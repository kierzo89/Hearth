import {useEffect,useState} from 'preact/hooks';
import {Clock} from '../components/Clock';
import {Row} from '../components/Row';
import type {TileModel} from '../components/Tile';
import type {Appearance} from '../screens/Home';
import type {TimeFormat} from '../lib/clock';
import type {WeatherView} from '../lib/weather';
import {useClock} from '../hooks/useClock';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import type {PlayerState} from './useMusic';
import {mediaTime} from './music';
import {HEARTH_NAV,moveHearthFocus,type HearthFocus} from './hearthNavigation';
export function HearthHome({apps,inputs,timeFormat,appearance,active,inputActive,paused,wake,focus,weather,player,onPlayerFocus,onActivate,onLongPress}:{apps:TileModel[];inputs:TileModel[];timeFormat:TimeFormat;appearance:Appearance;active:boolean;inputActive:boolean;paused:boolean;wake:number;focus?:{key:string;seq:number};weather:WeatherView|null;player:PlayerState;onPlayerFocus?:()=>void;onActivate:(item:TileModel)=>void;onLongPress:(item:TileModel)=>void}) {
	const now=useClock(paused),[section,setSection]=useState<'apps'|'inputs'>('apps');
	const [navigation,setNavigation]=useState<HearthFocus>({zone:'tiles',nav:0,tile:0});
	const list=section==='apps'?apps:inputs,at=Math.max(0,Math.min(navigation.tile,list.length-1));
	const enabled=active&&inputActive;
	useEffect(()=>{setNavigation({zone:'tiles',nav:0,tile:0});setSection('apps');},[wake]);
	useEffect(()=>{if(!focus)return;const app=apps.findIndex(t=>t.key===focus.key),input=inputs.findIndex(t=>t.key===focus.key);if(app>=0){setSection('apps');setNavigation({zone:'tiles',nav:0,tile:app});}else if(input>=0){setSection('inputs');setNavigation({zone:'tiles',nav:1,tile:input});}},[focus&&focus.seq]);
	const openNav=(index:number)=>{const item=HEARTH_NAV[index];if(index<2){setSection(index===0?'apps':'inputs');setNavigation({zone:'tiles',nav:index,tile:0});}else onActivate(item);};
	useKeys(key=>{
		if(key==='down'&&navigation.zone==='tiles'&&onPlayerFocus){onPlayerFocus();return;}
		if(key==='back'){setSection('apps');setNavigation({zone:'tiles',nav:0,tile:0});return;}
		if(key==='left'||key==='right'||key==='up'||key==='down')setNavigation(n=>moveHearthFocus(n,key,list.length));
	},enabled);
	useOkPress({onPress:()=>{if(navigation.zone==='nav')openNav(navigation.nav);else if(list[at])onActivate(list[at]);},onLongPress:()=>{if(navigation.zone==='tiles'&&list[at])onLongPress(list[at]);}},enabled);
	const size=Math.max(120,Math.min(184,Math.round(160*appearance.iconScale/100))),gap=26;
	const clock={...appearance.clock,top:34,left:player.track?32:50,size:Math.max(90,Math.min(156,appearance.clock.size))};
	return <main class={'screen hearth-home'+(!active?' screen--away':'')}>
		<header class="hearth-header"><div class="hearth-wordmark"><span>h</span><strong>hearth<small>PLUS</small></strong></div><nav aria-label="Dashboard sections">{HEARTH_NAV.map((item,i)=><button data-hearth-nav={item.key} class={(enabled&&navigation.zone==='nav'&&navigation.nav===i?'is-focused ':'')+(i===(section==='apps'?0:1)?'is-current':'')} onMouseEnter={()=>setNavigation(n=>({...n,zone:'nav',nav:i}))} onClick={()=>openNav(i)}>{item.label}</button>)}</nav></header>
		<Clock now={now} format={timeFormat} config={clock} weather={weather} />
		{player.track&&<button class="hearth-now" onClick={()=>onActivate({key:'dashboard-music',label:'Music'})} aria-label="Open now playing"><div class="hearth-now__art">{player.track.artwork?<img src={player.track.artwork} alt="" />:'♫'}</div><div class="hearth-now__text"><small>{player.playing?'NOW PLAYING':player.loading?'LOADING':'PAUSED'}</small><strong>{player.track.title}</strong><span>{player.track.artist}</span><div class="music-progress"><i style={{width:(player.duration?Math.min(100,player.current/player.duration*100):0)+'%'}} /></div><small>{mediaTime(player.current)} / {mediaTime(player.duration)}</small></div></button>}
		<section class="hearth-shelf" style={{'--layout-tile-size':size+'px','--layout-tile-gap':gap+'px','--layout-tile-radius':'26px','--font-tile-label':'21px'}}><div class="hearth-shelf__heading"><h2>{section==='apps'?'Your apps':'TV inputs'}</h2><span>{list.length?at+1:0} / {list.length}</span><small>↑ Music, system & themes</small></div><Row items={list} focused={enabled&&navigation.zone==='tiles'} selected={at} tileSize={size} tileGap={gap} viewportWidth={1760} emptyText={section==='apps'?'Choose your apps in Settings → Apps.':'No TV inputs are available.'} onSelect={tile=>setNavigation(n=>({...n,zone:'tiles',tile}))} onActivate={i=>{if(list[i])onActivate(list[i]);}} /></section>
		<footer class="hearth-help">↑ Navigation · ← → Browse · OK Open · Hold OK Options{onPlayerFocus?' · ↓ Player':''}</footer>
	</main>;
}
