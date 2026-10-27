import {useEffect,useRef,useState} from 'preact/hooks';
import {createIdleClock} from './idle';
export function useIdleVisualiser(enabled:boolean,seconds:number):boolean {
	const [active,setActive]=useState(false),clock=useRef<ReturnType<typeof createIdleClock>|null>(null),allowed=useRef(enabled);allowed.current=enabled;
	useEffect(()=>{
		const idle=createIdleClock(seconds,setActive);clock.current=idle;setActive(false);idle.enable(allowed.current&&!document.hidden);
		const swallowed=new Set<number>();let pointerWake=false;
		const consume=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
		const keydown=(e:KeyboardEvent)=>{if(swallowed.has(e.keyCode)){consume(e);return;}if(idle.activity()){swallowed.add(e.keyCode);consume(e);}};
		const keyup=(e:KeyboardEvent)=>{if(swallowed.delete(e.keyCode))consume(e);};
		const down=(e:Event)=>{pointerWake=idle.activity();if(pointerWake)consume(e);};
		const click=(e:Event)=>{if(pointerWake){pointerWake=false;consume(e);}else if(idle.activity())consume(e);};
		const move=()=>{idle.activity();};
		const visibility=()=>idle.enable(allowed.current&&!document.hidden);
		window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);window.addEventListener('mousedown',down,true);window.addEventListener('touchstart',down,true);window.addEventListener('click',click,true);window.addEventListener('mousemove',move,true);window.addEventListener('wheel',down,true);document.addEventListener('visibilitychange',visibility);
		return()=>{idle.dispose();clock.current=null;window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup,true);window.removeEventListener('mousedown',down,true);window.removeEventListener('touchstart',down,true);window.removeEventListener('click',click,true);window.removeEventListener('mousemove',move,true);window.removeEventListener('wheel',down,true);document.removeEventListener('visibilitychange',visibility);};
	},[seconds]);
	useEffect(()=>{if(clock.current)clock.current.enable(enabled&&!document.hidden);},[enabled]);
	return active;
}
