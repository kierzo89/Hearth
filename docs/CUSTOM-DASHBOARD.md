# Custom dashboard

Classic Hearth, Hearth Plus and Blades 360 share the same app list,
real icons, app ordering, hidden apps, TV inputs, weather and launch actions.
Blades 360 adapts the MC360 layout with metallic edges and navigation sounds;
see the source credits below.

## Navigation

On Blades, Left/Right switches between Apps, Inputs, Music, System and Themes.
Up/Down selects an entry; OK opens it. Hold OK on an app to move, hide or
uninstall it. Back returns to the first app. Pointer clicks work too.

Hearth Plus keeps the wallpaper, large clock and app row, adding a permanent
bar for Apps, Inputs, Music, Queue, Visualisers, System, Themes and Settings.
Press Up from any app to reach the bar, Left/Right to choose, and OK to open.
Press Down from the app row to control the player when a track is loaded.
The same Guide, music account, queue, artwork, player and visualisers work here.
Choose Themes → Hearth Plus to apply it, or Themes → Blades 360 to return.

On classic Hearth, Music, System stats and Themes are shortcut tiles in the
app row. Select the Themes tile to change themes.
Settings → Look → Theme library opens the same theme manager. Classic palette
returns to the familiar OLED black or blue-grey layout. Reset look and clock
also restores classic Hearth. Wallpapers and all app selections are preserved.

## Install a theme

Copy JSON files into `/media/developer/hearth-themes/` on the TV and choose
Themes → Theme library → Install themes from storage. Importing replaces an
installed theme with the same ID. Select a theme to apply it; selection and
custom definitions persist across app restarts. Remove this custom theme returns
to classic Hearth and keeps its file so it can be imported again.

`public/themes/midnight-blades.json` is a complete example, installed on this TV.
The schema is:

```json
{
  "version": 1,
  "id": "my-theme",
  "name": "My Theme",
  "author": "Your name",
  "description": "A short description",
  "layout": "blades",
  "base": "grey",
  "background": "theme",
  "accent": "#88bb44",
  "bladeColors": ["#6b9d19", "#2686a4", "#c57b18", "#766298", "#667279"],
  "palette": {
    "bg": "#172319",
    "wallpaperStart": "#334c32",
    "wallpaperMid": "#223521",
    "wallpaperEnd": "#101c12",
    "buttonActiveBg": "#88bb44",
    "buttonActiveText": "#102010"
  }
}
```

