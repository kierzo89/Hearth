import {useLayoutEffect, useMemo, useRef} from 'preact/hooks';
import {Blades} from './Blades';
import {HearthHome} from './HearthHome';
import {Home, type Appearance} from '../screens/Home';
import type {TileModel} from '../components/Tile';
import type {TimeFormat} from '../lib/clock';
import type {WallpaperConfig} from '../lib/storage';
import {readWallpaperCache, wallpaperCacheId} from '../lib/wallpaper';
import {THEMES} from '../theme/tokens';
import type {DashboardTheme} from './themes';
const noop = () => undefined;
const silentPlayer = {playbackId:0,track:null,playing:false,loading:false,current:0,duration:0,error:''};
export interface ThemePreviewProps {items: TileModel[]; appearance: Appearance; timeFormat: TimeFormat; wallpaper: WallpaperConfig;}

/** The actual home layouts, scaled down and isolated from saved settings and input. */
export function ThemePreview({theme,items,appearance,timeFormat,wallpaper}: ThemePreviewProps & {theme: DashboardTheme}) {
	const root=useRef<HTMLDivElement>(null);
	const picture=useMemo(()=>readWallpaperCache(wallpaperCacheId(wallpaper.mode,wallpaper.path)),[wallpaper.mode,wallpaper.path]);
	const colors={...THEMES[theme.base],...theme.palette};
	const style:Record<string,string>={'--dashboard-accent':theme.accent};
	for(const key of Object.keys(colors))style['--color-'+key.replace(/([A-Z])/g,'-$1').toLowerCase()]=(colors as unknown as Record<string,string>)[key];
	// Also keep the original/Hearth Plus layouts out of keyboard tab traversal.
	useLayoutEffect(()=>{if(root.current)root.current.querySelectorAll('button').forEach(b=>{b.tabIndex=-1;});});
	const common={items,timeFormat,appearance,active:true,inputActive:false,paused:true,onActivate:noop,onLongPress:noop};
	return <div class="theme-preview" data-preview-theme={theme.id} role="img" aria-label={theme.name+' dashboard preview'} style={style}>
		<div class="theme-preview__canvas" ref={root} aria-hidden="true">
			<div class="wallpaper" style={theme.background==='wallpaper'&&picture?{backgroundImage:`url("${picture}")`,backgroundSize:'cover',backgroundPosition:'center'}:{}} />
			{theme.layout==='blades'?<Blades {...common} preview={true} theme={theme} inputs={[]} wake={0} weather={null} />:
			 theme.layout==='hearth'?<HearthHome {...common} apps={items.filter(t=>!t.key.startsWith('dashboard-')&&!['lg-home','settings','system-settings'].includes(t.key)&&!/^com.webos.app.(hdmi|livetv)/.test(t.key))} inputs={[]} wake={0} weather={null} player={silentPlayer} />:
			 <Home {...common} />}
		</div>
	</div>;
}
