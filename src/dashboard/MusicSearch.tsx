import {useEffect, useRef, useState} from 'preact/hooks';
import {useKeys} from '../hooks/useKeys';
import {useOkPress} from '../hooks/useOkPress';
import {musicRequest, type MusicConnection, type Track} from './music';
import {clearSearchHistory, createLiveSearch, normalizeSearch, readSearchHistory, rememberSearch, uniqueQueries, type LiveSearchState} from './search';
import {TrackMenu} from './QueuePanel';
import type {MusicPlayer} from './useMusic';
type Zone = 'input' | 'suggestions' | 'results' | 'clear';
export function MusicSearch ({connection, player, initialQuery, onQuery, onClose, notify}: {notify:(s:string)=>void; connection: MusicConnection; player: MusicPlayer; initialQuery: string; onQuery: (query: string) => void; onClose: () => void}) {
	const [options,setOptions]=useState<Track|null>(null);
	const [query, setQuery] = useState(initialQuery);
	const [history, setHistory] = useState(readSearchHistory);
	const [state, setState] = useState<LiveSearchState>({query: '', loading: false, tracks: [], suggestions: [], error: ''});
	const [zone, setZone] = useState<Zone>('input');
	const [suggestionIndex, setSuggestionIndex] = useState(0);
	const [resultIndex, setResultIndex] = useState(0);
	const input = useRef<HTMLInputElement>(null);
	const engine = useRef<ReturnType<typeof createLiveSearch> | null>(null);
	const normalized = normalizeSearch(query);
	const recent = history.filter((q) => !normalized || q.toLowerCase().indexOf(normalized.toLowerCase()) >= 0);
	const choices = uniqueQueries(recent.concat(state.suggestions)).slice(0, 8);
	const selectedSuggestion = Math.min(suggestionIndex, Math.max(0, choices.length - 1));
	const selectedResult = Math.min(resultIndex, Math.max(0, state.tracks.length - 1));
	useEffect(() => {
		const live = createLiveSearch(async (q) => {
			const values = await Promise.all([
				musicRequest<{tracks: Track[]}>(connection, '/search?q=' + encodeURIComponent(q)),
				musicRequest<{suggestions: string[]}>(connection, '/suggest?q=' + encodeURIComponent(q)).catch(() => ({suggestions: []}))
			]);
			return {tracks: values[0].tracks, suggestions: values[1].suggestions};
		}, (next) => { setState(next); setResultIndex(0); setSuggestionIndex(0); });
		engine.current = live; live.setQuery(initialQuery);
		if (input.current) input.current.focus();
		return () => { live.dispose(); engine.current = null; };
	}, [connection]);
	const changeQuery = (value: string) => { setQuery(value); onQuery(value); if (engine.current) engine.current.setQuery(value); };
	const focusInput = () => { setZone('input'); if (input.current) input.current.focus(); };
	const leaveInput = (next: Zone) => { if (input.current) input.current.blur(); setZone(next); };
	const commit = (value: string) => {
		const term = normalizeSearch(value); if (!term) return;
		setQuery(term); onQuery(term); setHistory(rememberSearch(term));
		if (engine.current) engine.current.setQuery(term, true);
		setResultIndex(0); leaveInput('results');
	};
	const play = (index: number) => {
		if (state.loading || state.query !== normalized || !state.tracks[index]) return;
		setHistory(rememberSearch(normalized)); player.play(state.tracks, index, connection); setZone('results');
	};
	const clearRecent = () => { clearSearchHistory(); setHistory([]); setSuggestionIndex(0); if (state.suggestions.length) setZone('suggestions'); else focusInput(); };
	useKeys((key) => {
		if (key === 'back') { if (zone === 'input') leaveInput(choices.length ? 'suggestions' : 'results'); else onClose(); return true; }
		if (zone === 'input') { if (key === 'down') { leaveInput(choices.length ? 'suggestions' : 'results'); return true; } return false; }
		if (key === 'up') {
			if (zone === 'clear') { setZone('suggestions'); setSuggestionIndex(Math.max(0, choices.length - 1)); }
			else if (zone === 'suggestions' && selectedSuggestion > 0) setSuggestionIndex(selectedSuggestion - 1);
			else if (zone === 'results' && selectedResult > 0) setResultIndex(selectedResult - 1);
			else focusInput();
		} else if (key === 'down') {
			if (zone === 'suggestions') { if (selectedSuggestion + 1 < choices.length) setSuggestionIndex(selectedSuggestion + 1); else if (history.length) setZone('clear'); }
			else if (zone === 'results') setResultIndex(Math.min(Math.max(0, state.tracks.length - 1), selectedResult + 1));
		} else if (key === 'right' && zone !== 'results') { setZone('results'); }
		else if (key === 'left' && zone === 'results') { if (choices.length) setZone('suggestions'); else focusInput(); }
		return true;
	},!options);
	useOkPress({onPress: () => { if (zone === 'suggestions' && choices[selectedSuggestion]) commit(choices[selectedSuggestion]); else if (zone === 'results') play(selectedResult); else if (zone === 'clear') clearRecent(); }, onLongPress: () => {if(zone==='results'&&!state.loading&&state.tracks[selectedResult])setOptions(state.tracks[selectedResult]);}}, zone !== 'input'&&!options);
	const suggestionStart = Math.max(0, selectedSuggestion - 5), resultStart = Math.max(0, selectedResult - 4);
	if(options)return <TrackMenu track={options} connection={connection} player={player} onClose={()=>setOptions(null)} notify={notify} onPlay={()=>player.play([options],0,connection)} />;
	return <div class="dash-screen music-search-screen">
		<header class="dash-header"><div><div class="dash-eyebrow">Find your next track</div><h1>Search music</h1></div><button class="dash-back" onClick={onClose}>Back to music</button></header>
		<form class="music-search-bar" onSubmit={(e) => { e.preventDefault(); commit(query); }}><input ref={input} value={query} maxLength={120} placeholder="Search songs or artists" aria-label="Search songs or artists" onFocus={() => setZone('input')} onInput={(e) => changeQuery(e.currentTarget.value)} /><button type="submit">Search</button></form>
		<div class="music-search-columns"><section class="music-search-queries"><h2>{normalized ? 'Suggestions & recent searches' : 'Recent searches on this TV'}</h2>
			{choices.slice(suggestionStart, suggestionStart + 6).map((q, j) => <button key={q} class={'search-query' + (zone === 'suggestions' && selectedSuggestion === suggestionStart + j ? ' is-focused' : '')} onMouseEnter={() => { setZone('suggestions'); setSuggestionIndex(suggestionStart + j); }} onClick={() => commit(q)}><span><svg viewBox="0 0 24 24" aria-hidden="true">{history.some((h) => h.toLowerCase() === q.toLowerCase()) ? <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></> : <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>}</svg></span><strong>{q}</strong></button>)}
			{!choices.length && <p class="search-empty">{normalized ? 'Suggestions will appear as you type.' : 'Your recent searches will appear here. Start typing to find music.'}</p>}
			{!!history.length && <button class={'search-clear' + (zone === 'clear' ? ' is-focused' : '')} onClick={clearRecent} onMouseEnter={() => setZone('clear')}>Clear search history</button>}
		</section><section class="music-search-results" aria-busy={state.loading}><div class="music-search-results__heading"><h2>{normalized ? 'Songs' : 'Search as you type'}</h2><span role="status">{state.loading ? 'Searching…' : state.error ? 'Could not search' : state.tracks.length ? state.tracks.length + ' results' : ''}</span></div>
			{state.tracks.slice(resultStart, resultStart + 5).map((track, j) => <div key={track.id + '-' + j} class="search-track-row"><button disabled={state.loading} data-track-id={track.id} class={'search-track' + (zone === 'results' && selectedResult === resultStart + j ? ' is-focused' : '')} onMouseEnter={() => { setZone('results'); setResultIndex(resultStart + j); }} onClick={() => play(resultStart + j)}>{track.artwork && <img src={track.artwork} alt="" />}<span><strong>{track.title}</strong><small>{track.artist}</small></span><b>{track.duration}</b><i>▶</i></button><button class="search-track-more" disabled={state.loading} aria-label={'Options for '+track.title} onClick={()=>setOptions(track)}>•••</button></div>)}
			{!state.tracks.length && <p class="search-empty">{state.error || (state.loading ? 'Finding songs…' : normalized ? 'No songs found. Try another name or spelling.' : 'Song results update automatically—no need to press Search.')}</p>}
		</section></div>
		<footer class="music-search-footer">↓ Browse suggestions · → Songs · OK Select / play · Hold OK Song options · Back Return{player.state.track && <span>{player.state.playing ? '♫ Playing: ' : 'Ⅱ Paused: '}{player.state.track.title}</span>}</footer>
	</div>;
}
