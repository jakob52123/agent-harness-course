import { BASE } from '../shot-base.js';

function paperShot() {
  const shot = structuredClone(BASE);
  Object.assign(shot.car, { visible: false, dim: 0 });
  shot.cam.followLane = 0;
  shot.world.backdrop = 0;
  shot.ch02 = { assembly: 0 };
  return [shot];
}

export default {
  p36: paperShot(),
  p37: paperShot(),
  p38: paperShot(),
  p39: paperShot(),
  p40: paperShot(),
};
