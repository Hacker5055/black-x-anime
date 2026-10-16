/**
 * HLS playback for the APK player. Android WebView only plays .m3u8 natively on
 * some devices, and v15 simply hid HLS servers there. hls.js (already a project
 * dependency) plays them through Media Source Extensions; it is loaded on demand,
 * only when an HLS stream is opened.
 */
let hlsModule = null;

export function nativeHlsSupported(video) {
  try {
    const v = video || document.createElement('video');
    return Boolean(v.canPlayType && v.canPlayType('application/vnd.apple.mpegurl'));
  } catch {
    return false;
  }
}

export function mseHlsSupported() {
  try {
    const MS = window.ManagedMediaSource || window.MediaSource;
    return Boolean(MS && typeof MS.isTypeSupported === 'function' && MS.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'));
  } catch {
    return false;
  }
}

export function needsHlsJs(url, video) {
  return /\.m3u8(?:[?#]|$)/i.test(String(url || '')) || /\/api\/stream\/hls-proxy\?/i.test(String(url || ''))
    ? !nativeHlsSupported(video) && mseHlsSupported()
    : false;
}

/**
 * Attaches `url` to `video` with hls.js. Returns a controller:
 * { levels: [{ index, height, bitrate }], setLevel(i | -1), getLevel(), destroy() }.
 * `onLevels` fires once the manifest is parsed. Data saver caps quality at 480p
 * and starts at the lowest level.
 */
export async function attachHls(video, url, { dataSaver = false, onLevels, onFatal } = {}) {
  if (!hlsModule) hlsModule = import('hls.js');
  const { default: Hls } = await hlsModule;
  if (!Hls.isSupported()) throw new Error('hls_unsupported');
  const hls = new Hls({
    enableWorker: true,
    capLevelToPlayerSize: true,
    startLevel: dataSaver ? 0 : -1,
    maxBufferLength: dataSaver ? 20 : 40,
    backBufferLength: 30
  });
  let recovered = 0;
  const controller = {
    levels: [],
    setLevel(index) {
      hls.currentLevel = Number.isInteger(index) ? index : -1;
    },
    getLevel() {
      return hls.autoLevelEnabled ? -1 : hls.currentLevel;
    },
    destroy() {
      try {
        hls.destroy();
      } catch {
        /* already gone */
      }
    }
  };
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    controller.levels = hls.levels
      .map((l, index) => ({ index, height: Number(l.height) || 0, bitrate: Number(l.bitrate) || 0 }))
      .filter((l) => l.height > 0);
    if (dataSaver) {
      const capped = controller.levels.filter((l) => l.height <= 480).pop();
      if (capped) hls.autoLevelCapping = capped.index;
    }
    onLevels?.(controller.levels);
  });
  hls.on(Hls.Events.ERROR, (_evt, data) => {
    if (!data?.fatal) return;
    if (recovered < 2 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      recovered += 1;
      hls.startLoad();
    } else if (recovered < 2 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      recovered += 1;
      hls.recoverMediaError();
    } else {
      controller.destroy();
      onFatal?.(data);
    }
  });
  hls.loadSource(url);
  hls.attachMedia(video);
  return controller;
}
