"use strict";

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
let players=1, game=null, sound=true;

const AudioEngine={
 ctx:null,
 init(){if(!this.ctx){const A=window.AudioContext||window.webkitAudioContext;if(A)this.ctx=new A()}
 if(this.ctx&&this.ctx.state==="suspended")this.ctx.resume()},
 beep(f=440,d=.07,type="sine"){if(!sound)return;try{this.init();if(!this.ctx)return;
 const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;
 o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.08,t);
 g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+d)}catch(e){}},
 shot(){this.beep(130,.08,"square");setTimeout(()=>this.beep(90,.05,"sawtooth"),25)},
 hit(){this.beep(250,.05,"sine")},
 win(){[523,659,784].forEach((f,i)=>setTimeout(()=>this.beep(f,.16,"triangle"),i*120))}
};

$$(".mode").forEach(b=>b.onclick=()=>{
 $$(".mode").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");
 players=+b.dataset.players;
 AudioEngine.beep(560,.05,"triangle")
});

$("#tankCard").onclick=()=>startGame();
$("#quickCard").onclick=()=>startGame();

function showGame(){
 $("#menuScreen").classList.remove("active");
 $("#gameScreen").classList.add("active");
}

function showMenu(){
 if(game)game.stop();
 game=null;
 $("#gameScreen").classList.remove("active");
 $("#menuScreen").classList.add("active");
 $("#modal").classList.remove("show");
}

$("#backBtn").onclick=showMenu;
$("#menuBtn").onclick=showMenu;

$("#soundBtn").onclick=()=>{
 sound=!sound;
 $("#soundBtn").textContent=sound?"🔊":"🔇";
};

class ArenaGame{
 constructor(canvas,humanCount){
  this.c=canvas;
  this.x=canvas.getContext("2d");
  this.hum=humanCount;
  this.running=false;
  this.round=0;
  this.rounds=3;
  this.bullets=[];
  this.parts=[];
  this.floaters=[];
  this.keys={};
  this.bonus=null;
  this.bonusTimer=0;

  this.maps=[
   {
    name:"INDUSTRIAL",
    bg:"#3e3e43",
    grid:"#57575d",
    wall:"#ddd7ce",
    accent:"#b98232",
    plant:"#6d8e2a"
   },
   {
    name:"TEMPLE",
    bg:"#a88961",
    grid:"#c4a979",
    wall:"#d9d1bf",
    accent:"#a96218",
    plant:"#43852d"
   },
   {
    name:"ICE BASE",
    bg:"#3e4675",
    grid:"#555e92",
    wall:"#a9b6c5",
    accent:"#89a9bc",
    plant:"#4f8e78"
   }
  ];

  this.map=this.maps[0];
  this.tanks=[];
  this.w=0;
  this.h=0;
  this.resize();
  this.buildRound();
 }

 resize(){
  const r=this.c.parentElement.getBoundingClientRect();
  const d=devicePixelRatio||1;

  this.w=r.width;
  this.h=r.height;

  this.c.width=Math.floor(this.w*d);
  this.c.height=Math.floor(this.h*d);

  this.x.setTransform(d,0,0,d,0,0);
  this.buildWalls();
 }

 buildWalls(){
  const w=this.w;
  const h=this.h;
  const t=Math.min(w,h)*.055;

  this.walls=[
   {x:w*.17,y:h*.17,w:w*.20,h:t},
   {x:w*.63,y:h*.17,w:w*.20,h:t},
   {x:w*.17,y:h*.78,w:w*.20,h:t},
   {x:w*.63,y:h*.78,w:w*.20,h:t},
   {x:w*.48,y:h*.35,w:t,h:h*.30},
   {x:w*.25,y:h*.44,w:t,h:h*.17},
   {x:w*.75-t,y:h*.44,w:t,h:h*.17}
  ];
 }

