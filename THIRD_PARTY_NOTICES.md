# Third-party notices

This project is a modified version of [partridgeworks/webos-launcher](https://github.com/partridgeworks/webos-launcher) (MIT licence, see [LICENSE](LICENSE)).

The MIT licence in [LICENSE](LICENSE) covers this project's own code and its app icon
(`public/icon.png`, `public/largeIcon.png`). The following material belongs to others and
is **not** covered by that licence.

## Bundled software

| Component | Licence | Where |
|---|---|---|
| [QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) | MIT, © Kazuhiko Arase | compiled into `assets/app.js`; licence text in [public/licenses/qrcode-generator-MIT.txt](public/licenses/qrcode-generator-MIT.txt) |
| [Preact](https://preactjs.com) | MIT, © Jason Miller | compiled into `assets/app.js`; licence text in [public/licenses/preact-MIT.txt](public/licenses/preact-MIT.txt) |
| [core-js](https://github.com/zloirock/core-js) | MIT, © 2013-2025 Denis Pushkarev, © 2025-2026 CoreJS Company | polyfills put in front of `assets/app.legacy.js` (the bundle for webOS 3.x only); licence text in [public/licenses/core-js-MIT.txt](public/licenses/core-js-MIT.txt) |
| [Inter](https://rsms.me/inter/) typeface | SIL Open Font License 1.1, © The Inter Project Authors | `src/assets/inter-latin-wght.woff2`; licence text in [public/licenses/Inter-OFL.txt](public/licenses/Inter-OFL.txt) |
| Poppins typeface | SIL Open Font License 1.1, © The Poppins Project Authors | `src/assets/poppins-latin-*.woff2`, `src/assets/hearth-poppins-*.woff`; licence text in [public/licenses/Poppins-OFL.txt](public/licenses/Poppins-OFL.txt) |
| Oswald typeface | SIL Open Font License 1.1, © The Oswald Project Authors | `src/assets/oswald-latin-*.woff2`; licence text in [public/licenses/Oswald-OFL.txt](public/licenses/Oswald-OFL.txt) |
| Roboto Mono typeface | SIL Open Font License 1.1, © The Roboto Mono Project Authors | `src/assets/roboto-mono-latin-*.woff2`; licence text in [public/licenses/RobotoMono-OFL.txt](public/licenses/RobotoMono-OFL.txt) |
| Cormorant Garamond typeface | SIL Open Font License 1.1, © The Cormorant Garamond Project Authors | `src/assets/cormorant-garamond-latin-*.woff2`; licence text in [public/licenses/CormorantGaramond-OFL.txt](public/licenses/CormorantGaramond-OFL.txt) |
| Outfit typeface | SIL Open Font License 1.1, © 2021 The Outfit Project Authors (https://github.com/Outfitio/Outfit-Fonts) | `src/assets/hearth-outfit.woff`; licence text in [public/licenses/Outfit-OFL.txt](public/licenses/Outfit-OFL.txt) |
| Work Sans typeface | SIL Open Font License 1.1, © 2019 The Work Sans Project Authors (https://github.com/weiweihuanghuang/Work-Sans) | `src/assets/hearth-worksans.woff`; licence text in [public/licenses/WorkSans-OFL.txt](public/licenses/WorkSans-OFL.txt) |
| Bricolage Grotesque typeface | SIL Open Font License 1.1, © 2022 The Bricolage Grotesque Project Authors (https://github.com/ateliertriay/bricolage) | `src/assets/hearth-bricolage.woff`; licence text in [public/licenses/BricolageGrotesque-OFL.txt](public/licenses/BricolageGrotesque-OFL.txt) |
| Big Shoulders typeface | SIL Open Font License 1.1, © 2019 The Big Shoulders Project Authors (https://github.com/xotypeco/big_shoulders) | `src/assets/hearth-bigshoulders.woff`; licence text in [public/licenses/BigShoulders-OFL.txt](public/licenses/BigShoulders-OFL.txt) |
| Jura typeface | SIL Open Font License 1.1, © 2019 The Jura Project Authors (https://github.com/ossobuffo/jura) | `src/assets/hearth-jura.woff`; licence text in [public/licenses/Jura-OFL.txt](public/licenses/Jura-OFL.txt) |
| Tektur typeface | SIL Open Font License 1.1, © 2023 The Tektur Project Authors (https://www.github.com/hyvyys/Tektur) | `src/assets/hearth-tektur.woff`; licence text in [public/licenses/Tektur-OFL.txt](public/licenses/Tektur-OFL.txt) |
| JetBrains Mono typeface | SIL Open Font License 1.1, © 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) | `src/assets/hearth-jetbrains.woff`; licence text in [public/licenses/JetBrainsMono-OFL.txt](public/licenses/JetBrainsMono-OFL.txt) |
| Lora typeface | SIL Open Font License 1.1, © 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora". | `src/assets/hearth-lora.woff`; licence text in [public/licenses/Lora-OFL.txt](public/licenses/Lora-OFL.txt) |
| Poiret One typeface | SIL Open Font License 1.1, © 2011, Denis Masharov (denis.masharov@gmail.com) | `src/assets/hearth-poiret.woff`; licence text in [public/licenses/PoiretOne-OFL.txt](public/licenses/PoiretOne-OFL.txt) |
| Pixelify Sans typeface | SIL Open Font License 1.1, © 2021 The Pixelify Sans Project Authors (https://github.com/eifetx/Pixelify-Sans) | `src/assets/hearth-pixelify.woff`; licence text in [public/licenses/PixelifySans-OFL.txt](public/licenses/PixelifySans-OFL.txt) |

The licence texts are included in the installed app under `licenses/`.

## App and input icons

`public/icons/apps/` contains the icons of third-party TV apps, and `public/icons/inputs/`
contains input-type icons from LG's webOS software. They are trademarks or copyright of
their respective owners. This project is not affiliated with, endorsed by or sponsored by
any of them.

They are included in good faith, only so the launcher can show recognisable tiles for apps
and inputs already installed on the user's own TV. Rights holders who would like an icon
removed can open an issue on this repository and it will be removed. Every app tile falls
back to a plain text tile without its icon, so removal doesn't break anything.

"LG" and "webOS" are trademarks of LG Electronics.

## Photos
`public/wallpapers/nature-NN.jpg` are public-domain photos supplied by the maintainer, resized to 1920x1080.

## Feather icons (MIT)
The cog on the Hearth Settings tile is the "settings" icon from Feather (https://feathericons.com), (c) Cole Bemis, MIT licence.

## Technique and code derived from other projects

| Project | Licence | Used for |
|---|---|---|
| [Glasshouse](https://github.com/rorygallagher2024/glasshouse) | MIT, © 2026 Rory Gallagher | The "Replace LG Home with a script and SAM" option (`src/takeover/takeover.sh`). The technique: replacing LG Home under its own app id by bind-mounting over `/usr/palm/applications/com.webos.app.home`, making the TV's app manager (SAM) read the new manifest again (the `profile.blockedAppList` nudge, and `blockSystemApp` with `releaseBlockSystemApp`), stopping LG's own process only afterwards, and the restart of SAM for firmware that has neither (clear systemd's failure counters, kill `LunaExecutable`, kill `sam.service`, wait for SAM, start failed dependents, reopen the app in front). Adapted from `server/lib/home-takeover.js`, `server/lib/samrescan.js`, `server/lib/apps.js` (`restartSamNow`, `waitForSam`, `startFailedDependents`, `restoreApp`) and `server/50-tvweb.sh`; its research notes (`docs/development/TV-RESEARCH.md`) guided the order of steps. |

The MIT licence text of that project:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Ideas and contributions

Credited in the README: pull requests by Alejandro Morales (#1), chriskoperdraad-tech (#2, #3: webOS 3 Home-bar watcher lines in `src/homehook/watch.sh`), ganondorft (#6: `public/tools/webos11-permission.sh`) and iulyax27 (#8, #10), a community contribution (author not named), and the ideas from Clean Your TV, webOS Brew, LG Input Hook (Simon34545), Lightkeeper and throwaway96's Homebrew Channel 0.8.0-rc1. No code was copied from projects other than the ones listed in the tables above.
## Music protocol references

The TV music service implements the TV-code sign-in flow described by
[YouTube.js](https://ytjs.dev/guide/authentication) and uses client context values
documented in [yt-dlp](https://github.com/yt-dlp/yt-dlp). It does not bundle either
project. The music integration is unofficial and is not affiliated with Google.

## MC360 reference and assets

Blades 360 adapts the sliding-sheet layout of **MC360 (Media Center 360)** by
**Team Blackbolt**, with graphics by Blackbolt and Jezz-X. The layout was informed by the
[MC360 source archive](https://github.com/Team-Resurgent/XBMC-Skinning-Project/tree/484fa2309eab69291d546398d7444e3d761f8cac/MC360).

Original MC360 textures and navigation WAVs are bundled in `public/mc360/`,
with the original `README_MC360forXBMC.txt` and a source-revision record in
`SOURCE.txt`. They are included at the fork owner's request and retain their
original credits and disclaimer; they are not relicensed under Hearth's MIT
licence. CSS gradients and synthesised cues remain as fallbacks if assets cannot
load. Hearth is not affiliated with Team Blackbolt or Microsoft.

## Music visualisers

- [Butterchurn 2.6.7](https://github.com/jberg/butterchurn) and
  [butterchurn-presets 2.4.7](https://github.com/jberg/butterchurn-presets) are MIT
  licensed. Licence texts are in `public/licenses/`; the Minimal and MD1 preset
  bundles retain preset authors' names. Butterchurn is a browser implementation
  of MilkDrop, not the original Xbox binary.
- [GOOM Online](https://github.com/goom-online/goom-online.github.io/tree/a83821017af77077b75a2dae8676967053924fec)
  contains the LGPL GOOM engine. The unmodified corresponding upstream source
  archive, source revision, and modified JavaScript adapter source are bundled
  in `public/visualizers/`. `scripts/build-goom-adapter.py` reproduces the adapter;
  the embedded WebAssembly engine is unchanged. LGPL text is in
  `public/licenses/goom-LGPL.txt`.
- [Kodi Shadertoy presets](https://github.com/xbmc/visualization.shadertoy/tree/034413fa3c8a1488c5f2a0603430439b242aa49f)
  are included as unmodified GLSL sources and textures in
  `public/visualizers/kodi-shaders/`. Individual shader headers retain authors,
  attribution links and licence terms, including CC BY-NC-SA notices. They are
  not covered by Hearth's MIT licence; the upstream framework GPL notice does
  not replace individual preset terms. This personal TV customization must not
  be assumed suitable for commercial redistribution. Hearth supplies a separate
  WebGL adapter for the original shader inputs.

Spectrum, Waveform, Boxalizer style, Fountain style, Saville style, StarBurst
style, 3D Spectrum style, Fluid trails, Plasma and Fishtank are Hearth canvas
implementations. No G-Force, native projectM, FishBMC or RSXS code is bundled.
