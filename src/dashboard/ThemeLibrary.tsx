import {useCallback, useState} from 'preact/hooks';
import {ThemePreview, type ThemePreviewProps} from './ThemePreview';
import {DashboardPanel} from './Panel';
import {soundsEnabled, setSoundsEnabled, playNavigationSound} from './sounds';
import {BUILTIN_THEMES, importThemes, themeList, THEME_FOLDER, type ThemeState} from './themes';
export function ThemeLibrary ({state, onChange, onClose, notify, ...previewProps}: ThemePreviewProps & {state: ThemeState; onChange: (s: ThemeState) => void; onClose: () => void; notify: (s: string) => void}) {
	const [sound, setSound] = useState(soundsEnabled);
	const [busy, setBusy] = useState(false);
	const [report, setReport] = useState('');
	const [preview, setPreview] = useState(state.active);
	const themes = themeList(state);
	const theme = themes.find((t) => t.id === preview) || themes[0];
	const highlight = useCallback((id: string) => { if (themeList(state).some(t => t.id === id)) setPreview(id); }, [state]);
	const apply = (id: string) => { onChange({...state, active: id}); setPreview(id); notify('Theme applied'); };
	const install = () => {
		if (busy) return;
		setBusy(true); setReport('Reading theme files…');
		importThemes().then(({themes: imported, errors}) => {
			if (imported.length) onChange({...state, installed: state.installed.filter((t) => !imported.some((n) => n.id === t.id)).concat(imported).slice(-24)});
			setReport(`${imported.length} theme${imported.length === 1 ? '' : 's'} imported.${errors.length ? ' ' + errors.join(' · ') : imported.length ? ' Select a theme to apply it.' : ' Copy a theme JSON file into the folder below, then import again.'}`);
		}).catch((e) => setReport(String(e.message))).then(() => setBusy(false));
	};
	return <DashboardPanel initialFocusId={state.active} onHighlight={highlight} title="Themes" eyebrow="Make it your dashboard" onClose={onClose} actions={themes.map((t) => ({id: t.id, label: t.name, detail: t.description, value: state.active === t.id ? 'Active' : t.layout === 'blades' ? 'Blades' : t.layout==='hearth' ? 'Hearth Plus' : 'Original', run: () => apply(t.id)})).concat([{id: 'sounds', label: 'Navigation sounds', detail: 'Original MC360 blade slides, cursor, select and back sounds.', value: sound ? 'On' : 'Off', run: () => { setSoundsEnabled(!sound); setSound(!sound); if (!sound) playNavigationSound('select'); }}, {id: 'import', label: busy ? 'Importing…' : 'Install themes from storage', detail: THEME_FOLDER, value: '', run: install}, ...(BUILTIN_THEMES.some((t) => t.id === state.active) ? [] : [{id: 'remove', label: 'Remove this custom theme', detail: 'Returns to Hearth · OLED. The theme file is kept.', value: '', run: () => onChange({active: 'black', installed: state.installed.filter((t) => t.id !== state.active)})}])])}>
		<ThemePreview theme={theme} {...previewProps} />
		<p class="theme-preview-caption">{state.active===theme.id?'Currently active':'Preview · Press OK to apply'}</p>
		<h2>{theme.name}</h2><p>{theme.description}</p><p class="dash-muted">By {theme.author} · Theme format v1</p><div class="dash-note"><strong>Install your own</strong><p>Copy a .json theme to <code>{THEME_FOLDER}</code>, then select Install themes from storage. Colours, backgrounds and Original, Hearth Plus or Blades layouts are supported.</p></div>{report && <p role="status">{report}</p>}
	</DashboardPanel>;
}