 buildRound(){
  this.map=this.maps[this.round%this.maps.length];

  this.buildWalls();
  this.bullets=[];
  this.parts=[];
  this.floaters=[];
  this.bonus=null;
  this.bonusTimer=0;

  const w=this.w;
  const h=this.h;

  const defs=[
   {
    name:"P1 MOVIY",
    color:"#11d7f2",
    dark:"#087f9a",
    x:90,
    y:h-90,
    a:-.75
   },
   {
    name:"P2 YASHIL",
    color:"#42e65e",
    dark:"#168b32",
    x:90,
    y:90,
    a:.75
   },
   {
    name:"P3 BINAFSHA",
    color:"#c35bff",
    dark:"#7621aa",
    x:w-90,
    y:90,
    a:2.35
   },
   {
    name:"P4 QORA",
    color:"#f4a900",
    dark:"#7d5500",
    x:w-90,
    y:h-90,
    a:-2.35
   }
  ];

  this.tanks=defs.map((d,i)=>({
   ...d,
   id:i,
   alive:true,
   hp:1,
   ammo:4,
   maxAmmo:4,
   moving:false,
   rot:0.028,
   speed:2.25,
   isBot:i>=this.hum,
   score:0,
   fireCooldown:0,
   ai:0,
   rotDir:(i%2===0?1:-1),
   turnCooldown:0
  }));

  this.spawnBonus();

  $("#roundText").textContent=
   `RAUND ${this.round+1} / ${this.rounds} • ${this.map.name}`;
 }

 start(){
  this.running=true;
  this.last=performance.now();
  requestAnimationFrame(t=>this.loop(t));
 }

 stop(){
  this.running=false;
 }

 loop(now){
  if(!this.running)return;

  this.dt=Math.min(32,now-this.last);
  this.last=now;

  this.update(now);
  this.draw();

  requestAnimationFrame(t=>this.loop(t));
 }

 spawnBonus(){
  this.bonus={
   x:this.w*.5+(Math.random()-.5)*this.w*.16,
   y:this.h*.5+(Math.random()-.5)*this.h*.15,
   type:Math.random()<.5?"ammo":"shield",
   pulse:0
  };
 }

 moveTank(t){
  const nx=t.x+Math.cos(t.a)*t.speed;
  const ny=t.y+Math.sin(t.a)*t.speed;

  let hit=null;

  if(nx<30)
   hit={nx:1,ny:0};
  else if(nx>this.w-30)
   hit={nx:-1,ny:0};
  else if(ny<30)
   hit={nx:0,ny:1};
  else if(ny>this.h-30)
   hit={nx:0,ny:-1};

  if(!hit)
   for(const z of this.walls){
    if(
     nx>z.x-23 &&
     nx<z.x+z.w+23 &&
     ny>z.y-23 &&
     ny<z.y+z.h+23
    ){
     const dl=Math.abs(nx-(z.x-23));
     const dr=Math.abs(nx-(z.x+z.w+23));
     const dt=Math.abs(ny-(z.y-23));
     const db=Math.abs(ny-(z.y+z.h+23));
     const m=Math.min(dl,dr,dt,db);

     if(m===dl)
      hit={nx:-1,ny:0};
     else if(m===dr)
      hit={nx:1,ny:0};
     else if(m===dt)
      hit={nx:0,ny:-1};
     else
      hit={nx:0,ny:1};

     break;
    }
   }

  if(!hit)
   for(const o of this.tanks){
    if(
     o!==t &&
     o.alive &&
     Math.hypot(nx-o.x,ny-o.y)<40
    ){
     const dx=t.x-o.x;
     const dy=t.y-o.y;
     const len=Math.hypot(dx,dy)||1;

     hit={
      nx:dx/len,
      ny:dy/len
     };

     break;
    }
   }

  if(!hit){
   t.x=nx;
   t.y=ny;
   this.dust(t);
   return;
  }

  const fx=Math.cos(t.a);
  const fy=Math.sin(t.a);

  const dot=fx*hit.nx+fy*hit.ny;

  let rx=fx-2*dot*hit.nx;
  let ry=fy-2*dot*hit.ny;

  if(Math.hypot(rx,ry)<.01){
   rx=-fx;
   ry=-fy;
  }

  const target=Math.atan2(ry,rx);

  let delta=
   ((target-t.a+Math.PI*3)%(Math.PI*2))-Math.PI;

  delta=Math.max(-1.05,Math.min(1.05,delta));

  t.a+=delta;
  t.rotDir*=-1;
  t.turnCooldown=220;

  t.x+=hit.nx*2.5;
  t.y+=hit.ny*2.5;

  this.burst(
   t.x-hit.nx*5,
   t.y-hit.ny*5,
   "#d6d3d1"
  );

  AudioEngine.beep(95,.035,"square");
 }

