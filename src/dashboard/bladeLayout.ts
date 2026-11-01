// Fixed-size sheets slide under their neighbours instead of stretching content.
export const BLADE_SPINE = 72;
export const BLADE_WIDTH = 1920 - BLADE_SPINE * 4;
export const BLADE_OVERLAP = 94;
export function bladeOffset (index: number, selected: number): number {
	return index * BLADE_SPINE + (index > selected ? BLADE_WIDTH - BLADE_SPINE : 0);
}
