import { BASE } from '../shot-base.js';

// 原 p9 的完整入页状态；followLane 原本由前面的章节镜头清零。
const piShot = () => {
  const shot = structuredClone(BASE);
  shot.cam.followLane = 0;
  shot.car.visible = false;
  shot.car.dim = 0;
  shot.world.backdrop = 0;
  shot.ch02 = {assembly: 0};
  return shot;
};

export default {
  p9: [piShot()],
  p33: [piShot()],
  p34: [piShot()],
  p35: [piShot()],
};