 dust(t){
  if(Math.random()<.22)
   this.parts.push({
    x:t.x-Math.cos(t.a)*22,
    y:t.y-Math.sin(t.a)*22,
    vx:(Math.random()-.5)*.5,
    vy:(Math.random()-.5)*.5,
    life:18,
    r:4,
    c:"#b7a27c"
   });
 }

 fire(t){
  if(!t.alive||t.fireCooldown>0||t.ammo<=0)return;

  t.ammo--;
  t.fireCooldown=700;

  t.rotDir*=-1;

  AudioEngine.shot();

  this.parts.push({
   x:t.x+Math.cos(t.a)*29,
   y:t.y+Math.sin(t.a)*29,
   life:8,
   r:13,
   c:"#ffd21a"
  });

  this.bullets.push({
   x:t.x+Math.cos(t.a)*31,
   y:t.y+Math.sin(t.a)*31,
   vx:Math.cos(t.a)*5.3,
   vy:Math.sin(t.a)*5.3,
   o:t,
   life:150
  });

  setTimeout(()=>{
   if(t.alive&&t.ammo<t.maxAmmo)
    t.ammo++;
  },1300);
 }

 ai(t,now){
  const alive=this.tanks.filter(
   x=>x.alive&&x!==t
  );

  if(!alive.length)return;

  const target=alive.reduce(
   (a,b)=>
    Math.hypot(a.x-t.x,a.y-t.y)<
    Math.hypot(b.x-t.x,b.y-t.y)
     ?a:b
  );

  const want=Math.atan2(
   target.y-t.y,
   target.x-t.x
  );

  let diff=
   ((want-t.a+Math.PI*3)%(Math.PI*2))-Math.PI;

  t.a+=Math.sign(diff)*.035*t.rotDir;

  if(Math.abs(diff)<.28&&Math.random()<.045)
   this.fire(t);

  if(Math.random()<.015)
   t.moving=true;

  if(t.moving&&Math.random()<.012)
   t.moving=false;

  if(t.fireCooldown>0)
   t.fireCooldown-=this.dt;
 }

 update(now){
  this.bonusTimer+=this.dt;
  this.bonus.pulse+=.08;

  if(this.bonusTimer>9000){
   this.spawnBonus();
   this.bonusTimer=0;
  }

  for(const t of this.tanks){
   if(!t.alive)continue;

   if(t.fireCooldown>0)
    t.fireCooldown-=this.dt;

   if(t.isBot)
    this.ai(t,now);

   if(t.turnCooldown>0)
    t.turnCooldown-=this.dt;

   if(t.moving)
    this.moveTank(t);
   else if(!t.isBot)
    t.a+=t.rot*t.rotDir;

   if(
    Math.hypot(
     t.x-this.bonus.x,
     t.y-this.bonus.y
    )<32
   ){
    if(this.bonus.type==="ammo")
     t.ammo=t.maxAmmo;
    else
     t.shield=1600;

    this.floaters.push({
     x:t.x,
     y:t.y-35,
     text:this.bonus.type==="ammo"
      ?"AMMO MAX!"
      :"SHIELD!",
     life:70,
     c:t.color
    });

    AudioEngine.beep(800,.12,"triangle");

    this.spawnBonus();
    this.bonusTimer=0;
   }

   if(t.shield)
    t.shield-=this.dt;
  }

  for(let i=this.bullets.length-1;i>=0;i--){
   const b=this.bullets[i];

   b.x+=b.vx;
   b.y+=b.vy;
   b.life--;

   let dead=
    b.life<=0||
    b.x<5||
    b.y<5||
    b.x>this.w-5||
    b.y>this.h-5;

   if(!dead)
    for(const z of this.walls)
     if(
      b.x>=z.x&&
      b.x<=z.x+z.w&&
      b.y>=z.y&&
      b.y<=z.y+z.h
     ){
      dead=true;
      break;
     }

   if(!dead)
    for(const t of this.tanks)
     if(
      t!==b.o&&
      t.alive&&
      Math.hypot(b.x-t.x,b.y-t.y)<24
     ){
      dead=true;

      if(t.shield>0){
       this.burst(
        b.x,
        b.y,
        "#62dfff"
       );

       this.floaters.push({
        x:t.x,
        y:t.y-30,
        text:"BLOCK!",
        life:45,
        c:"#62dfff"
       });
      }
      else{
       t.alive=false;
       t.score+=1;

       this.burst(
        t.x,
        t.y,
        t.color
       );

       AudioEngine.beep(
        85,
        .25,
        "sawtooth"
       );
      }

      break;
     }

   if(dead){
    this.burst(
     b.x,
     b.y,
     "#ffe15a"
    );

    this.bullets.splice(i,1);
   }
  }

  for(let i=this.parts.length-1;i>=0;i--){
   let p=this.parts[i];

   p.x+=p.vx||0;
   p.y+=p.vy||0;
   p.life--;
   p.r*=.96;

   if(p.life<=0)
    this.parts.splice(i,1);
  }

  for(let i=this.floaters.length-1;i>=0;i--){
   this.floaters[i].y-=.45;
   this.floaters[i].life--;

   if(this.floaters[i].life<=0)
    this.floaters.splice(i,1);
  }

  const alive=this.tanks.filter(
   t=>t.alive
  );

  if(alive.length<=1)
   this.endRound(alive[0]);
 }

