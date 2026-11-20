import { BASE } from '../shot-base.js';

function paperShot() {
  const state = structuredClone(BASE);
  state.cam.followLane = 0;
  state.car.visible = false;
  state.car.dim = 0;
  state.world.backdrop = 0;
  state.ch02 = {assembly: 0};
  return [state];
}

export default {
  p49: paperShot(), p50: paperShot(), p51: paperShot(),
  p52: paperShot(), p53: paperShot(),
};
