#!/bin/sh
# Install/update the TV-resident service, retaining its account and pairing files.
set -e
cd "$(dirname "$0")/.."
[ ! -f tv.env ] || . ./tv.env
[ -n "${TV_HOST:-}" ] || { echo 'Set TV_HOST to your SSH host alias.' >&2; exit 1; }
scp -q service/server.cjs "$TV_HOST:/media/developer/hearth-music-server.cjs.new"
scp -q service/start.sh "$TV_HOST:/var/lib/webosbrew/init.d/95-hearth-music.new"
ssh "$TV_HOST" 'set -e
mv /media/developer/hearth-music-server.cjs.new /media/developer/hearth-music-server.cjs
mv /var/lib/webosbrew/init.d/95-hearth-music.new /var/lib/webosbrew/init.d/95-hearth-music
chmod 755 /var/lib/webosbrew/init.d/95-hearth-music
previous=$(cat /media/developer/hearth-music/pid 2>/dev/null || true)
case "$previous" in ""|*[!0-9]*) previous=0;; esac
if [ "$previous" -gt 0 ] && [ -r "/proc/$previous/cmdline" ] && tr "\000" " " <"/proc/$previous/cmdline" | grep -Fq /media/developer/hearth-music-server.cjs; then
  kill "$previous"
  attempts=0
  while [ -r "/proc/$previous/cmdline" ] && tr "\000" " " <"/proc/$previous/cmdline" | grep -Fq /media/developer/hearth-music-server.cjs; do
    attempts=$((attempts + 1))
    [ "$attempts" -lt 6 ] || { echo "Previous music service did not stop; leaving its state intact." >&2; exit 1; }
    sleep 1
  done
fi
sh /var/lib/webosbrew/init.d/95-hearth-music'
echo 'TV music service installed. Open Music in Hearth and sign in with your phone.'