 burst(x,y,c){
  for(let i=0;i<22;i++){
   let a=Math.random()*Math.PI*2;
   let s=1+Math.random()*4;

   this.parts.push({
    x,
    y,
    vx:Math.cos(a)*s,
    vy:Math.sin(a)*s,
    life:25+Math.random()*18,
    r:2+Math.random()*5,
    c:Math.random()<.45
     ?" #ff8a00"
     :c
   });
  }
 }

 endRound(winner){
  if(!this.running)return;

  this.running=false;

  if(winner)
   winner.score+=5;

  AudioEngine.win();

  const list=this.tanks.map(t=>({
   name:t.name,
   color:t.color,
   score:t.alive
    ?"TIRIK 👑"
    :"K.O. 💥"
  }));

  $("#modalIcon").textContent=
   winner?"🏆":"💥";

  $("#modalTitle").textContent=
   winner
    ?winner.name+" G‘OLIB!"
    :"HAMMA MAG‘LUB!";

  $("#reward").textContent=
   `+${winner?6:1} tanga • ${this.map.name}`;

  $("#scores").innerHTML=
   list.map(x=>
    `<div class="row">
      <span style="color:${x.color}">
       ${x.name}
      </span>
      <span>${x.score}</span>
    </div>`
   ).join("");

  $("#nextBtn").textContent=
   this.round<this.rounds-1
    ?"KEYINGI RAUND ▶"
    :"QAYTA O‘YNASH";

  $("#modal").classList.add("show");
 }

 next(){
  $("#modal").classList.remove("show");

  if(this.round>=this.rounds-1)
   this.round=0;
  else
   this.round++;

  this.buildRound();
  this.start();
 }

