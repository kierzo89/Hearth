export const VISUALISER_ROTATION_MS = 3 * 60 * 1000;
/** One clock for both dashboard and fullscreen renderers. Pausing starts a fresh
 * interval on resume; ordinary renders and song changes do not reset it. */
export function createVisualiserRotation(onChange: () => void) {
	let timer: ReturnType<typeof setInterval> | undefined;
	return {
		enable(enabled: boolean) {
			if (enabled && timer === undefined) timer = setInterval(onChange, VISUALISER_ROTATION_MS);
			else if (!enabled && timer !== undefined) { clearInterval(timer); timer = undefined; }
		},
		dispose() { if (timer !== undefined) clearInterval(timer); timer = undefined; }
	};
}
