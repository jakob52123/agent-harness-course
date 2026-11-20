import { BASE } from '../shot-base.js';

// One entry state per page, generated from the original resolveShots final states.
// Include inherited chapter fields explicitly; no runtime step remapping.
export default {
  c4: [{
    ...structuredClone(BASE),
    cam: {"pos":[-6,4.2,7.5],"look":[0,1,0],"fov":43.5,"followLane":0,"center":[0.75,0.58]},
    car: {"visible":true,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":1,"hideDriver":false},
    world: {"key":4.8,"rim":3.6,"fill":0.55,"fog":0,"grid":0,"speed":0,"backdrop":1,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p21: [{
    ...structuredClone(BASE),
    cam: {"pos":[8.5,6.2,14.5],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.815,0.62]},
    car: {"visible":false,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0,"speed":0,"backdrop":0,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p23: [{
    ...structuredClone(BASE),
    cam: {"pos":[10.8,7.8,18.6],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.805,0.705]},
    car: {"visible":true,"gray":1,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":1,"dashcam":1,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0.62,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p22: [{
    ...structuredClone(BASE),
    cam: {"pos":[13,9.3,21],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.795,0.675]},
    car: {"visible":true,"gray":1,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":1,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0.62,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p25: [{
    ...structuredClone(BASE),
    cam: {"pos":[10.6,7.7,18],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.8,0.5]},
    car: {"visible":true,"gray":1,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":1,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0.8,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0.62,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p24: [{
    ...structuredClone(BASE),
    cam: {"pos":[11.6,8.4,20],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.812,0.37]},
    car: {"visible":true,"gray":1,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":1,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0.62,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p26: [{
    ...structuredClone(BASE),
    cam: {"pos":[8.5,6.2,14.5],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.815,0.62]},
    car: {"visible":false,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":1,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0.75,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
  p20: [{
    ...structuredClone(BASE),
    cam: {"pos":[8.5,6.2,14.5],"look":[0,1,0],"fov":42,"followLane":0,"center":[0.815,0.62]},
    car: {"visible":true,"gray":1,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0.75,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0.018,"grid":0.08,"speed":0,"backdrop":0.62,"props":0,"wrenchSpin":0.24},
    ch02: {"assembly":1},
  }],
};
