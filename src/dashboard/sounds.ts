/** Navigation cues, with optional local WAV overrides, mixed separately from music. */
type Sound = 'cursor' | 'select' | 'back' | 'bladeslide_1' | 'bladeslide_2' | 'bladeslide_3' | 'bladeslide_4';
export const SOUND_KEY = 'hearth-navigation-sounds-v1';
const names: Sound[] = ['cursor', 'select', 'back', 'bladeslide_1', 'bladeslide_2', 'bladeslide_3', 'bladeslide_4'];
let context: AudioContext | null = null;
const buffers: Partial<Record<Sound, AudioBuffer>> = {};
const pending: Partial<Record<Sound, Promise<AudioBuffer>>> = {};
const voices: AudioBufferSourceNode[] = [];
let lastCursor = 0;
export function soundsEnabled (): boolean { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } }
export function setSoundsEnabled (enabled: boolean): void { try { localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); } catch { /* Storage may be unavailable. */ } }
function synthesise (name: Sound): AudioBuffer {
	const audio = context!;
	const slide = name.indexOf('bladeslide') === 0;
	const duration = slide ? .18 : .065;
	const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
	const data = buffer.getChannelData(0);
	const frequency = name === 'back' ? 340 : name === 'select' ? 740 : 520;
	for (let i = 0; i < data.length; i++) {
		const t = i / audio.sampleRate, progress = t / duration;
		const envelope = Math.sin(Math.PI * progress) * (1 - progress);
		data[i] = .22 * envelope * Math.sin(2 * Math.PI * (frequency * t + (slide ? 900 * t * t : 0)));
	}
	return buffer;
}
function load (name: Sound): Promise<AudioBuffer> {
	if (buffers[name]) return Promise.resolve(buffers[name]!);
	if (pending[name]) return pending[name]!;
	pending[name] = new Promise<AudioBuffer>((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open('GET', './mc360/' + name + '.wav'); request.responseType = 'arraybuffer'; request.timeout = 8000;
		request.onload = () => { if ((request.status === 0 || request.status === 200) && request.response && context) context.decodeAudioData(request.response, (buffer) => { buffers[name] = buffer; resolve(buffer); }, reject); else reject(new Error('Sound unavailable')); };
		request.onerror = request.ontimeout = () => reject(new Error('Sound unavailable')); request.send();
	}).catch(() => { const buffer = synthesise(name); buffers[name] = buffer; return buffer; });
	return pending[name]!;
}
export function prepareSounds (): void {
	try { if (!context) context = new AudioContext(); names.forEach((name) => { void load(name).catch(() => undefined); }); } catch { /* Navigation remains usable without Web Audio. */ }
}
export function playNavigationSound (name: Sound): void {
	if (document.hidden || document.documentElement.getAttribute('data-dashboard-layout') !== 'blades' || !soundsEnabled()) return;
	const now = Date.now(); if (name === 'cursor' && now - lastCursor < 70) return;
	if (name === 'cursor') lastCursor = now;
	prepareSounds(); if (!context) return;
	const audio = context; void audio.resume().catch(() => undefined);
	void load(name).then((buffer) => {
		// Don't play stale input after a slow initial load or after leaving Hearth.
		if (Date.now() - now > 250 || document.hidden || !soundsEnabled() || document.documentElement.getAttribute('data-dashboard-layout') !== 'blades') return;
		while (voices.length >= 3) { const oldest = voices.shift(); if (oldest) { try { oldest.stop(); } catch { /* Already ended. */ } } }
		const source = audio.createBufferSource(), gain = audio.createGain(); source.buffer = buffer; gain.gain.value = .45;
		source.connect(gain); gain.connect(audio.destination); voices.push(source);
		source.onended = () => { const at = voices.indexOf(source); if (at >= 0) voices.splice(at, 1); source.disconnect(); gain.disconnect(); };
		source.start();
	}).catch(() => undefined);
}
export function playBladeSound (section: number): void { playNavigationSound(names[3 + section % 4]); }
