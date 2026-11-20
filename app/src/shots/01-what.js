import { BASE, CAM, CAR, EFFECT, DRIVE, lit } from '../shot-base.js';

// One front/passenger-side tracking shot: constant angle, distance and FOV.
// It follows lateral translation, never the Loop beat or steering yaw. The
// road/other lane move in frame; cockpit, forward gate and field remain visible.
const CHASE={pos:[14,32,24],look:[0,1,0],fov:13.7,center:[.825,.40],followLane:1};
const ENGINE={pos:[24,30,4],look:[0,.8,0],fov:16,center:[.83,.60],followLane:0};
const PARTS_CHASE={...CHASE,center:[.825,.60]};
const driving=()=>({...DRIVE,active:true});
export default {
  c1:[{
    cam:{...CAM,pos:[-6,4.2,7.5],fov:43.5,center:[.75,.58]},
    car:{...CAR,blink:1,dim:0},effect:EFFECT,
    world:{key:4.8,rim:3.6,backdrop:1,fog:0,grid:0,props:0},insets:[],
  }],
  p3:[{
    cam:{...ENGINE,fov:11.7,center:[.736,.648]},car:{...CAR,rotY:0,dim:0,speed:3},effect:EFFECT,drive:driving(),
    world:{backdrop:1,fog:.002,grid:0,speed:0},insets:[],
  },
  {car:{gray:1,lit:lit({driver:1})}},
  {car:{gray:0,dim:0,lit:lit({driver:1,body:.55,wheels:.35,chassis:.35,engine:.35,steering:.35,windshield:.35,dashcam:.35,nav:.35,brake:.35})}},
  {car:{driver:2}}],
  c2:[{
    ...structuredClone(BASE),
    cam:{...CAM,pos:[-6,4.2,7.5],fov:43.5,center:[.75,.58],followLane:0},
    car:{...CAR,gray:0,dim:0,blink:1},
    world:{...BASE.world,key:4.8,rim:3.6,backdrop:1,fog:0,grid:0},
    ch02:{assembly:0},
  }],
  p4:[{
    cam:PARTS_CHASE,car:{...CAR,rotY:0,gray:1,dim:0,speed:3},effect:EFFECT,drive:driving(),
    world:{backdrop:1,fog:.002,grid:0,speed:0},insets:[],
  },
  {car:{lit:lit({driver:1})}},
  {car:{xray:.12,lit:lit({steering:1})},drive:{lane:'tools'}},
  {cam:{pos:[-16,11,20],look:[0,1,0],fov:21,center:[.82,.61],followLane:1},
    car:{xray:0,lit:lit({windshield:1})},drive:{lane:0,beam:true}},
  {car:{lit:lit({dashcam:1})},drive:{beam:false,trail:true}},
  {cam:PARTS_CHASE,car:{lit:lit()},drive:{trail:false,loop:true}},
  {cam:{pos:[1.5,8,23],look:[0,1.8,0],fov:40.5,center:[.825,.58],followLane:0},
    car:{gray:1,explode:1,xray:0,hideDriver:true,speed:0,lit:lit({engine:1,steering:1,windshield:1,dashcam:1,nav:1,brake:1})},
    drive:{gate:'',speed:0,loop:false}}],
  p32:[{
    ...structuredClone(BASE),
    cam:{...CAM,pos:[-7,5,9],fov:46,center:[.76,.41],followLane:0},
    car:{...CAR,visible:true,gray:0,dim:0},
    world:{...BASE.world,key:4.8,rim:3.6,backdrop:1,fog:.002,grid:0},
    ch02:{assembly:0},
  }],
  p5:[{
    cam:ENGINE,car:{...CAR,rotY:0,gray:1,dim:0,xray:.95,speed:3,lit:lit({engine:1})},effect:EFFECT,
    drive:{...driving(),engine:true,speed:4},world:{backdrop:.82,grid:0,speed:0},insets:[],
  },
  {cam:CHASE,car:{xray:0,lit:lit({windshield:1})},drive:{engine:false,beam:true,speed:3}},
  {car:{lit:lit({driver:1})},drive:{beam:false}},
  {car:{lit:lit()},drive:{loop:true}},
  {world:{backdrop:0},effect:EFFECT}],
  p6:[{
    cam:CHASE,car:{...CAR,rotY:0,gray:1,dim:0,speed:3},effect:EFFECT,drive:driving(),
    world:{backdrop:.82,grid:0,speed:0},insets:[],
  },
  {car:{gray:1,lit:lit({windshield:1})},drive:{beam:true}},
  {car:{lit:lit({driver:1})},drive:{beam:false}},
  {car:{xray:.88,lit:lit({brake:1})},drive:{gate:'pass'}},
  {car:{xray:.12,lit:lit({steering:1})},drive:{gate:'',lane:1}},
  {car:{xray:0,lit:lit({windshield:1})},drive:{beam:true}},
  {car:{lit:lit({dashcam:1})},drive:{beam:false,trail:true}}],
};
