import {loadOptionalBladeArtwork} from './dashboard/optionalAssets';
import {render} from 'preact';
import {App} from './app';
import {loadConfig} from './lib/storage';
import {applyTokens} from './theme/tokens';
import './theme/global.css';
import './dashboard/dashboard.css';
import {activeTheme, applyDashboardTheme, loadThemes} from './dashboard/themes';

loadOptionalBladeArtwork();
applyTokens(loadConfig().theme);       // theme first, so there is no flash of the wrong colours
applyDashboardTheme(activeTheme(loadThemes(loadConfig().theme)));
render(<App />, document.getElementById('root')!);
