import type {ComponentChildren} from 'preact';
import {useLayoutEffect, useState} from 'preact/hooks';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {playNavigationSound} from './sounds';
export interface PanelAction {id: string; label: string; detail?: string; artwork?: string; value?: string; disabled?: boolean; run: () => void; more?: () => void; adjust?: (direction: number) => void;}
export interface PanelFocus {id: string; seq: number;}
export function DashboardPanel ({title, eyebrow, children, actions, onClose, active = true, focusRequest, initialFocusId, onHighlight, backLabel = 'Back to dashboard'}: {title: string; eyebrow: string; children?: ComponentChildren; actions: PanelAction[]; onClose: () => void; active?: boolean; focusRequest?: PanelFocus; initialFocusId?: string; onHighlight?: (id: string) => void; backLabel?: string}) {
	const [selectedId, setSelectedId] = useState(initialFocusId || (actions.length ? actions[0].id : ''));
	const selected = Math.max(0, actions.findIndex((a) => a.id === selectedId));
	const item = actions[selected];
	useLayoutEffect(() => { if (item && onHighlight) onHighlight(item.id); }, [item && item.id, onHighlight]);
	useLayoutEffect(() => { if (focusRequest) setSelectedId(focusRequest.id); }, [focusRequest && focusRequest.seq]);
	const close = () => { playNavigationSound('back'); onClose(); };
	const select = (action: PanelAction) => { if (!action.disabled) { playNavigationSound('select'); action.run(); } };
	const focus = (id: string) => { if (id !== selectedId) { playNavigationSound('cursor'); setSelectedId(id); } };
	useKeys((key) => {
		if (key === 'back') close();
		else if (key === 'up' || key === 'down') { const index = Math.max(0, Math.min(actions.length - 1, selected + (key === 'up' ? -1 : 1))); if (actions[index]) focus(actions[index].id); }
		else if(key==='right'&&item&&!item.disabled&&item.more) item.more();
		else if ((key === 'left' || key === 'right') && item && !item.disabled && item.adjust) item.adjust(key === 'left' ? -1 : 1);
	}, active);
	useOkPress({onPress: () => { if (item) select(item); }, onLongPress: () => { if(item&&!item.disabled&&item.more)item.more(); }}, active);
	const start = Math.max(0, Math.min(selected - 2, actions.length - 6));
	return <div class="dash-screen"><header class="dash-header"><div><div class="dash-eyebrow">{eyebrow}</div><h1>{title}</h1></div><button class="dash-back" onClick={close}>{backLabel}</button></header>
		<div class="dash-columns"><div class="dash-actions">{actions.slice(start, start + 6).map((a, j) => <div key={a.id} class="dash-action-row"><button data-action-id={a.id} disabled={a.disabled} class={'dash-action' + (start + j === selected ? ' is-focused' : '')} onMouseEnter={() => focus(a.id)} onClick={() => { setSelectedId(a.id); select(a); }}><>{a.artwork && <span class="dash-action__art"><img src={a.artwork} alt="" onLoad={(e) => { e.currentTarget.style.visibility = ''; }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /></span>}</><span class="dash-action__text"><strong>{a.label}</strong>{a.detail && <small>{a.detail}</small>}</span>{a.value && <b>{a.value}</b>}<span class="dash-arrow">›</span></button>{a.more&&<button class="dash-action-more" aria-label={'Options for '+a.label} onClick={a.more}>•••</button>}</div>)}<p class="dash-list-count">{actions.length ? selected + 1 : 0} / {actions.length} · ↑ ↓ navigate · OK select · Back return{item&&item.more ? ' · Hold OK / → Song options' : ''}</p></div><div class="dash-detail">{children}</div></div>
	</div>;
}
