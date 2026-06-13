/**
 * MusicKit-JS bridge (Listen Together full-song playback, no native Swift).
 *
 * Apple Music full tracks can't be fetched as a URL — they must be played through a player tied to
 * the listener's own subscription. We run Apple's official MusicKit JS inside a hidden WebView
 * (see `components/music/MusicKitProvider`) and drive it from here. Audio stays inside the WebView
 * and never crosses the wire, so the existing `trackId + position + isPlaying` sync model is reused
 * unchanged — we only swap the playback engine.
 *
 * This module is the singleton store + command surface (mirrors `usePreviewPlayer`'s shape) and the
 * HTML for the player page. The WebView host registers a `sender` that injects JS into the page.
 */

export interface MusicKitSnapshot {
  /** id of the track currently loaded (null when stopped). */
  activeId: string | null
  isPlaying: boolean
  positionSec: number
  durationSec: number
  /** MusicKit configured + authorized and ready to play. */
  ready: boolean
  /** The WebView is showing the Apple sign-in flow and must be visible. */
  needsAuth: boolean
}

type Sender = (js: string) => void

let sender: Sender | null = null
let pendingJs: string[] = []
let configured = false

let snapshot: MusicKitSnapshot = {
  activeId: null,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  ready: false,
  needsAuth: false,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(l => l())
}

function setSnapshot(partial: Partial<MusicKitSnapshot>) {
  snapshot = { ...snapshot, ...partial }
  emit()
}

export function subscribeMusicKit(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getMusicKitSnapshot() {
  return snapshot
}

/** Build the JS the WebView page runs for a command, then send (or queue until the host is ready). */
function send(payload: Record<string, unknown>) {
  const js = `window.__mkHandle && window.__mkHandle(${JSON.stringify(JSON.stringify(payload))});true;`
  if (sender) sender(js)
  else pendingJs.push(js)
}

/** Called by the WebView host once the page is mounted; flushes anything queued before mount. */
export function registerMusicKitSender(fn: Sender) {
  sender = fn
  const queued = pendingJs
  pendingJs = []
  queued.forEach(js => fn(js))
}

export function unregisterMusicKitSender() {
  sender = null
  configured = false
  setSnapshot({ ready: false })
}

/** Configure MusicKit with the backend-minted developer token (idempotent). */
export function configureMusicKit(developerToken: string) {
  if (configured) return
  configured = true
  send({ cmd: 'configure', developerToken })
}

export function playFull(activeId: string, catalogId: string) {
  setSnapshot({ activeId, isPlaying: true, positionSec: 0 })
  send({ cmd: 'play', activeId, catalogId })
}

export function pauseFull() {
  setSnapshot({ isPlaying: false })
  send({ cmd: 'pause' })
}

export function resumeFull() {
  setSnapshot({ isPlaying: true })
  send({ cmd: 'resume' })
}

export function seekFull(seconds: number) {
  send({ cmd: 'seek', seconds: Math.max(0, seconds) })
}

export function stopFull() {
  setSnapshot({ activeId: null, isPlaying: false, positionSec: 0 })
  send({ cmd: 'stop' })
}

/** Handle a message posted back from the WebView page. */
export function handleMusicKitMessage(raw: string) {
  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  switch (msg.type) {
    case 'ready':
      setSnapshot({ ready: true })
      break
    case 'needsAuth':
      setSnapshot({ needsAuth: true })
      break
    case 'authorized':
      setSnapshot({ needsAuth: false })
      break
    case 'state':
      setSnapshot({
        activeId: (msg.activeId as string | null) ?? null,
        isPlaying: !!msg.isPlaying,
        positionSec: typeof msg.positionSec === 'number' ? msg.positionSec : snapshot.positionSec,
        durationSec: typeof msg.durationSec === 'number' ? msg.durationSec : snapshot.durationSec,
      })
      break
    case 'ended':
      setSnapshot({ activeId: null, isPlaying: false, positionSec: 0 })
      break
    default:
      break
  }
}

/**
 * The player page. Loads MusicKit JS v3, configures with the developer token, and exposes
 * `window.__mkHandle(jsonString)` for RN→page commands. Posts `{ type, ... }` back to RN.
 * Authorization (first play) flips the page visible via a `needsAuth`/`authorized` round-trip so the
 * Apple sign-in is interactive; the host hides the WebView again afterwards.
 */
export const MUSICKIT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js" data-web-components async></script>
  <style>html,body{margin:0;padding:0;background:#000;color:#fff;font-family:-apple-system,sans-serif}</style>
</head>
<body>
  <div id="auth" style="display:none;padding:24px;font-size:16px">Sign in to Apple Music to listen together…</div>
  <script>
    (function () {
      var music = null, ready = false, pendingDevToken = null;
      var activeId = null, catalogId = null, tickTimer = null;

      function post(obj) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
      function state(extra) {
        var s = {
          type: 'state',
          activeId: activeId,
          isPlaying: music ? !!music.isPlaying : false,
          positionSec: music ? (music.currentPlaybackTime || 0) : 0,
          durationSec: music ? (music.currentPlaybackDuration || 0) : 0
        };
        if (extra) for (var k in extra) s[k] = extra[k];
        post(s);
      }
      function startTick() { if (!tickTimer) tickTimer = setInterval(function () { state(); }, 1000); }
      function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }

      async function tryConfigure() {
        if (ready || !pendingDevToken || !window.MusicKit) return;
        try {
          await MusicKit.configure({ developerToken: pendingDevToken, app: { name: 'Groupys', build: '1.0' } });
          music = MusicKit.getInstance();
          ready = true;
          music.addEventListener('playbackStateDidChange', function () { state(); });
          music.addEventListener('mediaItemDidChange', function () { state(); });
          music.addEventListener('mediaPlaybackError', function (e) { post({ type: 'error', error: String(e && e.error) }); });
          post({ type: 'ready' });
          if (catalogId) doPlay(activeId, catalogId);
        } catch (e) { post({ type: 'error', error: String(e) }); }
      }

      async function doPlay(nextActiveId, nextCatalogId) {
        activeId = nextActiveId; catalogId = nextCatalogId;
        if (!ready) { tryConfigure(); return; }
        try {
          if (!music.isAuthorized) {
            document.getElementById('auth').style.display = 'block';
            post({ type: 'needsAuth' });
            await music.authorize();
            document.getElementById('auth').style.display = 'none';
            post({ type: 'authorized' });
          }
          await music.setQueue({ song: catalogId });
          await music.play();
          startTick();
          state();
        } catch (e) { post({ type: 'error', error: String(e) }); }
      }

      window.__mkHandle = function (jsonStr) {
        var msg; try { msg = JSON.parse(jsonStr); } catch (e) { return; }
        switch (msg.cmd) {
          case 'configure': pendingDevToken = msg.developerToken; tryConfigure(); break;
          case 'play': doPlay(msg.activeId, msg.catalogId); break;
          case 'pause': if (music) { try { music.pause(); } catch (e) {} } stopTick(); state(); break;
          case 'resume': if (music) { try { music.play(); startTick(); } catch (e) {} } state(); break;
          case 'seek': if (music) { try { music.seekToTime(msg.seconds); } catch (e) {} } state(); break;
          case 'stop':
            if (music) { try { music.stop(); } catch (e) {} }
            stopTick(); activeId = null; catalogId = null; state();
            break;
        }
      };

      document.addEventListener('musickitloaded', function () { post({ type: 'loaded' }); tryConfigure(); });
      // musickit.js may already be loaded if this runs late.
      if (window.MusicKit) tryConfigure();
    })();
  </script>
</body>
</html>`
