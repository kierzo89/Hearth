import type {Track} from './music';
export const SEARCH_HISTORY_KEY = 'hearth-music-search-history-v1';
const LIMIT = 20;
export function normalizeSearch (value: string): string { return value.replace(/\s+/g, ' ').trim().slice(0, 120); }
export function readSearchHistory (): string[] {
	try { const raw = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); return Array.isArray(raw) ? uniqueQueries(raw.filter((s): s is string => typeof s === 'string')) : []; }
	catch { return []; }
}
export function uniqueQueries (queries: string[]): string[] {
	const seen = new Set<string>();
	return queries.map(normalizeSearch).filter((q) => { const key = q.toLowerCase(); if (!q || seen.has(key)) return false; seen.add(key); return true; }).slice(0, LIMIT);
}
export function rememberSearch (query: string): string[] {
	const history = uniqueQueries([query].concat(readSearchHistory()));
	try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history)); } catch { /* Search still works if storage is full. */ }
	return history;
}
export function clearSearchHistory (): void { try { localStorage.removeItem(SEARCH_HISTORY_KEY); } catch { /* Storage may be unavailable. */ } }
export interface SearchResults {tracks: Track[]; suggestions: string[];}
export interface LiveSearchState extends SearchResults {query: string; loading: boolean; error: string;}
/** One request at a time, coalescing intermediate keystrokes and rejecting stale replies. */
export function createLiveSearch (load: (query: string) => Promise<SearchResults>, publish: (state: LiveSearchState) => void, delay = 350) {
	let current = '', generation = 0, disposed = false, running = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let queued: {query: string; generation: number} | null = null;
	const cache = new Map<string, SearchResults>();
	const state = (query: string, loading: boolean, results?: SearchResults, error = '') => ({query, loading, tracks: results ? results.tracks : [], suggestions: results ? results.suggestions : [], error});
	const run = async (query: string, version: number) => {
		if (disposed || version !== generation) return;
		if (running) { queued = {query, generation: version}; return; }
		running = true;
		try {
			const result = await load(query);
			cache.set(query, result); if (cache.size > 8) cache.delete(cache.keys().next().value as string);
			if (!disposed && version === generation) publish(state(query, false, result));
		} catch (error) { if (!disposed && version === generation) publish(state(query, false, undefined, (error as Error).message)); }
		finally { running = false; const next = queued; queued = null; if (next && !disposed) run(next.query, next.generation); }
	};
	return {
		setQuery (value: string, immediate = false) {
			const query = normalizeSearch(value);
			if (query === current && !immediate) return;
			current = query; const version = ++generation;
			if (timer !== undefined) clearTimeout(timer); queued = null;
			if (disposed) return;
			if (!query) { publish(state('', false)); return; }
			const cached = cache.get(query);
			publish(state(query, !cached, cached)); if (cached) return;
			timer = setTimeout(() => run(query, version), immediate ? 0 : delay);
		},
		dispose () { disposed = true; generation++; queued = null; if (timer !== undefined) clearTimeout(timer); }
	};
}
