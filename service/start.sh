#!/bin/sh
BASE=/media/developer/hearth-music
SERVER=/media/developer/hearth-music-server.cjs
mkdir -p "$BASE"
chmod 700 "$BASE"
previous=$(cat "$BASE/pid" 2>/dev/null || true)
case "$previous" in ''|*[!0-9]*) previous=0;; esac
if [ "$previous" -gt 0 ] && [ -r "/proc/$previous/cmdline" ] && tr '\000' ' ' <"/proc/$previous/cmdline" | grep -Fq "$SERVER"; then exit 0; fi
nohup /usr/bin/node --max-old-space-size=64 "$SERVER" >"$BASE/service.log" 2>&1 </dev/null &
echo "$!" >"$BASE/pid"