 draw(){
  const x=this.x;
  const w=this.w;
  const h=this.h;
  const m=this.map;

  x.clearRect(0,0,w,h);

  x.fillStyle=m.bg;
  x.fillRect(0,0,w,h);

  x.strokeStyle=m.grid;
  x.lineWidth=1;

  const step=
   m===this.maps[1]?38:42;

  for(
   let xx=0;
   xx<w;
   xx+=step
  ){
   x.beginPath();
   x.moveTo(xx,0);
   x.lineTo(xx,h);
   x.stroke();
  }

  for(
   let yy=0;
   yy<h;
   yy+=step
  ){
   x.beginPath();
   x.moveTo(0,yy);
   x.lineTo(w,yy);
   x.stroke();
  }

  for(let i=0;i<55;i++){
   let xx=(i*83+17)%w;
   let yy=(i*47+31)%h;

   x.fillStyle=
    i%3
     ?" #00000012"
     :" #ffffff0d";

   x.fillRect(
    xx,
    yy,
    8,
    4
   );
  }

  this.drawMapDecor(x);

  for(const z of this.walls){
   x.fillStyle=m.wall;
   x.fillRect(
    z.x,
    z.y,
    z.w,
    z.h
   );

   x.strokeStyle="#687080";
   x.lineWidth=2;

   x.strokeRect(
    z.x,
    z.y,
    z.w,
    z.h
   );

   x.fillStyle="#ffffff35";

   for(
    let a=z.x+8;
    a<z.x+z.w;
    a+=22
   )
    x.fillRect(
     a,
     z.y+3,
     10,
     3
    );
  }

  x.save();

  x.translate(
   this.bonus.x,
   this.bonus.y
  );

  let sc=
   1+Math.sin(
    this.bonus.pulse
   )*.08;

  x.scale(sc,sc);

  x.fillStyle="#facc15";
  x.shadowColor="#ffe66d";
  x.shadowBlur=18;

  x.fillRect(
   -17,
   -17,
   34,
   34
  );

  x.shadowBlur=0;
  x.strokeStyle="#8a6200";
  x.lineWidth=3;

  x.strokeRect(
   -17,
   -17,
   34,
   34
  );

  x.fillStyle="#111";
  x.font="900 21px Arial";
  x.textAlign="center";
  x.textBaseline="middle";

  x.fillText(
   "?",
   0,
   0
  );

  x.restore();

  for(const b of this.bullets){
   x.save();

   x.fillStyle="#fff";
   x.shadowColor="#ffe15a";
   x.shadowBlur=12;

   x.beginPath();

   x.arc(
    b.x,
    b.y,
    4.5,
    0,
    7
   );

   x.fill();
   x.restore();
  }

  for(const p of this.parts){
   x.globalAlpha=
    Math.max(0,p.life/30);

   x.fillStyle=p.c;

   x.beginPath();

   x.arc(
    p.x,
    p.y,
    p.r,
    0,
    7
   );

   x.fill();
  }

  x.globalAlpha=1;

  for(const t of this.tanks)
   if(t.alive)
    this.tank(x,t);

  for(const f of this.floaters){
   x.globalAlpha=
    Math.min(1,f.life/25);

   x.fillStyle=f.c;
   x.font="1000 15px Arial";
   x.textAlign="center";

   x.fillText(
    f.text,
    f.x,
    f.y
   );
  }

  x.globalAlpha=1;

  this.hud(x);
 }

 drawMapDecor(x){
  const m=this.map;

  if(m===this.maps[0]){
   for(let i=0;i<8;i++){
    let px=
     i<4
      ?this.w*.08+i*28
      :this.w*.72+(i-4)*28;

    let py=
     i<4
      ?this.h*.31
      :this.h*.66;

    x.fillStyle="#b89455";

    x.fillRect(
     px,
     py,
     23,
     10
    );

    x.fillStyle="#e1c483";

    x.fillRect(
     px+2,
     py-3,
     18,
     5
    );
   }
  }

  if(m===this.maps[1]){
   for(
    const p of [
     [.37,.28],
     [.63,.28],
     [.37,.72],
     [.63,.72]
    ]
   ){
    x.fillStyle=m.plant;

    x.beginPath();

    x.arc(
     this.w*p[0],
     this.h*p[1],
     18,
     0,
     7
    );

    x.fill();

    x.fillStyle="#86a94a";

    for(let a=0;a<7;a++){
     x.rotate?.(0);

     x.beginPath();

     x.ellipse(
      this.w*p[0]+Math.cos(a)*16,
      this.h*p[1]+Math.sin(a)*16,
      12,
      5,
      a,
      0,
      7
     );

     x.fill();
    }
   }
  }

  if(m===this.maps[2]){
   x.fillStyle="#8da6c0";

   x.fillRect(
    this.w*.47,
    0,
    this.w*.06,
    this.h
   );

   x.fillStyle="#52668c";

   x.fillRect(
    this.w*.49,
    0,
    this.w*.02,
    this.h
   );
  }
 }

