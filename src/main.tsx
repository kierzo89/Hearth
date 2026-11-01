import {loadOptionalBladeArtwork} from './dashboard/optionalAssets';
import {render} from 'preact';
import {App} from './app';
import {loadConfig} from './lib/storage';
import {applyBackground} from './lib/backgrounds';
import {applyTokens, THEMES} from './theme/tokens';
import './theme/global.css';
import './dashboard/dashboard.css';
import dashboardCss from './dashboard/dashboard.css?raw';
import {activeTheme, applyDashboardTheme, loadThemes} from './dashboard/themes';
import globalCss from './theme/global.css?raw';
import {LEGACY, startLegacyVars} from './lib/cssvars';
import {mark} from './lib/perfmarks';

mark('script started');

if (LEGACY) startLegacyVars(globalCss + '\n' + dashboardCss);       // Chromium 38: custom properties are emulated from the stylesheet source
const startConfig = loadConfig();
applyTokens(startConfig.theme);       // theme first, so there is no flash of the wrong colours
const startTheme = activeTheme(loadThemes(startConfig.theme));
applyDashboardTheme(startTheme);
if (startTheme.layout !== 'blades') applyBackground(startConfig.background, THEMES[startTheme.base]);
loadOptionalBladeArtwork();
render(<App />, document.getElementById('root')!);
mark('first render');
window.requestAnimationFrame(() => window.requestAnimationFrame(() => mark('first frame drawn')));
