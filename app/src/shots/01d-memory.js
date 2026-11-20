import { BASE } from '../shot-base.js';

// A full, independent non-driving state for each single-step memory page.
function paper() {
  const shot = structuredClone(BASE);
  shot.car.visible = false;
  shot.car.dim = 0;
  shot.world.backdrop = 0;
  shot.cam.followLane = 0;
  shot.ch02 = { assembly: 0 };
  return [shot];
}

export default {
  p41: paper(), p42: paper(), p43: paper(), p44: paper(),
  p45: paper(), p46: paper(), p47: paper(), p48: paper(),
};