 tank(x,t){
  x.save();

  x.translate(
   t.x,
   t.y
  );

  x.rotate(t.a);

  if(t.shield>0){
   x.strokeStyle="#64e9ff";
   x.lineWidth=4;
   x.shadowColor="#64e9ff";
   x.shadowBlur=16;

   x.beginPath();

   x.arc(
    0,
    0,
    31,
    0,
    7
   );

   x.stroke();

   x.shadowBlur=0;
  }

  x.fillStyle="#0007";

  x.fillRect(
   -25,
   -18,
   50,
   38
  );

  x.fillStyle="#202632";

  x.fillRect(
   -24,
   -24,
   48,
   11
  );

  x.fillRect(
   -24,
   13,
   48,
   11
  );

  x.fillStyle="#6b7280";

  for(let q=-21;q<22;q+=8){
   x.fillRect(
    q,
    -23,
    4,
    8
   );

   x.fillRect(
    q,
    15,
    4,
    8
   );
  }

  x.fillStyle=t.color;

  x.beginPath();

  x.roundRect(
   -21,
   -15,
   42,
   30,
   8
  );

  x.fill();

  x.strokeStyle=t.dark;
  x.lineWidth=3;
  x.stroke();

  x.fillStyle="#172033";

  x.fillRect(
   3,
   -5,
   29,
   10
  );

  x.fillStyle="#94a3b8";

  x.fillRect(
   29,
   -6,
   6,
   12
  );

  x.fillStyle=t.dark;

  x.beginPath();

  x.arc(
   0,
   0,
   13,
   0,
   7
  );

  x.fill();

  x.strokeStyle="#fff8";
  x.stroke();

  x.fillStyle="#f8fafc";

  x.beginPath();

  x.arc(
   -3,
   -2,
   5,
   0,
   7
  );

  x.fill();

  x.fillStyle="#f8fafc";

  x.beginPath();

  x.moveTo(
   -8,
   -11
  );

  x.quadraticCurveTo(
   0,
   -22,
   9,
   -11
  );

  x.lineTo(
   6,
   -8
  );

  x.quadraticCurveTo(
   0,
   -14,
   -6,
   -8
  );

  x.closePath();

  x.fill();

  x.restore();
 }

 hud(x){
  const pos=[
   {
    x:25,
    y:this.h-43,
    t:this.tanks[0]
   },
   {
    x:25,
    y:22,
    t:this.tanks[1]
   },
   {
    x:this.w-115,
    y:22,
    t:this.tanks[2]
   },
   {
    x:this.w-115,
    y:this.h-43,
    t:this.tanks[3]
   }
  ];

  pos.forEach(o=>{
   let t=o.t;

   x.fillStyle="#05070ddd";

   x.fillRect(
    o.x,
    o.y,
    90,
    20
   );

   x.strokeStyle=t.color;

   x.strokeRect(
    o.x,
    o.y,
    90,
    20
   );

   for(let i=0;i<t.maxAmmo;i++){
    x.fillStyle=
     i<t.ammo
      ?t.color
      :"#252b38";

    x.fillRect(
     o.x+7+i*18,
     o.y+4,
     11,
     12
    );
   }
  });

  x.fillStyle="#ffffffaa";
  x.font="900 11px Arial";
  x.textAlign="center";

  x.fillText(
   "II",
   this.w/2,
   22
  );
 }
}

function startGame(){
 AudioEngine.init();

 showGame();

 const c=$("#gameCanvas");

 game=new ArenaGame(
  c,
  players
 );

 game.start();
}

$("#nextBtn").onclick=()=>{
 if(game)
  game.next();
};

window.addEventListener(
 "resize",
 ()=>{
  if(game)
   game.resize();
 }
);

$$(".corner").forEach(btn=>{
 const idx=+btn.dataset.p;

 const down=e=>{
  e.preventDefault();

  btn.classList.add("pressed");

  if(
   game&&
   game.tanks[idx]&&
   game.tanks[idx].alive
  )
   game.tanks[idx].moving=true;
 };

 const up=e=>{
  e.preventDefault();

  btn.classList.remove("pressed");

  if(
   game&&
   game.tanks[idx]
  ){
   game.tanks[idx].moving=false;
   game.fire(game.tanks[idx]);
  }
 };

 btn.addEventListener(
  "pointerdown",
  down
 );

 btn.addEventListener(
  "pointerup",
  up
 );

 btn.addEventListener(
  "pointercancel",
  up
 );

 btn.addEventListener(
  "pointerleave",
  up
 );
});

const keys={
 "Space":0,
 "KeyW":0,
 "KeyQ":1,
 "KeyP":2,
 "ArrowUp":2,
 "Enter":3,
 "ArrowDown":3
};

window.addEventListener(
 "keydown",
 e=>{
  if(!game)return;

  const i=keys[e.code];

  if(
   i===undefined||
   e.repeat
  )
   return;

  e.preventDefault();

  if(game.tanks[i])
   game.tanks[i].moving=true;
 }
);

window.addEventListener(
 "keyup",
 e=>{
  if(!game)return;

  const i=keys[e.code];

  if(i===undefined)
   return;

  e.preventDefault();

  if(game.tanks[i]){
   game.tanks[i].moving=false;
   game.fire(game.tanks[i]);
  }
 }
); 