import {useEffect,useRef} from 'preact/hooks';
export function useGuideShortcut(canHold:boolean,open:boolean,onOpen:()=>void) {
	const latest=useRef({canHold,open,onOpen});latest.current={canHold,open,onOpen};
	useEffect(()=>{
		let timer=0,holding=false,fired=false,blue=false;
		const clear=()=>{clearTimeout(timer);holding=false;fired=false;blue=false;};
		const eat=(e:KeyboardEvent)=>{e.preventDefault();e.stopImmediatePropagation();};
		const down=(e:KeyboardEvent & {hearthReplay?:boolean})=>{
			if(e.hearthReplay||document.hidden||latest.current.open)return;
			if(e.keyCode===406){eat(e);if(!e.repeat){blue=true;latest.current.onOpen();}return;}
			if(e.keyCode!==461||!latest.current.canHold)return;eat(e);if(holding||e.repeat)return;holding=true;
			timer=window.setTimeout(()=>{fired=true;latest.current.onOpen();},650);
		};
		const up=(e:KeyboardEvent)=>{
			if(e.keyCode===406&&blue){blue=false;eat(e);return;}
			if(e.keyCode!==461||!holding)return;eat(e);clearTimeout(timer);holding=false;
			if(!fired){const replay=new KeyboardEvent('keydown',{keyCode:461,which:461,bubbles:true,cancelable:true});Object.defineProperty(replay,'hearthReplay',{value:true});window.dispatchEvent(replay);}fired=false;
		};
		window.addEventListener('keydown',down,true);window.addEventListener('keyup',up,true);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
		return()=>{clear();window.removeEventListener('keydown',down,true);window.removeEventListener('keyup',up,true);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);};
	},[]);
}
