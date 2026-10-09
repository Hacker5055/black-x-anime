/**
 * BLACK X — runtime configuration (edit this file, no rebuild needed).
 *
 * On GitHub Pages (static build) the app runs without a Node server:
 *   • catalog (trending/search) comes live from AniList GraphQL
 *   • favorites / continue-watching / accounts live in localStorage
 *   • streaming needs a tiny Cloudflare Worker relay (free) — see README:
 *     set `streamBase` to your worker URL to enable playback.
 *
 * On the Node/SnapDeploy build both fields can stay empty (same-origin API).
 */
window.BLACKX_CONFIG = {
  // Full URL of a BLACK X API server (e.g. SnapDeploy). "" = same-origin.
  apiBase: "",
  // Full URL of the streaming relay worker, e.g. "https://blackx-relay.x.workers.dev".
  // "" = browse-only mode (playback disabled). Static build only.
  streamBase: ""
};
