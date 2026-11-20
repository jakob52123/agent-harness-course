import { BASE } from '../shot-base.js';

// One entry state per page, generated from the original resolveShots final states.
// Include inherited chapter fields explicitly; no runtime step remapping.
export default {
  p1: [{
    ...structuredClone(BASE),
    cam: {"pos":[-6,4.2,7.5],"look":[0,1,0],"fov":53,"center":[0.75,0.57]},
    car: {"visible":true,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0.2243994752564138,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":3.6,"rim":9,"fill":0.55,"fog":0,"grid":0,"speed":0,"backdrop":1,"props":0,"wrenchSpin":0.24},
  }],
  p2: [{
    ...structuredClone(BASE),
    car: {"visible":true,"gray":0,"pos":[0,0,0],"rotY":-0.18,"speed":0,"spin":0,"silhouette":0,"dim":0,"lit":{"body":0,"driver":0,"engine":0,"steering":0,"windshield":0,"dashcam":0,"nav":0,"brake":0,"wheels":0,"chassis":0,"key":0,"radio":0},"explode":0,"xray":0,"driver":1,"chassisOnly":0,"blink":0,"hideDriver":false},
    world: {"key":4.4,"rim":3.6,"fill":0.55,"fog":0,"grid":0,"speed":0,"backdrop":0,"props":1,"wrenchSpin":0.24},
    insets: [
      {id:'what',rect:[1370,310,220,124],opacity:1,view:'car',cam:{pos:[5,3.8,7.3],look:[0,1,0],fov:24}},
      {id:'why',rect:[1370,466,220,124],opacity:1,view:'chassis',cam:{pos:[19.6,7.8,10.5],look:[18,.25,-1.5],fov:21}},
      {id:'products',rect:[1370,622,220,124],opacity:1,view:'cars',cam:{pos:[19.6,5.8,10.5],look:[18,.65,-1.5],fov:22}},
      {id:'how',rect:[1370,778,220,124],opacity:1,view:'tools',cam:{pos:[-13.5,3.5,8],look:[-16,1.3,0],fov:21}},
    ],
  }],
};
