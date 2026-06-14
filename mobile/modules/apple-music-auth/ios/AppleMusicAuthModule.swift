import ExpoModulesCore
import StoreKit
import MediaPlayer

public class AppleMusicAuthModule: Module {
  private let cloudServiceController = SKCloudServiceController()

  // App-scoped player: plays catalog songs by store id using the device's Apple Music subscription.
  // Unlike `systemMusicPlayer` it doesn't hijack the global Now Playing app, and it stops when the
  // app exits — which suits a foreground Listen Together sync session.
  private let player = MPMusicPlayerController.applicationQueuePlayer
  private var currentStoreId: String = ""
  private var hasStartedPlaying = false
  private var positionTimer: Timer?
  private var stateObserver: NSObjectProtocol?
  private var itemObserver: NSObjectProtocol?

  private func authorizationStatusString(_ status: SKCloudServiceAuthorizationStatus) -> String {
    switch status {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "notDetermined"
    }
  }

  private func emitStatus(ended: Bool = false) {
    let item = player.nowPlayingItem
    self.sendEvent("onPlaybackStatus", [
      "storeId": currentStoreId,
      "positionSec": player.currentPlaybackTime,
      "durationSec": item?.playbackDuration ?? 0,
      "isPlaying": player.playbackState == .playing,
      "ended": ended
    ])
  }

  // The queue player passes through `.stopped` briefly while a song loads, so only treat it as
  // "ended" once we've actually seen `.playing` for the current track.
  private func handlePlaybackStateChange() {
    if player.playbackState == .playing {
      hasStartedPlaying = true
    }
    if player.playbackState == .stopped && hasStartedPlaying {
      hasStartedPlaying = false
      currentStoreId = ""
      emitStatus(ended: true)
      return
    }
    emitStatus()
  }

  public func definition() -> ModuleDefinition {
    Name("AppleMusicAuth")

    Events("onPlaybackStatus")

    // ── Authorization / tokens ────────────────────────────────────────────────

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      SKCloudServiceController.requestAuthorization { status in
        promise.resolve(self.authorizationStatusString(status))
      }
    }

    AsyncFunction("getMusicUserToken") { (developerToken: String, promise: Promise) in
      self.cloudServiceController.requestUserToken(forDeveloperToken: developerToken) { userToken, error in
        if let error = error {
          promise.reject("APPLE_MUSIC_USER_TOKEN_ERROR", error.localizedDescription)
          return
        }

        guard let userToken = userToken, !userToken.isEmpty else {
          promise.reject("APPLE_MUSIC_USER_TOKEN_MISSING", "Apple Music user token unavailable")
          return
        }

        promise.resolve(userToken)
      }
    }

    AsyncFunction("getCapabilityStatus") { (promise: Promise) in
      self.cloudServiceController.requestCapabilities { capabilities, error in
        if let error = error {
          promise.reject("APPLE_MUSIC_CAPABILITY_ERROR", error.localizedDescription)
          return
        }

        let capabilityStatus: [String: Bool] = [
          "musicCatalogPlayback": capabilities.contains(.musicCatalogPlayback),
          "addToCloudMusicLibrary": capabilities.contains(.addToCloudMusicLibrary)
        ]
        promise.resolve(capabilityStatus)
      }
    }

    // ── Full-song playback (MediaPlayer, main-thread only) ────────────────────

    Function("playCatalogId") { (storeId: String) in
      DispatchQueue.main.async {
        self.currentStoreId = storeId
        self.hasStartedPlaying = false
        let descriptor = MPMusicPlayerStoreQueueDescriptor(storeIDs: [storeId])
        self.player.setQueue(with: descriptor)
        self.player.prepareToPlay()
        self.player.play()
      }
    }

    Function("pausePlayback") {
      DispatchQueue.main.async {
        self.player.pause()
        self.emitStatus()
      }
    }

    Function("resumePlayback") {
      DispatchQueue.main.async {
        self.player.play()
        self.emitStatus()
      }
    }

    Function("stopPlayback") {
      DispatchQueue.main.async {
        self.player.stop()
        self.currentStoreId = ""
        self.hasStartedPlaying = false
        self.emitStatus(ended: true)
      }
    }

    Function("seekTo") { (seconds: Double) in
      DispatchQueue.main.async {
        self.player.currentPlaybackTime = max(0, seconds)
        self.emitStatus()
      }
    }

    // ── Status event plumbing (only while JS has a listener) ───────────────────

    OnStartObserving {
      DispatchQueue.main.async {
        self.player.beginGeneratingPlaybackNotifications()
        self.stateObserver = NotificationCenter.default.addObserver(
          forName: .MPMusicPlayerControllerPlaybackStateDidChange,
          object: self.player,
          queue: .main
        ) { [weak self] _ in self?.handlePlaybackStateChange() }
        self.itemObserver = NotificationCenter.default.addObserver(
          forName: .MPMusicPlayerControllerNowPlayingItemDidChange,
          object: self.player,
          queue: .main
        ) { [weak self] _ in self?.emitStatus() }
        self.positionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
          self?.emitStatus()
        }
      }
    }

    OnStopObserving {
      DispatchQueue.main.async {
        self.positionTimer?.invalidate()
        self.positionTimer = nil
        if let observer = self.stateObserver {
          NotificationCenter.default.removeObserver(observer)
          self.stateObserver = nil
        }
        if let observer = self.itemObserver {
          NotificationCenter.default.removeObserver(observer)
          self.itemObserver = nil
        }
        self.player.endGeneratingPlaybackNotifications()
      }
    }
  }
}
