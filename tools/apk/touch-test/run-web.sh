#!/usr/bin/env bash
# Real-touch suite for the WEBSITE: phones get the app interface (client/src/mobile/webApp.js),
# computers get the website pages (client/src/webUi.js). Builds the website into $WORK/web
# (never into client/dist) unless DIST points at an existing build. See README.md.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
WORK="${WORK:-/tmp/bx-touch}"

mkdir -p "$WORK"
cp "$HERE/lib.mjs" "$HERE/web-suite.mjs" "$HERE/package.json" "$WORK/"

if [ ! -d "$WORK/node_modules/puppeteer-core" ]; then
  echo "installing the test browser into $WORK"
  (cd "$WORK" && npm install --no-audit --no-fund --no-package-lock --loglevel=error)
fi

if [ ! -s "$WORK/test.webm" ]; then
  FFMPEG="$(command -v ffmpeg || true)"
  if [ -z "$FFMPEG" ]; then
    [ -x "$WORK/py/bin/python" ] || python3 -m venv "$WORK/py"
    "$WORK/py/bin/pip" install -q imageio-ffmpeg
    FFMPEG="$("$WORK/py/bin/python" -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')"
  fi
  echo "making a 24-minute test video"
  "$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "testsrc2=size=192x108:rate=2" -t 1440 \
    -c:v libvpx -b:v 60k -deadline realtime -cpu-used 8 -g 20 "$WORK/test.webm"
fi

if [ -z "${DIST:-}" ]; then
  DIST="$WORK/web"
  echo "building the website into $DIST"
  (cd "$ROOT" && npx vite build client --outDir "$DIST" --emptyOutDir --logLevel error)
fi

cd "$WORK"
AWS_EXECUTION_ENV="${AWS_EXECUTION_ENV:-AWS_Lambda_nodejs22.x}" BX_REPO="$ROOT" DIST="$DIST" VIDEO="$WORK/test.webm" \
  node web-suite.mjs
