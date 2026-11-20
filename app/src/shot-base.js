// 1920 × 1080 design coordinates. Angles: radians; speed: world units/s.
// cam.center is the optical target's position on the slide, in normalized coordinates.
export const W = 1920, H = 1080;
export const PIXEL = 3;
export const BAYER = false;
export const SHOT_MS = 1200;
export const lit = (values = {}) => ({body:0,driver:0,engine:0,steering:0,windshield:0,dashcam:0,nav:0,brake:0,wheels:0,chassis:0,key:0,radio:0,...values});
export const CAR = {visible:true,pos:[0,0,0],rotY:-.18,speed:0,spin:0,silhouette:0,gray:0,dim:.4,lit:lit(),explode:0,xray:0,driver:1,chassisOnly:0,blink:0,hideDriver:false};
export const EFFECT = {part:'',duration:2.4,count:1};
// Driving is opt-in and additionally confined to p3–p6 by world.setShot.
export const DRIVE = {active:false,speed:3,lane:0,beam:false,trail:false,route:false,gate:'',engine:false,loop:false};
export const CAM = {pos:[6.5,4.7,10.5],look:[0,1,0],fov:42,center:[.815,.59]};
export const BASE = {
  cam:CAM,view:'car',car:CAR,effect:EFFECT,drive:DRIVE,
  idle:{amplitude:.03,period:1.5},
  world:{key:4.4,rim:3.6,fill:.55,fog:.018,grid:.18,speed:0,backdrop:.72,props:0,wrenchSpin:.24},
  insets:[],
};

// Full reset: safe even when the preceding chapter is omitted from a preview.
export const chapterShot = () => ({
  ...structuredClone(BASE),
  cam:{...CAM,pos:[7.4,4.9,11.5],center:[.815,.61]},
  car:{...structuredClone(CAR),blink:1,dim:.3},
  world:{...BASE.world,key:4.8,rim:3.6,backdrop:.72,grid:.15,props:0},
});

