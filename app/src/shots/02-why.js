import { BASE } from '../shot-base.js';

// One entry state per page, generated from the original resolveShots final states.
// Include inherited chapter fields explicitly; no runtime step remapping.
export default {
  c3: [{
    ...structuredClone(BASE),
    cam: {"pos":[-6,4.2,7.5],"look":[0,1,0],"fov":43.5,"center":[0.75,0.58],"followLane":0},
    car: {"visible":true,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":1,"hideDriver":false},
    world: {"key":4.8,"rim":3.6,"fill":0.55,"fog":0,"grid":0,"speed":0,"backdrop":1,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":0},
  }],
  p8: [{
    ...structuredClone(BASE),
    cam: {"pos":[15,11,28],"look":[0,1,0],"fov":42,"center":[0.89,0.59]},
    car: {"visible":false,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.06,"speed":0,"backdrop":0,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":0},
  }],
  p9: [{
    ...structuredClone(BASE),
    car: {"visible":false,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.18,"speed":0,"backdrop":0,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":0},
  }],
  p10: [{
    ...structuredClone(BASE),
    car: {"visible":false,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.18,"speed":0,"backdrop":0,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":0},
  }],
  p11: [{
    ...structuredClone(BASE),
    car:{...structuredClone(BASE.car),visible:false,dim:0},
    world:{...BASE.world,backdrop:0},
    ch02: {"assembly":0},
  }],
};