`layout` is `classic`, `hearth` (Hearth Plus) or `blades`. `base` is `black` or `grey`. `background` is
`wallpaper` (the user's existing wallpaper) or `theme` (theme gradient). Blades keeps its silver centre panel and uses the wallpaper around it when selected.
Colours must be six-digit hex values. Five blade colours are required if that
field is supplied. Palette keys are the colour keys in `src/theme/tokens.ts`
except `liftShadow`. Unknown keys, CSS, URLs and code are rejected. Built-in IDs
cannot be replaced. Files are limited to 16 KB; up to 24 custom themes are kept.
A bad file does not prevent other valid files from importing.

## System panel

CPU usage is sampled from successive `/proc/stat` readings (the first reading
says Sampling). Memory uses `MemAvailable`, with a fallback for older kernels.
The panel also shows uptime, maximum available thermal sensor reading, load,
developer-storage usage and IPv4 interfaces. It refreshes every five seconds
only while open; missing sensors show Unavailable.

Quick controls use the actual audio master service on this firmware, not the
legacy scenario-volume API: `com.webos.service.audio/master/getVolume`,
`setVolume`, and `muteVolume`. LG Home Auto Launch can be toggled, and both LG's
system settings and Hearth's settings are accessible. Changes are read back
from the TV. Volume and mute are unavailable if the TV refuses their queries.

## TV music service

Music runs entirely on the TV: `service/server.cjs` uses its existing Node 8
runtime, stores account credentials under `/media/developer/hearth-music/`, and
serves an authenticated API/audio proxy on **127.0.0.1:8766 only**. It does not
require a PC, Firefox, a cloud server or an external music proxy. TLS is verified
using the TV's CA bundle. Account tokens are never returned to the web app or
written to logs. The local pairing configuration is mode 600.

Install or update the service:

```sh
TV_HOST=lg-tv sh scripts/install-music.sh
```

The ordinary `npm run install:tv` also installs it. The boot hook is
`/var/lib/webosbrew/init.d/95-hearth-music`; opening Music also ensures it has
started. Existing account and pairing files survive updates.

Open Music → Sign in to YouTube Music. Scan the Google QR code or open the shown
URL on your phone and enter the TV code. Approve with Google on the phone. The
TV polls at Google's requested interval, stores the resulting session locally,
and refreshes it when needed. Sign out revokes/removes the TV music session.
No password is entered into Hearth. This uses YouTube's unofficial TV-code and
InnerTube interfaces; Google changes can require updates to this service.

Search works without signing in. Your library and liked songs require sign-in.
Choose a playlist, then a track; it becomes the playback queue. Play/pause,
next/previous, seek, stop and the TV remote's media buttons are supported. A
mini-player with a live progress bar and elapsed/total time remains on the
dashboard while you switch blades. Playback also
continues while you browse Hearth settings.
Opening another TV app pauses Hearth's audio to avoid playing over it.

The audio resolver chooses an unencrypted AAC/MP4 stream for the TV's browser;
it does not implement DRM or offline downloads. Private uploads, age-restricted
tracks, or tracks without such a stream can fail with a visible error. Search
is limited to 20 tracks per request; playlists to the first 100 playable tracks.
Account library browsing uses the TV client: Google can expose a different set
of shelves than the full YouTube Music mobile app. Phone sign-in and live
account-library verification require the account owner's participation.

## Validation and rollback

`npm test` includes theme/schema persistence checks, system counter parsing,
HTTP host validation, music renderer parsing and icon-buffer regressions.
`npm run build` checks types and compiles for Chrome 53+.

On this LG webOS 5.6.2 TV, loopback search and a muted AAC decoding test passed
with the music service running on the TV and the PC companion disabled. Google
issued a device code directly to the TV. Theme import and real app icons were
verified on the TV. Signed-in library/liked-song playback, saved playlists, service-restart
persistence and real token renewal were also verified; details are recorded
in `SETUP.md`.

Before the dashboard update, the installed app bundle was backed up to
`/media/developer/hearth-backups/app.before-dashboard-20261026.js`. Restoring that
bundle returns to the previous UI; old user preferences and wallpaper remain
unchanged. The new theme state is a separate `hearth-themes-v1` localStorage key.
To stop music, stop playback, remove only the `95-hearth-music` boot hook and
stop the PID whose command line is the Hearth music server. Keep its private
account directory if you intend to reinstall; sign out first to revoke access.

## Music browsing and live search

Library and Liked Songs open separate result lists. Loading is shown immediately,
and focus moves to the first playlist or song when it arrives. Playlist Back
returns to the library; list Back returns to Music. Controls remain on the Music
home so they do not hide results. Focus follows action IDs, so starting playback
cannot move the selection onto a different control.

Search updates songs and query suggestions as you type (350 ms debounce).
Requests run one batch at a time, with intermediate queries coalesced; stale
replies are ignored. The current search session caches its last eight queries.
Down leaves the input for suggestions, Right moves to songs, and OK selects a
suggestion or plays a song. Music continues while searching.

Selecting a query, pressing Search, or playing a result saves the query in
Recent searches on this TV. These are local Hearth searches, separate from
Google's account history. The newest 20 distinct searches are kept across
restarts; Clear search history removes them. Suggestions come from YouTube
Music's public catalogue, while recent queries remain local to this TV.


### MC360-style blades and sounds

The Blades layout now uses full-height sliding sheets and the metallic edge
styling inspired by Team Blackbolt's MC360 skin. Original textures and WAVs are bundled with their original credits and disclaimer.
CSS gradients and synthesised audio remain as fallbacks if those assets cannot load. All five sheets stay mounted;
only compositor transforms move them, so text and app icons do not stretch during
navigation. Blade transitions take 260 ms. Keeping their content layers rendered
avoids a first-frame rasterization stall on the TV. Remote and
pointer navigation share the same selection and sounds. Reduced-motion preferences
remove the slides.

Bundled `bladeslide_1` through `bladeslide_4`, `cursor`, `select`, and `back` WAVs
override the synthesised cues and are mixed through Web Audio at 45% gain independently of music playback. Sounds
only play in the Blades layout while Hearth is visible. Cursor repeats are limited
to one per 70 ms and at most three sound voices can overlap. Themes → Navigation
sounds toggles them and saves the preference on the TV. Silent/failed audio never
blocks navigation. See THIRD_PARTY_NOTICES.md and `public/mc360/SOURCE.txt` for
source attribution and asset notices.

Blade edges are clipped to the original textures' curved alpha contours. Each
sheet paints 94 px beyond its logical width, underneath the next steel edge;
this prevents a rectangular crop or exposed background in the curved cutout.
Inactive sheets use neutral grey beneath their steel edges and hide their menu
content. The outgoing colour lasts until its slide completes, while the newly
selected sheet immediately uses its own page colour.

## Artwork, remote player controls and visualisers

Music lists show playlist and song thumbnails; the dashboard player also shows
current-track artwork. On Home, press Down past the last menu item to focus
Play/Pause. Left/Right choose the player buttons, OK activates them, and Up or
Back returns to the menu. The diamond button opens the visualiser.

Music → Visualisers selects the effect, dashboard background, or full screen.
Full screen: Left/Right changes effect, Up/Down changes preset, OK pauses/resumes,
and Back closes. Hold OK for settings. The selected effect, preset and background
preference persist in the separate `hearth-visualisers-v1` key.

Included engines: Butterchurn/MilkDrop (MD1 and Minimal collections), the original
GOOM engine through WebAssembly, and 29 original Kodi Shadertoy shaders through
Hearth's WebGL adapter. Ten lightweight canvas effects include Spectrum,
Waveform, Boxalizer style, Fountain style, Saville style, StarBurst style,
3D Spectrum style, Fluid trails, Plasma and Fishtank. The “style” effects are
recreations; native G-Force, projectM, FishBMC and RSXS have not been ported.
See THIRD_PARTY_NOTICES.md for the different engine/preset licences.

### TV-local audio analysis

LG webOS does not support audio samples from `createMediaElementSource`.
Full-track browser decoding was rejected after a test caused the TV to restart.
Instead the authenticated TV service downloads one bounded compressed track,
uses the TV's existing GStreamer AAC decoder to produce mono 16 kHz PCM, and
returns only one-second sample windows aligned to the hardware player's position.
These feed the visualiser's analyser through a muted Web Audio path. The normal
TV player remains the sole audible source. No PC companion or microphone is used.

Preparing a new track can take several seconds; playback continues while the
visualiser displays its preparation status. Analysis is limited to 20 MiB of
compressed audio and 64 MiB PCM, with a 90-second preparation timeout. Only one
track is cached, in private files alongside the service state. Track changes,
service shutdown, startup and two minutes of inactivity clear the sample cache.
Unsupported/oversized tracks retain playback with a visible analysis message.
GOOM renders in a worker to keep remote navigation responsive. Animation stops while paused/hidden; leaving the visualiser stops sample polling.

On this TV, playlist/song/home artwork and remote player navigation passed live
checks. All 29 Kodi shaders compiled. MilkDrop, GOOM, Shadertoy and the canvas modes
received nonzero samples during actual account playback. The automated regression
suite and TypeScript/Vite build also pass.

## Guide, music queue and automatic visualiser

Hold Back for 650 ms on Home to open the Guide. A short Back keeps its usual
navigation action. The visible Guide button also opens it; the blue remote
button opens it anywhere in Hearth. Back/blue closes it. The Guide captures
remote input so the screen underneath cannot activate a second action.
Music, TV and Shortcuts tabs provide playback/queue access, volume/mute,
backlight brightness, System and Themes. Left/Right changes tabs, except on
an adjustable TV row; Up above the first row focuses the tab strip.
Unavailable TV controls stay disabled. Brightness changes the current picture
mode's backlight, not the picture black-level setting.

Hold OK on a library/liked song or search result for song options. List rows
also offer a visible ••• button; library rows accept Right. Play next inserts
immediately after the current queue entry. Add to queue appends. Identical
songs have separate queue identities, so duplicates can be moved independently.
Music → Music queue (also in Guide) exposes each entry's Play now, Move earlier,
Move later and Remove actions. Moving an entry preserves playback and progress.
Removing the current entry selects its successor, retaining play/pause state.
Shuffle mixes upcoming entries only, keeping the current song and history.
Turning shuffle off retains the visible order. Repeat cycles Off → Queue → One
song; manual Next still advances with repeat-one. End-of-queue stops with repeat
Off. Stop retains the queue for resume. Starting a playlist replaces the queue;
queue contents remain in memory for this Hearth session and are capped at 500.
No pairing credentials are written to browser storage.

Music → Visualisers → Automatic full-screen visualiser cycles Off, 30 seconds,
1 minute, 2 minutes (default), and 5 minutes. It starts only on Home during music
playback, never over settings, search, the queue, Guide or another TV app.
The automatic view fades in and preserves the selected effect. Its first key
press wakes Home and consumes that key's release/repeats, preventing accidental
pause, app launch or menu navigation. Pointer activity also wakes it. Manual
full-screen mode retains effect/preset and play/pause controls. The idle setting
persists with the existing visualiser preferences; selecting Off disables it.

Live TV checks passed for Guide hold/release and input isolation, reading native
volume/mute/backlight, backlight 100 → 95 → 100 restoration, adding 2 queue
entries, moving the current song without stopping it, shuffle/repeat selection,
natural end-of-track repeat-one, automatic entry after 30 seconds and consuming
the waking OK without pausing. The installed default idle delay is restored to
2 minutes. Regression coverage includes queue identity/boundaries, idle reset/
cleanup and shared audio sampling. `npm test`, build and packaging pass.
The prior app bundle is backed up at
`/media/developer/hearth-backups/app.before-guide-queue-idle-20261026.js`.

## Automatic visualiser changes

Music → Visualisers → Change visualiser defaults to **Every 3 minutes**.
While music is playing and visuals are visible, a different effect is chosen
without an immediate repeat. MilkDrop and Kodi Shadertoy also get a random preset.
Song changes and switching between dashboard and fullscreen visuals do not reset
this timer. Pausing playback, hiding Hearth or leaving the visuals stops the timer;
returning starts a fresh three minutes.

The setting cycles through Every 3 minutes, Every song and Manual. Selecting an
effect or preset switches to Manual and preserves that choice across restarts.
Existing automatic settings migrate to three minutes; saved manual choices stay
manual. The separate automatic fullscreen delay and wallpaper interval are unchanged.

## Blades colour collection

Themes → Theme library includes eight additional built-in Blades palettes:
Futuristic (icy cyan/titanium), Gothic (burgundy/violet/antique gold), Cyber
(teal/magenta/acid green), Synthwave (pink/violet), Aurora (jade/turquoise),
Ember (copper/amber), Ocean (deep blue/sea glass), and Royal (purple/sapphire/gold).
Each has five blade colours and coordinated submenu, focus and player colours.
Inactive tabs retain the original steel finish; the active tab uses its page
colour. Select Blades 360 to return to the original palette.

The theme library previews the highlighted theme using a scaled version of its
home layout, with your app icons and cached wallpaper. Remote Up/Down and pointer
hover update this preview without saving or applying the theme. Press OK to apply;
Back leaves the current theme unchanged.

## Wallpaper behind the automatic visualiser

Music → Visualisers → Wallpaper behind automatic visualiser blends the effect
over your existing wallpaper. Folder slideshows continue using the interval and
shuffle settings from Settings → Wallpaper, without restarting when the idle
visualiser opens or closes. Works with Blades as well as the Hearth layouts.
This option defaults to on for new and existing settings without a saved choice;
an explicitly saved Off choice is preserved. With this option on, a single-picture
wallpaper stays still and a gradient
remains a gradient. Manually opened full-screen visualisers keep their usual
background. Any button still wakes the dashboard.
