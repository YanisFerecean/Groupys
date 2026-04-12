import ExpoModulesCore
import StoreKit

public class AppleMusicAuthModule: Module {
  private let cloudServiceController = SKCloudServiceController()

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

  public func definition() -> ModuleDefinition {
    Name("AppleMusicAuth")

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      SKCloudServiceController.requestAuthorization { status in
        promise.resolve(self.authorizationStatusString(status))
      }
    }

    AsyncFunction("getMusicUserToken") { (developerToken: String, promise: Promise) in
      self.cloudServiceController.requestUserToken(forDeveloperToken: developerToken) { userToken, error in
        if let error = error {
          promise.reject("APPLE_MUSIC_USER_TOKEN_ERROR", error.localizedDescription, error)
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
          promise.reject("APPLE_MUSIC_CAPABILITY_ERROR", error.localizedDescription, error)
          return
        }

        let capabilityStatus: [String: Bool] = [
          "musicCatalogPlayback": capabilities.contains(.musicCatalogPlayback),
          "addToCloudMusicLibrary": capabilities.contains(.addToCloudMusicLibrary)
        ]
        promise.resolve(capabilityStatus)
      }
    }
  }
}
