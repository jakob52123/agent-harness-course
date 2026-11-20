// Chapter files contain authored states; this module only resolves/interpolates them.
import SHOTS from '@chapters/shots';
import { BASE } from './shot-base.js';
export { SHOTS };
export { W, H, PIXEL, BAYER, SHOT_MS, BASE } from './shot-base.js';
export const clone = value => structuredClone(value);
export function merge(base, patch) {
  if (Array.isArray(patch)) {
    if (!patch.length || !patch[0]?.id) return clone(patch);
    const result = clone(base || []);
    for (const item of patch) {
      const index = result.findIndex(x => x.id === item.id);
      if (index < 0) result.push(clone(item));
      else result[index] = merge(result[index], item);
    }
    return result;
  }
  if (patch && typeof patch === 'object') {
    const result = clone(base || {});
    for (const [key, value] of Object.entries(patch)) result[key] = merge(result[key], value);
    return result;
  }
  return patch;
}
export function resolveShots(shots = SHOTS) {
  let state = clone(BASE);
  return Object.fromEntries(Object.entries(shots).map(([id, steps]) => [id, steps.map(patch => {
    state = merge(state, patch);return clone(state);
  })]));
}
export const RESOLVED = resolveShots();
export const ease = t => t * t * (3 - 2 * t);
export function interpolate(a, b, t) {
  if (typeof b === 'number') return (typeof a === 'number' ? a : 0) * (1 - t) + b * t;
  if (Array.isArray(b)) {
    if (b[0]?.id || a?.[0]?.id) {
      const ids = new Set([...(a || []).map(x => x.id), ...b.map(x => x.id)]);
      return [...ids].map(id => {
        const from = a?.find(x => x.id === id), to = b.find(x => x.id === id);
        return interpolate(from || { ...to, opacity: 0 }, to || { ...from, opacity: 0 }, t);
      });
    }
    return b.map((v, i) => interpolate(a?.[i], v, t));
  }
  if (b && typeof b === 'object') {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b)]);
    return Object.fromEntries([...keys].map(k => [k, interpolate(a?.[k], b[k] ?? 0, t)]));
  }
  return b;
}
