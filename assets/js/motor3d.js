/*  ══════════════════════════════════════════════════════════════════
    EL MOTOR EN TRES DIMENSIONES · UNA SOLA FUENTE
    ──────────────────────────────────────────────────────────────────
    Extraido de `chapters/c31-marine-engine.html` el 31 de agosto de 2026, del tramo
    676-2745 medido ESE DIA. **c31 no se toco.**

    QUE ES. La figura del motor y nada mas: geometria, camara, animacion de cuatro
    tiempos y flujos. **No sabe de pantallas, ni de fases, ni de preguntas.**

    ── POR QUE LLEVA UN PANEL DE MENTIRA ──────────────────────────────
    El tramo original lee el DOM en treinta y siete sitios: `stage`, `err`, `tgRun`,
    `rpm`, `strokeBar`, `cylRow`, `exEl`, `cutEl`... Reescribir esos treinta y siete
    es donde se rompen las cosas, y ademas los mezcla con logica de verdad:
    **`applyCut` y `applyExplode` viven en el bloque que parecia interfaz.**

    Asi que la pieza trae `panelFalso()`: un objeto sin DOM que responde a `.value`,
    `.textContent`, `.classList` y `.addEventListener` sin hacer nada. **El codigo de
    dentro sigue igual, byte a byte**, y la API de fuera lo conduce.

    Es reversible, no toca una linea de logica, y deja al arnes una pregunta simple:
    **jdibuja las mismas 94 piezas y 630 mallas que el original?**

    ── LA API ────────────────────────────────────────────────
      montar(nodo)              arranca la escena dentro de ese nodo
      verSistemas({com,ref,tra,est})
      despiece(v)               0..1
      corte(v)                  0..1
      enfocar(nombre, animar, cerca)  reencuadra sin cambiar el angulo, y con
                                `cerca` ademas SE ACERCA · devuelve si la
                                encontro. `null` NO lo quita: eso lo hace verCamara
      alSeleccionar(fn)         fn(nombre) cuando el alumno pincha una pieza
      verAngulo(grados)         0..720 · conduce los cuatro tiempos
      verRecorrido(clave, t)    'raw'|'cool'|'lube'|'tra'|'fuel'|'elec'
      enMarcha(v, seg)          arranca o para · los chorros del espejo dependen
                                de esto, y `verAngulo` lo apaga: son excluyentes.
                                Se para sola a los `seg` segundos (6 por defecto)
      marcha()                  si esta girando ahora mismo
      gesto(que, como)          los gestos del taller · `gestos()` los lee
      verTestigo(cual, on)      'oil' | 'temp' | 'charge' · el panel del mamparo
      verAguja(frac)            0..1 · la aguja de temperatura
      panel()                   que esta diciendo el panel ahora mismo
      estado()                  que hace cada cilindro ahora mismo
      censo()                   las piezas registradas, para el arnes

    `verAngulo` y `verRecorrido` NO son mandos que se anaden: son **la forma en que
    esta pieza deja de tener mandos propios**. La fase 2 conduce el angulo y la 3 el
    recorrido, y la figura ya no tiene barra de tiempos ni boton de marcha.
    ═════════════════════════════════════════════════════════════════  */
(function (raiz) {
"use strict";

if (typeof THREE === "undefined") {
  raiz.Motor3D = { error: "three.js no esta cargado" };
  return;
}

/*  EL PANEL DE MENTIRA. Un nodo que acepta todo lo que el codigo original le hace y
    no hace nada. Se guarda lo escrito en `.__txt` y `.__val` para que la API pueda
    leer lo que el motor cree estar pintando — asi `estado()` sale gratis.      */
var FALSOS = {};
function panelFalso(id) {
  if (FALSOS[id]) return FALSOS[id];
  var n = {
    id: id, __txt: "", __val: 0, children: [], style: {}, dataset: {},
    classList: { add: function () {}, remove: function () {}, toggle: function () {},
                 contains: function () { return false; } },
    addEventListener: function () {}, removeEventListener: function () {},
    appendChild: function (c) { n.children.push(c); return c; },
    removeChild: function (c) { var i = n.children.indexOf(c); if (i >= 0) n.children.splice(i, 1); return c; },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    focus: function () {}, blur: function () {}, click: function () {},
    firstChild: null, parentNode: null, disabled: false, checked: false,
    setAttribute: function () {}, getAttribute: function () { return null; }
  };
  Object.defineProperty(n, "textContent", {
    get: function () { return n.__txt; }, set: function (v) { n.__txt = v; } });
  Object.defineProperty(n, "innerHTML", {
    get: function () { return n.__txt; }, set: function (v) { n.__txt = v; } });
  Object.defineProperty(n, "value", {
    get: function () { return n.__val; }, set: function (v) { n.__val = v; } });
  FALSOS[id] = n;
  return n;
}

/*  El nodo real donde se monta. Lo pone `montar()`; hasta entonces es de mentira.  */
var NODO = null;

/*  EL LIENZO NECESITA UN NODO DE VERDAD DESDE EL PRINCIPIO.
    El cuerpo construye la escena AL CARGAR y engancha el lienzo a `stage`. En ese
    momento `montar()` todavía no se ha llamado, así que con un `stage` de mentira el
    lienzo se enganchaba a un objeto sin DOM: **la escena existía y no se veía.**

    El censo daba 94 piezas y 630 mallas igualmente — **un arnés que cuenta piezas no
    ve que no se dibujan.** Lo cazó el del móvil, que mide el lienzo.

    Así que `stage` es un `<div>` de verdad, suelto del documento. El cuerpo lo llena
    al cargar y `montar(nodo)` lo mete donde le digan. **El orden deja de importar.** */
var LIENZO = (typeof document !== "undefined" && document.createElement)
  ? document.createElement("div") : null;
if (LIENZO) { LIENZO.style.width = "100%"; LIENZO.style.height = "100%"; }

var DOC = {
  getElementById: function (id) {
    if (id === "stage") return NODO || LIENZO || panelFalso(id);
    return panelFalso(id);
  },
  createElement: function (t) { return document.createElement(t); },
  createElementNS: function (ns, t) { return document.createElementNS(ns, t); },
  addEventListener: function () {}, body: { appendChild: function () {} }
};

var API_ganchos = { pick: null };

/* ============================================================
   MOTOR MARINO DIÉSEL — modelo 3D de estudio (v3, realista)
   Inspirado en la arquitectura de un 4 cil. marino (Volvo Penta / Yanmar / Beta)
   Three.js r128 · controles orbitales propios (sin OrbitControls)
   Eje X = longitud (−X proa / frontal correa · +X popa / volante)
   Y = altura · Z = manga (+Z babor)
   ============================================================ */

/* ---------- paleta ---------- */
var COL = {
  // pintura del bloque (verde marino tipo Volvo Penta)
  paint:0x2f5e48, paintDk:0x213d2f, paintLt:0x3a7257,
  // metales
  alu:0xb4bdc4, aluDk:0x868f98, cast:0x4c5560, castDk:0x363d46,
  steel:0xaab4be, steelDk:0x6e7a85, polish:0xd0d8de,
  bronze:0xb98a4e, bronzeDk:0x8a6636, brass:0xc9a24a, copper:0xc07b46,
  // consumibles / acentos
  rubber:0x1c2127, rubberLt:0x2c333b, blk:0x14181d,
  filtBlue:0x2f6fed, filtWhite:0xc9d2d8, filtRed:0xb5402e,
  // fluidos (lenguaje de color, para mangueras y flujos)
  raw:0x46a0c4, cool:0x3a64c0, fuel:0xcf9a40, exh:0x6b4e42, air:0x9aa0a6,
  com:0xc75a44, tra:0x3a8f5e, traDark:0x27633f, est:0x8194a6, oil:0x2a323b
};

/* ---------- escena ---------- */
var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b1018, 52, 105);

var stage = DOC.getElementById('stage');
var W = stage.clientWidth, H = stage.clientHeight;
var camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 300);

var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2.5));
renderer.setSize(W,H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
stage.appendChild(renderer.domElement);

/* ---------- entorno generado por código (reflejos en metales) ----------
   Sin archivos externos: una "sala de máquinas" emisiva pasada por PMREM
   da a latón, bronce, acero y aluminio algo real que reflejar. */
(function buildEnvironment(){
  try{
    var box=new THREE.BoxGeometry(1,1,1);
    function panel(w,h,d,x,y,z,color){
      var m=new THREE.Mesh(box, new THREE.MeshBasicMaterial({color:color}));
      m.scale.set(w,h,d); m.position.set(x,y,z); return m;
    }
    var envScene=new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(46,32,46), new THREE.MeshBasicMaterial({color:0x141a22, side:THREE.BackSide})));
    envScene.add(panel(18,0.2,14, 0,15,0, 0xdfe7ee));    // escotilla abierta (luz principal)
    envScene.add(panel(10,0.2,3,  2,14.2,6, 0xffe2b4));  // lámpara cálida de sala
    envScene.add(panel(5,0.2,5,  -9,13.4,-5, 0xfff2d8));  // segunda lámpara
    envScene.add(panel(0.2,15,22, -22,4,0, 0x71879f));    // mamparo frío (babor)
    envScene.add(panel(0.2,15,22,  22,3,0, 0x7d6244));    // mamparo cálido (estribor)
    envScene.add(panel(22,15,0.2, 0,4,-20, 0x5e6a76));    // mamparo de proa
    envScene.add(panel(22,15,0.2, 0,4, 20, 0x6b7480));    // mamparo de popa
    envScene.add(panel(9,0.2,7,  10,11,7, 0x99a6b2));     // rebote lateral
    envScene.add(panel(34,0.2,34, 0,-9,0, 0x11171e));     // sentina oscura
    var pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.022).texture;
    pmrem.dispose();
  }catch(e){ /* si PMREM no está disponible, el modelo se ve igualmente con las luces */ }
})();

/* ---------- luces ---------- */
scene.add(new THREE.AmbientLight(0x33414f, 0.42));
scene.add(new THREE.HemisphereLight(0x9fb6cf, 0x10161d, 0.58));
var key = new THREE.DirectionalLight(0xfff1d8, 1.2);
key.position.set(11, 16, 9); key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
key.shadow.camera.near=6; key.shadow.camera.far=42;
key.shadow.camera.left=-11; key.shadow.camera.right=11;   // ceñido al motor: sombras mucho más finas
key.shadow.camera.top=9; key.shadow.camera.bottom=-9;
key.shadow.bias=-0.00035; key.shadow.normalBias=0.022;
key.target.position.set(1.2,-0.3,0); scene.add(key.target);
scene.add(key);
var fill = new THREE.DirectionalLight(0x6fa8e0, 0.55); fill.position.set(-12,6,-7); scene.add(fill);
var rim  = new THREE.DirectionalLight(0xffd98a, 0.55); rim.position.set(-6,9,-13); scene.add(rim);
var warm = new THREE.PointLight(0xffc070, 0.55, 36); warm.position.set(3,4,5); scene.add(warm);
var hatch = new THREE.PointLight(0xd8e8ff, 0.5, 30); hatch.position.set(0.5,4.4,0); scene.add(hatch);

/* ---------- raíz + grupos ---------- */
var root = new THREE.Group(); scene.add(root);
var groups = { com:new THREE.Group(), ref:new THREE.Group(), tra:new THREE.Group(), est:new THREE.Group() };
/*  LOS CUATRO GRUPOS DE SISTEMA, POR SU NOMBRE. Una malla que cuelga de uno
    hereda ESE sistema: no es adivinar, lo declaro quien la modelo. Es la tercera
    regla de `adopta()`, y la que resuelve las mangueras que `hoseRun` mete en su
    grupo sin ponerles `userData.sys`.                                        */
for (var _g in groups) { if (groups[_g]) groups[_g].name = "sys:" + _g; }
root.add(groups.com, groups.ref, groups.tra, groups.est);

/*  ── LO QUE EL MONTAJE NO TOCA, POR NOMBRE ─────────────────────────
    Cinco grupos que no son fontaneria del motor y que el deslizador de montaje no
    puede encender ni apagar:

      bayGroup    el escenario del hueco — casco, espuma, bancadas, agua. **No se
                  apaga nunca**: la posicion 0 es un compartimento vacio, no negro.
      humoGroup   los tres penachos. Los enciende la P3 con `setHumo()`, que enciende
                  EL GRUPO: si el montaje apagara las mallas, no volverian a verse.
      gasGroup    las flechas del gas en el ciclo de cuatro tiempos
      flowGroup   el recorrido de los fluidos
      gridGroup   la rejilla
      spotGroup   el senalador de la pieza enfocada

    Las cuatro ultimas nacen apagadas y las enciende el alumno. Antes entraban en el
    reparto: **135 mallas tenian posicion y 7 seguian ocultas en la 16**. No rompia
    nada a la vista, y hacia que el recuento dijera 135 donde son 128.            */
/*  `marcaGroup` entra aqui por lo mismo que `humoGroup`: **no es fontaneria del motor,
    es lo que una pantalla enciende encima**. Si `verPiezas` lo apagara, la pantalla que
    marca seis piezas se quedaria sin marcas al montar el motor — que es exactamente el
    fallo que tuvo el humo y que nadie vio porque `walk-humo` no llama a `verPiezas`. */
var FUERA_DEL_MONTAJE = { bayGroup: 1, humoGroup: 1, gasGroup: 1, flowGroup: 1, marcaGroup: 1,
                          gridGroup: 1, spotGroup: 1 };

/* registros */
var parts = [], pickables = [], cutMeshes = [], NUMS = [];

/* ---------- SISTEMA DE ANIMACIÓN (motor en marcha + ciclo de 4 tiempos) ----------
   4 cilindros en línea REAL: codos a 0°-180°-180°-0° (1 y 4 suben juntos).
   Orden de encendido 1-3-4-2 → desfase en el ciclo de 720°: cil1=0, cil2=540, cil3=180, cil4=360. */
var ANIM = {
  run:false, theta:0, speed:0.55, crank:null,
  pistons:[], rods:[], valves:[], gas:[], spin:[],
  ORDER:[0,540,180,360],   // desfase en el ciclo (grados) por cilindro
  OFF:0.34,                // radio del codo (media carrera)
  L:1.30                   // longitud de biela
};
var gasGroup = new THREE.Group(); gasGroup.name="gasGroup"; gasGroup.visible=false; groups.com.add(gasGroup);
var INTER = {};   // piezas manipulables (varilla, filtro, impeller...)
/* mueve una pieza manteniendo coherente el despiece */
function setAnimPos(o,x,y,z){ o.position.set(x,y,z); if(o.userData && o.userData.home) o.userData.home.set(x,y,z); }
function throwAngle(c){ return (ANIM.ORDER[c]%360)*Math.PI/180; }
/* Y del bulón por cinemática exacta biela-manivela (biela de longitud constante) */
function pinY(c, th){
  var a=th+throwAngle(c), s=ANIM.OFF*Math.sin(a);
  return CRANK_Y + ANIM.OFF*Math.cos(a) + Math.sqrt(Math.max(0.0001, ANIM.L*ANIM.L - s*s));
}
function pinZ(c, th){ return ANIM.OFF*Math.sin(th+throwAngle(c)); }
/* tiempo actual del cilindro c: 0=Power 1=Exhaust 2=Intake 3=Compression */
function strokeOf(c, thDeg){ return Math.floor((((thDeg-ANIM.ORDER[c])%720)+720)%720/180); }
function localAngle(c, thDeg){ return (((thDeg-ANIM.ORDER[c])%720)+720)%720; }

/* ---------- materiales ---------- */
function mat(color, o){
  o = o || {};
  var m = new THREE.MeshStandardMaterial({
    color: color,
    metalness: o.metal!=null?o.metal:0.85,
    roughness: o.rough!=null?o.rough:0.42,
    transparent: !!o.opacity, opacity: o.opacity!=null?o.opacity:1,
    side: o.side||THREE.FrontSide, flatShading: !!o.flat,
    envMapIntensity: o.env!=null?o.env:0.9
  });
  if(o.emissive){ m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei!=null?o.ei:1; }
  return m;
}
/* materiales reutilizables */
/* Valores PBR físicamente correctos: lo pintado NO es metal (metalness ~0).
   Ahí estaba gran parte del aspecto "de plástico". */
var M = {
  paint:   mat(COL.paint,{metal:0.04, rough:0.54, env:0.75}),
  paintDk: mat(COL.paintDk,{metal:0.04, rough:0.60, env:0.65}),
  paintLt: mat(COL.paintLt,{metal:0.04, rough:0.50, env:0.75}),
  alu:     mat(COL.alu,{metal:0.88, rough:0.52, env:0.95}),      // aluminio fundido, mate
  aluDk:   mat(COL.aluDk,{metal:0.88, rough:0.58, env:0.9}),
  cast:    mat(COL.cast,{metal:0.55, rough:0.78, env:0.7}),      // fundición sin pintar, áspera
  castDk:  mat(COL.castDk,{metal:0.5, rough:0.82, env:0.65}),
  steel:   mat(COL.steel,{metal:0.95, rough:0.34, env:1.05}),
  steelDk: mat(COL.steelDk,{metal:0.92, rough:0.44, env:0.95}),
  polish:  mat(COL.polish,{metal:0.98, rough:0.16, env:1.2}),
  bronze:  mat(COL.bronze,{metal:0.9, rough:0.46, env:0.95}),    // bronce marino, oxidado
  bronzeDk:mat(COL.bronzeDk,{metal:0.88, rough:0.56, env:0.85}),
  brass:   mat(COL.brass,{metal:0.92, rough:0.38, env:1.0}),
  copper:  mat(COL.copper,{metal:0.9, rough:0.44, env:1.0}),
  rubber:  mat(COL.rubber,{metal:0.0, rough:0.96, env:0.2}),     // goma mate de verdad
  blk:     mat(COL.blk,{metal:0.0, rough:0.85, env:0.35}),
  bolt:    mat(0x6e767d,{metal:0.95, rough:0.5, env:0.9}),
  heat:    mat(0x5c4238,{metal:0.35, rough:0.9, env:0.5})        // escape con pátina térmica
};

/* registra pieza interactiva */
function reg(mesh, sys, meta){
  meta = meta || {};
  var cast = !meta.noShadow, recv = !meta.noRecv;
  mesh.traverse(function(c){ if(c.isMesh){ c.castShadow=cast; c.receiveShadow=recv; } });
  if(mesh.isMesh){ mesh.castShadow=cast; mesh.receiveShadow=recv; }
  mesh.userData = Object.assign({sys:sys}, meta);
  mesh.userData.home = mesh.position.clone();
  mesh.userData.ex = (meta.ex || new THREE.Vector3(0,1,0)).clone().normalize();
  mesh.userData.exMag = meta.exMag!=null?meta.exMag:2.0;
  /*  SI NACIO VISIBLE. El montaje por pieza no puede encender lo que arranca oculto
      a proposito -burbujas, chorros, gotas, descompresores-: apagarlas es facil y
      volver a encenderlas seria inventarse un estado que nadie pidio.          */
  mesh.userData.visBase = mesh.visible !== false;
  parts.push(mesh);
  if(!meta.noPick) pickables.push(mesh);
  groups[sys].add(mesh);
  if(meta.cut) markCut(mesh);
  return mesh;
}
/*  REGISTRAR SIN MOVER · para lo que no puede salir de donde está.
    `reg()` acaba con `groups[sys].add(mesh)`, y eso REPARENTA. Da igual cuando la
    pieza ya vive en su grupo, y **es un fallo cuando vive en otro sitio**:

      · la SENTINA cuelga de `bayGroup`, que `syncBay()` esconde entero con el
        despiece. Sacarla la dejaría flotando sobre un compartimento invisible.
      · la VARILLA DEL INVERSOR cuelga de `gbox`, **que tiene posición**. Sacarla la
        mandaría al origen de coordenadas.

    Hace todo lo que hace `reg()` menos mover el nodo.                          */
function regEnSitio(mesh, sys, meta){
  meta = meta || {};
  var cast = !meta.noShadow, recv = !meta.noRecv;
  mesh.traverse(function(c){ if(c.isMesh){ c.castShadow=cast; c.receiveShadow=recv; } });
  if(mesh.isMesh){ mesh.castShadow=cast; mesh.receiveShadow=recv; }
  mesh.userData = Object.assign({sys:sys}, meta);
  mesh.userData.home = mesh.position.clone();
  mesh.userData.ex = (meta.ex || new THREE.Vector3(0,1,0)).clone().normalize();
  mesh.userData.exMag = meta.exMag!=null?meta.exMag:2.0;
  /*  SI NACIO VISIBLE. El montaje por pieza no puede encender lo que arranca oculto
      a proposito -burbujas, chorros, gotas, descompresores-: apagarlas es facil y
      volver a encenderlas seria inventarse un estado que nadie pidio.          */
  mesh.userData.visBase = mesh.visible !== false;
  parts.push(mesh);
  if(!meta.noPick) pickables.push(mesh);
  if(meta.cut) markCut(mesh);
  return mesh;
}
function markCut(mesh){ if(cutMeshes.indexOf(mesh)<0) cutMeshes.push(mesh); }
function num(n, name, sys, mesh){ NUMS.push({n:n,name:name,sys:sys,mesh:mesh}); mesh.userData.n=n; mesh.userData.badge=true; }

/* ============================================================
   HELPERS DE GEOMETRÍA
   ============================================================ */
function V(x,y,z){ return new THREE.Vector3(x,y,z); }
function cyl(r1,r2,h,seg,o){ o=o||{}; return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h, seg||28, 1, !!o.open, o.ts||0, o.tl||Math.PI*2), o.material); }
function box(w,h,d,m,seg){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d, seg||1,seg||1,seg||1), m); }
function sph(r,m,o){ o=o||{}; return new THREE.Mesh(new THREE.SphereGeometry(r, o.w||24, o.h||18, o.ps||0, o.pl||Math.PI*2, o.ts||0, o.tl||Math.PI), m); }
function tor(r,t,m,seg){ return new THREE.Mesh(new THREE.TorusGeometry(r,t, seg||16, seg?seg*2:34), m); }

/* caja redondeada (bloque mecanizado) */
function roundedBox(w,h,d,r,m){
  var s=new THREE.Shape(), x=-w/2, y=-h/2;
  s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  var g=new THREE.ExtrudeGeometry(s,{depth:d, bevelEnabled:true, bevelThickness:r*0.85, bevelSize:r*0.8, bevelSegments:4, steps:1});
  g.translate(0,0,-d/2);
  return new THREE.Mesh(g,m);
}
/* perno hexagonal */
function bolt(headR, len, m){
  m=m||M.bolt; var g=new THREE.Group();
  var head=new THREE.Mesh(new THREE.CylinderGeometry(headR,headR,headR*0.8,6), m); g.add(head);
  if(len>0){ var sh=new THREE.Mesh(new THREE.CylinderGeometry(headR*0.5,headR*0.5,len,10), m); sh.position.y=-len/2-headR*0.2; g.add(sh); }
  return g;
}
function boltCircle(parent, count, radius, headR, axis, along, m){
  for(var i=0;i<count;i++){
    var a=(i/count)*Math.PI*2, b=bolt(headR,0,m);
    if(axis==='y'){ b.position.set(Math.cos(a)*radius, along, Math.sin(a)*radius); }
    else if(axis==='x'){ b.rotation.z=Math.PI/2; b.position.set(along, Math.cos(a)*radius, Math.sin(a)*radius); }
    else { b.rotation.x=-Math.PI/2; b.position.set(Math.cos(a)*radius, Math.sin(a)*radius, along); }
    parent.add(b);
  }
}
/* brida con corona de pernos */
function flange(r, thick, axis, m, bolts){
  m=m||M.steelDk; var g=new THREE.Group();
  var disc=new THREE.Mesh(new THREE.CylinderGeometry(r,r,thick,30), m);
  if(axis==='x') disc.rotation.z=Math.PI/2; else if(axis==='z') disc.rotation.x=Math.PI/2;
  g.add(disc);
  if(bolts) boltCircle(g, bolts, r*0.76, Math.max(0.04,r*0.12), axis, thick*0.55, M.bolt);
  return g;
}
/* manguera / tubo por spline */
function hose(points, radius, m, o){
  o=o||{};
  var curve=new THREE.CatmullRomCurve3(points, false, 'catmullrom', o.tension!=null?o.tension:0.5);
  var seg=o.seg||Math.max(24, points.length*12);
  var mesh=new THREE.Mesh(new THREE.TubeGeometry(curve, seg, radius, o.radial||14, false), m);
  mesh.userData._curve=curve; return mesh;
}
function clampRing(curve, t, hoseR, m){
  m=m||M.steel; t=Math.max(0,Math.min(1,t));
  var p=curve.getPointAt(t), tan=curve.getTangentAt(t);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(hoseR*1.18, hoseR*0.17, 8, 22), m);
  ring.position.copy(p);
  ring.quaternion.setFromUnitVectors(V(0,0,1), tan.clone().normalize());
  var screw=new THREE.Mesh(new THREE.BoxGeometry(hoseR*0.5,hoseR*0.5,hoseR*0.7), m);
  screw.position.copy(p).add(tan.clone().cross(V(0,1,0)).normalize().multiplyScalar(hoseR*1.25));
  var g=new THREE.Group(); g.add(ring,screw); return g;
}
function hoseRun(parent, points, radius, m, clampM){
  var h=hose(points,radius,m); parent.add(h);
  parent.add(clampRing(h.userData._curve,0.05,radius,clampM));
  parent.add(clampRing(h.userData._curve,0.95,radius,clampM));
  return h;
}
function pipe(points, radius, m){ return hose(points, radius, m, {tension:0.1, radial:14}); }

/* polea acanalada */
function pulley(r, width, m){
  m=m||M.steelDk; var g=new THREE.Group();
  var a=new THREE.Mesh(new THREE.CylinderGeometry(r,r,width*0.3,30), m); a.position.y=width*0.34;
  var b=a.clone(); b.position.y=-width*0.34;
  var core=new THREE.Mesh(new THREE.CylinderGeometry(r*0.6,r*0.6,width,26), m);
  var hub=new THREE.Mesh(new THREE.CylinderGeometry(r*0.26,r*0.26,width*1.25,16), m);
  g.add(a,b,core,hub); return g;
}
/* filtro spin-on (aceite/combustible) */
function canister(r, h, bodyM, capM){
  var g=new THREE.Group();
  var body=cyl(r,r,h,26,{material:bodyM});
  var dome=cyl(r,r*0.7,h*0.18,26,{material:bodyM}); dome.position.y=h*0.58;
  var base=cyl(r*0.78,r*0.78,h*0.12,26,{material:capM||M.steelDk}); base.position.y=-h*0.55;
  // nervios verticales sutiles
  for(var i=0;i<3;i++){ var ring=tor(r*1.005, r*0.03, bodyM, 8); ring.rotation.x=Math.PI/2; ring.position.y=-h*0.2+i*h*0.2; g.add(ring); }
  g.add(body,dome,base); return g;
}
/* PALA DE HÉLICE — superficie generada: cuerda elíptica, torsión de paso,
   curvatura (camber), espesor variable, skew y rake. Radial = +Y, empuje = +X. */
function propellerBlade(o){
  o=o||{};
  var R0=o.r0!==undefined?o.r0:0.22, R1=o.r1!==undefined?o.r1:0.78;
  var pitch=o.pitch||1.15, skew=o.skew||0.55, rake=o.rake||0.14;
  var tMax=o.thick||0.05, camb=o.camber||0.06, cMax=o.chord||0.42;
  var NS=20, NC=14;
  var verts=[], idx=[];
  function chord(u){ return cMax*Math.sin(Math.PI*(0.20+0.76*u))*(1-0.16*u); }
  function beta(u){ var r=R0+(R1-R0)*u; return Math.atan2(pitch, 2*Math.PI*Math.max(0.06,r)); }
  function section(u){
    var r=R0+(R1-R0)*u, c=chord(u), b=beta(u);
    var sb=Math.sin(b), cb=Math.cos(b), sk=skew*u*u*cMax, rk=rake*u*u;
    var pts=[], k, s, th, cam, n;
    for(k=0;k<NC;k++){                       // cara de presión
      s=-0.5+k/(NC-1);
      th=tMax*(1-0.62*u)*Math.sqrt(Math.max(0,1-4*s*s));
      cam=camb*(1-4*s*s); n=cam+th*0.5;
      pts.push([ s*c*sb + n*cb + rk, r, s*c*cb - n*sb + sk ]);
    }
    for(k=NC-1;k>=0;k--){                    // dorso
      s=-0.5+k/(NC-1);
      th=tMax*(1-0.62*u)*Math.sqrt(Math.max(0,1-4*s*s));
      cam=camb*(1-4*s*s); n=cam-th*0.5;
      pts.push([ s*c*sb + n*cb + rk, r, s*c*cb - n*sb + sk ]);
    }
    return pts;
  }
  var loops=[], i, j;
  for(i=0;i<NS;i++) loops.push(section(i/(NS-1)));
  var L=loops[0].length;
  for(i=0;i<NS;i++) for(j=0;j<L;j++){ var pp=loops[i][j]; verts.push(pp[0],pp[1],pp[2]); }
  for(i=0;i<NS-1;i++) for(j=0;j<L;j++){
    var a=i*L+j, b2=i*L+((j+1)%L), c2=(i+1)*L+j, d=(i+1)*L+((j+1)%L);
    idx.push(a,c2,b2, b2,c2,d);
  }
  function cap(st, flip){
    var base=st*L, cx=0, cy=0, cz=0, k;
    for(k=0;k<L;k++){ cx+=verts[(base+k)*3]; cy+=verts[(base+k)*3+1]; cz+=verts[(base+k)*3+2]; }
    cx/=L; cy/=L; cz/=L;
    var ci=verts.length/3; verts.push(cx,cy,cz);
    for(k=0;k<L;k++){ var a2=base+k, b3=base+((k+1)%L);
      if(flip) idx.push(ci,b3,a2); else idx.push(ci,a2,b3); }
  }
  cap(0,true); cap(NS-1,false);
  var g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ánodo de zinc (pencil anode) */
function anode(){
  var g=new THREE.Group();
  var head=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.12,6), M.brass);
  var pencil=cyl(0.06,0.06,0.34,12,{material:mat(0xb9c0c4,{metal:0.6,rough:0.5})}); pencil.position.y=-0.22;
  g.add(head,pencil); return g;
}

/* ============================================================
   CONSTRUCCIÓN DEL MOTOR  (silueta de 4 cil. marino real)
   ============================================================ */
var CYL_X = [-2.4, -0.8, 0.8, 2.4];  // ejes de cilindro
var BORE = 0.7;                       // radio camisa
var CRANK_Y = -1.4;                   // eje cigüeñal
var DECK_Y = 0.7;                     // plano junta bloque/culata

/* ---------- BLOQUE · CÁRTER · CAMPANA · PATAS ---------- */
(function blockGroup(){
  // BLOQUE MOTOR — grupo con cuerpo principal + detalles de fundición
  var block = new THREE.Group();
  var body = roundedBox(7.0, 2.05, 1.92, 0.26, M.paint);
  block.add(body);
  // reborde perimetral de la junta bloque/cárter (parting line)
  var ledge = roundedBox(7.12, 0.13, 2.02, 0.06, M.paintDk); ledge.position.y=-0.95; block.add(ledge);
  // engrosamientos de fundición sobre cada cilindro (bosses laterales)
  for(var c=0;c<4;c++){ for(var sgn=-1;sgn<=1;sgn+=2){
    var boss=cyl(0.6,0.6,0.16,20,{material:M.paint}); boss.rotation.x=Math.PI/2;
    boss.position.set(CYL_X[c], 0.2, sgn*0.96); block.add(boss);
  }}
  // nervios de fundición entre cilindros
  for(var i=0;i<5;i++){ for(var sg=-1;sg<=1;sg+=2){
    var rib=box(0.16, 1.4, 0.08, M.paintDk); rib.position.set(-2.6+i*1.3, -0.2, sg*0.97); block.add(rib);
  }}
  // tapones de núcleo (core/welch plugs) en los laterales
  for(var pp=0;pp<4;pp++){ for(var s2=-1;s2<=1;s2+=2){
    var plug=cyl(0.15,0.15,0.05,18,{material:M.brass}); plug.rotation.x=Math.PI/2;
    plug.position.set(-2.4+pp*1.6, -0.5, s2*0.99); block.add(plug);
  }}
  // pletina de culata (deck) con sus pernos — como parte del bloque
  var deck=box(6.9,0.16,1.95,M.paintLt); deck.position.y=DECK_Y-0.02+0.25; block.add(deck);
  for(var b=0;b<10;b++){ var bo=bolt(0.1,0,M.bolt); bo.position.set(-3.1+b*0.69, DECK_Y+0.06+0.25, 0.84*((b%2)?1:-1)); block.add(bo); }
  // cáncamos de izado (lifting eyes) en esquinas diagonales
  function liftEye(x,z){ var st=box(0.16,0.34,0.16,M.steelDk); st.position.set(x,1.2,z); block.add(st); var ey=tor(0.15,0.05,M.steel,10); ey.position.set(x,1.42,z); block.add(ey); }
  liftEye(-2.8, 0.65); liftEye(2.8, -0.65);
  block.position.set(0,-0.25,0);
  reg(block,'est',{name:'Engine block', ex:V(0,-1,0), exMag:1.0, cut:true,
    desc:'Cast structure (painted here, as on a real marine engine) that houses the cylinder liners, the crankshaft main bearings and the internal oil and coolant passages. It is the “skeleton” of the engine.',
    yacht:'Look for oil or water leaks at its joints, and check the anodes and mounts. A stain under the engine almost always starts here.'});
  num(31,'Engine block','est', block);

  // CÁRTER DE ACEITE (sump) — grupo con forma escalonada
  var sump=new THREE.Group();
  var sUpper=roundedBox(6.1,0.55,1.55,0.2,M.paintDk); sUpper.position.y=0.2; sump.add(sUpper);
  var sLower=roundedBox(4.4,0.65,1.15,0.22,M.paintDk); sLower.position.y=-0.25; sump.add(sLower);
  var drainBoss=cyl(0.14,0.14,0.16,12,{material:M.paintDk}); drainBoss.position.set(-1.9,-0.5,0); sump.add(drainBoss);
  var drain=cyl(0.1,0.1,0.1,6,{material:M.steelDk}); drain.position.set(-1.9,-0.6,0); sump.add(drain);
  for(var sx=0;sx<12;sx++){ var sb=bolt(0.06,0,M.bolt); sb.position.set(-2.7+sx*0.49, 0.42, 0.74*((sx%2)?1:-1)); sump.add(sb); }
  sump.position.set(0.1,-1.78,0);
  reg(sump,'est',{name:'Oil sump', ex:V(0,-1,0), exMag:2.4, cut:true,
    desc:'Reservoir at the bottom of the engine where the oil collects. The pump draws it through a strainer and delivers it under pressure to the bearings, camshaft and pistons.',
    yacht:'Check the level with the dipstick before every trip (the “O” in WOBBLE = Oil). Milky oil = water getting in; a level that rises on its own = possible diesel.'});
  num(32,'Oil sump','est', sump);

  // CAMPANA DEL VOLANTE (bell housing) — gran cilindro en popa
  var bell=new THREE.Group();
  var bellCyl=cyl(1.45,1.45,1.15,40,{material:M.paint}); bellCyl.rotation.z=Math.PI/2;
  var bellCone=cyl(1.45,1.05,0.75,40,{material:M.paint}); bellCone.rotation.z=-Math.PI/2; bellCone.position.x=-0.92;
  // tapa de inspección + boss del arranque
  var insp=box(0.1,0.5,0.4,M.paintDk); insp.position.set(0.62,0.85,0.7); bell.add(insp);
  var starterBoss=cyl(0.32,0.32,0.2,18,{material:M.paintDk}); starterBoss.rotation.x=Math.PI/2; starterBoss.position.set(0.3,-0.25,-1.0); bell.add(starterBoss);
  bell.add(bellCyl, bellCone);
  bell.position.set(4.0,-1.0,0);   // concéntrica con el cigüeñal: encierra el volante
  reg(bell,'tra',{name:'Bell housing', ex:V(1,0,0), exMag:1.0, cut:true,
    desc:'Housing that joins the block to the gearbox and encloses the flywheel. A side window usually exposes the ring gear for timing the engine.',
    yacht:'Keep this area clean and dry: oil drips from the rear crankshaft seal or the gearbox bell show up here.'});
  boltCircle(bell, 12, 1.36, 0.09, 'x', 0.6, M.bolt);

  // PATAS / SILENTBLOCKS (4)
  var footPos=[[-2.9,1.0],[-2.9,-1.0],[3.3,1.05],[3.3,-1.05]];
  for(var f=0;f<4;f++){
    var foot=new THREE.Group();
    var bracket=box(0.45,0.9,0.4,M.paintDk); bracket.position.y=0.35;
    var plate=box(0.7,0.12,0.6,M.steelDk); plate.position.y=-0.12;
    var pad=cyl(0.22,0.26,0.34,16,{material:M.rubber}); pad.position.y=-0.4;
    var stud=cyl(0.07,0.07,0.45,10,{material:M.steel}); stud.position.y=-0.68;
    foot.add(bracket,plate,pad,stud);
    foot.position.set(footPos[f][0],-1.5,footPos[f][1]);
    reg(foot,'est',{name:'Engine mount (flexible mount)', noPick:(f>0), ex:V(0,-1,0), exMag:1.6,
      desc:'Anti-vibration support that ties the engine to the boat’s bearers. The rubber block isolates the hull from engine vibration.',
      yacht:'Check the rubber isn’t cracked or crushed and that the nuts are tight. Sagging mounts throw the shaft out of line and punish the stern gland.'});
  }
})();

/* ---------- CIGÜEÑAL · PISTONES · BIELAS (visibles en corte) ---------- */
(function crankTrain(){
  var Mj = mat(0x8c98a4,{metal:0.98, rough:0.25});
  // CIGÜEÑAL — codos 0/180/180/0 (4 cil. en línea real)
  var crank=new THREE.Group();
  for(var s=0;s<5;s++){ var mj=cyl(0.26,0.26,0.42,20,{material:Mj}); mj.rotation.z=Math.PI/2; mj.position.x=-2.9+s*1.45; crank.add(mj); }
  for(var c=0;c<4;c++){
    var cx=CYL_X[c], ang=throwAngle(c), off=ANIM.OFF;
    var ry=Math.cos(ang)*off, rz=Math.sin(ang)*off;
    var rj=cyl(0.2,0.2,0.4,18,{material:Mj}); rj.rotation.z=Math.PI/2; rj.position.set(cx,ry,rz); crank.add(rj);
    for(var w=0;w<2;w++){
      var web=box(0.13,0.82,0.5, M.steelDk); web.position.set(cx+(w?0.28:-0.28), ry*0.5, rz*0.5); web.lookAt(0,ry,rz); crank.add(web);
      var cw=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.13,18,1,false,0,Math.PI), M.steelDk);
      cw.rotation.x=Math.PI/2; cw.position.set(cx+(w?0.28:-0.28), -ry*0.7, -rz*0.7); crank.add(cw);
    }
  }
  crank.position.set(0, CRANK_Y, 0);
  ANIM.crank=crank;
  reg(crank,'com',{name:'Crankshaft', ex:V(0,-1,0), exMag:1.0, noExplodeAnim:true,
    desc:'Turns the up-and-down motion of the pistons into rotation. On an in-line four the crankpins are set so cylinders 1 and 4 rise together while 2 and 3 fall, giving a firing order of 1-3-4-2 and one power stroke every half turn.',
    yacht:'Not an on-board maintenance item, but its turning depends on oil: low pressure = risk of damaging the main and big-end bearings.'});
  num(13,'Crankshaft','com', crank);

  // PISTONES + BIELAS (animables)
  for(var p=0;p<4;p++){
    var px=CYL_X[p];
    var py=pinY(p,0)+0.1, pz=0;
    // pistón
    var grp=new THREE.Group();
    var skirt=cyl(BORE*0.84,BORE*0.84,0.6,24,{material:M.alu});
    var crown=cyl(BORE*0.84,BORE*0.84,0.14,24,{material:M.aluDk}); crown.position.y=0.34;
    grp.add(skirt,crown);
    for(var r=0;r<3;r++){ var ring=tor(BORE*0.84,0.03,M.steel,8); ring.rotation.x=Math.PI/2; ring.position.y=0.18-r*0.11; grp.add(ring); }
    grp.position.set(px,py,0);
    reg(grp,'com',{name: p===0?'Piston':'Piston (cyl. '+(p+1)+')', ex:V(0,1,0), exMag:2.0+p*0.12,
      desc:'Plunger that takes the pressure of the burning gases and passes it to the connecting rod. Its rings seal the chamber and control the oil on the cylinder wall.',
      yacht:'Blue smoke from the exhaust usually means worn rings or valve guides (the engine is “burning oil”). It’s a diagnosis you should know how to read.'});
    if(p===0) num(11,'Piston','com', grp);
    ANIM.pistons.push({m:grp, c:p, x:px});

    // biela suelta (para poder orientarla cada fotograma)
    var rod=new THREE.Group();
    rod.add(box(0.17,ANIM.L,0.3, M.steelDk));
    var be=cyl(0.26,0.26,0.44,16,{material:M.steelDk}); be.rotation.z=Math.PI/2; be.position.y=-ANIM.L/2; rod.add(be);
    var se=cyl(0.14,0.14,0.34,14,{material:M.steelDk}); se.rotation.z=Math.PI/2; se.position.y=ANIM.L/2; rod.add(se);
    if(p===1){
      reg(rod,'com',{name:'Connecting rod', ex:V(0,1,0), exMag:2.3,
        desc:'Links the piston to the crankshaft and converts the piston’s linear thrust into turning torque. It works in tension and compression thousands of times a minute.',
        yacht:'Internal part; its health depends on lubrication. A dry metallic knock at idle can betray play in the big-end bearing.'});
      num(12,'Connecting rod','com', rod);
    } else {
      rod.traverse(function(o){ if(o.isMesh){o.castShadow=true;o.receiveShadow=true;} });
      groups.com.add(rod);
    }
    ANIM.rods.push({m:rod, c:p, x:px});

    // volumen de gases dentro del cilindro (didáctico, se ve en corte)
    var gm=mat(0x6ab0e0,{metal:0.0, rough:0.5, opacity:0.28, emissive:0x2a4a66, ei:0.4});
    var gas=cyl(BORE*0.8,BORE*0.8,1,20,{material:gm});
    gas.position.set(px,0,0); gas.castShadow=false; gas.receiveShadow=false;
    gasGroup.add(gas);
    ANIM.gas.push({m:gas, c:p, x:px, mat:gm});
  }
})();

/* ---------- CAMISAS · CULATA · TAPA · VÁLVULAS · INYECTORES ---------- */
(function head(){
  // CAMISAS (liners) — tubos abiertos, visibles en corte
  for(var c=0;c<4;c++){
    var liner=cyl(BORE,BORE,1.75,30,{material:M.castDk, open:true});
    liner.position.set(CYL_X[c],0.0,0);
    reg(liner,'com',{name: c===0?'Cylinder / liner':'Liner (cyl. '+(c+1)+')', ex:V(0,1,0), exMag:1.6, cut:true, noShadow:true, side:THREE.DoubleSide,
      desc:'Bore in which the piston travels up and down. It is usually a replaceable liner; this is where the diesel is compressed and burned.',
      yacht:'Its wear (going oval) reduces compression and power. It explains why an old engine starts worse from cold.'});
    if(c===0) num(10,'Cylinder / liner','com', liner);
  }

  // CULATA (cylinder head) — pintada como el bloque
  var head=roundedBox(6.5, 0.85, 1.9, 0.2, M.paint);
  head.position.set(0, DECK_Y+0.45, 0);
  reg(head,'com',{name:'Cylinder head & valves', ex:V(0,1,0), exMag:2.0, cut:true,
    desc:'Closes the top of the cylinders and forms the combustion chamber. It houses the valves, injectors and coolant passages.',
    yacht:'The head gasket is critical: if it fails it mixes water, oil and gases (white smoke, milky oil, overheating). Watch the temperature and the look of the oil.'});
  num(14,'Cylinder head & valves','com', head);

  // TAPA DE BALANCINES (rocker cover) — alu, con placa de fabricante y tapón de aceite
  var rocker=roundedBox(6.0, 0.62, 1.45, 0.24, M.alu);
  rocker.position.set(0, DECK_Y+1.05, 0);
  reg(rocker,'est',{name:'Rocker cover', ex:V(0,1,0), exMag:2.4, cut:true,
    desc:'Cover that closes the top of the cylinder head and contains the oil that lubricates the valves and rockers. It carries the oil filler cap.',
    yacht:'This is where you top up the oil. A worn cover gasket lets oil weep down the sides of the head.'});
  // placa de fabricante (detalle visual)
  var plate=box(1.6,0.02,0.5, M.steelDk); plate.position.set(0, DECK_Y+1.34, 0.4); groups.est.add(plate);
  // tapón de llenado de aceite
  var oilcap=cyl(0.24,0.24,0.2,20,{material:M.aluDk}); oilcap.position.set(-2.1, DECK_Y+1.4, 0.0);
  reg(oilcap,'est',{name:'Oil filler cap', noPick:false, ex:V(0,1,0), exMag:2.6,
    desc:'Opening through which oil is added to the engine, on top of the rocker cover.',
    yacht:'Fill with the correct oil and don’t overfill. Wipe around it before opening so no dirt gets in.'});
  // pernos de la tapa
  for(var bb=0;bb<8;bb++){ var bo=bolt(0.08,0,M.bolt); bo.position.set(-2.6+bb*0.74, DECK_Y+1.32, 0.66*((bb%2)?1:-1)); groups.est.add(bo); }

  // VÁLVULAS (2/cil) + muelles + balancines (visibles con tapa quitada/corte)
  for(var v=0;v<4;v++){
    var vref={};
    for(var k=0;k<2;k++){
      var vz=k?0.36:-0.36;                       // k=1 → admisión (+Z) · k=0 → escape (−Z)
      var stem=cyl(0.05,0.05,0.6,10,{material:M.steel}); stem.position.set(CYL_X[v], DECK_Y+0.85, vz); groups.com.add(stem);
      var vh=cyl(0.15,0.09,0.1,14,{material:M.steelDk}); vh.position.set(CYL_X[v], DECK_Y+0.55, vz); groups.com.add(vh);
      var spr=cyl(0.11,0.11,0.3,10,{material:mat(COL.steelDk,{metal:0.9,rough:0.4}), open:true}); spr.position.set(CYL_X[v], DECK_Y+1.0, vz);
      reg(spr,'com',{name:'Valve spring', noPick:(v>0||k>0), ex:V(0,1,0), exMag:2.2,
        desc:'Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.',
        yacht:'Internal head component; no on-board attention required.'});
      vref[k?'in':'ex']={stem:stem, head:vh, spring:spr, y0:{stem:DECK_Y+0.85, head:DECK_Y+0.55, spring:DECK_Y+1.0}};
    }
    var rk=box(0.6,0.09,0.12, M.steel); rk.position.set(CYL_X[v], DECK_Y+1.2, 0); groups.com.add(rk);
    vref.rocker=rk;
    ANIM.valves.push(vref);
  }

  // INYECTORES (4) en la culata
  for(var i=0;i<4;i++){
    var inj=new THREE.Group();
    inj.add(cyl(0.1,0.14,0.5,14,{material:M.steel}));
    var nut=cyl(0.17,0.17,0.16,6,{material:M.steelDk}); nut.position.y=0.08; inj.add(nut);
    var top=cyl(0.08,0.08,0.26,12,{material:mat(COL.fuel,{metal:0.8,rough:0.4})}); top.position.y=0.36; inj.add(top);
    inj.position.set(CYL_X[i], DECK_Y+1.25, 0);
    reg(inj,'com',{name: i===0?'Injector':'Injector (cyl. '+(i+1)+')', ex:V(0,1,0), exMag:2.7, cut:true,
      desc:'Atomises the diesel at very high pressure into the chamber, at exactly the right instant, so it ignites from the heat of the compressed air (there is no spark plug).',
      yacht:'Dirty injectors give black smoke, hesitation and hard starting. Calibration is a workshop job, but their failure is diagnosed by the smoke.'});
    if(i===0) num(6,'Injector','com', inj);
  }

  // CAMISAS DE REFRIGERACIÓN (water jacket) — envolvente translúcida
  var jacket=box(7.05, 2.1, 2.0, mat(COL.cool,{metal:0.2, rough:0.4, opacity:0.14, side:THREE.DoubleSide}));
  jacket.position.set(0, -0.25, 0);
  reg(jacket,'ref',{name:'Water jacket (cooling)', noShadow:true, ex:V(0,1,0), exMag:0.6, cut:true,
    desc:'Internal cavities in the block and head through which the coolant flows around each cylinder to carry away the heat of combustion.',
    yacht:'You can’t see or touch them, but if they fur up with scale or salt they lose cooling. The correct antifreeze keeps them clean.'});
  num(23,'Water jacket (cooling)','ref', jacket);
})();

/* ---------- FRONTAL DE LA CORREA (cara reconocible) + arranque, varilla, filtro aceite ---------- */
(function frontEnd(){
  var FX = -3.55;                 // plano frontal del bloque
  var coolM = mat(COL.cool,{metal:0.55, rough:0.45});

  // tapa de distribución (timing cover) frontal
  // sin rotar: la placa ya es fina en X, que es la cara frontal del bloque
  var tcov=roundedBox(0.22,1.95,1.85,0.12,M.paintLt); tcov.position.set(FX,-0.25,0);
  reg(tcov,'est',{name:'Timing cover', noPick:true, ex:V(-1,0,0), exMag:1.4});

  // POLEA DEL CIGÜEÑAL (damper) al frente del cigüeñal
  var cp=pulley(0.46,0.3,M.steelDk); cp.rotation.z=Math.PI/2; cp.position.set(FX-0.25,CRANK_Y,0);
  ANIM.spin.push({o:cp, r:1.0});
  /*  LA MANIVELA · `handstart` no tenia nada que agarrar. Va en la nariz del ciguenal,
      que es donde encaja: un eje corto, un brazo y un puño.
      **Nace oculta**: una manivela no vive puesta en el motor, se trae y se encaja, y
      el taller la enseña cuando toca. `visBase` recuerda que nacio apagada, asi que el
      montaje no la enciende sin querer.                                            */
  var manivela=new THREE.Group();
  manivela.add(cyl(0.05,0.05,0.3,10,{material:M.steelDk}));
  var mBrazo=box(0.06,0.4,0.06,M.steelDk); mBrazo.position.set(0,0.2,-0.16);
  var mPuno=cyl(0.055,0.055,0.16,10,{material:mat(0x2c2a28,{metal:0.1,rough:0.9})});
  mPuno.rotation.x=Math.PI/2; mPuno.position.set(0,0.4,-0.24);
  manivela.add(mBrazo,mPuno);
  manivela.rotation.z=Math.PI/2;
  manivela.position.set(FX-0.62,CRANK_Y,0);
  manivela.visible=false; groups.est.add(manivela);
  regEnSitio(manivela,'est',{name:'Starting handle', ex:V(-1,0,0), exMag:1.6,
    desc:'A crank that engages the nose of the crankshaft, for starting a small diesel by hand with the decompressors lifted.',
    yacht:'Thumb on the same side as your fingers, and never wrap it round. A handle that kicks back breaks wrists.'});

  reg(cp,'est',{name:'Crankshaft pulley (damper)', ex:V(-1,0,0), exMag:1.6,
    desc:'Pulley on the nose of the crankshaft that drives the accessory belt (water pump and alternator) and damps torsional vibration.',
    yacht:'If the belt squeals or slips, check here: an oily pulley or a slack belt rob you of charging and cooling.'});

  // BOMBA DE AGUA DULCE / CIRCULADORA (#21) — frontal, sobre el cigüeñal
  var fwp=new THREE.Group();
  var fwBody=cyl(0.34,0.34,0.5,24,{material:coolM}); fwBody.rotation.z=Math.PI/2;
  var fwSnout=cyl(0.16,0.16,0.3,16,{material:coolM}); fwSnout.rotation.x=Math.PI/2; fwSnout.position.set(0,0,0.32);
  var fwPul=pulley(0.3,0.22,M.steelDk); fwPul.rotation.z=Math.PI/2; fwPul.position.x=-0.42;
  fwp.add(fwBody,fwSnout,fwPul); ANIM.spin.push({o:fwPul, r:1.53});
  fwp.position.set(FX-0.15,-0.35,0.0);
  reg(fwp,'ref',{name:'Freshwater (circulating) pump', ex:V(-0.6,0.2,0), exMag:2.2, cut:true,
    desc:'Circulates the coolant (fresh water + antifreeze) through the block, the head and the heat exchanger. It is driven by the crankshaft belt.',
    yacht:'It usually shares a belt with the alternator: a slack or broken belt stops circulation and the engine overheats (WOBBLE: Belts).'});
  num(21,'Freshwater (circulating) pump','ref', fwp);

  // ALTERNADOR (accesorio) — arriba a un lado, con polea y tirante de tensado
  var alt=new THREE.Group();
  var altBody=cyl(0.32,0.32,0.7,24,{material:M.steelDk}); altBody.rotation.z=Math.PI/2;
  var altCap=cyl(0.28,0.28,0.1,24,{material:M.steel}); altCap.rotation.z=Math.PI/2; altCap.position.x=0.4;
  var altPul=pulley(0.22,0.18,M.steel); altPul.rotation.z=Math.PI/2; altPul.position.x=-0.45;
  var altFan=cyl(0.26,0.26,0.04,12,{material:M.steelDk}); altFan.rotation.z=Math.PI/2; altFan.position.x=-0.32;
  alt.add(altBody,altCap,altPul,altFan); ANIM.spin.push({o:altPul, r:2.1}); ANIM.spin.push({o:altFan, r:2.1});
  alt.position.set(FX+0.1,0.7,0.7);
  INTER.alt=alt; INTER.altHomeZ=0.7;
  reg(alt,'est',{name:'Alternator', ex:V(-0.5,0.4,0.5), exMag:2.4,
    desc:'Generator that charges the batteries and powers the electrical loads while the engine runs, driven by the crankshaft belt.',
    yacht:'Check the tension and condition of its belt (the “B” in WOBBLE: Belts). If it’s a shared belt and it breaks, you lose both charging and cooling.'});
  // tirante de tensado
  var strap=box(0.7,0.08,0.04,M.steelDk); strap.position.set(FX+0.2,0.4,0.45); strap.rotation.z=-0.5; groups.est.add(strap);

  // BOMBA DE AGUA SALADA (#18) — bronce, con tapa atornillada del impeller
  var rwp=new THREE.Group();
  var rwBody=cyl(0.36,0.36,0.42,24,{material:M.bronze}); rwBody.rotation.z=Math.PI/2;
  var rwCover=cyl(0.37,0.37,0.06,24,{material:M.bronzeDk}); rwCover.rotation.z=Math.PI/2; rwCover.position.x=-0.24;
  // tornillos de la tapa (impeller)
  boltCircle(rwp, 6, 0.28, 0.05, 'x', -0.27, M.bolt);
  // racores de entrada/salida
  var rwIn=cyl(0.1,0.1,0.24,12,{material:M.bronzeDk}); rwIn.position.set(0,-0.34,0);
  var rwOut=cyl(0.1,0.1,0.24,12,{material:M.bronzeDk}); rwOut.rotation.x=Math.PI/2; rwOut.position.set(0,0,0.3);
  var rwPul=pulley(0.24,0.2,M.steelDk); rwPul.rotation.z=Math.PI/2; rwPul.position.x=0.34;
  // IMPELLER de goma (6 paletas) dentro de la carcasa
  var imp=new THREE.Group();
  var impHub=cyl(0.1,0.1,0.2,14,{material:M.steelDk}); impHub.rotation.z=Math.PI/2; imp.add(impHub);
  var vaneM=mat(0x1d2228,{metal:0.03,rough:0.95});
  INTER.impVanes=[];
  for(var b=0;b<6;b++){
    var vane=box(0.18,0.26,0.05, vaneM);
    var va=(b/6)*Math.PI*2;
    vane.position.set(0, Math.cos(va)*0.17, Math.sin(va)*0.17);
    vane.rotation.x=va; imp.add(vane); INTER.impVanes.push(vane);
  }
  imp.position.x=-0.08; rwp.add(imp);
  INTER.rwp=rwp; INTER.rwCover=rwCover; INTER.impeller=imp; INTER.rwCoverX=-0.24;
  rwp.add(rwBody,rwCover,rwIn,rwOut,rwPul); ANIM.spin.push({o:rwPul, r:1.9}); ANIM.spin.push({o:imp, r:1.9});
  rwp.position.set(FX+0.05,-0.7,-0.7);
  reg(rwp,'ref',{name:'Raw-water pump (impeller)', ex:V(-0.5,-0.2,-0.5), exMag:2.4, cut:true,
    desc:'Belt-driven rubber-vane pump (impeller) that draws in seawater and pushes it through the circuit to the heat exchanger. The bronze cover gives access to the impeller.',
    yacht:'THE star item of the RYA syllabus: the rubber impeller is destroyed in seconds if it runs dry. Carry a spare and learn to change it (the bronze cover comes off). Check it every season.'});
  num(18,'Raw-water pump (impeller)','ref', rwp);

  // POLEA TENSORA / GUÍA
  var idler=pulley(0.18,0.16,M.steelDk); idler.rotation.z=Math.PI/2; idler.position.set(FX-0.1,0.0,-0.55); ANIM.spin.push({o:idler, r:2.5});
  reg(idler,'est',{name:'Idler / tensioner pulley', noPick:true, ex:V(-1,0,0), exMag:1.6});

  // CORREA (serpentina/trapezoidal) — bucle cerrado por las poleas frontales
  var BX = FX-0.5;
  var beltPts=[
    V(BX,CRANK_Y+0.5,0), V(BX,-0.55,0.62), V(BX,0.5,0.78), V(BX,0.95,0.7),
    V(BX,0.5,0.5), V(BX,0.0,-0.6), V(BX,-0.55,-0.78), V(BX,CRANK_Y+0.2,-0.45), V(BX,CRANK_Y-0.46,0)
  ];
  var beltCurve=new THREE.CatmullRomCurve3(beltPts, true, 'catmullrom', 0.5);
  var belt=new THREE.Mesh(new THREE.TubeGeometry(beltCurve, 120, 0.05, 10, true), M.rubber);
  groups.est.add(belt);
  /*  LA CORREA. Ya estaba en `groups.est`. Es la que más renta de las siete: mejora
      dos preguntas de la fase 5 y el taller de tensarla, que ya está construido.  */
  reg(belt,'est',{name:'Drive belt', ex:V(-1,0,0), exMag:1.4,
    desc:'One belt from the crankshaft pulley drives the alternator, the freshwater pump and the raw-water pump.',
    yacht:'The B in WOBBLE. About a centimetre of give at the longest span, no cracks, no glaze, no black dust. When it goes you lose both cooling circuits AND your charging at the same moment.'});
  var beltFlat=new THREE.Mesh(new THREE.TubeGeometry(beltCurve, 120, 0.07, 4, true), M.rubberLt);
  beltFlat.userData={sys:'est'}; groups.est.add(beltFlat);
  INTER.belt=belt; INTER.beltFlat=beltFlat; INTER.beltPts=beltPts; INTER.beltPressIdx=2;
  // dedo/indicador para comprobar la flecha de la correa
  var thumb=cyl(0.09,0.06,0.3,14,{material:mat(0xd8c49a,{metal:0.05,rough:0.85})});
  thumb.rotation.x=Math.PI/2; thumb.position.set(BX,0.5,1.25); thumb.visible=false;
  groups.est.add(thumb); INTER.beltThumb=thumb;

  // MOTOR DE ARRANQUE (accesorio) — junto a la campana, abajo
  var starter=new THREE.Group();
  var stBody=cyl(0.3,0.3,0.8,20,{material:M.steelDk}); stBody.rotation.z=Math.PI/2;
  var stSol=cyl(0.16,0.16,0.5,16,{material:M.steel}); stSol.rotation.z=Math.PI/2; stSol.position.set(0,0.32,0);
  var stNose=cyl(0.18,0.14,0.3,16,{material:M.cast}); stNose.rotation.z=Math.PI/2; stNose.position.x=0.5;
  starter.add(stBody,stSol,stNose);
  starter.position.set(3.0,-1.25,-0.95);
  reg(starter,'est',{name:'Starter motor', ex:V(0.3,-0.4,-0.5), exMag:2.2,
    desc:'Electric motor that spins the flywheel (via its ring gear) to start the diesel. It draws a large current from the batteries for a moment.',
    yacht:'A “click” with no cranking is usually a flat battery or loose/corroded starter connections rather than the motor itself. Check the terminals and earth.'});

  // VARILLA DE NIVEL DE ACEITE (dipstick) — mango amarillo, bien visible
  var dip=new THREE.Group();
  var dipY=mat(0xf4c020,{metal:0.35, rough:0.5});
  var guide=cyl(0.075,0.075,0.5,12,{material:M.steelDk}); guide.position.y=-0.1;        // tubo guía hacia el bloque
  var rodd=cyl(0.045,0.045,1.35,10,{material:M.steel}); rodd.position.y=0.6;             // varilla
  var collar=cyl(0.06,0.06,0.16,10,{material:dipY}); collar.position.y=1.18;
  var loop=tor(0.15,0.045,dipY,12); loop.position.y=1.42;                                // anilla de tiro amarilla
  dip.add(guide,rodd,collar,loop);
  // marcas mín/máx y película de aceite (para leer el nivel)
  var markM=mat(0x232830,{metal:0.4,rough:0.6});
  var mkMin=tor(0.052,0.013,markM,8); mkMin.rotation.x=Math.PI/2; mkMin.position.y=0.10; dip.add(mkMin);
  var mkMax=tor(0.052,0.013,markM,8); mkMax.rotation.x=Math.PI/2; mkMax.position.y=0.42; dip.add(mkMax);
  var oilM=mat(0x2a1d0a,{metal:0.25,rough:0.42});
  var oilFilm=cyl(0.057,0.057,1,12,{material:oilM}); dip.add(oilFilm);
  /*  ══ LA BOMBA DE VACIADO DE ACEITE ═══════════════════════════════
      **No es una pieza del motor: es una herramienta.** No vive atornillada a nada
      — se trae del pañol, se mete el tubo por el hueco de la varilla, se bombea y se
      guarda. Por eso se dibuja **junto a la varilla**, que es donde se usa.

      Y por eso existe: sin ella el taller `oilchange` de la P2 no se puede hacer con
      las manos, que es la regla de esa parte entera. En casi ningún motor marino se
      puede llegar al tapón del cárter, así que **el aceite sale por donde entra la
      varilla** y esto es lo único que lo saca.                                   */
  (function bombaVaciado(){
    var g=new THREE.Group();
    var cuerpo=cyl(0.10,0.10,0.34,14,{material:M.steelDk});
    var tapa=cyl(0.11,0.11,0.05,14,{material:M.brass}); tapa.position.y=0.19;
    var mango=cyl(0.028,0.028,0.30,10,{material:M.steel}); mango.position.y=0.36;
    var puno=cyl(0.06,0.06,0.05,10,{material:M.rubber}); puno.position.y=0.53;
    g.add(cuerpo,tapa,mango,puno);
    /*  el tubo, que es lo que la hace reconocible: baja hasta el hueco de la varilla  */
    var tubo=pipe([V(0.10,0.10,0),V(0.34,0.02,0.20),V(0.34,-0.42,0.52)],0.022,M.rubberLt);
    g.add(tubo);
    g.position.set(-2.55,0.62,1.30);
    reg(g,'est',{name:'Oil extraction pump', ex:V(0,1,0), exMag:1.0,
      desc:'A hand pump with a tube that goes down the dipstick hole. On most marine engines the sump drain plug cannot be reached, so this is how the old oil comes out.',
      yacht:'It lives in the locker, not on the engine. Carry one, and carry a container that holds more than the sump does \u2014 finding out halfway through that it does not is a bad afternoon.'});
  })();

  INTER.dip=dip; INTER.dipOil=oilFilm; INTER.dipOilMat=oilM; INTER.dipHome=V(-2.0,-0.15,1.02);
  dip.position.set(-2.0,-0.15,1.02);
  reg(dip,'est',{name:'Oil dipstick', ex:V(-0.2,0.6,0.5), exMag:2.4,
    desc:'Measures the oil level in the sump. Pull it out, wipe it, push it fully home and pull it again to read between the min./max. marks.',
    yacht:'The “O” in WOBBLE: check the level cold and on level trim before every trip. Sudden changes in level or colour warn of trouble.'});

  // FILTRO DE ACEITE (spin-on, accesorio)
  var oilf=canister(0.26,0.6, M.steel, M.steelDk);
  oilf.rotation.x=Math.PI/2; oilf.position.set(-2.5,-0.55,1.05);
  reg(oilf,'est',{name:'Oil filter', ex:V(0,0,1), exMag:2.4,
    desc:'Screw-on (spin-on) cartridge that cleans the oil circulating through the engine, trapping metal particles and carbon.',
    yacht:'Changed with the oil at every service. Oil the new seal and tighten by hand; carry a filter wrench and a spare on board.'});
})();

/* ---------- ADMISIÓN · ESCAPE · TURBO · CODO MEZCLADOR ---------- */
(function manifolds(){
  // COLECTOR DE ADMISIÓN (#8) — lado +Z (babor), alu, 4 ramales
  var intM=M.alu;
  var intLog=cyl(0.3,0.3,5.4,22,{material:intM}); intLog.rotation.z=Math.PI/2; intLog.position.set(-0.1, DECK_Y+0.55, 1.15);
  reg(intLog,'com',{name:'Intake manifold', ex:V(0,0.3,1), exMag:2.4, cut:true,
    desc:'Distributes the air (clean, and pressurised if there is a turbo) to the intake valves of each cylinder.',
    yacht:'Leaks at its joints let the engine breathe unfiltered air and lose performance. Keep the flanges tight and crack-free.'});
  num(8,'Intake manifold','com', intLog);
  for(var a=0;a<4;a++){ var ra=hose([V(CYL_X[a],DECK_Y+0.55,1.15),V(CYL_X[a],DECK_Y+0.6,0.92),V(CYL_X[a],DECK_Y+0.65,0.8)],0.15,intM,{tension:0.2}); ra.userData={sys:'com'}; groups.com.add(ra); }

  // COLECTOR DE ESCAPE (#15) — lado −Z, aspecto refrigerado por agua (pintado)
  var exM=mat(COL.exh,{metal:0.35, rough:0.88, env:0.5});
  var exLog=cyl(0.34,0.34,5.4,22,{material:exM}); exLog.rotation.z=Math.PI/2; exLog.position.set(-0.1, DECK_Y+0.45, -1.15);
  reg(exLog,'com',{name:'Exhaust manifold', ex:V(0,0.3,-1), exMag:2.4, cut:true,
    desc:'Collects the burned gases from the cylinders and carries them to the turbo and the mixing elbow. On a marine engine it is usually water-cooled.',
    yacht:'An internal leak in the water-cooled manifold can put seawater into the cylinders. The colour of the smoke here tells you everything (blue/black/white).'});
  num(15,'Exhaust manifold','com', exLog);
  for(var e=0;e<4;e++){ var re=hose([V(CYL_X[e],DECK_Y+0.5,-0.8),V(CYL_X[e],DECK_Y+0.48,-0.95),V(CYL_X[e],DECK_Y+0.45,-1.15)],0.17,exM,{tension:0.2}); re.userData={sys:'com'}; groups.com.add(re); }
  // bridas del colector de escape
  for(var ef=0;ef<4;ef++){ var fl=flange(0.22,0.06,'z',M.steelDk,4); fl.position.set(CYL_X[ef],DECK_Y+0.45,-0.78); groups.com.add(fl); }

  // TURBOCOMPRESOR (#9) — popa, lado escape
  var turbo=new THREE.Group();
  var hot=tor(0.3,0.18,mat(COL.exh,{metal:0.35,rough:0.9,env:0.5}),12); hot.rotation.y=Math.PI/2; hot.position.z=-0.24;
  var cold=tor(0.3,0.18,mat(COL.alu,{metal:0.8,rough:0.45}),12); cold.rotation.y=Math.PI/2; cold.position.z=0.24;
  var chra=cyl(0.16,0.16,0.46,16,{material:M.steel}); chra.rotation.x=Math.PI/2;
  var mouth=cyl(0.22,0.22,0.18,16,{material:M.steelDk}); mouth.rotation.x=Math.PI/2; mouth.position.z=0.46;
  turbo.add(hot,cold,chra,mouth);
  turbo.position.set(2.7, DECK_Y+0.55, -1.35);
  reg(turbo,'com',{name:'Turbocharger', ex:V(0.4,0.4,-0.6), exMag:2.6, cut:true,
    desc:'Uses the energy of the exhaust gases to drive a turbine that compresses the intake air. More air = more fuel burned = more power.',
    yacht:'Let it idle to cool before shutting down after running under load: stopping it hot “bakes” the turbo oil and shortens its life.'});
  num(9,'Turbocharger','com', turbo);

  // FILTRO DE AIRE (#7) — en la boca del compresor del turbo
  var af=new THREE.Group();
  var afCan=cyl(0.42,0.42,0.6,24,{material:mat(COL.air,{metal:0.45,rough:0.6})}); afCan.rotation.x=Math.PI/2;
  var afCap=cyl(0.46,0.34,0.14,24,{material:M.steelDk}); afCap.rotation.x=Math.PI/2; afCap.position.z=0.36;
  af.add(afCan,afCap);
  af.position.set(2.7, DECK_Y+0.55, -0.55);
  reg(af,'com',{name:'Air filter', ex:V(0.2,0.3,0.6), exMag:2.4, cut:true,
    desc:'Cleans the air before it enters the engine, trapping dust and salt. On a boat it also guards against water droplets.',
    yacht:'Keep it clean and dry: a dirty filter chokes the engine (black smoke, lack of power). Check it after rough weather.'});
  num(7,'Air filter','com', af);

  // CODO MEZCLADOR DE ESCAPE (#24) — popa-arriba, curva hacia atrás
  var elbow=new THREE.Group();
  var ePipe=cyl(0.26,0.26,0.7,18,{material:exM}); ePipe.rotation.z=0.6;
  var eBend=tor(0.26,0.26,exM,12); eBend.rotation.y=Math.PI/2; eBend.position.set(0.35,-0.28,0);
  var eDown=cyl(0.26,0.26,0.6,18,{material:exM}); eDown.position.set(0.62,-0.55,0); eDown.rotation.z=-0.2;
  var eInj=cyl(0.1,0.1,0.26,12,{material:mat(COL.raw,{metal:0.6,rough:0.45})}); eInj.position.set(-0.15,0.28,0);
  elbow.add(ePipe,eBend,eDown,eInj);
  elbow.position.set(3.3, DECK_Y+1.0, -1.0);
  reg(elbow,'ref',{name:'Exhaust mixing elbow', ex:V(0.5,0.3,-0.5), exMag:2.4, cut:true,
    desc:'Point where the seawater that has already cooled the engine is injected into the exhaust gases, cooling and silencing them before they leave at the stern.',
    yacht:'If no water comes out of the exhaust, STOP the engine! It signals a cooling failure (impeller, strainer or pump). The elbow clogs with carbon over the years.'});
  num(24,'Exhaust mixing elbow','ref', elbow);
})();

/* ---------- REFRIGERACIÓN: intercambiador, expansión, termostato, toma, filtro, mangueras ---------- */
(function cooling(){
  var rawM=mat(COL.raw,{metal:0.5,rough:0.5}), rawH=mat(COL.raw,{metal:0.2,rough:0.7});
  var coolM=mat(COL.cool,{metal:0.5,rough:0.5}), coolH=mat(COL.cool,{metal:0.2,rough:0.7});
  var HXY=2.75;

  // INTERCAMBIADOR DE CALOR (#19) — cilindro horizontal sobre el motor
  var hx=new THREE.Group();
  var shell=cyl(0.5,0.5,4.0,30,{material:coolM}); shell.rotation.z=Math.PI/2; hx.add(shell);
  var capL=cyl(0.54,0.54,0.26,30,{material:rawM}); capL.rotation.z=Math.PI/2; capL.position.x=-2.1; hx.add(capL);
  var capR=capL.clone(); capR.position.x=2.1; hx.add(capR);
  hx.add((function(){var f=flange(0.55,0.1,'x',M.steelDk,8); f.position.x=-1.92; return f;})());
  hx.add((function(){var f=flange(0.55,0.1,'x',M.steelDk,8); f.position.x=1.92; return f;})());
  // racores de entrada/salida en las tapas
  var hxIn=cyl(0.1,0.1,0.3,12,{material:rawM}); hxIn.position.set(-2.2,-0.4,0); hx.add(hxIn);
  var hxOut=cyl(0.1,0.1,0.3,12,{material:rawM}); hxOut.position.set(2.2,-0.4,0); hx.add(hxOut);
  hx.position.set(0.15, HXY, 0);
  reg(hx,'ref',{name:'Heat exchanger', ex:V(0,1,0), exMag:2.6, cut:true,
    desc:'Like a “marine radiator”: inside, seawater flows through a tube bundle and cools the coolant (fresh water) around it, WITHOUT the two liquids ever mixing.',
    yacht:'Its tubes block with salt and scale; when dirty it overheats the engine. Check the anode that protects it from corrosion.'});
  num(19,'Heat exchanger','ref', hx);
  // haz de tubos interno (visible en corte)
  for(var t=0;t<7;t++){ var tube=cyl(0.045,0.045,3.8,8,{material:M.copper}); tube.rotation.z=Math.PI/2; var ta=(t/7)*Math.PI*2; tube.position.set(0.15, HXY+Math.sin(ta)*0.3, Math.cos(ta)*0.3); reg(tube,'ref',{name:'Tube bundle (raw water)', noPick:true, cut:true, noShadow:true}); }
  // soportes del intercambiador a la culata
  for(var sx=-1;sx<=1;sx+=2){ var brk=box(0.1,0.9,0.4,M.steelDk); brk.position.set(sx*1.4, HXY-0.85, 0); groups.ref.add(brk); }

  // DEPÓSITO DE EXPANSIÓN (#20) — integrado en el extremo frontal del intercambiador, con tapón
  var exp=new THREE.Group();
  var ebody=cyl(0.34,0.34,0.7,22,{material:coolM});
  var eneck=cyl(0.16,0.16,0.18,16,{material:mat(COL.cool,{metal:0.8,rough:0.3})}); eneck.position.y=0.42;
  var ecap=cyl(0.2,0.2,0.16,18,{material:M.steel}); ecap.position.y=0.56;
  exp.add(ebody,eneck,ecap);
  exp.position.set(-2.0, HXY+0.7, 0);
  reg(exp,'ref',{name:'Header (expansion) tank', ex:V(-0.3,1,0), exMag:2.2,
    desc:'Takes up the expansion of the coolant as it heats and lets you top up the level. Its cap holds the pressure of the closed circuit.',
    yacht:'Check the level COLD (never open the cap hot: pressurised steam comes out!). A falling level = possible leak or head gasket.'});
  num(20,'Header (expansion) tank','ref', exp);
  // ÁNODO de zinc en la coraza
  var an=anode(); an.position.set(1.4, HXY+0.5, 0); groups.ref.add(an);
  /*  EL ÁNODO. Existía desde siempre y no tenía nombre.  */
  reg(an,'ref',{name:'Heat exchanger anode', ex:V(0,1,0), exMag:2.0,
    desc:'A soft zinc rod screwed into the heat exchanger shell. It is meant to be eaten away so that the tube bundle is not.',
    yacht:'Look at it, and replace it before it disappears. An anode that has gone completely is not a job finished \u2014 it is a job that stopped protecting anything some time ago.'});

  // TERMOSTATO (#22) — alojamiento en la salida frontal de la culata
  var thermo=new THREE.Group();
  var thBody=cyl(0.24,0.28,0.3,18,{material:mat(COL.cool,{metal:0.6,rough:0.45})});
  var thNeck=cyl(0.15,0.15,0.26,14,{material:coolM}); thNeck.position.y=0.26;
  thermo.add(thBody,thNeck);
  thermo.position.set(-2.6, DECK_Y+0.7, 0.3);
  reg(thermo,'ref',{name:'Thermostat', ex:V(-0.4,0.6,0.2), exMag:2.2, cut:true,
    desc:'Thermal valve: keeps the coolant recirculating until ~80–85 °C and then opens the path to the heat exchanger to hold the temperature steady.',
    yacht:'Stuck closed = overheating; stuck open = an engine that never warms up and runs poorly. It’s cheap, so carry a spare.'});
  num(22,'Thermostat','ref', thermo);

  // TOMA DE MAR (#16) — pasacascos con grifo, abajo
  var sea=new THREE.Group();
  var skin=cyl(0.28,0.28,0.16,18,{material:M.bronzeDk}); skin.position.y=-0.1;
  var valve=cyl(0.16,0.16,0.4,16,{material:M.bronze});
  var handle=box(0.46,0.06,0.09,mat(COL.com,{metal:0.4,rough:0.6})); handle.position.y=0.26;
  sea.add(skin,valve,handle);
  sea.position.set(-1.4,-2.45,-1.95);
  reg(sea,'ref',{name:'Seacock', ex:V(0,-1,0), exMag:1.8,
    desc:'Through-hull valve where the seawater that cools the engine comes in. It is the start of the raw-water circuit.',
    yacht:'Know EVERY seacock and keep tapered wooden bungs tied near each one. Close it if you work on the circuit or in the event of flooding.'});
  num(16,'Seacock','ref', sea);

  // FILTRO DE AGUA SALADA (#17) — vaso transparente con cesta
  var strainer=new THREE.Group();
  var sCan=cyl(0.3,0.3,0.6,20,{material:mat(0x9fd6ef,{metal:0.2,rough:0.2,opacity:0.4})});
  var sLid=cyl(0.34,0.34,0.12,20,{material:rawM}); sLid.position.y=0.36;
  var sBasket=cyl(0.2,0.2,0.44,16,{material:mat(COL.steel,{metal:0.9,rough:0.5}),open:true});
  strainer.add(sCan,sLid,sBasket);
  // algas y suciedad atrapadas en el cesto
  var dirt=new THREE.Group();
  for(var dz=0;dz<8;dz++){
    var w=box(0.05+Math.random()*0.09,0.022,0.05+Math.random()*0.07, mat(0x2c4a22,{metal:0.02,rough:0.95}));
    w.position.set((Math.random()-0.5)*0.24,-0.14+Math.random()*0.26,(Math.random()-0.5)*0.24);
    w.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3); dirt.add(w);
  }
  strainer.add(dirt);
  INTER.strainer=strainer; INTER.strLid=sLid; INTER.strBasket=sBasket; INTER.strDirt=dirt;
  INTER.strLidY=0.36; INTER.strBasketY=0;
  strainer.position.set(-1.4,-1.1,-2.0);
  reg(strainer,'ref',{name:'Raw-water strainer', ex:V(-0.3,0.4,-0.5), exMag:2.2, cut:true,
    desc:'Holds back weed, bags and dirt from the seawater before the pump, so they cannot block the circuit. Its clear bowl lets you see the debris.',
    yacht:'Check and clean it often, especially in weed or plastic. If the engine overheats, a clogged basket is the first suspect (along with the impeller).'});
  num(17,'Raw-water strainer','ref', strainer);

  // --- MANGUERAS DE REFRIGERACIÓN ---
  // AGUA SALADA (azul claro): toma→filtro→bomba→intercambiador→codo
  hoseRun(groups.ref, [V(-1.4,-2.35,-1.95),V(-1.4,-1.9,-2.0),V(-1.4,-1.5,-2.0)], 0.1, rawH);              // toma→filtro
  hoseRun(groups.ref, [V(-1.4,-0.95,-2.0),V(-2.4,-0.85,-1.4),V(-3.4,-0.95,-0.95)], 0.1, rawH);            // filtro→bomba sal
  hoseRun(groups.ref, [V(-3.55,-0.45,-0.7),V(-3.0,1.0,-0.4),V(-2.2,2.35,0)], 0.1, rawH);                  // bomba sal→HX (cap izq)
  // (la salida del intercambiador va ahora al codo antisifón; ver "escape húmedo")
  // REFRIGERANTE (azul oscuro): bomba dulce→bloque→termostato→HX→expansión
  hoseRun(groups.ref, [V(-3.55,-0.35,0.32),V(-3.2,0.0,0.3),V(-2.9,DECK_Y+0.2,0.3)], 0.1, coolH);          // bomba dulce→bloque
  hoseRun(groups.ref, [V(-2.6,DECK_Y+0.95,0.3),V(-2.4,1.7,0.2),V(-1.8,2.45,0.1)], 0.1, coolH);            // termostato→HX
  hoseRun(groups.ref, [V(-1.9,2.7,0),V(-1.95,2.95,0),V(-2.0,3.1,0)], 0.08, coolH);                        // HX→expansión
})();

/* ---------- COMBUSTIBLE: tanque, Racor, cebado, filtro fino, bomba inyección, tubos ---------- */
(function fuel(){
  var tankM=mat(COL.fuel,{metal:0.4,rough:0.6,opacity:0.92});
  var fuelH=mat(COL.fuel,{metal:0.3,rough:0.7});

  // TANQUE (#1) — fuera del motor, a proa-babor
  var tank=roundedBox(1.9,1.5,1.4,0.2,tankM); tank.position.set(-6.2,-0.5,1.5);
  reg(tank,'com',{name:'Fuel tank', ex:V(-1,0,0.3), exMag:1.6,
    desc:'Stores the diesel. The whole fuel-supply circuit to the engine starts here.',
    yacht:'Keep it full to reduce condensation (water) and “diesel bug”. Know where the shut-off valve and tap are in case of fire or a leak.'});
  num(1,'Fuel tank','com', tank);

  /*  LA LLAVE DEL DEPOSITO · el taller `fuelfilters` empieza cerrandola, y el texto de
      `Fuel tank` ya la nombraba —«know where the shut-off valve and tap are»— sin que
      existiera. Un grifo de cuarto de vuelta en la salida del tanque.               */
  var fTap=new THREE.Group();
  fTap.add(cyl(0.07,0.07,0.14,12,{material:M.brass}));
  var fLev=box(0.22,0.045,0.05,mat(0xc23b2a,{metal:0.3,rough:0.6}));
  fLev.position.set(0.08,0.09,0); fTap.add(fLev);
  /*  FUERA DEL TANQUE, NO DENTRO. La primera version la puso en (-5.55, 0.02, 1.42) y
      dio **cero desde las seis camaras y acercada**: el tanque es una caja de 1,9 x 1,5
      x 1,4 centrada en (-6.2, -0.5, 1.5), o sea que la llave estaba metida en su cara.
      Va en la esquina de salida, asomando.                                          */
  /*  Y FUERA DE VERDAD: la cara del tanque esta en x = -5.25 y la primera correccion la
      puso en -5.28 — **tres centesimas dentro**, y volvio a dar cero. Medir otra vez es
      lo unico que lo distingue de «esta pieza no se puede ver».                      */
  fTap.position.set(-5.02,-0.62,1.9); groups.com.add(fTap);
  regEnSitio(fTap,'com',{name:'Fuel tank valve', ex:V(0,1,0), exMag:1.4,
    desc:'The shut-off valve at the tank outlet. It closes the fuel supply to the engine.',
    yacht:'Know where it is before you need it: it is the first thing you close for a fuel leak or a fire, and the first thing you close before changing a filter.'});
  var fillNeck=cyl(0.13,0.13,0.4,12,{material:M.steelDk}); fillNeck.position.set(-6.2,0.5,1.5); groups.com.add(fillNeck);

  // FILTRO PRIMARIO / SEPARADOR DE AGUA — RACOR (#2) — vaso transparente
  var racor=new THREE.Group();
  var rTop=cyl(0.26,0.26,0.4,18,{material:mat(COL.fuel,{metal:0.7,rough:0.4})});
  var rBowl=cyl(0.24,0.2,0.4,18,{material:mat(0x9fd6ef,{metal:0.2,rough:0.15,opacity:0.45})}); rBowl.position.y=-0.4;
  var rDrain=cyl(0.05,0.05,0.1,8,{material:M.steelDk}); rDrain.position.y=-0.64;
  /*  ══ EL ELEMENTO, DENTRO DEL VASO ════════════════════════════
      El vaso transparente existía; lo que hay dentro, no. Y es lo que se cambia:
      el taller `fuelfilters` de la P2 pide **sacarlo, mirarlo y poner uno nuevo**, y
      sin él ese taller es una secuencia sin objeto.

      Lleva `cut:true` porque **sólo se ve con el corte puesto**, igual que las camisas
      o la galería de aceite: está dentro de algo.                                */
  var rElem=cyl(0.17,0.17,0.30,16,{material:mat(0xcfae6a,{metal:0.05, rough:0.85})});
  rElem.position.y=-0.30;
  var rPlisado=cyl(0.175,0.175,0.30,20,{material:mat(0xb99a56,{metal:0.0, rough:0.95,
                    opacity:0.55})});
  rPlisado.position.y=-0.30;
  racor.add(rTop,rBowl,rDrain,rElem,rPlisado);
  racor.position.set(-4.7,-0.2,1.7);
  reg(racor,'com',{name:'Primary filter / water separator', ex:V(-0.6,0.4,0.4), exMag:2.2,
    desc:'First line of defence for the fuel: it traps large particles and, above all, separates WATER from the diesel in its clear lower bowl.',
    yacht:'A star maintenance item: check the bowl daily and drain it if you see water or dirt. Water in the diesel is the No.1 cause of engine stoppage.'});
  num(2,'Primary filter / water separator','com', racor);
  /*  EL ELEMENTO se registra APARTE del vaso que lo contiene: son dos cosas
      distintas y el taller las trata distinto — el vaso se abre, el elemento se
      tira. `regEnSitio` porque vive dentro del grupo del racor.                */
  regEnSitio(rElem,'com',{name:'Primary filter element', cut:true, ex:V(0,-1,0), exMag:1.6,
    desc:'The pleated cartridge inside the primary filter bowl. It is what actually traps the dirt, and it is what you replace.',
    yacht:'Look at the old one before you throw it away: what is on it tells you what is in your tank, and whether one set of filters is going to be enough.'});

  // BOMBA DE CEBADO / ALIMENTACIÓN (#3) — en el bloque, con palanca manual
  var lift=new THREE.Group();
  var lbody=roundedBox(0.42,0.4,0.4,0.07,M.steelDk);
  var dome=sph(0.2,M.steel,{tl:Math.PI}); dome.position.y=0.18; dome.scale.y=0.6;
  var lever=box(0.36,0.06,0.09,M.steel); lever.position.set(0.26,-0.08,0); lever.rotation.z=0.3;
  lift.add(lbody,dome,lever);
  INTER.liftLever=lever; INTER.liftLeverZ=0.3;
  lift.position.set(-1.2,-0.35,1.2);
  reg(lift,'com',{name:'Lift / priming pump', ex:V(-0.3,0.3,0.5), exMag:2.2, cut:true,
    desc:'Draws diesel from the tank through the filters and sends it to the injection pump. Its hand lever lets you prime/bleed the circuit.',
    yacht:'Its lever lets you bleed the air after changing filters or running out of diesel. Knowing how to bleed is an essential on-board skill.'});
  num(3,'Lift / priming pump','com', lift);

  // FILTRO SECUNDARIO / FINO (#4) — cartucho atornillado al bloque
  var fine=canister(0.24,0.6, mat(COL.fuel,{metal:0.6,rough:0.5}), M.aluDk);
  fine.position.set(0.9,-0.05,1.3);
  reg(fine,'com',{name:'Secondary fuel filter', ex:V(0.2,0.4,0.5), exMag:2.2, cut:true,
    desc:'Final fine filtration: it traps the smallest particles just before the injection pump, protecting the precision injectors.',
    yacht:'Changed at every service. After changing it you must bleed the air with the priming pump or the engine won’t start.'});
  num(4,'Secondary fuel filter','com', fine);

  // BOMBA DE INYECCIÓN (#5) — en línea, lateral del bloque
  var ip=new THREE.Group();
  var ipbody=roundedBox(2.6,0.52,0.52,0.14,M.steelDk);
  ip.add(ipbody);
  var gov=cyl(0.2,0.2,0.4,16,{material:M.steel}); gov.rotation.z=Math.PI/2; gov.position.x=-1.5; ip.add(gov); // regulador
  for(var o=0;o<4;o++){ var dv=cyl(0.05,0.05,0.2,10,{material:M.steel}); dv.position.set(CYL_X[o],0.28,0); ip.add(dv); } // válvulas de impulsión
  ip.position.set(-0.1,-0.25,1.05);
  reg(ip,'com',{name:'Injection pump', ex:V(0,0.3,0.6), exMag:2.4, cut:true,
    desc:'Generates the very high fuel pressure and delivers it to each injector at the exact moment in the cycle. It is the “heart” of diesel control.',
    yacht:'Sealed and precision-built: not touched on board. Clean, water-free diesel is what keeps it alive; hence the obsession with filters.'});
  num(5,'Injection pump','com', ip);

  // TUBOS DE INYECCIÓN (acero pulido, curvados) bomba→cada inyector — muy reconocibles
  for(var l=0;l<4;l++){
    var x=CYL_X[l];
    var hp=pipe([V(x,-0.0,1.05), V(x,DECK_Y+0.2,0.9), V(x+0.05,DECK_Y+0.9,0.45), V(x,DECK_Y+1.25,0.08)], 0.035, M.polish);
    hp.userData={sys:'com'}; hp.castShadow=true; groups.com.add(hp);
  }
  // tubería de retorno (fina) de los inyectores
  var ret=pipe([V(CYL_X[0],DECK_Y+1.5,0.05),V(0,DECK_Y+1.55,0.1),V(CYL_X[3],DECK_Y+1.5,0.05)],0.025,M.steelDk);
  groups.com.add(ret);
  /*  EL RETORNO. Ya vivía en `groups.com`, así que `reg()` no lo mueve.  */
  reg(ret,'com',{name:'Return line', ex:V(0,1,0), exMag:2.2,
    desc:'Carries the fuel that was not burned back to the tank, taking heat and any trapped air with it.',
    yacht:'It is thin, it is often old rubber, and a leak in it does not drip fuel out \u2014 it lets air IN. A hidden cause of an engine that keeps stopping.'});

  // --- MANGUERAS DE COMBUSTIBLE (ámbar) ---
  hoseRun(groups.com, [V(-5.9,-0.5,1.5),V(-5.4,-0.4,1.6),V(-4.95,-0.35,1.7)], 0.07, fuelH);   // tanque→racor
  hoseRun(groups.com, [V(-4.45,-0.2,1.7),V(-3.0,-0.3,1.5),V(-1.45,-0.3,1.25)], 0.07, fuelH);   // racor→cebado
  hoseRun(groups.com, [V(-0.95,-0.3,1.25),V(0.0,-0.2,1.3),V(0.85,-0.05,1.32)], 0.07, fuelH);   // cebado→filtro fino
  hoseRun(groups.com, [V(0.9,-0.4,1.3),V(0.4,-0.3,1.1),V(-0.05,-0.25,1.08)], 0.07, fuelH);     // filtro fino→bomba inyección
})();

/* ---------- TORNILLOS DE PURGA (para el taller de purga) ---------- */
(function bleedScrews(){
  var scM=mat(0xc9b06a,{metal:0.85, rough:0.42});
  // en la cabeza del filtro fino
  var b1=new THREE.Group();
  b1.add(cyl(0.05,0.05,0.16,6,{material:scM}));
  var h1=cyl(0.075,0.075,0.06,6,{material:scM}); h1.position.y=0.1; b1.add(h1);
  b1.position.set(0.9,0.30,1.32);
  reg(b1,'com',{name:'Bleed screw (fine filter)', ex:V(0,0.6,0.4), exMag:1.6,
    desc:'A small screw on top of the filter housing. Opening it lets trapped air escape while fuel is pumped through.',
    yacht:'This is where bleeding starts after any filter change. Have a rag and a container ready — diesel will come out.'});
  INTER.bleed1=b1; INTER.bleed1Y=0.30;
  // en la bomba de inyección
  var b2=new THREE.Group();
  b2.add(cyl(0.05,0.05,0.16,6,{material:scM}));
  var h2=cyl(0.075,0.075,0.06,6,{material:scM}); h2.position.y=0.1; b2.add(h2);
  b2.position.set(-0.1,0.10,1.07);
  reg(b2,'com',{name:'Bleed screw (injection pump)', ex:V(0,0.6,0.4), exMag:1.6,
    desc:'The second bleed point, on the injection pump body. Air trapped here stops the pump delivering fuel.',
    yacht:'Bleed in order: filter first, then the pump. Only go to the injectors if it still will not start.'});
  INTER.bleed2=b2; INTER.bleed2Y=0.10;
  // burbujas de aire que salen al purgar
  var bub=new THREE.Group(); INTER.bubbles=[];
  for(var i=0;i<5;i++){
    var s=sph(0.038, mat(0xdfe8ee,{metal:0.0, rough:0.1, opacity:0.75}));
    s.visible=false; bub.add(s); INTER.bubbles.push({m:s, t:i/5});
  }
  bub.position.set(0.9,0.36,1.32); groups.com.add(bub);
  INTER.bubbleGroup=bub; INTER.bubbleOn=0;
})();

/* ---------- CIRCUITO DE LUBRICACIÓN ---------- */
(function lubrication(){
  var oilM=mat(0x8a6a24,{metal:0.45, rough:0.5});
  var oilDk=mat(0x5c4718,{metal:0.4, rough:0.6});

  // COLADOR DE ASPIRACIÓN dentro del cárter (visible en corte)
  var pick=new THREE.Group();
  var mesh=box(0.5,0.1,0.34, mat(0x8d949b,{metal:0.85, rough:0.55}));
  var neck=cyl(0.07,0.07,0.45,12,{material:M.steelDk}); neck.position.set(0.15,0.25,0);
  pick.add(mesh,neck);
  pick.position.set(-0.75,-2.05,0);
  reg(pick,'est',{name:'Oil pickup strainer', ex:V(0,-1,0), exMag:2.0, cut:true,
    desc:'A coarse mesh sitting in the lowest part of the sump. The oil pump draws through it, so large debris can never reach the pump or the bearings.',
    yacht:'You do not service it afloat, but it is why oil changes matter: sludge in the sump eventually blocks this strainer and starves the engine of oil.'});

  // BOMBA DE ACEITE, arrastrada desde el morro del cigüeñal
  var opump=new THREE.Group();
  var obody=roundedBox(0.42,0.42,0.34,0.07,oilM);
  var ogear=cyl(0.2,0.2,0.12,18,{material:M.steelDk}); ogear.rotation.x=Math.PI/2; ogear.position.z=0.22;
  var oout=cyl(0.055,0.055,0.4,10,{material:oilDk}); oout.position.set(0,0.3,0); 
  opump.add(obody,ogear,oout);
  opump.position.set(-2.95,-1.7,0.3);
  reg(opump,'est',{name:'Oil pump', ex:V(-0.5,-0.4,0.3), exMag:2.0, cut:true,
    desc:'A gear pump driven directly from the crankshaft. It lifts oil from the sump and pushes it, under pressure, through the filter and on into the engine.',
    yacht:'It has no adjustment. What you monitor is its result: oil pressure. If the alarm sounds, stop the engine at once.'});

  // GALERÍA PRINCIPAL dentro del bloque (translúcida, se ve en corte)
  var gal=cyl(0.085,0.085,6.2,14,{material:mat(0xd8a63a,{metal:0.3, rough:0.35, opacity:0.5})});
  gal.rotation.z=Math.PI/2; gal.position.set(0,-1.02,0.42);
  reg(gal,'est',{name:'Main oil gallery', noShadow:true, ex:V(0,1,0), exMag:1.2, cut:true,
    desc:'The main drilled passage running the length of the block. From it, smaller drillings feed every main bearing, the big ends and the camshaft.',
    yacht:'Invisible in service, but it explains why clean oil matters: these drillings are narrow and sludge blocks them.'});

  // ENFRIADOR DE ACEITE refrigerado por agua salada
  var ocool=new THREE.Group();
  var oshell=cyl(0.24,0.24,0.9,20,{material:oilM}); oshell.rotation.z=Math.PI/2;
  var oc1=cyl(0.27,0.27,0.1,20,{material:mat(COL.raw,{metal:0.5,rough:0.5})}); oc1.rotation.z=Math.PI/2; oc1.position.x=-0.48;
  var oc2=oc1.clone(); oc2.position.x=0.48;
  ocool.add(oshell,oc1,oc2);
  // montado en el costado del bloque, con su soporte
  var ocBrk=box(0.5,0.5,0.3, mat(0x6e767d,{metal:0.7, rough:0.55}));
  ocBrk.position.set(0,0,-0.28); ocool.add(ocBrk);
  ocool.position.set(1.75,-0.72,1.14);
  reg(ocool,'ref',{name:'Oil cooler', ex:V(0.3,-0.3,0.6), exMag:2.0, cut:true,
    desc:'A small heat exchanger where seawater cools the engine oil. Hot oil loses its film strength, so keeping it cool protects the bearings.',
    yacht:'It sits in the raw-water circuit, so it is another place salt and scale build up. An internal failure mixes oil and seawater — check for milky oil.'});
})();

/* ---------- ESCAPE HÚMEDO: antisifón, silenciador y salida al espejo ---------- */
(function wetExhaust(){
  var hoseM=mat(0x191d22,{metal:0.0, rough:0.94});
  var rawM=mat(COL.raw,{metal:0.5, rough:0.5});

  // CODO ANTISIFÓN (vented loop) — atornillado al costado, por encima de la flotación
  var vl=new THREE.Group();
  var loopTube=hose([V(-0.3,-0.45,0),V(-0.3,0.15,0),V(-0.22,0.44,0),V(0,0.53,0),
                     V(0.22,0.44,0),V(0.3,0.15,0),V(0.3,-0.45,0)], 0.09, rawM, {tension:0.45});
  vl.add(loopTube);
  var valve=cyl(0.085,0.065,0.18,14,{material:M.bronze}); valve.position.y=0.62; vl.add(valve);
  var vcap=sph(0.065,M.bronzeDk); vcap.position.y=0.72; vl.add(vcap);
  var brk=box(0.1,0.62,1.15, mat(0x8d949b,{metal:0.7, rough:0.55}));
  brk.position.set(0,0.0,-0.62); vl.add(brk);
  var plate=box(0.1,0.7,0.14, mat(0x8d949b,{metal:0.7, rough:0.55}));
  plate.position.set(0,0.0,-1.2); vl.add(plate);
  var uclip=tor(0.13,0.03,M.steel,10); uclip.rotation.y=Math.PI/2; uclip.position.set(-0.3,-0.1,0); vl.add(uclip);
  var uclip2=tor(0.13,0.03,M.steel,10); uclip2.rotation.y=Math.PI/2; uclip2.position.set(0.3,-0.1,0); vl.add(uclip2);
  vl.position.set(3.05,3.05,-2.25);
  reg(vl,'ref',{name:'Vented (anti-siphon) loop', ex:V(0.2,1,-0.3), exMag:2.2,
    desc:'A loop taken above the waterline with a small air valve at its top. It breaks any siphon that could otherwise pull seawater down into the exhaust and back into the engine after you stop.',
    yacht:'The valve furs up with salt. If it blocks, seawater can siphon into a cylinder and hydraulic-lock the engine — expensive. Check and clean it every season; carry a spare valve.'});

  // intercambiador -> entrada del antisifón
  var hA=hose([V(2.3,2.55,-0.1),V(2.5,2.75,-1.1),V(2.7,2.7,-1.9),V(2.75,2.62,-2.25)], 0.1,
              mat(COL.raw,{metal:0.2, rough:0.7}), {tension:0.4});
  hA.userData={sys:'ref'}; hA.castShadow=true; groups.ref.add(hA);
  // salida del antisifón -> codo mezclador
  var hB=hose([V(3.35,2.62,-2.25),V(3.4,2.3,-1.8),V(3.35,1.95,-1.2),V(3.3,1.78,-1.02)], 0.1,
              mat(COL.raw,{metal:0.2, rough:0.7}), {tension:0.4});
  hB.userData={sys:'ref'}; hB.castShadow=true; groups.ref.add(hB);

  // manguera de escape húmedo: codo mezclador -> silenciador
  var h1=hose([V(3.55,1.15,-1.15),V(4.3,0.2,-1.5),V(5.1,-1.2,-1.8),V(5.55,-1.75,-1.9)], 0.19, hoseM, {tension:0.4});
  var h1c=h1.userData._curve;
  h1.userData={sys:'ref'}; h1.castShadow=true; groups.ref.add(h1);
  groups.ref.add(clampRing(h1c,0.04,0.19,M.steel));

  // SILENCIADOR / WATERLOCK en el punto bajo
  var wl=new THREE.Group();
  var drum=cyl(0.46,0.46,1.15,26,{material:mat(0x2a3038,{metal:0.15, rough:0.8})}); drum.rotation.z=Math.PI/2;
  var capA=cyl(0.48,0.48,0.1,26,{material:mat(0x353c45,{metal:0.2, rough:0.7})}); capA.rotation.z=Math.PI/2; capA.position.x=-0.6;
  var capB=capA.clone(); capB.position.x=0.6;
  var inl=cyl(0.19,0.19,0.3,14,{material:hoseM}); inl.position.set(-0.35,0.4,0);
  var outl=cyl(0.19,0.19,0.3,14,{material:hoseM}); outl.position.set(0.35,0.4,0);
  wl.add(drum,capA,capB,inl,outl);
  wl.position.set(6.25,-2.0,-1.9);
  reg(wl,'ref',{name:'Waterlock / exhaust silencer', ex:V(0.3,-0.4,-0.5), exMag:2.2, cut:true,
    desc:'A drum at the low point of the exhaust. It holds a slug of water that silences the gases and, crucially, stops seawater running back down the pipe into the engine when it is stopped.',
    yacht:'Never crank an engine repeatedly without it firing: each turn pumps more water into this drum until it backs up into the cylinders. If it will not start, find out why before you keep cranking.'});

  // manguera silenciador -> salida al espejo
  var h2=hose([V(6.6,-1.7,-1.9),V(7.6,-1.1,-1.8),V(8.7,-0.6,-1.7),V(9.45,-0.35,-1.62)], 0.19, hoseM, {tension:0.4});
  var h2c=h2.userData._curve;
  h2.userData={sys:'ref'}; h2.castShadow=true; groups.ref.add(h2);
  groups.ref.add(clampRing(h2c,0.95,0.19,M.steel));

  // SALIDA AL ESPEJO DE POPA (skin fitting)
  var out=new THREE.Group();
  var flangeO=cyl(0.3,0.3,0.12,20,{material:M.bronzeDk}); flangeO.rotation.z=Math.PI/2;
  var spout=cyl(0.2,0.22,0.4,18,{material:M.bronze}); spout.rotation.z=Math.PI/2; spout.position.x=0.24;
  out.add(flangeO,spout);
  out.position.set(9.62,-0.35,-1.6);
  reg(out,'ref',{name:'Exhaust outlet (transom)', ex:V(1,0,-0.3), exMag:1.8,
    desc:'Where the cooled exhaust gases and the seawater leave the boat together, through the transom or the topsides.',
    yacht:'THIS is where you look every time you start the engine. Water spitting out with the exhaust means the whole raw-water circuit is working. No water = stop the engine at once.'});

  // chorro de agua saliendo (didáctico)
  var jetG=new THREE.Group(); INTER.jets=[];
  for(var i=0;i<4;i++){
    var j=sph(0.075, mat(0x9fd6ef,{metal:0.1, rough:0.15, opacity:0.8, emissive:0x2a5a72, ei:0.5}));
    j.visible=false; jetG.add(j); INTER.jets.push({m:j, t:i/4});
  }
  jetG.position.set(9.9,-0.35,-1.6); groups.ref.add(jetG);
  INTER.jetGroup=jetG;
})();

/* ---------- ELÉCTRICO: baterías, interruptor de corte, masa ---------- */
(function electrical(){
  var caseM=mat(0x23282e,{metal:0.05, rough:0.72});
  var lidM=mat(0x2e343c,{metal:0.05, rough:0.62});
  var shelf=box(2.5,0.12,1.2, mat(0x2b3138,{metal:0.08,rough:0.85}));
  shelf.position.set(-5.1,-2.32,-2.25); shelf.receiveShadow=true; groups.est.add(shelf);

  function battery(x,z,label){
    var b=new THREE.Group();
    b.add(box(0.95,0.72,0.62,caseM));
    var lid=box(0.98,0.08,0.65,lidM); lid.position.y=0.38; b.add(lid);
    // bornes: positivo rojo, negativo negro
    var pos=cyl(0.075,0.075,0.14,12,{material:mat(0xb5402e,{metal:0.5,rough:0.5})}); pos.position.set(-0.28,0.47,0.18); b.add(pos);
    var neg=cyl(0.075,0.075,0.14,12,{material:mat(0x14181d,{metal:0.5,rough:0.5})}); neg.position.set(0.28,0.47,0.18); b.add(neg);
    b.position.set(x,-1.9,z);
    return b;
  }
  var bStart=battery(-5.6,-2.25);
  /*  LOS BORNES · `flatbatt` dice «aprieta los bornes» y habia baterias sin bornes.
      Dos postes de plomo con su abrazadera, en la cara de arriba.                  */
  var bornes=new THREE.Group();
  for(var bp=0; bp<2; bp++){
    var post=cyl(0.055,0.07,0.1,10,{material:mat(0x9aa2a8,{metal:0.85,rough:0.35})});
    var clamp=cyl(0.09,0.09,0.05,10,{material:M.bronzeDk}); clamp.position.y=0.07;
    var g=new THREE.Group(); g.add(post,clamp);
    g.position.set(bp?0.16:-0.16,0.2,0); bornes.add(g);
  }
  bornes.position.set(-5.6,-2.25,0); groups.est.add(bornes);
  regEnSitio(bornes,'est',{name:'Battery terminals', ex:V(0,1,0), exMag:1.6,
    desc:'The two posts on top of the battery and the clamps bolted to them. All the starting current passes through these two joints.',
    yacht:'Green or white powder on a post is resistance, and resistance is where a large current turns into heat. Clean them once a year and smear them with petroleum jelly.'});
  reg(bStart,'est',{name:'Engine-start battery', ex:V(-0.5,0.3,-0.5), exMag:2.0,
    desc:'A battery dedicated to starting the engine, kept isolated from the domestic supply so the lights and fridge can never flatten it.',
    yacht:'If the engine has not fired after about ten seconds of cranking, STOP. Something else is wrong and you are only flattening the battery you will need.'});
  var bDom=battery(-4.55,-2.25);
  reg(bDom,'est',{name:'Domestic battery', ex:V(-0.3,0.3,-0.5), exMag:2.0,
    desc:'The service battery bank that runs lights, instruments and the fridge. Kept separate from the starting battery.',
    yacht:'On non-sealed batteries check the acid level. When one starts needing regular topping up, its life is nearly over.'});

  // interruptor de corte (isolator)
  var iso=new THREE.Group();
  var panel=box(0.5,0.5,0.08, mat(0x2b3138,{metal:0.1,rough:0.8}));
  var knob=cyl(0.16,0.16,0.14,20,{material:mat(0xb5402e,{metal:0.35,rough:0.5})}); knob.rotation.x=Math.PI/2; knob.position.z=0.1;
  var bar=box(0.3,0.06,0.05, mat(0xe8e8e8,{metal:0.2,rough:0.6})); bar.position.z=0.18;
  iso.add(panel,knob,bar);
  iso.position.set(-3.9,-1.55,-2.5);
  reg(iso,'est',{name:'Battery isolator switch', ex:V(-0.3,0.4,-0.6), exMag:2.0,
    desc:'The main switch that disconnects the batteries from the boat. Turning it off makes the whole system safe to work on.',
    yacht:'Know where it is before you need it — it is your first move in an electrical fire. Never switch it off while the engine is running or you can destroy the alternator.'});

  // CABLE POSITIVO GRUESO batería -> arranque (por donde pasan cientos de amperios)
  var posCab=hose([V(-5.15,-1.62,-2.15),V(-4.4,-1.55,-1.7),V(-3.6,-1.4,-1.2),V(-3.05,-1.28,-1.0)],
                  0.075, mat(0x8f2f22,{metal:0.1, rough:0.85}), {radial:8});
  posCab.userData={sys:'est'};
  reg(posCab,'est',{name:'Main positive cable', ex:V(-0.3,0.3,-0.5), exMag:1.6,
    desc:'The heavy red cable carrying the starting current from the battery to the starter motor. It is thick because a starter can draw several hundred amps for a few seconds.',
    yacht:'Check the terminals are tight and free of green corrosion. A poor connection here drops the voltage and gives you slow, laboured cranking.'});

  // CUADRO / RELÉ DE CARGA (split charge)
  var relay=new THREE.Group();
  var rbody=roundedBox(0.42,0.42,0.3,0.06, mat(0x30363d,{metal:0.15, rough:0.7}));
  var rtop=cyl(0.1,0.1,0.1,14,{material:M.steelDk}); rtop.position.y=0.24;
  var rt1=cyl(0.045,0.045,0.1,10,{material:M.brass}); rt1.position.set(-0.13,0.24,0);
  var rt2=cyl(0.045,0.045,0.1,10,{material:M.brass}); rt2.position.set(0.13,0.24,0);
  relay.add(rbody,rtop,rt1,rt2);
  relay.position.set(-4.35,-1.15,-2.55);
  reg(relay,'est',{name:'Split-charge relay', ex:V(-0.3,0.4,-0.5), exMag:1.8,
    desc:'Lets the alternator charge both battery banks while the engine runs, but separates them when it stops — so the domestic side can never flatten the starting battery.',
    yacht:'If the engine battery keeps going flat, suspect this or its wiring. It is what keeps your one guaranteed start in reserve.'});

  // masa al bloque: una mala masa es causa clásica de "clac" sin girar
  var earth=hose([V(-4.9,-1.75,-2.2),V(-4.2,-1.7,-1.6),V(-3.4,-1.5,-1.1)],0.06,M.blk,{radial:8});
  earth.userData={sys:'est'};
  reg(earth,'est',{name:'Earth (ground) strap', ex:V(-0.3,0.3,-0.5), exMag:1.6,
    desc:'The heavy negative cable bonding the battery to the engine block. Every starting amp returns through it.',
    yacht:'A corroded earth is a classic fault: the starter clicks but will not turn the engine, even though the battery is fine. Clean the terminals yearly and smear them with Vaseline.'});
})();

/* ---------- DESCOMPRESORES (arranque a mano) ---------- */
(function decompressors(){
  var levM=mat(0x9aa7b4,{metal:0.9, rough:0.4});
  INTER.decomp=[];
  for(var i=0;i<4;i++){
    var d=new THREE.Group();
    var pivot=cyl(0.06,0.06,0.16,12,{material:M.steelDk}); pivot.rotation.x=Math.PI/2; d.add(pivot);
    var lev=box(0.32,0.07,0.06,levM); lev.position.set(0.14,0.06,0); d.add(lev);
    d.position.set(CYL_X[i], DECK_Y+1.42, -0.62);
    reg(d,'com',{name: i===0?'Decompressor lever':'Decompressor ('+(i+1)+')', noPick:(i>0), ex:V(0,1,-0.3), exMag:2.0,
      desc:'A lever that holds the exhaust valve open so the cylinder cannot build compression. With them lifted, the engine can be turned by hand.',
      yacht:'Essential for hand-starting: a diesel has far too much compression to turn by hand otherwise. Also useful to spin the engine over while bleeding the fuel.'});
    INTER.decomp.push({m:d, lev:lev, y0:0.06});
  }
})();

/* ---------- TRANSMISIÓN: volante, caja, acoplamiento, eje, bocina, hélice ---------- */
(function transmission(){
  var traM=mat(COL.tra,{metal:0.6,rough:0.45}), traDk=mat(COL.traDark,{metal:0.6,rough:0.5});
  var SY=CRANK_Y;  // eje de transmisión (alineado al cigüeñal)

  // VOLANTE DE INERCIA (#25) — dentro de la campana (visible en corte/despiece)
  var fly=new THREE.Group();
  var disc=cyl(0.98,0.98,0.3,40,{material:mat(0x6b7782,{metal:0.95,rough:0.3})}); disc.rotation.z=Math.PI/2; fly.add(disc);
  var ring=tor(0.98,0.08,mat(0x596573,{metal:0.85,rough:0.35}),16); ring.rotation.y=Math.PI/2; fly.add(ring);
  for(var z=0;z<52;z++){ var tooth=box(0.055,0.1,0.15,mat(0x596573,{metal:0.85,rough:0.4})); var za=(z/52)*Math.PI*2; tooth.position.set(0,Math.cos(za)*1.0,Math.sin(za)*1.0); tooth.rotation.x=za; fly.add(tooth); }
  fly.position.set(4.0, SY, 0); ANIM.spin.push({o:fly, r:1.0});
  reg(fly,'tra',{name:'Flywheel', ex:V(0,1,0), exMag:1.6,
    desc:'Heavy disc that stores energy and smooths the rotation between firing strokes. Its ring gear meshes with the starter motor to start the engine.',
    yacht:'No maintenance needed, but its ring gear is what the starter “bites”: a “click” with no cranking is usually the starter or battery, not the flywheel.'});
  num(25,'Flywheel','tra', fly);

  // CAJA REDUCTORA / INVERSOR (#26) — ZF/Hurth, atornillada a la campana
  var gbox=new THREE.Group();
  var gBell=cyl(0.95,0.95,0.3,30,{material:traDk}); gBell.rotation.z=Math.PI/2; gBell.position.x=-0.55; gbox.add(gBell);
  var gBody=roundedBox(1.1,1.25,1.1,0.2,traM); gbox.add(gBody);
  // aletas de refrigeración de la caja
  for(var fk=0;fk<4;fk++){ var fin=box(0.9,0.05,1.1,traDk); fin.position.set(0,-0.35+fk*0.22,0); gbox.add(fin); }
  var shiftLever=cyl(0.04,0.04,0.5,10,{material:M.steel}); shiftLever.position.set(0,0.8,0.25); shiftLever.rotation.x=-0.3; gbox.add(shiftLever);
  var shiftKnob=sph(0.1,mat(COL.com,{metal:0.3,rough:0.6})); shiftKnob.position.set(0,1.03,0.18); gbox.add(shiftKnob);
  var dipG=cyl(0.04,0.04,0.2,8,{material:M.steel}); dipG.position.set(-0.3,0.7,0); gbox.add(dipG); // varilla ATF
  INTER.gbDip=dipG;
  /*  LA VARILLA DEL INVERSOR, sin sacarla de `gbox`, que tiene posición.  */
  regEnSitio(dipG,'tra',{name:'Gearbox dipstick', ex:V(0,1,0), exMag:1.2,
    desc:'The gearbox has its own oil and its own dipstick, separate from the engine.',
    yacht:'Check the book: some boxes take automatic transmission fluid and some take engine oil, and they are not interchangeable. "I checked the oil" usually means somebody checked one of the two.'});
  gbox.position.set(5.45, SY+0.05, 0);
  reg(gbox,'tra',{name:'Gearbox / reverse gear', ex:V(1,0.1,0), exMag:1.8, cut:true,
    desc:'Reduces engine revs to those suited to the propeller and selects ahead, neutral and astern (it reverses the shaft’s rotation).',
    yacht:'It has its own oil/ATF: check the level with its dipstick and watch for leaks. Always change gear at idle to spare the clutch.'});
  num(26,'Gearbox / reverse gear','tra', gbox);

  // ACOPLAMIENTO FLEXIBLE (#27)
  var coup=new THREE.Group();
  coup.add((function(){var f=flange(0.3,0.12,'x',traDk,6); f.position.x=-0.14; return f;})());
  coup.add((function(){var f=flange(0.3,0.12,'x',traDk,6); f.position.x=0.14; return f;})());
  var rd=cyl(0.26,0.26,0.12,20,{material:mat(COL.com,{metal:0.2,rough:0.8})}); rd.rotation.z=Math.PI/2; coup.add(rd);
  coup.position.set(6.4, SY+0.05, 0);
  reg(coup,'tra',{name:'Flexible coupling', ex:V(1,0,0), exMag:2.0,
    desc:'Joins the gearbox to the propeller shaft, absorbing small misalignments and vibration, protecting both gearbox and stern gland.',
    yacht:'Check the bolts don’t work loose and the rubber isn’t cracked. Marked misalignment vibrates, heats the stern gland and wears the shaft.'});
  num(27,'Flexible coupling','tra', coup);

  // EJE DE LA HÉLICE (#29)
  var shaft=cyl(0.15,0.15,3.0,20,{material:M.steel}); shaft.rotation.z=Math.PI/2; shaft.position.set(8.0, SY+0.05, 0);
  reg(shaft,'tra',{name:'Propeller shaft', ex:V(0.4,0,0), exMag:1.4,
    desc:'Stainless-steel bar that carries the drive from the gearbox to the propeller, passing through the hull at the stern gland.',
    yacht:'Make sure it isn’t bent (vibration) or corroded. The shaft anode protects it galvanically: replace it when it’s half consumed.'});
  num(29,'Propeller shaft','tra', shaft);

  // BOCINA / PRENSAESTOPAS (#28)
  var gland=new THREE.Group();
  var gBody=cyl(0.24,0.24,0.5,18,{material:traDk}); gBody.rotation.z=Math.PI/2;
  var gNut=cyl(0.28,0.28,0.2,6,{material:M.steelDk}); gNut.rotation.z=Math.PI/2; gNut.position.x=0.26;
  var gHose=cyl(0.26,0.26,0.4,18,{material:mat(COL.com,{metal:0.2,rough:0.8})}); gHose.rotation.z=Math.PI/2; gHose.position.x=-0.28;
  gland.add(gBody,gNut,gHose);
  gland.position.set(9.4, SY+0.05, 0);
  var dripG=new THREE.Group(); INTER.drips=[];
  for(var dd=0; dd<3; dd++){
    var drop=sph(0.055, mat(0x8fd0ea,{metal:0.1, rough:0.15, opacity:0.8, emissive:0x2a5a72, ei:0.4}));
    drop.scale.set(0.8,1.3,0.8); drop.visible=false; dripG.add(drop);
    INTER.drips.push({m:drop, t:dd/3});
  }
  dripG.position.set(9.4, SY+0.05, 0); groups.tra.add(dripG);
  INTER.dripGroup=dripG; INTER.dripRate=0;
  reg(gland,'tra',{name:'Stern gland (stuffing box)', ex:V(0.3,-0.3,0), exMag:2.0,
    desc:'Seals the point where the shaft passes through the hull so water cannot get in, while still letting it turn. They come as packed glands or mechanical-face seals.',
    yacht:'A packed gland should drip a few drops a minute when running (otherwise it overheats). It’s one of the boat’s few controlled “leaks”.'});
  num(28,'Stern gland (stuffing box)','tra', gland);

  /*  ══ LO QUE EL TALLER `gland` TOCA Y NO TENIA NOMBRE ═══════════════════════
      **La tuerca ya existia como malla** —`gNut`, ahi arriba— y no estaba registrada.
      Es el tercer caso del mismo patron en este fichero: el anodo del intercambiador y
      la sentina estaban igual. *Antes de modelar una pieza que «falta», conviene mirar
      si ya esta dibujada y lo que le falta es el nombre.*

      El engrasador si es nuevo: una copa roscada con su tapa, seis lineas.           */
  regEnSitio(gNut,'tra',{name:'Gland packing nut', ex:V(1,0,0), exMag:1.2,
    desc:'The nut that squeezes the packing against the shaft. It is adjusted a flat at a time, never more.',
    yacht:'Nip it down a flat, run her, and look again. Tighten it until the drip stops and you have cooked the packing and scored the shaft.'});

  var greaser=new THREE.Group();
  /*  EL TAMAÑO ES EL DE UNO DE VERDAD, y la primera version se quedo corta: a la escala
      de esta figura —1 unidad ~ 15 cm— una copa de 0,09 de radio son 2,7 cm de ancho, y
      un engrasador de bocina de verdad ronda los 5. Con el tamaño real pasa el suelo
      del dedo; con el de antes se quedaba en 918. **No es agrandar para que se vea: es
      que estaba mal medido.**                                                        */
  greaser.add(cyl(0.15,0.18,0.24,14,{material:M.brass}));
  var gcap=cyl(0.12,0.12,0.08,12,{material:M.bronzeDk}); gcap.position.y=0.15;
  greaser.add(gcap);
  greaser.position.set(9.28, SY+0.42, 0); groups.tra.add(greaser);
  regEnSitio(greaser,'tra',{name:'Stern tube greaser', ex:V(0,1,0), exMag:1.4,
    desc:'A screw-down cup of waterproof grease that keeps grease in the stern tube bearing and the sea out of it.',
    yacht:'A turn every couple of hours under way, and topped up when it empties. It is the easiest thing on a boat to forget, because nothing happens for a long time when you do.'});

  // HÉLICE (#30) — núcleo + 3 palas
  var prop=new THREE.Group();
  // núcleo cónico + ojiva de popa + tuerca de eje
  var pcore=cyl(0.24,0.2,0.36,24,{material:M.bronze}); pcore.rotation.z=Math.PI/2; prop.add(pcore);
  var fair=cyl(0.2,0.07,0.3,24,{material:M.bronze}); fair.rotation.z=-Math.PI/2; fair.position.x=0.32; prop.add(fair);
  var pnut=cyl(0.11,0.11,0.1,6,{material:M.bronzeDk}); pnut.rotation.z=Math.PI/2; pnut.position.x=0.5; prop.add(pnut);
  // 3 palas reales, generadas por superficie
  var bladeGeo=propellerBlade({});
  for(var b=0;b<3;b++){
    var blade=new THREE.Mesh(bladeGeo, M.bronze);
    blade.rotation.x=(b/3)*Math.PI*2;
    prop.add(blade);
  }
  // ánodo de eje justo delante de la hélice
  var pan=cyl(0.19,0.19,0.16,20,{material:mat(0xb9c0c4,{metal:0.6, rough:0.62})});
  pan.rotation.z=Math.PI/2; pan.position.x=-0.42; prop.add(pan);
  prop.position.set(10.4, SY+0.05, 0); ANIM.spin.push({o:prop, r:0.4});
  reg(prop,'tra',{name:'Propeller', ex:V(0.5,0,0), exMag:1.6,
    desc:'Turns the shaft’s rotation into thrust, “screwing” itself through the water to drive the boat ahead or astern.',
    yacht:'Check it by diving: weed, fishing line or a chipped blade rob performance and cause vibration. Keep its anode in good shape.'});
  num(30,'Propeller','tra', prop);
})();

/* ---------- DETALLES REALISTAS: cableado, respiradero, sensores, mandos ---------- */
(function ancillaries(){
  var FX=-3.55;
  // MAZO DE CABLES (alternador → arranque) recorriendo el motor
  var loomPts=[V(-3.45,0.7,0.7),V(-3.0,1.2,0.85),V(-1.2,1.95,0.95),V(1.4,1.6,0.6),V(2.6,0.2,-0.4),V(3.0,-1.0,-0.85)];
  var loom=hose(loomPts, 0.055, M.blk, {tension:0.4, radial:8});
  var loomCurve=loom.userData._curve;
  loom.userData={sys:'est'};
  reg(loom,'est',{name:'Wiring loom', ex:V(0,1,0.3), exMag:1.2,
    desc:'The bundle of cables connecting the alternator, starter motor, senders and the boat’s instrument panel.',
    yacht:'Vibration and salt loosen and corrode connections. Check terminals, fuses and earth: many engine “breakdowns” are really electrical.'});
  // bridas del mazo
  for(var z=0.15; z<0.95; z+=0.28){ var p=loomCurve.getPointAt(z); var tie=tor(0.07,0.018,M.blk,8); tie.position.copy(p); var tn=loomCurve.getTangentAt(z); tie.quaternion.setFromUnitVectors(V(0,0,1),tn.clone().normalize()); groups.est.add(tie); }

  // CABLES DE BATERÍA al arranque (positivo rojo / masa negro)
  var posCable=hose([V(3.0,-1.0,-0.7),V(2.6,-1.5,-0.4),V(2.2,-2.0,-0.2)],0.06,mat(0xb5402e,{metal:0.2,rough:0.7}),{radial:8});
  posCable.userData={sys:'est'}; groups.est.add(posCable);
  var negCable=hose([V(2.9,-1.3,-0.9),V(2.5,-1.8,-0.7),V(2.1,-2.1,-0.5)],0.06,M.blk,{radial:8});
  negCable.userData={sys:'est'}; groups.est.add(negCable);

  // RESPIRADERO DEL CÁRTER (rocker → admisión)
  var br=hose([V(-1.9,DECK_Y+1.35,0.55),V(-1.4,DECK_Y+1.0,0.85),V(-0.6,DECK_Y+0.7,1.05)],0.07,M.rubber);
  br.userData={sys:'com'};
  reg(br,'com',{name:'Crankcase breather', ex:V(0,0.4,0.6), exMag:1.6,
    desc:'Carries crankcase gases and vapours back to the intake to be burned, preventing pressure build-up and emissions to the atmosphere.',
    yacht:'If it blocks, the engine pressurises the crankcase and can push oil past the seals. Keep the hose and its filter clean.'});

  // SENSOR DE PRESIÓN DE ACEITE (en el bloque)
  var ops=new THREE.Group();
  ops.add(cyl(0.07,0.07,0.2,12,{material:M.brass}));
  var opsTop=cyl(0.05,0.05,0.12,10,{material:M.steelDk}); opsTop.position.y=0.15; ops.add(opsTop);
  ops.position.set(-2.0,-0.05,1.0); ops.rotation.x=-Math.PI/2.4;
  reg(ops,'est',{name:'Oil pressure sender', ex:V(-0.3,0.2,0.6), exMag:1.8,
    desc:'Measures the oil pressure and sends it to the gauge or the panel alarm. It is your early warning of a lubrication failure.',
    yacht:'If the oil-pressure alarm sounds, STOP the engine at once and find the cause: running on without pressure melts the bearings.'});

  // SENSOR DE TEMPERATURA (en la culata / salida de agua)
  var cts=new THREE.Group();
  cts.add(cyl(0.07,0.07,0.18,12,{material:M.brass}));
  var ctsTop=cyl(0.05,0.05,0.12,10,{material:M.steelDk}); ctsTop.position.y=0.14; cts.add(ctsTop);
  cts.position.set(-2.7,DECK_Y+0.85,0.3); cts.rotation.z=0.3;
  reg(cts,'est',{name:'Temperature sender', ex:V(-0.3,0.5,0.3), exMag:1.8,
    desc:'Measures the coolant temperature and sends it to the gauge or the panel alarm.',
    yacht:'If it reads high or the alarm sounds, suspect the cooling: impeller, strainer, belt or thermostat. Check that water is coming out of the exhaust.'});
  // cablecillos finos de los sensores hacia el mazo
  var w1=hose([V(-2.0,0.05,1.0),V(-1.8,0.6,0.95),V(-1.3,1.5,0.9)],0.02,M.blk,{radial:6}); w1.userData={sys:'est'}; groups.est.add(w1);
  var w2=hose([V(-2.7,DECK_Y+1.0,0.3),V(-2.2,1.4,0.6),V(-1.4,1.7,0.85)],0.02,M.blk,{radial:6}); w2.userData={sys:'est'}; groups.est.add(w2);

  // CABLES DE GAS Y PARO (al regulador de la bomba de inyección)
  var gov=V(-1.6,-0.05,1.05);
  var throttle=hose([gov,V(-1.6,0.4,1.3),V(-1.4,1.0,1.4),V(-1.0,1.4,1.5)],0.035,mat(0x9aa7b4,{metal:0.7,rough:0.4}),{radial:8});
  throttle.userData={sys:'com'};
  reg(throttle,'com',{name:'Throttle & stop cables', ex:V(0,0.5,0.6), exMag:1.6,
    desc:'Connect the throttle lever and the stop control at the helm to the governor on the injection pump.',
    yacht:'The STOP cable cuts the fuel to shut the diesel down (it isn’t switched off with a “key” like a petrol engine). Check both controls move smoothly.'});
  var stopc=hose([gov,V(-1.7,0.3,1.2),V(-1.7,0.9,1.25),V(-1.5,1.3,1.3)],0.03,M.blk,{radial:8}); stopc.userData={sys:'com'}; groups.com.add(stopc);
  // soporte de los cables
  var cbrk=box(0.3,0.08,0.12,M.steelDk); cbrk.position.set(-1.0,1.45,1.5); groups.com.add(cbrk);
})();

/* ---------- TEXTURA DE SUPERFICIE (grano de fundición + brillo variable) ----------
   Genera mapas por código (sin archivos) para que las superficies no parezcan plástico. */
(function surfaceDetail(){
  try{
    function noiseTex(size, freq, oct, gain, lo, hi){
      var cv=document.createElement('canvas'); cv.width=cv.height=size;
      var ctx=cv.getContext('2d'); if(!ctx) return null;
      var img=ctx.createImageData(size,size), d=img.data;
      function h2(x,y){ var n=(x*374761393+y*668265263)|0; n=(n^(n>>13)); n=(n*1274126177)|0; return ((n^(n>>16))>>>0)/4294967295; }
      function sm(t){ return t*t*(3-2*t); }
      function vn(x,y){ var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
        var a=h2(xi,yi),b=h2(xi+1,yi),c=h2(xi,yi+1),e=h2(xi+1,yi+1),u=sm(xf),v=sm(yf);
        return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+e*u)*v; }
      for(var y=0;y<size;y++){ for(var x=0;x<size;x++){
        var amp=1,f=freq,sum=0,norm=0;
        for(var o=0;o<oct;o++){ sum+=amp*vn(x/size*f,y/size*f); norm+=amp; amp*=gain; f*=2; }
        var val=lo+(hi-lo)*(sum/norm), i=(y*size+x)*4, c8=Math.max(0,Math.min(255,(val*255)|0));
        d[i]=d[i+1]=d[i+2]=c8; d[i+3]=255;
      }}
      ctx.putImageData(img,0,0);
      var tx=new THREE.CanvasTexture(cv); tx.wrapS=tx.wrapT=THREE.RepeatWrapping; return tx;
    }
    var grain=noiseTex(256, 26, 4, 0.55, 0.3, 1.0);   // relieve fino (bump)
    var rough=noiseTex(256, 7, 3, 0.6, 0.72, 1.0);    // variación de brillo
    if(!grain||!rough) return;
    grain.repeat.set(3,3); rough.repeat.set(2,2);
    var seen=[];
    root.traverse(function(o){
      if(!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
      var m=o.material;
      if(m.transparent && m.opacity<1) return;          // no en cristales/camisa translúcida
      if(seen.indexOf(m)>=0) return; seen.push(m);
      m.bumpMap=grain; m.bumpScale = (m.metalness>0.7?0.012:0.038);
      m.roughnessMap=rough;
      m.needsUpdate=true;
    });
  }catch(e){ /* sin canvas -> se omite; el modelo se ve igualmente */ }
})();

/* ============================================================
   SUELO (recibe sombra) · BANCADA · FLUJOS
   ============================================================ */
/* ============================================================
   COMPARTIMENTO DEL MOTOR (para que se vea DENTRO de un barco)
   Sección de casco en V extruida, con espuma acústica, bancadas y sentina.
   Se construye con caras interiores (BackSide): la pared más cercana a la
   cámara nunca tapa la vista, se ve siempre el interior.
   ============================================================ */
var BAY_X0=-7.4, BAY_X1=9.75;
/*  EL COMPARTIMENTO SE LLAMA POR SU NOMBRE. Casco, espuma, bancadas y agua son
    ESCENOGRAFIA: no son piezas registradas y no se apagan nunca. Sin un nombre en
    el nodo no habia forma de distinguirlas de la fontaneria suelta del motor, y la
    posicion 0 -«un agujero vacio»- salia con mangueras flotando.               */
var bayGroup = new THREE.Group(); bayGroup.name = "bayGroup"; scene.add(bayGroup);
(function engineBay(){
  // textura acolchada tipo espuma acústica con foil (generada por código)
  var quilt=null;
  try{
    var cv=document.createElement('canvas'); cv.width=cv.height=256;
    var cx2=cv.getContext('2d');
    if(cx2){
      cx2.fillStyle='#6d6d6d'; cx2.fillRect(0,0,256,256);
      var cells=4, s=256/cells;
      for(var yq=0;yq<cells;yq++) for(var xq=0;xq<cells;xq++){
        var px=(xq+0.5)*s, py=(yq+0.5)*s;
        var gr=cx2.createRadialGradient(px,py,s*0.04,px,py,s*0.5);
        gr.addColorStop(0,'#e2e2e2'); gr.addColorStop(0.75,'#8a8a8a'); gr.addColorStop(1,'#3a3a3a');
        cx2.fillStyle=gr; cx2.beginPath(); cx2.arc(px,py,s*0.45,0,Math.PI*2); cx2.fill();
      }
      quilt=new THREE.CanvasTexture(cv);
      quilt.wrapS=quilt.wrapT=THREE.RepeatWrapping; quilt.repeat.set(9,4);
    }
  }catch(e){}

  // sección transversal del casco (z,y) — fondo plano que abre en V
  var hs=new THREE.Shape();
  hs.moveTo(-1.85,-3.15);
  hs.lineTo(1.85,-3.15);
  hs.quadraticCurveTo(3.25,-2.35, 3.5,-0.35);
  hs.lineTo(3.65,4.9);
  hs.lineTo(-3.65,4.9);
  hs.lineTo(-3.5,-0.35);
  hs.quadraticCurveTo(-3.25,-2.35, -1.85,-3.15);
  var hullMat=new THREE.MeshStandardMaterial({
    color:0x9aa0a4, metalness:0.22, roughness:0.72, side:THREE.BackSide, envMapIntensity:0.5
  });
  if(quilt){ hullMat.bumpMap=quilt; hullMat.bumpScale=0.06; }
  var hull=new THREE.Mesh(new THREE.ExtrudeGeometry(hs,{depth:BAY_X1-BAY_X0, bevelEnabled:false}), hullMat);
  hull.rotation.y=Math.PI/2; hull.position.set(BAY_X0,0,0);
  hull.receiveShadow=true; hull.castShadow=false;
  bayGroup.add(hull);

  // sentina: sole oscuro + lámina de agua
  var bilgeM=mat(0x1a2027,{metal:0.1, rough:0.9, env:0.3});
  var bilge=box(BAY_X1-BAY_X0, 0.12, 3.6, bilgeM);
  bilge.position.set((BAY_X0+BAY_X1)/2, -3.08, 0); bilge.receiveShadow=true; bayGroup.add(bilge);
  /*  LA SENTINA, con nombre. `1.1` y `1.6` la necesitan como blanco pinchable, y es
      la única pieza del módulo que pertenece al BARCO y no al motor.  */
  /*  LA SENTINA VA EN `est`, NO EN `ref`. No es del circuito de refrigeracion:
      apagar «cooling» no puede hacerla desaparecer, y estando en `ref` el selector
      viejo la dejaba dibujada y no pinchable en `1.1` -que enciende solo `est`-, o
      sea que la pregunta de esa pantalla no tenia respuesta posible. `est` es el
      cajon de lo que no es combustion, refrigeracion ni transmision.            */
  regEnSitio(bilge,'est',{name:'Bilge', noPick:false, ex:V(0,-1,0), exMag:0.0,
    desc:'The lowest part of the engine compartment, under the engine itself. There is nearly always a little water in it.',
    yacht:'The B in WOBBLE. Everything the engine leaks ends up here, so a look under the boards tells you about oil, coolant, seawater and diesel at once \u2014 for free, every time.'});
  var water=box(BAY_X1-BAY_X0-0.4, 0.02, 3.2,
    mat(0x16323f,{metal:0.1, rough:0.08, opacity:0.55, env:1.2}));
  water.position.set((BAY_X0+BAY_X1)/2, -2.98, 0); bayGroup.add(water);

  // bancadas longitudinales bajo las patas del motor
  /*  ══ EL PANEL DEL MOTOR · mamparo de popa ═══════════════════════════════════
      POR QUE EXISTE, y llevaba tres fases pedido. `4.7` enseña la alarma de presion
      de aceite, `6.5` y `6.6` la aguja de temperatura y `7.4` el testigo de carga —
      **tres instrumentos que el alumno no habia visto nunca**, explicados con
      palabras sobre una figura que no los tenia. Y la P3 entera habla de alarmas.

      NO ES UN INSTRUMENTO COMPLETO: tres testigos y una aguja, que es lo que las
      cuatro pantallas necesitan y ni una malla mas.

      ── DONDE VA, Y POR QUE NO DONDE SE VERIA MEJOR ───────────────
      En el **mamparo de popa**, mirando hacia proa. La pared de babor de la bancada
      se veria desde mas camaras y **es un sitio que no existe en ningun barco**: un
      modulo que enseña un motor que el alumno va a reconocer en el suyo no puede
      poner las cosas donde se ven mejor. Es la misma decision que se tomo con las
      tres salidas de escape.

      ── Y CUELGA DE `bayGroup`, COMO LA SENTINA ───────────────────
      Un panel no es fontaneria del motor: no se monta ni se desmonta con el
      deslizador, esta ahi desde la posicion 0 como el casco. `bayGroup` esta en
      `FUERA_DEL_MONTAJE`, asi que `verPiezas` no lo toca — **exactamente el arreglo
      que ya usa `Bilge`**, que tambien es pieza registrada, pinchable y fuera del
      montaje.                                                                     */
  var panelG = new THREE.Group();
  var panelM = mat(0x232a2e,{metal:0.35, rough:0.6});
  var placa = box(0.07, 0.62, 0.94, panelM);
  panelG.add(placa);

  /*  LOS TRES TESTIGOS, Y COMO SE VE UN PILOTO DE VERDAD ─────────────
      **El color base es la lente oscura, no el color de la luz.** Apagado, un piloto
      es un plastico casi negro; encendido, es su color. Si la lente fuera ya roja, la
      diferencia entre apagado y encendido seria «rojo mate» contra «rojo brillante»,
      que es la mitad de contraste por nada.

      Y `ei` VA EN 1,6 Y NO EN 2,4. Medido mirando la foto, que es la unica manera de
      medir esto: **a 2,4 los tres testigos salian BLANCOS** — el tono se satura y el
      rojo se pierde—, o sea encendidos y sin decir de que color. Un piloto que no se
      lee como rojo no ha encendido nada para el alumno. Es la regla de Joel: *un
      testigo encendido tiene que LEERSE como encendido, no solo tener otro numero.*

      No hay malla nueva al encenderse, que es lo que hace esto barato: el mismo truco
      que usan los puntos del recorrido.                                             */
  var LENTE = 0x2b3034;                //  el plastico apagado
  var TESTIGOS = [["oil", 0xe2402c], ["temp", 0xe2402c], ["charge", 0xe8a521]];
  var luces = {};
  for (var it = 0; it < TESTIGOS.length; it++) {
    var lz = cyl(0.105, 0.105, 0.05, 18,
                 {material: mat(LENTE, {metal:0.05, rough:0.45,
                                        emissive:TESTIGOS[it][1], ei:0})});
    lz.rotation.z = Math.PI / 2;                  //  tumbado, mirando a proa
    lz.position.set(-0.05, -0.19, 0.29 - it * 0.29);
    panelG.add(lz); luces[TESTIGOS[it][0]] = lz;
  }

  /*  LA AGUJA Y SU ESFERA. La aguja cuelga de un grupo cuyo origen es el centro de la
      esfera, asi que moverla es girar el grupo y no recolocar la malla.            */
  var esfera = cyl(0.2, 0.2, 0.04, 24,
                   {material: mat(0xe8ecee, {metal:0.05, rough:0.7})});
  esfera.rotation.z = Math.PI / 2; esfera.position.set(-0.05, 0.13, 0.28);
  panelG.add(esfera);
  var agujaG = new THREE.Group(); agujaG.position.set(-0.09, 0.13, 0.28);
  var aguja = box(0.018, 0.17, 0.02, mat(0x1d2326,{metal:0.2, rough:0.6}));
  aguja.position.y = 0.075; agujaG.add(aguja); panelG.add(agujaG);

  panelG.position.set(BAY_X1 - 0.55, 2.35, -1.25);
  bayGroup.add(panelG);
  INTER.panel = {luces: luces, aguja: agujaG};

  regEnSitio(placa,'est',{name:'Engine panel', ex:V(-1,0,0), exMag:0.0,
    desc:'The engine instrument panel: a temperature gauge and the three warning lights — oil pressure, temperature and charge. On a real boat it is in the cockpit or on the bulkhead, where you can see it from the helm.',
    yacht:'The lights come on with the key and go out when she fires. One that stays on, or comes on under way, is telling you to stop and look — and the oil one you obey before you understand it.'});
  var bearM=mat(0x2b3138,{metal:0.08, rough:0.85, env:0.4});
  for(var b=0;b<2;b++){
    var rail=box(11.6, 0.75, 0.62, bearM);
    rail.position.set(0.4, -2.55, b?1.03:-1.03);
    rail.castShadow=true; rail.receiveShadow=true; bayGroup.add(rail);
    var cap=box(11.6, 0.08, 0.7, mat(0x4a5158,{metal:0.5, rough:0.6}));
    cap.position.set(0.4, -2.14, b?1.03:-1.03); cap.receiveShadow=true; bayGroup.add(cap);
  }

  // mamparo de popa por donde sale el eje (aro del pasacasco)
  var ring=tor(0.34,0.09, mat(0x6e767d,{metal:0.7, rough:0.5}), 14);
  ring.rotation.y=Math.PI/2; ring.position.set(9.7, CRANK_Y+0.05, 0); bayGroup.add(ring);
})();

/* rejilla técnica opcional (medidas) */
var gridGroup=new THREE.Group(); gridGroup.name="gridGroup"; gridGroup.visible=false; scene.add(gridGroup);
(function bed(){
  var bedHelper=new THREE.GridHelper(44,44,0x2a3f55,0x18283a); bedHelper.position.y=-3.02; gridGroup.add(bedHelper);
})();

/* Los flujos se construyen a partir de los MISMOS tramos que usan los recorridos
   guiados, así el trazado siempre coincide con lo que se enseña paso a paso.
   Se dibuja la ruta completa (tubo translúcido) + partículas en movimiento. */
var flowGroup=new THREE.Group(); flowGroup.name="flowGroup"; flowGroup.visible=false; scene.add(flowGroup);
var flows=[], flowsBuilt=false, flowSolo=null;
/*  ── LOS RECORRIDOS · SEIS, NO CUATRO ───────────────────────────────
    `FLOWDEF` declaraba **cuatro** y `JOURNEY` trae **seis**. Los dos que faltaban son
    `elec` y `tra` — que son, exactamente, **los circuitos de la fase 7 y de la fase 8**.
    Habrian llegado sin recorrido y sin que nada lo dijera: `buildFlows` recorre
    `FLOWDEF`, asi que lo que no este aqui no se dibuja aunque tenga sus datos.

    LO SACO COTEJAR LOS TRES SITIOS QUE DECLARAN LO MISMO: `JOURNEY` -los datos-,
    `FLOWDEF` -lo que la figura dibuja- y `RECORRIDOS` en `mecanicas-motor.js` -lo que
    las pantallas pueden pedir-. Comparando dos cualesquiera de los tres, no sale.   */
var FLOWDEF=[
  {key:'raw',  label:'Seawater',  color:COL.raw,     speed:0.075, dots:11},
  {key:'cool', label:'Coolant',   color:COL.cool,    speed:0.060, dots:9},
  {key:'fuel', label:'Fuel',      color:COL.fuel,    speed:0.065, dots:9},
  {key:'lube', label:'Oil',       color:0xd8a63a,    speed:0.055, dots:8},
  {key:'elec', label:'Current',   color:0xd0574a,    speed:0.090, dots:10},
  {key:'tra',  label:'Drive',     color:COL.tra,     speed:0.050, dots:9}
];
/*  ── `JOURNEY` · LOS DATOS DE LOS SEIS RECORRIDOS ───────────────────
    SE QUEDO EN EL CAPITULO VIEJO, y `buildFlows()` empieza con
    `if(flowsBuilt || typeof JOURNEY==='undefined') return;` — asi que regresaba sin
    construir nada, en silencio.

    MEDIDO TRES VECES ANTES DE TOCARLO: cero pixeles de diferencia entre `t=0` y
    `t=0,25`, cero contra el circuito apagado, **218 mallas visibles con recorrido y 218
    sin el**, y la foto sin recorrido ninguno. La consola, callada.

    Es la cuarta de la misma familia —`onPick`, `clearFocus`, `setFlow` y esta—, y todas
    tienen la misma forma: **la extraccion se llevo la maquinaria y dejo la llamada**,
    protegida por un `typeof` que la convierte en no hacer nada.

    Transcrito del capitulo sin tocar una cifra. Que cada tramo siga cuadrando con la
    geometria de HOY no se supone: se mide.                                          */
var JOURNEY={
  raw:{ title:'Seawater (raw water) circuit', color:COL.raw, hi:0x1f4f8a, steps:[
    {n:'Seacock', names:['Seacock'], cam:{theta:0.6,phi:1.30,r:11},
     leg:[V(-1.4,-2.9,-1.95),V(-1.4,-2.45,-1.95)],
     d:'Seawater enters through a valve in the hull. This is the start of the whole cooling circuit — and the first thing to check if the engine overheats.',
     c:'It must be OPEN to run the engine. Know where every seacock is, and keep a tapered wooden bung tied beside each one.'},
    {n:'Raw-water strainer', names:['Raw-water strainer'], cam:{theta:0.5,phi:1.18,r:10},
     leg:[V(-1.4,-2.45,-1.95),V(-1.4,-1.8,-2.0),V(-1.4,-1.1,-2.0)],
     d:'The water passes through a basket that traps weed, plastic bags and sand before they can reach the pump.',
     c:'Look at the clear bowl daily. A blocked basket starves the pump and the engine overheats — one of the two commonest causes.'},
    {n:'Raw-water pump', names:['Raw-water pump (impeller)'], cam:{theta:1.9,phi:1.10,r:9},
     leg:[V(-1.4,-1.1,-2.0),V(-2.5,-0.9,-1.4),V(-3.5,-0.7,-0.75)],
     d:'A belt-driven rubber impeller sucks the water in and pushes it on. It is a positive-displacement pump, so it can lift water without priming.',
     c:'The impeller self-destructs in seconds if it runs dry. Carry a spare and know how to change it — the bronze cover comes off.'},
    {n:'Heat exchanger', nums:[19], cam:{theta:1.1,phi:0.95,r:13},
     leg:[V(-3.5,-0.7,-0.7),V(-3.0,1.0,-0.4),V(-2.1,2.7,0)],
     d:'The seawater flows through a bundle of tubes inside the heat exchanger. The engine coolant flows around those tubes and gives up its heat — the two liquids never touch.',
     c:'Salt and scale block those tubes over time. Check the anode that protects the exchanger from corrosion.'},
    {n:'Vented (anti-siphon) loop', names:['Vented (anti-siphon) loop'], cam:{theta:0.75,phi:0.92,r:10},
     leg:[V(2.3,2.55,-0.1),V(2.5,2.75,-1.1),V(2.75,2.65,-2.25),V(2.75,3.2,-2.25),
          V(3.05,3.58,-2.25),V(3.35,3.2,-2.25),V(3.35,2.65,-2.25)],
     d:'On its way to the exhaust the water is taken up over a loop above the waterline, with a small air valve at the top. That air break makes it impossible for the sea to siphon back down into the engine once it is stopped.',
     c:'The little valve furs up with salt. If it blocks, seawater can siphon into a cylinder and hydraulic-lock the engine. Clean it every season and carry a spare.'},
    {n:'Exhaust mixing elbow', nums:[24], cam:{theta:-0.3,phi:1.0,r:11},
     leg:[V(3.35,2.62,-2.25),V(3.4,2.3,-1.8),V(3.35,1.95,-1.2),V(3.3,1.75,-1.02)],
     d:'Here the seawater is injected into the hot exhaust gases. It cools them and silences them — which is why the rest of the exhaust can be ordinary rubber hose rather than steel.',
     c:'Carbon builds up here over the years and narrows the passage. A classic cause of a slowly overheating older engine.'},
    {n:'Waterlock / silencer', names:['Waterlock / exhaust silencer'], cam:{theta:0.35,phi:1.18,r:11},
     leg:[V(3.55,1.15,-1.15),V(4.3,0.2,-1.5),V(5.1,-1.2,-1.8),V(6.0,-1.9,-1.9)],
     d:'Water and gas run down into a drum at the low point of the system. It muffles the noise and holds a slug of water that cannot run back up into the engine when everything stops.',
     c:'Never crank and crank without the engine firing: each turn pumps more water into this drum until it backs up into the cylinders. Find out why it will not start first.'},
    {n:'Out through the transom', names:['Exhaust outlet (transom)'], cam:{theta:0.55,phi:1.05,r:12},
     leg:[V(6.6,-1.7,-1.9),V(7.6,-1.1,-1.8),V(8.7,-0.6,-1.7),V(9.9,-0.35,-1.6)],
     d:'Water and exhaust gas leave the boat together through a fitting in the transom. The seawater that came in at the seacock finally goes back to the sea.',
     c:'THIS is the check to make every single time you start: water spitting out with the exhaust within seconds. No water = stop the engine immediately.'}
  ]},
  cool:{ title:'Coolant circuit — sealed fresh-water loop', color:COL.cool, hi:0x1f3f8a, steps:[
    {n:'Header tank', nums:[20], cam:{theta:1.2,phi:0.85,r:12},
     leg:[V(-2.0,3.45,0),V(-2.0,3.0,0)],
     d:'The header tank holds the coolant — fresh water plus antifreeze — and takes up its expansion as the engine warms.',
     c:'Check the level COLD. Never open the cap on a hot engine: it is under pressure and will scald you.'},
    {n:'Circulating pump', nums:[21], cam:{theta:2.0,phi:1.10,r:9},
     leg:[V(-2.0,3.0,0),V(-3.2,1.2,0.2),V(-3.7,-0.35,0)],
     d:'A belt-driven pump on the front of the engine keeps the coolant moving round the loop.',
     c:'It usually shares its belt with the alternator. A broken belt means no circulation AND no charging at the same time.'},
    {n:'Water jacket', nums:[23], cam:{theta:1.4,phi:1.05,r:12},
     leg:[V(-3.7,-0.35,0),V(-2.6,-0.3,0.5),V(0,-0.25,0.6),V(2.4,-0.2,0.5)],
     d:'The coolant flows through galleries cast inside the block and head, wrapping around every cylinder and picking up the heat of combustion.',
     c:'You cannot see or reach these. Using the correct antifreeze stops them furring up with scale.'},
    {n:'Thermostat', nums:[22], cam:{theta:1.6,phi:1.0,r:9},
     leg:[V(2.4,-0.2,0.5),V(0,0.5,0.5),V(-2.6,1.4,0.3)],
     d:'The thermostat keeps the coolant recirculating inside the engine until it reaches about 80–85 °C, then opens the way to the heat exchanger.',
     c:'Stuck shut = overheating. Stuck open = an engine that never warms up and runs badly. Cheap, so carry a spare.'},
    {n:'Heat exchanger', nums:[19], cam:{theta:1.1,phi:0.9,r:13},
     leg:[V(-2.6,1.4,0.3),V(-1.6,2.2,0.2),V(0.15,2.75,0)],
     d:'Here the hot coolant gives its heat to the seawater in the tube bundle, then returns to the pump. The loop is sealed — the coolant never leaves the engine.',
     c:'If the level keeps dropping, look for a leak or a failed head gasket. Oil that looks milky is water getting into it.'}
  ]},
  elec:{ title:'Electrical circuit — starting and charging', color:0xd0574a, hi:0x8a2f22, steps:[
    {n:'Engine-start battery', names:['Engine-start battery'], cam:{theta:0.7,phi:1.15,r:11},
     leg:[V(-5.6,-1.55,-2.25),V(-5.3,-1.6,-2.2)],
     d:'A battery kept for one job only: turning the engine. It is isolated from the domestic bank so lights, fridge and instruments can never flatten it.',
     c:'If the engine has not fired after about ten seconds of cranking, stop. Something else is wrong and you are spending the one thing you need.'},
    {n:'Isolator switch', names:['Battery isolator switch'], cam:{theta:0.6,phi:1.12,r:9},
     leg:[V(-5.3,-1.6,-2.2),V(-4.7,-1.5,-2.4),V(-4.0,-1.5,-2.5)],
     d:'The main switch between the batteries and the boat. Off means the whole system is dead and safe to work on.',
     c:'Know where it is before you need it — it is your first move in an electrical fire. But never switch it off with the engine running: that can destroy the alternator.'},
    {n:'Main positive cable', names:['Main positive cable'], cam:{theta:0.85,phi:1.18,r:10},
     leg:[V(-5.15,-1.62,-2.15),V(-4.4,-1.55,-1.7),V(-3.6,-1.4,-1.2),V(-3.05,-1.28,-1.0)],
     d:'A heavy cable carries the current to the starter. It is thick because a starter motor draws several hundred amps for the few seconds it turns the engine.',
     c:'Terminals tight and clean. Green corrosion here means voltage drop and slow, laboured cranking.'},
    {n:'Starter motor', names:['Starter motor'], cam:{theta:-0.15,phi:1.12,r:9},
     leg:[V(-3.05,-1.28,-1.0),V(0,-1.3,-1.0),V(2.7,-1.25,-0.95)],
     d:'The starter throws a small pinion into the flywheel ring gear and spins the engine fast enough for compression to ignite the diesel.',
     c:'A single loud click with no turning is almost never the starter itself — it is a flat battery or a bad connection.'},
    {n:'Earth return', names:['Earth (ground) strap'], cam:{theta:0.55,phi:1.20,r:10},
     leg:[V(2.7,-1.35,-0.95),V(0,-1.5,-1.05),V(-3.4,-1.5,-1.1),V(-4.9,-1.75,-2.2)],
     d:'Every one of those amps has to get back to the battery, and it returns through the heavy negative strap bonded to the engine block. The circuit is only complete when it does.',
     c:'THE classic hidden fault. A corroded earth gives a starter that clicks but will not turn, while the battery tests perfectly fine. Clean it yearly and smear with Vaseline.'},
    {n:'Alternator', names:['Alternator'], cam:{theta:2.1,phi:1.05,r:9},
     leg:[V(-3.45,0.7,0.7),V(-3.2,0.9,0.2),V(-3.3,0.85,-0.4)],
     d:'Once running, the belt-driven alternator becomes the power station: it recharges what the start took and carries the boat’s electrical load.',
     c:'Its belt is shared with the coolant pump on most engines, so a broken belt costs you charging AND cooling at the same moment.'},
    {n:'Split-charge relay', names:['Split-charge relay'], cam:{theta:0.65,phi:1.05,r:9},
     leg:[V(-3.3,0.85,-0.4),V(-3.8,-0.4,-1.6),V(-4.35,-0.95,-2.55)],
     d:'The charge is shared between both banks while the engine runs, then the relay separates them when it stops — so the domestic side can never drain your one guaranteed start.',
     c:'If the engine battery keeps going flat overnight, suspect this or its wiring before you blame the battery.'}
  ]},
  lube:{ title:'Lubrication circuit — the oil path', color:0xd8a63a, hi:0x7a5a10, steps:[
    {n:'Sump', nums:[32], cam:{theta:1.2,phi:1.22,r:12},
     leg:[V(0,-2.4,0),V(-0.75,-2.2,0)],
     d:'All the oil drains back down here between jobs. The dipstick measures what is sitting in this tray.',
     c:'Check the level cold before every trip. Milky oil means water is getting in; a level that rises on its own can mean diesel.'},
    {n:'Pickup strainer', names:['Oil pickup strainer'], cam:{theta:1.0,phi:1.20,r:9},
     leg:[V(-0.75,-2.15,0),V(-0.75,-1.9,0)],
     d:'The pump draws through a coarse mesh at the lowest point of the sump, so debris can never reach the bearings.',
     c:'Not serviceable afloat — but it is exactly why oil changes matter. Sludge eventually blocks it.'},
    {n:'Oil pump', names:['Oil pump'], cam:{theta:1.9,phi:1.12,r:8},
     leg:[V(-0.75,-1.9,0),V(-2.0,-1.8,0.15),V(-2.95,-1.7,0.3)],
     d:'A gear pump driven straight off the crankshaft. It puts the whole system under pressure the moment the engine turns.',
     c:'No adjustment to make. What you watch is its result on the gauge: oil pressure.'},
    {n:'Oil filter', names:['Oil filter'], cam:{theta:1.45,phi:1.10,r:9},
     leg:[V(-2.95,-1.55,0.3),V(-2.8,-1.0,0.8),V(-2.5,-0.55,1.05)],
     d:'All the oil passes through a full-flow spin-on filter. It carries a bypass valve, so if it ever clogs the engine still gets oil — dirty oil beats no oil.',
     c:'Changed with every oil change. Oil the new seal, tighten by hand, and carry a spare plus the wrench.'},
    {n:'Oil cooler', names:['Oil cooler'], cam:{theta:1.05,phi:1.10,r:9},
     leg:[V(-2.5,-0.55,1.05),V(0,-0.65,1.12),V(1.75,-0.72,1.14)],
     d:'Seawater takes heat out of the oil here. Hot oil thins and loses its protective film, so cooling it protects the bearings.',
     c:'It sits in the raw-water circuit: another place salt and scale build up. An internal leak mixes oil and seawater.'},
    {n:'Main gallery and bearings', names:['Main oil gallery'], cam:{theta:1.35,phi:1.05,r:12},
     leg:[V(1.75,-0.9,1.14),V(0,-1.02,0.6),V(-2.9,-1.02,0.42)],
     d:'A drilled passage runs the length of the block. Smaller drillings branch off it to every main bearing, every big end and the camshaft. Some engines also squirt oil at the underside of the pistons.',
     c:'You never see it, but its drillings are narrow. Sludge from neglected oil is what blocks them.'},
    {n:'Pressure sender and return', names:['Oil pressure sender'], cam:{theta:1.25,phi:1.05,r:9},
     leg:[V(-2.0,-0.6,0.9),V(-2.0,-0.05,1.0)],
     d:'Oil drains back down to the sump under gravity and the cycle repeats. A sender on the gallery reports the pressure to your gauge or alarm.',
     c:'The oil-pressure alarm is the most important warning on the panel. If it sounds, STOP — running without pressure destroys the bearings in seconds.'}
  ]},
  tra:{ title:'Transmission — from piston to propeller', color:COL.tra, hi:0x1f6a3e, steps:[
    {n:'Piston and connecting rod', nums:[11], cam:{theta:1.25,phi:1.05,r:11},
     leg:[V(-2.4,0.3,0),V(-2.4,-1.1,0)],
     d:'The burning gases push the piston down. The connecting rod passes that push to the crankshaft. This is where power is born, four times every two turns.',
     c:'You never see this running, but the knocking noises that come from here — and blue smoke — are what you diagnose from outside.'},
    {n:'Crankshaft', nums:[13], cam:{theta:1.5,phi:1.15,r:12},
     leg:[V(-2.4,-1.4,0),V(0,-1.4,0),V(3.2,-1.4,0)],
     d:'The crankshaft turns those four separate pushes into smooth rotation. On this in-line four the firing order is 1-3-4-2, so one cylinder fires every half turn.',
     c:'It survives on oil pressure alone. If the oil alarm sounds, stop the engine before the bearings are ruined.'},
    {n:'Flywheel', nums:[25], cam:{theta:0.35,phi:1.10,r:11},
     leg:[V(3.2,-1.4,0),V(4.0,-1.4,0)],
     d:'A heavy disc that stores energy and carries the crankshaft smoothly between firing strokes. Its toothed ring is what the starter motor engages to crank the engine.',
     c:'A loud click with no cranking is usually a flat battery or a bad connection — not the flywheel itself.'},
    {n:'Gearbox', nums:[26], cam:{theta:0.2,phi:1.05,r:10},
     leg:[V(4.0,-1.4,0),V(5.45,-1.35,0)],
     d:'The gearbox reduces engine revs to something a propeller can use, and selects ahead, neutral or astern by reversing the shaft.',
     c:'It has its own oil, with its own dipstick — check it and watch for leaks. Always change gear at idle, never at revs.'},
    {n:'Flexible coupling', nums:[27], cam:{theta:0.15,phi:1.05,r:8},
     leg:[V(5.45,-1.35,0),V(6.4,-1.35,0)],
     d:'A rubber-and-steel joint between gearbox and shaft. It absorbs small misalignments and damps the vibration and shock of gear changes.',
     c:'Look for cracked rubber and bolts working loose. Bad alignment shows up as vibration and a hot stern gland.'},
    {n:'Propeller shaft', nums:[29], cam:{theta:0.1,phi:1.05,r:12},
     leg:[V(6.4,-1.35,0),V(8.0,-1.35,0),V(9.2,-1.35,0)],
     d:'A stainless steel shaft carries the drive aft, passing out through the hull.',
     c:'Check it is straight and not corroded, and keep its sacrificial anode in good condition.'},
    {n:'Stern gland', nums:[28], cam:{theta:0.4,phi:1.12,r:8},
     leg:[V(9.2,-1.35,0),V(9.6,-1.35,0)],
     d:'Where the turning shaft goes through the hull, the stern gland seals against the sea while still letting it spin.',
     c:'A traditional packed gland should drip a few drops a minute under way. Bone dry and hot means it is too tight.'},
    {n:'Propeller', nums:[30], cam:{theta:0.3,phi:1.08,r:10},
     leg:[V(9.6,-1.35,0),V(10.4,-1.35,0),V(11.4,-1.35,0)],
     d:'The propeller screws itself through the water and turns rotation into thrust — ahead or astern.',
     c:'Dive on it if the boat feels slow: weed, a rope round the shaft or a chipped blade all rob performance and cause vibration.'}
  ]},
  fuel:{ title:'Fuel circuit — tank to injector', color:COL.fuel, hi:0x8a6a12, steps:[
    {n:'Fuel tank', nums:[1], cam:{theta:1.5,phi:1.12,r:13},
     leg:[V(-6.2,-0.5,1.5),V(-5.5,-0.45,1.6)],
     d:'Diesel is drawn from the tank. Everything downstream depends on that fuel being clean and free of water.',
     c:'Keep the tank full to cut condensation, which is where water — and diesel bug — comes from.'},
    {n:'Primary filter / water separator', nums:[2], cam:{theta:1.35,phi:1.10,r:9},
     leg:[V(-5.5,-0.45,1.6),V(-5.0,-0.3,1.7),V(-4.7,-0.2,1.7)],
     d:'The first filter traps large dirt and, above all, separates water from the diesel. The water sinks into the clear bowl underneath.',
     c:'The single most important fuel check. Look at the bowl daily and drain it if water or dirt is sitting there.'},
    {n:'Lift pump', nums:[3], cam:{theta:1.3,phi:1.10,r:9},
     leg:[V(-4.7,-0.2,1.7),V(-3.0,-0.3,1.5),V(-1.2,-0.35,1.2)],
     d:'The lift pump pulls fuel through the filters and pushes it on to the injection pump. Its hand lever lets you prime the system by hand.',
     c:'This lever is what you use to bleed the air out after changing a filter or running the tank dry.'},
    {n:'Secondary fine filter', nums:[4], cam:{theta:0.9,phi:1.08,r:9},
     leg:[V(-1.2,-0.35,1.2),V(0,-0.2,1.3),V(0.9,-0.05,1.3)],
     d:'A final, much finer filter catches the smallest particles before they can reach the precision injection equipment.',
     c:'Changed at every service — and every filter change must be followed by bleeding the air out.'},
    {n:'Injection pump', nums:[5], cam:{theta:1.1,phi:1.02,r:9},
     leg:[V(0.9,-0.05,1.3),V(0.4,-0.2,1.15),V(-0.1,-0.25,1.05)],
     d:'This pump raises the fuel to enormous pressure and sends a measured shot to each injector at exactly the right moment.',
     c:'Sealed precision equipment — never touched on board. Clean, dry fuel is what keeps it alive.'},
    {n:'Injectors', nums:[6], cam:{theta:1.2,phi:0.95,r:10},
     leg:[V(-0.1,-0.25,1.05),V(-2.4,0.9,0.5),V(-2.4,1.95,0.05)],
     d:'The injector sprays the diesel as a fine mist into air that compression has already heated past 500 °C. It ignites on contact — there is no spark plug.',
     c:'Worn or dirty injectors give black smoke, rough running and hard starting. Workshop work, but you diagnose it from the smoke.'},
    {n:'Return line', names:['Injection pump'], cam:{theta:1.0,phi:1.0,r:12},
     leg:[V(-2.4,1.95,0.05),V(-4.0,1.2,0.8),V(-6.2,-0.4,1.5)],
     d:'Fuel that is not burned returns to the tank through a separate line, carrying away heat and any trapped air.',
     c:'A leaking return line lets air into the system — a hidden cause of an engine that keeps stopping.'}
  ]}
};
/*  ══ LAS GUARDAS CANTAN, NO CALLAN ═══════════════════════════════════════════════
    EN UNA PIEZA EXTRAIDA, QUE ALGO FALTE NO ES UNA CONDICION NORMAL: es que la
    extraccion esta incompleta. Un `typeof` que devuelve en silencio es lo que hizo
    invisibles las cuatro averias de esta familia —`onPick`, `clearFocus`, `setFlow` y
    `JOURNEY`—: la figura arrancaba, no lanzaba nada, y la mitad de un mando no existia.

    `falta()` deja constancia de lo que no esta: lo dice por consola y lo guarda, para
    que `queFalta()` lo pueda contar. `walk-motor3d.js` se pone ROJO si la lista no esta
    vacia — que es lo que convierte cuatro fallos invisibles en cuatro rojos.        */
var LO_QUE_FALTA = [];
var recorridoActual = null;
function falta(nombre, paraQue){
  if (LO_QUE_FALTA.indexOf(nombre) >= 0) return;
  LO_QUE_FALTA.push(nombre);
  if (typeof console !== "undefined" && console.warn) {
    console.warn("motor3d: FALTA `" + nombre + "` — " + paraQue
      + ". La figura sigue, pero eso no funciona.");
  }
}

function buildFlows(){
  if(flowsBuilt) return;
  if(typeof JOURNEY==='undefined'){
    falta("JOURNEY", "son los datos de los seis recorridos; sin ellos no se dibuja "
                   + "ningun circuito");
    return;
  }
  flowsBuilt=true;
  for(var f=0; f<FLOWDEF.length; f++){
    var D=FLOWDEF[f], J=JOURNEY[D.key];
    if(!J) continue;
    // encadena todos los tramos del recorrido en una sola ruta
    var pts=[];
    for(var s=0; s<J.steps.length; s++){
      var leg=J.steps[s].leg||[];
      for(var q=0; q<leg.length; q++){
        var pnt=leg[q], last=pts[pts.length-1];
        if(!last || last.distanceTo(pnt)>0.05) pts.push(pnt.clone());
      }
    }
    if(pts.length<2) continue;
    var curve=new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
    var g=new THREE.Group();
    // ruta visible: tubo fino translúcido, para ver POR DÓNDE va
    var routeM=mat(D.color,{emissive:D.color, ei:0.5, metal:0.1, rough:0.4, opacity:0.30});
    var tube=new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(60,pts.length*10), 0.045, 8, false), routeM);
    g.add(tube);
    // partículas
    var dotM=mat(D.color,{emissive:D.color, ei:1.5, metal:0.15, rough:0.25});
    var dots=[];
    for(var i=0;i<D.dots;i++){
      var dd=new THREE.Mesh(new THREE.SphereGeometry(0.115,10,10), dotM);
      g.add(dd); dots.push(dd);
    }
    flowGroup.add(g);
    flows.push({key:D.key, label:D.label, curve:curve, group:g, dots:dots, speed:D.speed, t0:Math.random()});
  }
  buildFlowLegend();
}

/* ============================================================
   CÁMARA ORBITAL PROPIA
   ============================================================ */
var target=new THREE.Vector3(1.0, 0.3, 0);
var orb={ r:27, theta:0.9, phi:1.08 };
function clampPhi(){ orb.phi=Math.max(0.12,Math.min(Math.PI-0.12,orb.phi)); }
function updateCam(){
  clampPhi(); var s=Math.sin(orb.phi);
  camera.position.set(target.x+orb.r*s*Math.sin(orb.theta), target.y+orb.r*Math.cos(orb.phi), target.z+orb.r*s*Math.cos(orb.theta));
  camera.lookAt(target);
  // lookAt() solo toca el quaternion: sin esto, project() usa la matriz del
  // fotograma ANTERIOR y los números van desfasados respecto al motor.
  camera.updateMatrixWorld();
}
updateCam();
/* +X = popa · -X = proa (frontal de la correa) · +Z = babor · -Z = estribor */
var PRESETS={
  iso:  {theta:0.9,          phi:1.08, r:27, tx:1.0,  ty:0.3,  tz:0},
  front:{theta:-Math.PI/2,   phi:1.20, r:20, tx:-2.6, ty:-0.1, tz:0},
  port: {theta:0,            phi:1.28, r:25, tx:0.5,  ty:0.4,  tz:0},
  stbd: {theta:Math.PI,      phi:1.28, r:25, tx:0.5,  ty:0.4,  tz:0},
  top:  {theta:0.95,         phi:0.20, r:28, tx:1.0,  ty:0.3,  tz:0},
  stern:{theta:Math.PI/2,    phi:1.20, r:22, tx:5.5,  ty:-0.4, tz:0},
  /*  ── EL SEPTIMO · LA SALIDA DEL ESCAPE ──────────────────────────────────
      **Los tres penachos de humo llevaban dias modelados, probados y medidos y NO SE
      VEIAN DESDE NINGUNA DE LAS SEIS CAMARAS.** La salida del espejo esta muy a popa y
      queda fuera de las seis: `stern` mira al motor desde atras, o sea **de espaldas al
      escape**. Lo sabiamos y estaba escrito — la mirilla `__humo` tiene que apuntar
      ella misma antes de medir, y la nota decia «a 375 px se sale del encuadre, y los
      tres humos daban 0,0,0»— y aun asi construi `9.3` sin preajuste que lo enseñara.
      **Lo dijo la foto: una pantalla del color del humo, sin humo.**

      Estos valores son los de la mirilla, que es la unica vista de la que sabemos que
      el penacho entra entera. *Van tres cosas del humo que estaban hechas y no
      alcanzables: la geometria, la puerta, y ahora la camara.*                     */
  escape:{theta:0.55,        phi:1.02, r:17, tx:8.0,  ty:2.2,  tz:0.3}
};
var camAnim=null;
function animateCam(t, animate){
  if(animate===false){ orb.theta=t.theta; orb.phi=t.phi; orb.r=t.r; target.set(t.tx,t.ty,t.tz); updateCam(); return; }
  var from={theta:orb.theta,phi:orb.phi,r:orb.r,tx:target.x,ty:target.y,tz:target.z};
  var dth=t.theta-from.theta; while(dth>Math.PI)dth-=2*Math.PI; while(dth<-Math.PI)dth+=2*Math.PI;
  camAnim={from:from,to:t,dth:dth,t0:performance.now(),dur:680};
  despierta();
}

/* ============================================================
   INTERACCIÓN: drag / zoom / pan
   ============================================================ */
var el=renderer.domElement;
var dragging=false, panning=false, lastX=0, lastY=0, downX=0, downY=0;
el.addEventListener('pointerdown', function(e){
  el.setPointerCapture(e.pointerId);
  if(e.button===2||e.shiftKey){ panning=true; } else { dragging=true; }
  despierta();   //  lo que el alumno conduce no se detiene mientras lo conduce
  lastX=e.clientX; lastY=e.clientY; downX=e.clientX; downY=e.clientY; camAnim=null;
});
el.addEventListener('pointermove', function(e){
  if(!dragging && !panning){
    var m=pointerPick(e.clientX,e.clientY);
    if(m!==hovered){
      if(mode==='study'){ if(hovered&&hovered!==pinned)clearEmissive(hovered); }
      hovered=m;
      if(mode==='study' && hovered && hovered!==pinned) setEmissive(hovered,0x335577,0.5);
      el.style.cursor=hovered?'pointer':'default';
    }
    return;
  }
  var dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
  if(panning){
    var sp=orb.r*0.0015;
    var right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
    var up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
    target.addScaledVector(right,-dx*sp).addScaledVector(up,dy*sp); updateCam();
  } else { orb.theta-=dx*0.005; orb.phi-=dy*0.005; updateCam(); }
});
function endDrag(e){ try{el.releasePointerCapture(e.pointerId);}catch(_){} dragging=false; panning=false; }
el.addEventListener('pointerup', function(e){
  endDrag(e);
  if(Math.hypot(e.clientX-downX,e.clientY-downY)<6){ onPick(pointerPick(e.clientX,e.clientY)); }
});
el.addEventListener('pointercancel', endDrag);
el.addEventListener('contextmenu', function(e){ e.preventDefault(); });
el.addEventListener('wheel', function(e){ e.preventDefault(); orb.r*=(1+(e.deltaY>0?0.08:-0.08)); orb.r=Math.max(8,Math.min(60,orb.r)); updateCam(); }, {passive:false});
var pinchD=0;
function touchDist(e){ var a=e.touches[0],b=e.touches[1]; return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); }
el.addEventListener('touchmove', function(e){ if(e.touches.length===2){ e.preventDefault(); var d=touchDist(e); if(pinchD){ orb.r*=pinchD/d; orb.r=Math.max(8,Math.min(60,orb.r)); updateCam(); } pinchD=d; } }, {passive:false});
el.addEventListener('touchend', function(){ pinchD=0; });

/* ---------- raycast ---------- */
var ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
var hovered=null, pinned=null;
function topMesh(obj){ var o=obj; while(o && parts.indexOf(o)<0 && o.parent) o=o.parent; return (parts.indexOf(o)>=0)?o:null; }
function groupVisible(sys){ return groups[sys] ? groups[sys].visible : false; }
/*  ¿SE VE DE VERDAD? `obj.visible` es LOCAL: una malla encendida dentro de un grupo
    apagado no se ve, y una pieza apagada por el montaje sigue dentro de un grupo
    encendido. La unica respuesta honrada es recorrer la cadena hasta la raiz.

    ESTO SUSTITUYE A `groupVisible` EN EL SELECTOR. Preguntar por el grupo dejo la
    pregunta de `1.1` sin respuesta posible: la sentina se dibujaba -cuelga de
    `bayGroup`- pero su grupo `ref` estaba apagado, asi que no se podia pinchar.  */
function seVeDeVerdad(o){
  for (var q = o; q; q = q.parent) { if (!q.visible) return false; }
  return true;
}
/*  ── LO QUE PASA AL PINCHAR · Y ESTA FUNCION NO EXISTIA ─────────────
    `pointerup` llamaba a `onPick` desde la linea 1774 y **`onPick` no estaba definida
    en ninguna parte de este fichero**. Cada pinchazo sobre el modelo lanzaba un
    `ReferenceError` y no pasaba nada mas: ni se seleccionaba la pieza, ni llegaba el
    aviso a quien escucha con `alSeleccionar`.

    VIENE DE LA EXTRACCION. En `c31-marine-engine.html` la funcion existe y reparte
    entre los modos de aquel capitulo -`examPick`, `answerQuiz`, `selectPart`-. Al
    sacar la figura, los modos se quedaron alli y **la funcion se fue con ellos; la
    llamada se quedo aqui**.

    NO LO VIO NINGUNA MEDIDA, y merece decir por que: ni una sola comprobacion pinchaba.
    Se fotografiaban las pantallas, se contaban las piezas, se median los encuadres y se
    comprobaba el corte — y **nueve de las quince pantallas piden pinchar el modelo**.
    Se descubrio construyendo el instrumento para medir OTRA cosa: cuanta pantalla
    selecciona cada pieza. El barrido devolvio cero en las dieciseis respuestas, y un
    cero que no se comprueba no es una ausencia: la consola decia el nombre del fallo.

    Y el pinchazo en el vacio **no avisa**. Quien escucha esta juzgando una respuesta, y
    dar por contestada una pantalla porque el alumno toco el fondo seria contarle un
    error que no cometio.                                                            */
function onPick(m){
  if (!m) return;
  selectPart(m);
  if (API_ganchos.pick) API_ganchos.pick(m.userData ? m.userData.name : null);
}

function setEmissive(m,hex,inten){ m.traverse(function(c){ if(c.isMesh&&c.material&&c.material.emissive){ if(c.userData._baseEm===undefined)c.userData._baseEm=c.material.emissive.getHex(); c.material.emissive.setHex(hex); c.material.emissiveIntensity=inten; } }); }
function clearEmissive(m){ m.traverse(function(c){ if(c.isMesh&&c.material&&c.material.emissive&&c.userData._baseEm!==undefined){ c.material.emissive.setHex(c.userData._baseEm); c.material.emissiveIntensity=1; } }); }
/*  ── EL PINCHAZO TIENE QUE RESPETAR EL CORTE ────────────────────────
    **`Raycaster` no sabe nada de los planos de recorte.** El recorte es cosa del
    sombreador: el fragmento no se pinta, y la geometria sigue entera y sigue ahi para
    el rayo. Asi que en una pantalla con el motor abierto, el alumno pincha lo que ve
    —el cigueñal, el piston, la camisa— y el rayo choca antes con **la pared del bloque
    que ya no esta dibujada**.

    MEDIDO, y es la causa de casi todos los ceros. Barriendo el lienzo del capitulo con
    pinchazos sinteticos, uno cada 3 px, desde las seis camaras y con el corte abierto:

        Crankshaft        0  0  0  0  0  0      Cylinder / liner   0  0  0  0  0  0
        Piston            0  0  0  0  0  0      Injector           9  9  9  9  9  9

    Seis camaras, ninguna diferencia: no era el encuadre. Era que el rayo nunca llegaba.

    Aqui se descarta el impacto que cae en el lado quitado, y **solo para las mallas que
    de verdad llevan el plano puesto** —`material.clippingPlanes`—, que son las que el
    corte se lleva. `distanceToPoint` negativo es el lado que three.js recorta.       */
function recortado(hit){
  var m = hit.object && hit.object.material;
  if (!m || !m.clippingPlanes || !m.clippingPlanes.length) return false;
  for (var k = 0; k < m.clippingPlanes.length; k++) {
    if (m.clippingPlanes[k].distanceToPoint(hit.point) < 0) return true;
  }
  return false;
}
/*  ── LA TOLERANCIA DEL DEDO ─────────────────────────────────────────
    `TOLERANCIA` es el radio, en pixeles de pantalla, dentro del cual se busca. Con
    cero, el comportamiento es el de siempre: un rayo por el punto exacto.

    CON RADIO, **el rayo del centro sigue mandando**: si da en una pieza, esa es. Solo
    cuando NO da en nada -el alumno ha tocado el fondo- se buscan rayos en dos anillos
    alrededor y se coge el impacto mas cercano a la camara. Un fallo se convierte en
    acierto y **un acierto no se puede convertir en otro**.

    LA PRIMERA VERSION NO TENIA ESA GUARDA -ganaba el mas cercano SIEMPRE- y la medida
    la tumbo. Barriendo el lienzo del capitulo, en pixeles de CSS y contra el minimo de
    la casa, que son 1 936:

                            r=0    r=6   r=12
        Rocker cover       1413   2088   3060     lo de fuera gana...
        Turbocharger        108    450    927
        Crankshaft         1242   2169   2034
        Cylinder / liner    225     45     90     ...y lo de dentro PIERDE
        Intake manifold     234      0      0
        Oil sump            378    387    261

    `Intake manifold` pasaba de 234 a **cero**: los vecinos, que estan mas cerca de la
    camara, se quedaban con los diecisiete rayos. Una regla que hace mas facil pinchar
    la tapa y IMPOSIBLE pinchar el colector no es un perdon, es una loteria.

    CON LA GUARDA, la misma tabla entera -y ni una sola pieza baja-:

                            r=0    r=6   r=12
        Rocker cover       1413   2052   2709     cruza el minimo
        Crankshaft         1242   1404   1503
        Cylinder head      1071   1224   1395
        Oil sump            378    387    378     no gana nada
        Intake manifold     234    234    234     y ya no cae a cero
        Cylinder / liner    225    225    279
        Piston              171    171    180
        Turbocharger        108    108    189
        Air filter           81     99    171
        Injector             36     72    171
        Decompressor lever    0      0      0

    NO CRECE COMO PARECE: **solo gana el borde que da al fondo**. Por eso `Oil sump`,
    que esta detras de todo, no se mueve ni un pixel, y por eso lo que esta dentro del
    bloque apenas nota nada. La tolerancia perdona al dedo torpe; no saca a la luz lo
    que esta tapado. Para eso esta la camara.

    Todo esto se mide con `barre-pinchazo.js`, que barre el lienzo pinchando.       */
var TOLERANCIA = 0;
var _anillos = [[0,0]];
function _haceAnillos(r){
  _anillos = [[0,0]];
  if (r <= 0) return;
  for (var k = 0; k < 8; k++) {
    var a = k * Math.PI / 4;
    _anillos.push([Math.cos(a)*r, Math.sin(a)*r]);
    _anillos.push([Math.cos(a)*r/2, Math.sin(a)*r/2]);
  }
}
function _unRayo(rect, cx, cy){
  ndc.x=((cx-rect.left)/rect.width)*2-1; ndc.y=-((cy-rect.top)/rect.height)*2+1;
  ray.setFromCamera(ndc,camera);
  /*  ── LAS MARCAS VAN PRIMERO, Y NO PIDEN VERSE ────────────────────
      Una marca esta dibujada **delante de todo** —`depthTest` apagado—, asi que si el
      dedo cae dentro de un aro lo que el alumno ha señalado es ese aro y no lo que hay
      detras. Y **no se le pasa por `seVeDeVerdad`** a proposito: el caso que esto
      resuelve es justo la pieza que no se ve —el rodete a 566 px, la sentina con
      ochenta y nueve piezas encima— y exigirle que se vea seria deshacer el arreglo.
      *La marca ES la prueba de que la pantalla la esta señalando.*                */
  /*  ── ENTRE MARCAS GANA LA MAS PEQUEÑA, NO LA MAS CERCANA ─────────
      Los discos se solapan, y con la regla del mas cercano **el grande se come al
      chico**: medido en el lienzo del telefono, con cuatro marcas desde `front` el
      rodete daba 1 968 px y el filtro fino **16** — su disco entero estaba detras del
      de al lado. Y no era su tamaño: subir el radio minimo del aro no movio ninguno.

      «El mas cercano» no significa nada aqui, porque **todas las marcas se dibujan
      delante de todo** —`depthTest` apagado—: la profundidad ya no decide que se ve.
      Lo que decide es cual quiso el dedo, y **dentro de un blanco grande, un blanco
      pequeño es una eleccion mas concreta**. Es el mismo principio que ya rige el
      pinchazo con tolerancia: el centro manda.                                    */
  /*  ── LA MARCA SE PINCHA EN PANTALLA, NO CON UN RAYO ──────────────
      La primera version ponia un disco invisible por marca y lo cazaba con el rayo. **Y
      dio dos estados estables**: la misma pagina, la misma camara y las mismas cuatro
      marcas daban 1 504/2 048/1 456/1 360 unas veces y 704/160/0/0 otras — tres de
      cuatro pasadas malas, identicas entre si.

      La causa: un disco es plano, y `updateMarcas` es quien lo pone **de cara a la
      camara** — dentro del bucle de dibujo, que en esta figura **se aparca**. Si el
      encuadre cambia y el bucle no vuelve a pasar, el disco se queda mirando a donde
      miraba antes, y **un circulo visto de canto no tiene area**: el rayo lo atraviesa.

      Asi que no se pincha una malla: **se proyecta el centro de la marca a la pantalla y
      se mira si el dedo cayo dentro de su radio**. No hay geometria de por medio, asi
      que no hay orientacion que pueda estar vieja, y la cuenta usa la camara de ESTE
      instante — la misma con la que se dibujo lo que el alumno esta viendo.

      *Es la leccion de `walk-angulo` una vez mas: lo que posa una cosa corre dentro del
      bucle, y quien pregunta fuera del bucle pregunta por lo de antes. Aqui, en vez de
      forzar el bucle, se quita el bucle de en medio.*

      ENTRE MARCAS GANA LA MAS PEQUEÑA. Todas se dibujan delante de todo, asi que la
      profundidad no decide nada; lo que decide es cual quiso el dedo, y **dentro de un
      blanco grande, un blanco pequeño es una eleccion mas concreta**. Es el mismo
      principio que ya rige la tolerancia del pinchazo: el centro manda.            */
  if (typeof MARCAS !== "undefined" && MARCAS.length
      && typeof marcaGroup !== "undefined" && marcaGroup.visible) {
    var _mv = new THREE.Vector3();
    var mejorM = null, mejorR = Infinity;
    for (var q = 0; q < MARCAS.length; q++) {
      var mk = MARCAS[q];
      if (!mk.mesh || !mk.mesh.visible) continue;
      mk.mesh.getWorldPosition(_mv);
      var dCam = camera.position.distanceTo(_mv);
      _mv.project(camera);
      if (_mv.z > 1) continue;                      //  detras de la camara
      var mx = (_mv.x * 0.5 + 0.5) * rect.width;
      var my = (-_mv.y * 0.5 + 0.5) * rect.height;
      /*  el radio del aro, de unidades del mundo a pixeles de pantalla: media altura
          del plano visible a esa distancia es `tan(fov/2) * d`  */
      var medio = Math.tan((camera.fov * Math.PI / 180) / 2) * dCam;
      if (!(medio > 0)) continue;
      var rPx = (mk.r * 1.34 / medio) * (rect.height / 2);
      var dx = (cx - rect.left) - mx, dy = (cy - rect.top) - my;
      if (dx * dx + dy * dy > rPx * rPx) continue;
      if (rPx < mejorR) { mejorR = rPx; mejorM = mk; }
    }
    if (mejorM) return { pieza: mejorM.mesh, lejos: 0 };
  }
  var hits=ray.intersectObjects(pickables,true);
  for(var i=0;i<hits.length;i++){
    if(recortado(hits[i])) continue;
    var t=topMesh(hits[i].object);
    if(t&&seVeDeVerdad(t)) return {pieza:t, lejos:hits[i].distance};
  }
  return null;
}
function pointerPick(cx,cy){
  var rect=el.getBoundingClientRect();
  var centro=_unRayo(rect,cx,cy);
  //  el centro manda: un acierto nunca se cambia por otro
  if (centro) return centro.pieza;
  if (TOLERANCIA <= 0) return null;
  var mejor=null;
  for (var k=1;k<_anillos.length;k++){
    var h=_unRayo(rect, cx+_anillos[k][0], cy+_anillos[k][1]);
    if (h && (!mejor || h.lejos < mejor.lejos)) mejor=h;
  }
  return mejor?mejor.pieza:null;
}

/* ============================================================
   INFO · ÍNDICE · BADGES
   ============================================================ */
var SYSMETA={ com:{name:'Combustion',col:'var(--c-com)'}, ref:{name:'Cooling',col:'var(--c-cool)'}, tra:{name:'Transmission',col:'var(--c-tra)'}, est:{name:'Structure',col:'var(--c-est)'} };
var infoEl=DOC.getElementById('info');
function selectPart(m){
  if(pinned&&pinned!==m)clearEmissive(pinned);
  pinned=m; setEmissive(m,0x4a6a2a,0.7);
  var d=m.userData, sm=SYSMETA[d.sys];
  var nlabel=d.n?('No. '+d.n):(d.n2?('No. '+d.n2):'Component');
  infoEl.innerHTML='<div class="pin">'+nlabel+'</div><h2>'+(d.name||'Part')+'</h2>'+
    '<div class="sysline"><span class="dot" style="background:'+sm.col+'"></span>'+sm.name+'</div>'+
    (d.desc?'<div class="lab">What it is & does</div><p>'+d.desc+'</p>':'')+
    (d.yacht?'<div class="yacht"><div class="lab">For the Yachtmaster</div><p>'+d.yacht+'</p></div>':'');
  document.querySelectorAll('.ix').forEach(function(it){ it.classList.toggle('active', it.getAttribute('data-n')==String(d.n)); });
  if(window.innerWidth<=900) DOC.getElementById('right').classList.add('open');
}
(function buildIndex(){
  var list=DOC.getElementById('indexList'), order=['com','ref','tra','est'];
  NUMS.sort(function(a,b){ return a.n-b.n; });
  order.forEach(function(sys){
    var head=document.createElement('div'); head.className='ixgroup'; head.textContent=SYSMETA[sys].name; list.appendChild(head);
    NUMS.filter(function(x){return x.sys===sys;}).forEach(function(x){
      var row=document.createElement('div'); row.className='ix'; row.setAttribute('data-n',x.n);
      row.innerHTML='<span class="n">'+x.n+'</span>'+x.name;
      row.addEventListener('click', function(){ selectPart(x.mesh); focusOn(x.mesh); });
      row.addEventListener('mouseenter', function(){ if(x.mesh!==pinned)setEmissive(x.mesh,0x335577,0.5); });
      row.addEventListener('mouseleave', function(){ if(x.mesh!==pinned)clearEmissive(x.mesh); });
      list.appendChild(row);
    });
  });
})();
var badgesEl=DOC.getElementById('badges'), badgeEls=[];
NUMS.forEach(function(x){
  var w=document.createElement('div'); w.className='badgeWrap';
  var b=document.createElement('div'); b.className='badge'; b.textContent=x.n;
  b.addEventListener('click', function(){ selectPart(x.mesh); focusOn(x.mesh); });
  w.appendChild(b); badgesEl.appendChild(w);
  badgeEls.push({el:b, wrap:w, item:x});
});
var _wp=new THREE.Vector3();
/* ---------- OCLUSIÓN DE LOS NÚMEROS ----------
   Es un mapa 3D: solo debe verse el número de lo que está realmente a la vista.
   Rayo cámara -> pieza; si algo se interpone, el número se esconde. */
var OCCLUDERS_BY_NAME=['Engine block','Oil sump','Cylinder head & valves','Rocker cover',
  'Bell housing','Gearbox / reverse gear','Heat exchanger','Intake manifold','Exhaust manifold',
  'Fuel tank','Flywheel','Waterlock / exhaust silencer','Air filter','Turbocharger'];
var occluders=[];
function buildOccluders(){
  occluders.length=0;
  for(var i=0;i<parts.length;i++){
    var nm=parts[i].userData.name||'';
    for(var k=0;k<OCCLUDERS_BY_NAME.length;k++){
      if(nm.indexOf(OCCLUDERS_BY_NAME[k])===0){ occluders.push(parts[i]); break; }
    }
  }
}
var bRay=new THREE.Raycaster(), _od=new THREE.Vector3(), _aim=new THREE.Vector3();
var _s2=new THREE.Vector3(), _cright=new THREE.Vector3(), _rd=new THREE.Vector3();
var occKey='', occT=0;
function rayClear(aim, mesh, list){
  _rd.copy(aim).sub(camera.position);
  var d=_rd.length();
  if(d<0.35) return true;
  _rd.multiplyScalar(1/d);
  bRay.set(camera.position, _rd);
  bRay.near=0; bRay.far=d-0.16;
  var hits=bRay.intersectObjects(list, true);
  for(var h=0;h<hits.length;h++){ if(!ownsHit(hits[h].object, mesh)) return false; }
  return true;
}
/* radio aproximado de cada pieza: permite apuntar a su CARA FRONTAL en vez de a su
   centro, que es lo que hacía que la decisión bailara en los bordes. */
function measureBadgeRadii(){
  var bb=new THREE.Box3(), bs=new THREE.Sphere();
  for(var i=0;i<badgeEls.length;i++){
    var be=badgeEls[i], r=0.3;
    try{ bb.setFromObject(be.item.mesh); bb.getBoundingSphere(bs);
         if(isFinite(bs.radius) && bs.radius>0) r=Math.min(1.1, bs.radius*0.8); }catch(e){}
    be.rad=r; be.wantOcc=false; be.occStreak=0;
  }
}
function ownsHit(obj, mesh){ var n=obj; while(n){ if(n===mesh) return true; n=n.parent; } return false; }
function updateBadgeOcclusion(){
  var relax=(cutT>0.02)||(exT>0.05);      // en corte o despiece se ve el interior
  var list=relax?[]:occluders;
  _cright.setFromMatrixColumn(camera.matrix, 0);
  for(var i=0;i<badgeEls.length;i++){
    var be=badgeEls[i], mesh=be.item.mesh;
    if(be.off){ be.occluded=true; continue; }
    if(!list.length){ be.occluded=false; continue; }
    mesh.getWorldPosition(_wp);
    _od.copy(camera.position).sub(_wp);
    var dc=_od.length();
    if(dc<0.6){ be.occluded=false; be.occStreak=0; continue; }
    _od.multiplyScalar(1/dc);
    var r=be.rad||0.3;
    _aim.copy(_wp).addScaledVector(_od, r);
    // tres muestras (centro y laterales): una sola daba una decisión que
    // oscilaba en el borde de la silueta -> de ahí el titileo
    var clear = rayClear(_aim, mesh, list);
    if(!clear){ _s2.copy(_aim).addScaledVector(_cright,  r*0.6); clear=rayClear(_s2, mesh, list); }
    if(!clear){ _s2.copy(_aim).addScaledVector(_cright, -r*0.6); clear=rayClear(_s2, mesh, list); }
    var blocked=!clear;
    if(blocked===be.wantOcc){ be.occStreak++; } else { be.wantOcc=blocked; be.occStreak=1; }
    if(be.occStreak>=2) be.occluded=blocked;
  }
}
var _bp=new THREE.Vector3();
function updateBadges(){
  if(!numsOn) return;
  for(var i=0;i<badgeEls.length;i++){
    var be=badgeEls[i], mesh=be.item.mesh;
    if(!mesh.visible||!groupVisible(be.item.sys)){ be.off=true; be.wrap.style.display='none'; continue; }
    // se proyecta el punto FIJO de la pieza: así el número no se desliza al girar
    mesh.getWorldPosition(_bp);
    _bp.project(camera);
    if(_bp.z>1||_bp.x<-1.15||_bp.x>1.15||_bp.y<-1.15||_bp.y>1.15){
      be.off=true; be.wrap.style.display='none'; continue;
    }
    be.off=false;
    if(be.wrap.style.display!=='block') be.wrap.style.display='block';
    // translate3d: lo compone la GPU, sin recalcular maquetación cada fotograma
    be.wrap.style.transform='translate3d('+((_bp.x*0.5+0.5)*W).toFixed(1)+'px,'+
                                          ((-_bp.y*0.5+0.5)*H).toFixed(1)+'px,0)';
    be.el.classList.toggle('hid', !!be.occluded);
    be.el.classList.toggle('sel', pinned===be.item.mesh);
  }
}
/*  ── ACERCARSE A UNA PIEZA ───────────────────────────────────────
    Conserva el ángulo y sólo cambia a dónde mira y cuánto se aleja. `animar` viaja
    hasta aquí por la misma razón que en `verCamara`: bajo tiempo virtual una cámara
    que tarda 680 ms en llegar se fotografía **a medio camino**, y la foto sale
    correcta y encuadrada en otro sitio. Quien pide una pieza la tiene puesta al
    volver.                                                                       */
/*  ── SE ACERCA A 18, Y ESO ESTA MEDIDO ──────────────────────────
    `animar` viaja hasta aqui por lo mismo que en `verCamara`: bajo tiempo virtual una
    camara que tarda 680 ms en llegar se fotografia **a medio camino**.

    Y LA DISTANCIA SE INTENTO CALCULAR DEL TAMAÑO DE LA PIEZA —darle un sexto de la
    altura de la vista— y **midio peor**: el colector de escape, que es largo, paso de
    6 960 pixeles suyos en pantalla a 3 661. Acercarse a una pieza larga la recorta.
    El tope de 18 se queda, ahora con la medida detras en vez de por costumbre.

    *Lo que ese intento si dejo claro es otra cosa, y esa no se arregla aqui:
    `Decompressor lever` da CERO pixeles desde las seis camaras, con enfoque y sin el.
    Cero no es «pequeña»: quitarla no cambia un solo pixel, asi que no se esta
    dibujando. Anotado, sin tocar.*                                              */
/*  ── EL ENCUADRE SALE DE LA ESFERA DE LA PIEZA ──────────────────
    Dos versiones anteriores, y las dos con su medida:

      1 · `r = min(orb.r, 18)` y mirar a `getWorldPosition()`. Con el motor entero
          encuadrado, un inyector ocupaba **179 pixeles** de 425 600 y con enfoque
          **352**: 18 apenas se acerca desde los 25 del preajuste. La pregunta que
          pide pincharlo seguia sin blanco.

      2 · calcular la distancia del tamano y seguir mirando a `getWorldPosition()`.
          **Midio peor** para el colector de escape: de 6 960 pixeles a 3 661. Y la
          causa NO era acercarse: era el punto al que se mira. `getWorldPosition` de
          un grupo devuelve **su origen**, que en una pieza larga puede estar en un
          extremo — asi que al acercarse, la pieza se salia por el otro lado.

      3 · calcular la distancia para que la pieza ocupara el 60 % del alto. El
          inyector paso de 179 pixeles a **418 550 de 425 600**: la camara se metia
          dentro del motor y no quedaba contexto ninguno.

    Y de ahi sale lo que hay que escribir, porque es lo que no se ve venir: **el
    tamano angular de la esfera envolvente no es el area que la pieza ocupa en
    pantalla.** Un colector largo y fino tiene una esfera enorme y un area pequena, y
    un inyector tiene una esfera diminuta y, de cerca, lo llena todo. Ninguna formula
    sobre la geometria puede acertar un objetivo de area.

    ASI QUE NO SE CALCULA: la distancia se queda en 18, que es lo medido, **y lo unico
    que se corrige es el punto al que se mira** —el centro de la esfera y no el origen
    del grupo—, que era el fallo de verdad de la version 2. Cuanto ocupa cada pieza en
    cada pantalla lo mide `walk-c31-clicable.js`, dibujandolo; y si una no llega, eso
    es una decision de contenido y no una constante que se ajusta aqui.           */
var _caja = null, _esf = null;
/*  ══ LOS GESTOS DEL TALLER · la tabla ══════════════════════════════════════
    Cada gesto son unos estados y una manera de ponerlos. **Nada mas: la geometria ya
    existe, y esto solo es la puerta.**

    LOS CUATRO PRIMEROS TALLERES —`strainer`, `impeller`, `nowater`, `gland`— son los
    que se construyen primero, por decision de Joel: son los cuatro que un solo
    encuadre sirve de punta a punta, medido. Estos son sus gestos y ninguno mas; los
    demas entran cuando se construyan sus talleres.

    EL ORDEN DE `estados` IMPORTA: **el primero es el de reposo**, y es lo que `gestos()`
    devuelve mientras nadie haya tocado nada.                                       */
var ESTADO_GESTOS = {};
var GESTOS = {
  //  ── el filtro de agua salada · `strainer` ────────────────────
  "tapa-filtro": { estados: ["puesta", "fuera"], pon: function (v) {
    if (!INTER.strLid) return;
    INTER.strLid.position.y = INTER.strLidY + (v === "fuera" ? 0.75 : 0);
  }},
  "cesta": { estados: ["dentro", "fuera"], pon: function (v) {
    if (!INTER.strBasket) return;
    INTER.strBasket.position.y = INTER.strBasketY + (v === "fuera" ? 0.55 : 0);
  }},
  //  la suciedad viaja CON la cesta —esta dentro de ella— y ademas se puede vaciar,
  //  que es el paso siguiente del taller.
  "suciedad": { estados: ["dentro", "vaciada"], pon: function (v) {
    if (INTER.strDirt) INTER.strDirt.visible = (v !== "vaciada");
  }},

  //  ── la bomba de agua salada · `impeller` y `nowater` ─────────
  "tapa-bomba": { estados: ["puesta", "fuera"], pon: function (v) {
    if (!INTER.rwCover) return;
    INTER.rwCover.position.x = INTER.rwCoverX + (v === "fuera" ? -0.85 : 0);
  }},
  "rodete": { estados: ["dentro", "fuera"], pon: function (v) {
    if (!INTER.impeller) return;
    INTER.impeller.position.x = (v === "fuera" ? -1.35 : 0);
  }},
  //  **DOS PALAS DE MENOS, QUE ES LA LECCION DE `impeller`**: se cuentan las del viejo
  //  y faltan dos, y hay que ir a buscarlas al intercambiador. El taller viejo ya hacia
  //  esto a mano —`INTER.impVanes[1].visible=false`—; aqui es un estado con nombre.
  "palas": { estados: ["todas", "faltan-dos"], pon: function (v) {
    if (!INTER.impVanes) return;
    for (var i = 0; i < INTER.impVanes.length; i++)
      INTER.impVanes[i].visible = !(v === "faltan-dos" && (i === 1 || i === 4));
  }},

  //  ── la manivela · `handstart` ────────────────────────────────
  //  **Nace oculta a proposito**: una manivela no vive puesta en el motor, se trae y se
  //  encaja. Por eso es un gesto y no una pieza del montaje — `verPiezas` no puede
  //  encender lo que nacio apagado, y aqui eso es la leccion, no un estorbo.
  "manivela": { estados: ["guardada", "encajada"], pon: function (v) {
    var m = null;
    for (var i = 0; i < parts.length; i++)
      if (parts[i].userData && parts[i].userData.name === "Starting handle") m = parts[i];
    if (m) m.visible = (v === "encajada");
  }},

  //  ── el prensaestopas · `gland` ───────────────────────────────
  //  **Su comprobacion ES el goteo**, y tiene tres lecturas: seco es demasiado
  //  apretado, unas gotas es lo correcto, y un chorro es que hay que apretarlo.
  "goteo": { estados: ["seco", "gotas", "chorro"], pon: function (v) {
    INTER.dripRate = (v === "seco") ? 0 : (v === "gotas" ? 0.55 : 2.2);
    if (INTER.dripGroup) INTER.dripGroup.visible = (v !== "seco");
  }},

  /*  ══ LOS GESTOS DE LOS SIETE TALLERES RESTANTES ═══════════════════════════
      Se añaden cuando se construyen sus talleres y no antes: **un gesto que ninguna
      pantalla pide es una puerta a un cuarto vacio**, y el guardia tendria que
      medirlo igual.                                                              */

  //  ── la varilla · `oil` y `oilchange` ─────────────────────────
  //  Sale, se limpia, entra hasta el fondo y vuelve a salir. `INTER.dipOil` es la
  //  pelicula de aceite, que es lo que se lee: limpia despues de secarla, con nivel
  //  cuando vuelve a entrar y salir.
  "varilla": { estados: ["dentro", "fuera", "limpia"], pon: function (v) {
    if (!INTER.dip || !INTER.dipHome) return;
    INTER.dip.position.y = INTER.dipHome.y + (v === "dentro" ? 0 : 1.5);
    if (INTER.dipOil) INTER.dipOil.visible = (v !== "limpia");
  }},

  //  ── el filtro de aceite · `oilchange` ────────────────────────
  "filtro-aceite": { estados: ["puesto", "fuera"], pon: function (v) {
    var m = _pieza("Oil filter");
    if (m) m.visible = (v !== "fuera");
  }},

  //  ── los filtros de gasoleo · `fuelfilters` ───────────────────
  //  El vaso del decantador se abre y su elemento sale; el filtro fino se desenrosca.
  "elemento-decantador": { estados: ["puesto", "fuera"], pon: function (v) {
    var m = _pieza("Primary filter element");
    if (m) m.position.y = (v === "fuera" ? 1.1 : 0) + (m.userData.home ? m.userData.home.y : 0);
  }},
  "filtro-fino": { estados: ["puesto", "fuera"], pon: function (v) {
    var m = _pieza("Secondary fuel filter");
    if (m) m.visible = (v !== "fuera");
  }},
  "llave-deposito": { estados: ["abierta", "cerrada"], pon: function (v) {
    var m = _pieza("Fuel tank valve");
    if (m) m.rotation.x = (v === "cerrada" ? Math.PI / 2 : 0);
  }},

  //  ── el purgado · `bleed` ─────────────────────────────────────
  //  `INTER.bubbleOn` tiene DOS estados y aqui se usan los dos: 1 mientras salen
  //  burbujas con el aire, 2 cuando ya sale gasoil limpio. **Esa es la leccion.**
  "burbujas": { estados: ["ninguna", "con-aire", "limpias"], pon: function (v) {
    INTER.bubbleOn = (v === "ninguna") ? 0 : (v === "con-aire" ? 1 : 2);
    if (INTER.bubbleGroup) INTER.bubbleGroup.visible = (v !== "ninguna");
    despierta();
  }},
  "palanca-cebado": { estados: ["arriba", "abajo"], pon: function (v) {
    if (!INTER.liftLever) return;
    INTER.liftLever.rotation.z = (v === "abajo" ? -0.5 : 0);
  }},

  //  ── la correa · `belt` ───────────────────────────────────────
  //  **`INTER.belt` se reconstruye geometricamente al presionarla**, asi que se hunde
  //  de verdad. El taller la aprieta con el pulgar y mide la flecha.
  "correa": { estados: ["quieta", "pulsada"], pon: function (v) {
    if (INTER.beltThumb) INTER.beltThumb.visible = (v === "pulsada");
    //  `beltDeflect` NO mide en milimetros aunque su parametro se llame `mm`: resta
    //  directamente de la `z` del punto de la correa, o sea **unidades del mundo**. Con
    //  12 el pulgar se iba a `z = -17,95`. A la escala de esta figura —1 unidad ~ 15
    //  cm— **0,12 son los ~2 cm que un pulgar hunde una correa bien tensada**, que es
    //  la cifra del taller.
    if (typeof beltDeflect === "function") beltDeflect(v === "pulsada" ? 0.12 : 0);
  }},

  //  ── los bornes · `flatbatt` ──────────────────────────────────
  "bornes": { estados: ["sucios", "limpios"], pon: function (v) {
    var m = _pieza("Battery terminals");
    if (!m) return;
    m.traverse(function (c) {
      if (c.isMesh && c.material && c.material.color)
        c.material.color.set(v === "sucios" ? 0x6f8a5c : 0x9aa2a8);
    });
  }},

  //  ── los descompresores · `handstart` ─────────────────────────
  "descompresores": { estados: ["cerrados", "levantados"], pon: function (v) {
    if (!INTER.decomp) return;
    for (var i = 0; i < INTER.decomp.length; i++) {
      var d = INTER.decomp[i];
      if (d.lev) d.lev.position.y = d.y0 + (v === "levantados" ? 0.18 : 0);
    }
  }},
};

/*  BUSCA UNA PIEZA REGISTRADA POR SU NOMBRE. Lo usan los gestos que mueven una pieza
    que ya tiene nombre en vez de una malla suelta de `INTER`.                      */
function _pieza(nombre) {
  for (var i = 0; i < parts.length; i++)
    if (parts[i].userData && parts[i].userData.name === nombre) return parts[i];
  return null;
}

/*  CUANTOS RADIOS DE LA PIEZA SE DEJAN DE DISTANCIA AL ENFOCAR. `3.4` sale de medir:
    con ese valor las siete piezas de la fase 8 pasan de no llegar al suelo del dedo a
    cruzar el minimo de la casa, y siguen quedando entre 5 y 14 piezas en cuadro — o
    sea que la pieza se puede señalar y todavia se ve donde esta. **Subirlo aleja y
    deja de servir; bajarlo borra el contexto**, que es el peligro medido en `2.8`,
    donde el encuadre que hacia el blanco se llevaba el motor por delante.        */
var ZOOM_K = 5, ZOOM_MIN = 2.6;

function focusOn(mesh, animar, cerca){
  if (!_caja) { _caja = new THREE.Box3(); _esf = new THREE.Sphere(); }
  /*  ── LAS MATRICES, ANTES DE MEDIR NADA ────────────────────────
      `Box3.setFromObject` lee la matriz de mundo de cada malla **y no la calcula**, y
      desde que el bucle se para cuando no hay nada que mover puede no haberla
      calculado nadie desde el ultimo cambio. Es un fallo latente: la caja saldria de
      otra postura y la camara aterrizaria en un sitio cualquiera.

      *Y CONVIENE DECIR QUE NO ES LO QUE PARECIO CAZARLO.* Un control de estabilidad
      —dibujar tres veces lo mismo— dio 0, 0 y **188 630 pixeles de diferencia**, y lo
      atribui a esto. No era: era que habia otras tandas de Chrome corriendo a la vez.
      Con la maquina libre, cuatro dibujos identicos dan cero, con `update` y sin el.
      **La linea se queda porque es correcta, no porque arreglara aquello.**        */
  mesh.updateWorldMatrix(true, true);
  _caja.setFromObject(mesh); _caja.getBoundingSphere(_esf);
  /*  ── Y AHORA ACERCA DE VERDAD ─────────────────────────────────
      **Esta linea decia `r: Math.min(orb.r, 18)` y eso no es acercarse: es un tope.**
      Los seis preajustes vienen con `r` menor que 18, asi que el minimo no hacia nada
      y `enfocar` **solo movia el objetivo**. Durante dias se descarto una respuesta
      tras otra por invisible con una herramienta que no hacia lo que su nombre dice,
      y «acercar la camara» estaba anotado en `PLAN.md` como salida aprobada.

      MEDIDO el 1 de septiembre de 2026 sobre las siete piezas de la fase 8, con el
      lienzo del telefono y el suelo del dedo en 1 000 px:

          `Stern gland`   153 -> **13 491**      `Gearbox`       846 -> 13 050
          `Engine mount`  162 -> **11 223**      `Coupling`       81 ->  6 831
          `Propeller`     297 ->   6 336         `Shaft`         216 ->  3 807
          `Flywheel`        0 ->       0

      **Seis de siete cruzan el minimo de la casa**, que son 1 936. Y el septimo dice
      por que esto no rescata a las fases 3 a 7: el volante da cero acercado **porque
      esta dentro de la campana**. Un acercamiento no destapa lo tapado — las piezas
      de la fase 8 estan LEJOS y las de las otras estan ENTERRADAS, y son dos
      problemas distintos.

      LA DISTANCIA SE MIDE EN RADIOS DE LA PIEZA, no en unidades del mundo: asi una
      pieza grande y una pequeña quedan igual de encuadradas. Y con dos frenos:
        · **nunca mas lejos que el preajuste** —`Math.min(orb.r, ...)`—, para que
          enfocar no pueda ALEJAR;
        · **nunca mas cerca que `ZOOM_MIN`**, para no meterse dentro de la pieza.

      ── Y LO PIDE LA PANTALLA, NO LO DECIDE ESTA FUNCION ──────────
      **Porque acercar no siempre mejora, y eso tambien se midio.** Mirando las fotos:
        · `2.7` —el colector— con el acercamiento **conserva el motor entero en cuadro**
          y su blanco sube de 810 a 1 152. Gana.
        · `6.5` —la salida del espejo— **empeora**: esa pieza esta en la cara de fuera
          del casco, con el motor al otro lado de la pared, asi que acercarse no trae
          contexto porque **alli no hay contexto que traer**. Queda un pasacascos de
          laton abstracto, y la leccion es *«arranca y mira por la popa»*.
      Con un solo comportamiento habria que elegir cual de las dos se estropea. Asi que
      la pantalla lo dice: `enfocar(nombre, animar, cerca)`. **Sin `cerca` se hace lo de
      siempre** —reencuadrar sin acercarse—, que es contra lo que se escribieron y se
      aprobaron las pantallas que ya lo usan.                                        */
  var rr = cerca ? Math.max(ZOOM_MIN, Math.min(orb.r, _esf.radius * ZOOM_K))
                 : Math.min(orb.r, 18);
  animateCam({theta:orb.theta, phi:orb.phi, r:rr,
              tx:_esf.center.x, ty:_esf.center.y, tz:_esf.center.z}, animar);
}

/* ============================================================
   CONTROLES UI
   ============================================================ */
var sysState={com:true,ref:true,tra:true,est:true};
function refreshSys(){ for(var s in sysState)groups[s].visible=sysState[s]; document.querySelectorAll('.sys').forEach(function(b){ var s=b.getAttribute('data-sys'); b.classList.toggle('on',sysState[s]); b.classList.toggle('off',!sysState[s]); }); }
document.querySelectorAll('.sys').forEach(function(b){ b.addEventListener('click', function(){ var s=b.getAttribute('data-sys'); sysState[s]=!sysState[s]; refreshSys(); }); });
DOC.getElementById('soloOff').addEventListener('click', function(){ for(var s in sysState)sysState[s]=true; refreshSys(); });

/* DESPIECE */
var exT=0;
function applyExplode(){ for(var i=0;i<parts.length;i++){ var m=parts[i]; m.position.copy(m.userData.home).addScaledVector(m.userData.ex, m.userData.exMag*exT); } }
var exEl=DOC.getElementById('ex'), exV=DOC.getElementById('exV');
exEl.addEventListener('input', function(){
  exT=exEl.value/100; exV.textContent=exEl.value+'%';
  if(exT>0.05&&flowOn) setFlow(false);
  applyExplode(); syncBay();
});

/* CUTAWAY — solo el cuerpo del motor (no los accesorios) */
// reconstruye cutMeshes a partir de una lista blanca por nombre
(function rebuildCut(){
  var allow=['Engine block','Oil sump','Bell housing','Cylinder head & valves','Rocker cover',
             'Cylinder / liner','Liner (cyl.','Water jacket (cooling)','Heat exchanger',
             'Tube bundle (raw water)','Gearbox / reverse gear'];
  cutMeshes.length=0;
  for(var i=0;i<parts.length;i++){
    var nm=parts[i].userData.name||'';
    for(var k=0;k<allow.length;k++){ if(nm.indexOf(allow[k])===0){ cutMeshes.push(parts[i]); break; } }
  }
})();
var clipPlane=new THREE.Plane(new THREE.Vector3(0,0,1), 0);
renderer.localClippingEnabled=true;
var cutT=0, cutV=DOC.getElementById('cut'), cutVlabel=DOC.getElementById('cutV');
(function isolateCutMaterials(){
  for(var i=0;i<cutMeshes.length;i++){ cutMeshes[i].traverse(function(c){ if(c.isMesh&&c.material&&!c.userData._cutMat){ c.material=c.material.clone(); c.userData._cutMat=true; c.userData._origSide=c.material.side; } }); }
})();
function applyCut(){
  clipPlane.constant=1.2 - cutT*1.2;
  var active=cutT>0.02;
  for(var i=0;i<cutMeshes.length;i++){ cutMeshes[i].traverse(function(c){ if(c.isMesh&&c.material&&c.userData._cutMat){ c.material.clippingPlanes=active?[clipPlane]:null; c.material.clipShadows=active; c.material.side=active?THREE.DoubleSide:c.userData._origSide; c.material.needsUpdate=true; } }); }
  for(var q=0;q<gasGroup.children.length;q++){
    var gmt=gasGroup.children[q].material;
    if(gmt){ gmt.clippingPlanes=active?[clipPlane]:null; gmt.side=THREE.DoubleSide; gmt.needsUpdate=true; }
  }
  cutVlabel.textContent=active?Math.round(cutT*100)+'% open':'closed';
}
cutV.addEventListener('input', function(){ cutT=cutV.value/100; applyCut(); });

/* PILLS */
var flowOn=false;
function buildFlowLegend(){
  var box=DOC.getElementById('flowLeg');
  if(!box || box.dataset && box.dataset.built) return;
  if(box.dataset) box.dataset.built='1';
  for(var i=0;i<flows.length;i++){
    (function(fl){
      var b=document.createElement('div'); b.className='fl on';
      var sw=document.createElement('span'); sw.className='sw';
      var c='#'+('000000'+fl.dots[0].material.color.getHex().toString(16)).slice(-6);
      sw.style.background=c; sw.style.color=c;
      var tx=document.createElement('span'); tx.textContent=fl.label;
      b.appendChild(sw); b.appendChild(tx);
      b.addEventListener('click', function(){ flowSolo=(flowSolo===fl.key)?null:fl.key; applyFlowSolo(); });
      box.appendChild(b); fl.btn=b;
    })(flows[i]);
  }
}
function applyFlowSolo(){
  for(var i=0;i<flows.length;i++){
    var fl=flows[i], on=(!flowSolo || flowSolo===fl.key);
    fl.group.visible=on;
    if(fl.btn){ fl.btn.classList.toggle('on',on); fl.btn.classList.toggle('dim',!on); }
  }
}
function setFlow(v){
  flowOn=v;
  if(v) buildFlows();
  flowGroup.visible=v&&exT<=0.05;
  DOC.getElementById('tgFlow').classList.toggle('on',flowOn);
  var lg=DOC.getElementById('flowLeg'), base=DOC.getElementById('legend');
  if(lg) lg.classList.toggle('show', flowGroup.visible);
  if(base) base.style.display = flowGroup.visible ? 'none' : '';
  if(v){ flowSolo=null; applyFlowSolo(); }
}
DOC.getElementById('tgFlow').addEventListener('click', function(){ var v=!flowOn; if(v&&exT>0.05){ exT=0; exEl.value=0; exV.textContent='0%'; applyExplode(); } setFlow(v); });
var numsMode=1;                 // 0 = ocultos · 1 = discretos · 2 = destacados
var numsOn=true, numsAllowed=true;
function applyNums(){
  numsOn=(numsMode>0) && numsAllowed;
  badgesEl.style.display = numsOn ? 'block' : 'none';
  badgesEl.classList.toggle('full', numsMode===2);
  var b=DOC.getElementById('tgNums');
  b.classList.toggle('on', numsMode>0);
  b.textContent = numsMode===0 ? 'Numbers: off' : (numsMode===1 ? 'Numbers: subtle' : 'Numbers: bold');
}
DOC.getElementById('tgNums').addEventListener('click', function(){ numsMode=(numsMode+1)%3; applyNums(); });
applyNums();
var spinOn=false;
DOC.getElementById('tgSpin').addEventListener('click', function(){ spinOn=!spinOn; this.classList.toggle('on',spinOn); despierta(); });
var bayWanted=true;
function syncBay(){ bayGroup.visible = bayWanted && exT<=0.05;
  DOC.getElementById('tgGrid').classList.toggle('on', bayWanted); }
DOC.getElementById('tgGrid').addEventListener('click', function(){ bayWanted=!bayWanted; syncBay(); });

/* cámara presets */
document.querySelectorAll('.cam').forEach(function(c){ c.addEventListener('click', function(){ animateCam(PRESETS[c.getAttribute('data-cam')]); }); });
DOC.getElementById('camReset').addEventListener('click', function(){ animateCam(PRESETS.iso); });
DOC.getElementById('tgLeft').addEventListener('click', function(){ DOC.getElementById('left').classList.toggle('open'); });
DOC.getElementById('tgRight').addEventListener('click', function(){ DOC.getElementById('right').classList.toggle('open'); });

/* ============================================================
   ANIMACIÓN DEL MOTOR (ciclo real de 4 tiempos)
   ============================================================ */
var XAX=new THREE.Vector3(1,0,0), _c1=new THREE.Color(), _c2=new THREE.Color();
ANIM._last=0; ANIM.dirty=true; despierta();
function applyValve(v, lift){
  var d=lift*0.17;
  v.stem.position.y=v.y0.stem-d;
  v.head.position.y=v.y0.head-d;
  v.spring.position.y=v.y0.spring-d*0.5;
  if(v.spring.userData && v.spring.userData.home) v.spring.userData.home.y=v.y0.spring-d*0.5;
}
function updateEngine(dt){
  if(ANIM.run) ANIM.theta += dt*ANIM.speed*Math.PI*2*2.6;
  else if(!ANIM.dirty) return;
  ANIM.dirty=false;
  var th=ANIM.theta, thDeg=((th*180/Math.PI)%720+720)%720;

  if(ANIM.crank) ANIM.crank.rotation.x=th;

  for(var i=0;i<ANIM.pistons.length;i++){ var P=ANIM.pistons[i]; setAnimPos(P.m, P.x, pinY(P.c,th)+0.1, 0); }

  for(var j=0;j<ANIM.rods.length;j++){
    var R=ANIM.rods[j];
    var py=pinY(R.c,th);
    var cy=CRANK_Y+ANIM.OFF*Math.cos(th+throwAngle(R.c)), cz=pinZ(R.c,th);
    setAnimPos(R.m, R.x, (py+cy)/2, cz/2);
    R.m.lookAt(R.x, cy, cz); R.m.rotateX(Math.PI/2);
  }

  for(var v=0;v<ANIM.valves.length;v++){
    var VV=ANIM.valves[v], loc=localAngle(v,thDeg);
    var li=(loc>=355&&loc<545)?Math.sin(Math.PI*(loc-355)/190):0;   // admisión
    var le=(loc>=175&&loc<365)?Math.sin(Math.PI*(loc-175)/190):0;   // escape
    applyValve(VV['in'], li); applyValve(VV.ex, le);
    if(VV.rocker) VV.rocker.rotation.z=(li-le)*0.14;
  }

  for(var g=0;g<ANIM.gas.length;g++){
    var G=ANIM.gas[g];
    var crownTop=pinY(G.c,th)+0.1+0.41, top=DECK_Y+0.12;
    var h=Math.max(0.07, top-crownTop);
    G.m.scale.y=h; G.m.position.set(G.x, crownTop+h/2, 0);
    var s=strokeOf(G.c,thDeg), f=(localAngle(G.c,thDeg)%180)/180, mt=G.mat;
    if(s===2){ mt.color.setHex(0x6ab0e0); mt.opacity=0.20; mt.emissive.setHex(0x1d3a52); mt.emissiveIntensity=0.3; }
    else if(s===3){ _c1.setHex(0x6ab0e0); _c2.setHex(0xe6b45a); _c1.lerp(_c2,f); mt.color.copy(_c1);
      mt.opacity=0.20+0.24*f; mt.emissive.setHex(0x3a2a10); mt.emissiveIntensity=0.3+0.6*f; }
    else if(s===0){ _c1.setHex(0xff6a22); _c2.setHex(0xa8391a); _c1.lerp(_c2,f); mt.color.copy(_c1);
      mt.opacity=0.62-0.30*f; mt.emissive.setHex(0xff4400); mt.emissiveIntensity=1.7*(1-f)+0.2; }
    else { mt.color.setHex(0x8a8a8a); mt.opacity=0.30-0.13*f; mt.emissive.setHex(0x242424); mt.emissiveIntensity=0.2; }
  }

  var dth=th-ANIM._last; ANIM._last=th;
  if(dth) for(var k=0;k<ANIM.spin.length;k++) ANIM.spin[k].o.rotateOnWorldAxis(XAX, dth*ANIM.spin[k].r);
  if(strokeMode) strokeSync(thDeg);
}

/* ---------- controles del motor ---------- */
var rpmEl=DOC.getElementById('rpm'), rpmV=DOC.getElementById('rpmV');
function setRun(v){
  ANIM.run=v; ANIM.dirty=true; despierta();
  DOC.getElementById('tgRun').classList.toggle('on',v);
  gasGroup.visible = v || strokeMode;
  if(v && exT>0.02){ exT=0; exEl.value=0; exV.textContent='0%'; applyExplode(); syncBay(); }
  rpmV.textContent = v ? (Math.round(600+ANIM.speed*2200)+' rpm') : 'stopped';
}
DOC.getElementById('tgRun').addEventListener('click', function(){ setRun(!ANIM.run); });
rpmEl.addEventListener('input', function(){ ANIM.speed=rpmEl.value/100; if(ANIM.run) rpmV.textContent=Math.round(600+ANIM.speed*2200)+' rpm'; });
ANIM.speed=rpmEl.value/100;

/* ---------- modo CICLO DE 4 TIEMPOS ---------- */
var strokeMode=false, strokeI=0, strokePlaying=false;
var STROKES=[
  {n:'1', t:'Intake (induction)', start:360, text:'The inlet valve opens and the piston travels down, drawing in a cylinder full of AIR only — no fuel yet. That is the key difference from a petrol engine, which draws in a fuel/air mixture.'},
  {n:'2', t:'Compression', start:540, text:'Both valves are shut and the rising piston squeezes the air into a tiny space. Compression alone heats it to well over 500 °C — hot enough to ignite diesel on its own.'},
  {n:'3', t:'Power (combustion)', start:0, text:'Near the top, the injector sprays atomised diesel into the hot air and it ignites on contact — there is no spark plug. The expanding gases force the piston down. This is the only stroke that produces power.'},
  {n:'4', t:'Exhaust', start:180, text:'The exhaust valve opens and the rising piston pushes the burnt gases out to the manifold, turbo and mixing elbow. The crankshaft has now turned twice (720°) for one complete cycle.'}
];
var STROKE_SHORT=['Power','Exhaust','Intake','Compression'];
var strokeBarEls=[], cylRowEls=[];
(function buildStrokeUI(){
  var bar=DOC.getElementById('strokeBar');
  for(var i=0;i<4;i++){ var d=document.createElement('div'); d.className='s'; d.textContent=STROKES[i].t.split(' ')[0];
    d.addEventListener('click',(function(k){return function(){ strokeGo(k); };})(i)); bar.appendChild(d); strokeBarEls.push(d); }
  var row=DOC.getElementById('cylRow');
  for(var c=0;c<4;c++){
    var e=document.createElement('div'); e.className='c';
    var lab=document.createElement('b'); lab.textContent='Cyl '+(c+1);
    var val=document.createElement('span'); val.textContent='—';
    e.appendChild(lab); e.appendChild(val); row.appendChild(e); cylRowEls.push(val);
  }
})();
function strokeGo(k){
  strokePlaying=false; DOC.getElementById('strokePlay').textContent='Play';
  strokeI=(k+4)%4;
  ANIM.run=false; DOC.getElementById('tgRun').classList.remove('on'); rpmV.textContent='stopped';
  ANIM.theta=(STROKES[strokeI].start+90)*Math.PI/180;
  ANIM.dirty=true; despierta();
}
function strokeSync(thDeg){
  var s=strokeOf(0,thDeg);                       // tiempo del cilindro 1
  var order={2:0,3:1,0:2,1:3};                   // a orden didáctico
  var k=order[s]; strokeI=k;
  var S=STROKES[k];
  DOC.getElementById('strokeNum').textContent=S.n;
  DOC.getElementById('strokeTitle').textContent=S.t;
  DOC.getElementById('strokeText').textContent=S.text;
  DOC.getElementById('strokeStep').textContent='Crank '+Math.round(thDeg)+'° of 720°';
  for(var i=0;i<4;i++) strokeBarEls[i].classList.toggle('on', i===k);
  for(var c=0;c<4;c++) cylRowEls[c].textContent=STROKE_SHORT[strokeOf(c,thDeg)];
}
DOC.getElementById('strokePrev').addEventListener('click', function(){ strokeGo(strokeI-1); });
DOC.getElementById('strokeNext').addEventListener('click', function(){ strokeGo(strokeI+1); });
DOC.getElementById('strokePlay').addEventListener('click', function(){
  strokePlaying=!strokePlaying; this.textContent=strokePlaying?'Pause':'Play';
  despierta();
  ANIM.dirty=true; despierta();
});

/* ---------- animaciones sueltas (piezas que se manipulan) ---------- */
var tweens=[];
//  un tween nuevo no siempre toca `dirty`, asi que despierta el bucle el mismo
function tw(setter, a, b, dur, cb){ tweens.push({set:setter,a:a,b:b,t:0,d:dur||0.6,cb:cb}); despierta(); }
function updateTweens(dt){
  for(var i=tweens.length-1;i>=0;i--){
    var T=tweens[i]; T.t+=dt;
    var k=Math.min(1,T.t/T.d), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    T.set(T.a+(T.b-T.a)*e);
    if(k>=1){ tweens.splice(i,1); if(T.cb) T.cb(); }
  }
}
/* flecha real de la correa: se reconstruye la curva con un punto hundido */
function beltDeflect(mm){
  if(!INTER.belt || !INTER.beltPts) return;
  var pts=[]; for(var i=0;i<INTER.beltPts.length;i++) pts.push(INTER.beltPts[i].clone());
  pts[INTER.beltPressIdx].z -= mm;
  var c=new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  INTER.belt.geometry.dispose();     INTER.belt.geometry=new THREE.TubeGeometry(c,120,0.05,10,true);
  INTER.beltFlat.geometry.dispose(); INTER.beltFlat.geometry=new THREE.TubeGeometry(c,120,0.07,4,true);
  if(INTER.beltThumb) INTER.beltThumb.position.z=1.25-mm*1.6;
}
/* burbujas de aire saliendo por el tornillo de purga */
function updateBubbles(dt){
  if(!INTER.bubbles) return;
  var on=INTER.bubbleOn>0;
  for(var i=0;i<INTER.bubbles.length;i++){
    var B=INTER.bubbles[i];
    if(!on){ B.m.visible=false; continue; }
    B.m.visible=true;
    B.t=(B.t+dt*0.55)%1;
    B.m.position.y=B.t*0.55;
    B.m.material.opacity=0.8*(1-B.t);
    // al final de la purga salen limpias (gasoil sin aire)
    B.m.scale.setScalar(INTER.bubbleOn===2 ? 0.45 : 1.0);
  }
}

/*  ══ EL MOTOR SE PARA SOLO ══════════════════════════════════════════════════
    LA REGLA DEL MODULO, aplicada a la tercera animacion: **lo que se anima solo se
    muestra y se detiene.** El humo dura 2,6 s, las burbujas lo mismo, y esto seis —
    un chorro tarda ~1,1 s en recorrer su arco, asi que 2,6 se leerian como un
    parpadeo y seis son cinco pasadas.

    POR QUE IMPORTA Y NO ES COSMETICA: mientras `ANIM.run` es cierto, `hayQueMover()`
    devuelve `true` **para siempre** y el bucle de dibujo no para. En un telefono eso
    es bateria, y es exactamente por lo que el bucle se paro en su dia. Sin esto,
    `6.5` seria la unica pantalla del curso que redibuja el motor entero mientras el
    alumno lee cinco parrafos.

    `Infinity` deja el motor girando sin limite y no lo pide ninguna pantalla: existe
    para que un arnes pueda medir el estado sostenido.                             */
function updateMarcha(dt){
  if (!ANIM.run || !ANIM.marchaResta) return;
  if (ANIM.marchaResta === Infinity) return;
  ANIM.marchaResta -= dt;
  if (ANIM.marchaResta <= 0) { ANIM.marchaResta = 0; setRun(false); }
}

/* chorro de agua en la salida de escape (prueba de que el circuito funciona) */
function updateJets(dt){
  if(!INTER.jets) return;
  var on=ANIM.run;
  for(var i=0;i<INTER.jets.length;i++){
    var J=INTER.jets[i];
    if(!on){ J.m.visible=false; continue; }
    J.m.visible=true;
    J.t=(J.t+dt*0.9)%1;
    J.m.position.set(J.t*1.5, -J.t*J.t*0.9, -J.t*0.12);
    J.m.material.opacity=0.85*(1-J.t*0.8);
  }
}

/* goteo del prensaestopas */
function updateDrips(dt){
  if(!INTER.drips) return;
  var on=INTER.dripRate>0;
  for(var i=0;i<INTER.drips.length;i++){
    var D=INTER.drips[i];
    if(!on){ D.m.visible=false; continue; }
    D.m.visible=true;
    D.t=(D.t+dt*INTER.dripRate)%1;
    D.m.position.y=-0.2-D.t*1.1;
    D.m.material.opacity=0.85*(1-D.t*0.7);
  }
}

/* recorrido de UN tramo del circuito (para los pasos guiados) */
var legGroup=new THREE.Group(); scene.add(legGroup);
var legFlow=null;
function setLeg(points, color){
  while(legGroup.children.length) legGroup.remove(legGroup.children[0]);
  legFlow=null;
  if(!points || points.length<2) return;
  var m=mat(color,{emissive:color, ei:1.3, metal:0.2, rough:0.3});
  var dots=[];
  for(var i=0;i<9;i++){ var d=new THREE.Mesh(new THREE.SphereGeometry(0.105,10,10), m); legGroup.add(d); dots.push(d); }
  legFlow={curve:new THREE.CatmullRomCurve3(points), dots:dots, t:0};
}
function updateLeg(dt){
  if(!legFlow) return;
  legFlow.t=(legFlow.t+dt*0.22)%1;
  for(var i=0;i<legFlow.dots.length;i++){
    var tt=(legFlow.t+i/legFlow.dots.length)%1;
    legFlow.dots[i].position.copy(legFlow.curve.getPointAt(tt));
  }
}

/* ============================================================
   LOOP
   ============================================================ */
var clock=new THREE.Clock();
/*  ══ EL BUCLE SE PARA CUANDO NO HAY NADA QUE MOVER ═══════════════════════════
    Antes `tick()` se llamaba a si mismo **para siempre**, y redibujaba el motor entero
    aunque la pantalla llevara un minuto quieta.

    POR QUE IMPORTA AL ALUMNO, que es la razon de verdad: un motor en 3D que redibuja
    sin parar en un telefono **se come la bateria**. La figura esta quieta la mayor
    parte del tiempo — se mira, se lee el texto de al lado, se piensa la respuesta.

    Y DE PASO ARREGLA DOS DIAS DE RAREZAS EN LOS ARNESES. Medido el 1 de septiembre de
    2026: la MISMA pagina, con la MISMA configuracion, tardo **1 957 s una vez y 55 s
    otra** — treinta y seis veces. La columna que lo explicaba no era el corte ni el
    angulo, era **los fotogramas**: 3 943 contra 10. Bajo `--virtual-time-budget` cada
    `rAF` avanza el reloj virtual una pizca, asi que un bucle que nunca para puede
    encadenar miles de fotogramas antes de agotar el presupuesto, y cada uno cuesta
    tiempo real sobre swiftshader. **Un tiempo que varia treinta y seis veces con la
    configuracion identica no lo explica ninguna variable del contenido.**

    QUE MANTIENE EL BUCLE VIVO, y es la lista entera:
      · el motor en marcha (`ANIM.run`) o el ciclo reproduciendose (`strokePlaying`)
      · una pose pendiente (`ANIM.dirty`), que es lo que pone `verAngulo`
      · la camara viajando (`camAnim`) o girando sola (`spinOn`)
      · el alumno arrastrando o desplazando (`dragging`, `panning`)
      · las transiciones (`tweens`) — montaje, corte, despiece, enfoque
      · los recorridos de fluido (`flowGroup`, `legFlow`)
      · y **lo que se anima unos segundos y se para**: el humo (`humo.mov`), las
        burbujas (`INTER.bubbleOn`), los chorros (`ANIM.run` los gobierna) y el goteo
        (`INTER.dripRate`). Eso ya era una parada y aqui no se toca: se pregunta si
        siguen andando, y cuando terminan solos el bucle se para con ellos.

    NADA DE LO QUE EL ALUMNO CONDUCE SE DETIENE MIENTRAS LO CONDUCE: arrastrar, girar
    y los tweens estan en la lista, y cualquier orden de la API llama a `despierta()`.
                                                                                    */
var bucleVivo = false;

function hayQueMover(){
  if (ANIM.run || ANIM.dirty || strokePlaying) return true;
  if (camAnim || (spinOn && !dragging && !panning)) return true;
  if (dragging || panning) return true;
  if (tweens.length) return true;
  if (legFlow) return true;
  if (typeof flowGroup !== "undefined" && flowGroup.visible) return true;
  //  los que se animan unos segundos y se paran solos
  if (typeof humo !== "undefined" && humoGroup.visible && humo.mov > 0) return true;
  if (INTER.bubbleOn > 0) return true;
  if (INTER.dripRate > 0) return true;
  if (typeof spot !== "undefined" && spot.on) return true;
  return false;
}

/*  DESPIERTA · lo llama todo lo que cambia algo. Si el bucle esta parado, lo arranca;
    si esta vivo, no cuesta nada. **Un despertar de mas sólo gasta un fotograma; uno
    de menos deja la figura congelada**, asi que se llama de sobra.               */
function despierta(){
  if (bucleVivo) return;
  bucleVivo = true;
  requestAnimationFrame(tick);
}

function tick(){
  var dt=clock.getDelta(), now=performance.now();
  if(strokePlaying){ ANIM.theta += dt*0.55; ANIM.dirty=true; despierta(); }
  updateMarcha(dt);
  updateEngine(dt); updateTweens(dt); updateLeg(dt); updateDrips(dt); updateBubbles(dt); updateJets(dt); updateSpot(dt); updateHumo(dt);
  updateMarcas();
  if(camAnim){
    var k=Math.min(1,(now-camAnim.t0)/camAnim.dur), e=k<0.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    var f=camAnim.from, t=camAnim.to;
    orb.theta=f.theta+camAnim.dth*e; orb.phi=f.phi+(t.phi-f.phi)*e; orb.r=f.r+(t.r-f.r)*e;
    target.set(f.tx+(t.tx-f.tx)*e, f.ty+(t.ty-f.ty)*e, f.tz+(t.tz-f.tz)*e); updateCam();
    if(k>=1)camAnim=null;
  } else if(spinOn&&!dragging&&!panning){ orb.theta+=dt*0.16; updateCam(); }
  if(flowGroup.visible){
    for(var i=0;i<flows.length;i++){
      var fl=flows[i];
      if(!fl.group.visible) continue;
      fl.t0=(fl.t0+dt*fl.speed)%1;
      for(var j=0;j<fl.dots.length;j++){
        var tt=(fl.t0+j/fl.dots.length)%1;
        fl.dots[j].position.copy(fl.curve.getPointAt(tt));
      }
    }
  }
  // oclusión: solo cuando la vista ha cambiado, y limitado en frecuencia
  if(numsOn){
    var key=orb.theta.toFixed(3)+'|'+orb.phi.toFixed(3)+'|'+orb.r.toFixed(2)+'|'+
            target.x.toFixed(2)+'|'+target.y.toFixed(2)+'|'+target.z.toFixed(2)+'|'+
            cutT.toFixed(2)+'|'+exT.toFixed(2);
    if(key!==occKey && now-occT>90){ occKey=key; occT=now; updateBadgeOcclusion(); }
  }
  renderer.render(scene,camera);
  updateBadges();          // después del render: matrices ya actualizadas

  /*  ¿OTRO FOTOGRAMA? Se pregunta DESPUES de dibujar, no antes: `updateEngine` acaba
      de consumir `ANIM.dirty`, los tweens que terminaron ya se han quitado de la
      lista, y el humo que se paro ya lleva `mov <= 0`. Preguntar antes dejaria un
      fotograma de mas cada vez — que no rompe nada, pero es justo lo que se venia a
      quitar.                                                                     */
  //  se marca vivo explicitamente: si no, un `despierta()` posterior creeria que
  //  el bucle esta parado y arrancaria un SEGUNDO bucle en paralelo.
  if (hayQueMover()) { bucleVivo = true; requestAnimationFrame(tick); }
  else bucleVivo = false;
}
function onResize(){ W=stage.clientWidth; H=stage.clientHeight; camera.aspect=W/H; camera.updateProjectionMatrix(); renderer.setSize(W,H);  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); }  /*  EL TOPE DE DENSIDAD, y en un teléfono no es cosmético: a 3x un lienzo de
    375 px son 1125 píxeles reales, y eso en una GPU de móvil se nota al primer
    giro. Dos es de sobra para que no se vean escalones.  */
window.addEventListener('resize', onResize);

/*  EL ARRANQUE ESTABA AQUI, Y AQUI ERA DEMASIADO PRONTO.
    `tick()` llama a `updateHumo` y a `updateSpot`, y el humo y el senalador se
    declaran MAS ABAJO -son los dos anadidos del paso 5-. Con `var`, `humoGroup`
    valia `undefined` cuando el primer fotograma lo leia, y el arranque entero moria
    dentro de su propio try:

        TypeError: Cannot read properties of undefined (reading 'visible')
            at updateHumo (motor3d.js:2345)  <- el guardia, leyendo humoGroup
            at tick (motor3d.js:2209)

    NO SE VEIA. El catch pinta el cartel de error en un panel que aqui es de mentira,
    y `montar()` vuelve a arrancar el bucle cuando ya existe todo. Los tres arneses
    del motor daban verde porque los tres llaman a `montar()`; el unico que lo vio
    fue abrir el capitulo en Chrome y escuchar la consola.

    El arranque baja al final, detras de todo lo que `tick()` toca.               */



/*  ══ EL HUMO ═══════════════════════════════════════════════════════════════════
    Tres estados de un mismo penacho, en la salida del espejo. **Una salida, no tres**
    — decidido por Joel: tres chimeneas por el espejo no existen en un barco, y una
    figura que muestra algo imposible enseña a esperar algo imposible. El mapa de
    `9.4` lo hace la tabla del panel.

    ── POR QUÉ GEOMETRÍA Y NO PARTÍCULAS ──────────────────────────────
    En 375 px un sistema de partículas o se ve como ruido o hay que subir tanto el
    número que el teléfono lo nota. **Y una nube delante del escape se come los
    pinchazos** de dos pantallas que preguntan señalando.

    ── LOS TRES NO SE DISTINGUEN SÓLO POR COLOR ───────────────────────
    El compartimento es casi negro, así que un penacho negro sobre él sería invisible
    y uno azul oscuro se le parecería. **No se ajusta el tinte a ojo: se cambia lo
    que los separa.**

      azul    fino, muy translúcido, se desvanece pronto
      negro   OPACO y el más ANCHO — no se ve nada a través de él
      blanco  claro sobre fondo oscuro, y el de más volumen

    Tres capas concéntricas de radio creciente y opacidad decreciente dan volumen sin
    partículas **y se pueden medir en píxeles**, que es lo que decide si de verdad se
    distinguen. Lo mide `walk-humo`.

    ── Y SE PARA ──────────────────────────────────────────────────────
    Sube unos segundos al aparecer y se queda, según la regla del módulo. **Vuelve a
    moverse cuando el alumno cambia de color, porque eso lo conduce él.**       */
/*  EL HUMO SE LLAMA POR SU NOMBRE, para que el montaje lo deje en paz. `verPiezas`
    apagaba las nueve mallas de los tres penachos y `setHumo()` enciende EL GRUPO,
    no las mallas: despues de un `verPiezas` el humo no habria vuelto a verse. No lo
    veia ningun arnes porque `walk-humo` no llama a `verPiezas`.                  */
var humoGroup = new THREE.Group(); humoGroup.name = "humoGroup"; scene.add(humoGroup);
var humo = { color: null, t: 0, mov: 0, grupos: {} };

/*  LOS TRES ESTADOS. Cada uno lleva su color, sus opacidades y **sus radios**, que es
    lo que de verdad los separa sobre un fondo casi negro:

      azul    fino y muy translúcido — se desvanece pronto
      negro   OPACO y el más ANCHO — no se ve nada a través de él
      blanco  claro sobre fondo oscuro, y el de más volumen

    LOS RADIOS VAN EN LA GEOMETRÍA Y NO EN LA ESCALA, y eso no es un detalle: escalar
    una `TubeGeometry` en x/z **mueve la curva entera**, no ensancha el tubo. La primera
    versión lo hacía así y **dos de los tres penachos se salían de la vista**: el azul a
    0,5 y el negro a 1,45. Medido antes de arreglarlo, con las escalas a 1: aparecieron
    los tres.                                                                        */
var HUMOS = {
  blue:  { color: 0x7fa8d8, op: [0.34, 0.16, 0.07], rad: [0.13, 0.24, 0.36] },
  black: { color: 0x1a1a1a, op: [0.98, 0.88, 0.62], rad: [0.20, 0.44, 0.78] },
  white: { color: 0xf2f4f6, op: [0.82, 0.52, 0.26], rad: [0.17, 0.36, 0.62] }
};

(function buildHumo(){
  /*  la curva: sale del espejo, sube y se abre hacia popa  */
  var pts = [V(9.9, 1.72, 0), V(10.6, 2.10, 0.10), V(11.4, 2.75, 0.28),
             V(12.3, 3.70, 0.55), V(13.2, 4.95, 0.95)];
  var curva = new THREE.CatmullRomCurve3(pts);
  for (var cual in HUMOS) {
    var H = HUMOS[cual];
    var g = new THREE.Group(); g.visible = false;
    for (var k = 0; k < 3; k++) {
      var geo = new THREE.TubeGeometry(curva, 26, H.rad[k], 12, false);
      var mat = new THREE.MeshBasicMaterial({ color: H.color, transparent: true,
        opacity: H.op[k], depthWrite: false, side: THREE.DoubleSide });
      var mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 900 + k;
      g.add(mesh);
    }
    humoGroup.add(g);
    humo.grupos[cual] = g;
  }
  humoGroup.visible = false;
})();

function setHumo(cual){
  for (var c in humo.grupos) humo.grupos[c].visible = false;
  if (!cual || !humo.grupos[cual]) {
    humoGroup.visible = false; humo.color = null; ANIM.dirty=true; despierta(); return;
  }
  humo.grupos[cual].visible = true;
  humo.color = cual; humo.t = 0;
  /*  se mueve unos segundos cada vez que el alumno lo cambia: lo que él conduce
      no se detiene solo  */
  humo.mov = 2.6;
  humoGroup.visible = true;
  ANIM.dirty=true; despierta();
}

function updateHumo(dt){
  if (!humoGroup.visible || humo.mov <= 0) return;   //  se mostró y se detuvo
  humo.mov -= dt; humo.t += dt;
  /*  sube creciendo, y ondea un poco mientras dura. **En Y, que es a lo largo de la
      curva: en x/z movería el penacho de sitio.**  */
  var sube = Math.min(1, humo.t / 1.2);
  var g = humo.grupos[humo.color];
  for (var k = 0; k < g.children.length; k++) {
    g.children[k].scale.y = sube * (1 + 0.04 * Math.sin(humo.t * 2.2 + k));
  }
  ANIM.dirty=true; despierta();
}


/*  ══ EL SEÑALADOR ════════════════════════════════════════════════
    Dos aros y un punto que marcan la pieza enfocada, y los mueve `updateSpot` cada
    fotograma. **Eran las tres mallas que faltaban** — 630 contra 627.

    En el capítulo viven en las líneas 2768–2830, o sea **después del corte**. Y la
    hipótesis era otra —que el panel de mentira estuviera suprimiéndolas—: era
    razonable y era falsa. **Se persiguió midiendo**, comparando las dos escenas malla
    a malla por su huella de geometría, y salieron dos toros de radio 1 y una esfera
    de 0,07 que apuntaban aquí sin ambigüedad.

    **Es la segunda vez que una pieza del 3D estaba escrita fuera del bloque del 3D**
    —la primera fue `applyCut`—. Los bloques del capítulo viejo no están separados por
    función: están separados por cuándo se escribieron.

    Y no es cosmético: **es lo que `enfocar(pieza)` dibuja.**                     */
var spotGroup=new THREE.Group(); spotGroup.name="spotGroup"; scene.add(spotGroup);
var spot={on:false, mesh:null, t:0, ring:null, ring2:null, dot:null, r:0.5};
(function buildSpot(){
  var mk=function(op){ return new THREE.MeshBasicMaterial({color:0xffd66b, transparent:true,
                        opacity:op, depthTest:false, side:THREE.DoubleSide}); };
  spot.ring=new THREE.Mesh(new THREE.TorusGeometry(1,0.035,10,44), mk(0.95));
  spot.ring2=new THREE.Mesh(new THREE.TorusGeometry(1,0.02,10,44), mk(0.5));
  spot.dot=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,12), mk(0.95));
  spotGroup.add(spot.ring, spot.ring2, spot.dot);
  spot.ring.renderOrder=999; spot.ring2.renderOrder=999; spot.dot.renderOrder=999;
  spotGroup.visible=false;
})();
function spotOn(mesh){
  if(!mesh) return;
  spot.mesh=mesh; spot.on=true; spot.t=0;
  var bb=new THREE.Box3(), bs=new THREE.Sphere();
  try{ bb.setFromObject(mesh); bb.getBoundingSphere(bs);
       spot.r=(isFinite(bs.radius)&&bs.radius>0)?Math.max(0.35,Math.min(1.6,bs.radius*1.35)):0.5; }
  catch(e){ spot.r=0.5; }
  spotGroup.visible=true;
}
function spotOff(){ spot.on=false; spot.mesh=null; spotGroup.visible=false; /* xrayOff: es un modo del capítulo, no de la figura */ }
function updateSpot(dt){
  if(typeof spot==="undefined" || !spot || !spot.on || !spot.mesh) return;
  spot.t+=dt;
  spot.mesh.getWorldPosition(_sp);
  spotGroup.position.copy(_sp);
  spotGroup.quaternion.copy(camera.quaternion);      // siempre de cara a la cámara
  var pulse=1+0.12*Math.sin(spot.t*3.4);
  spot.ring.scale.setScalar(spot.r*pulse);
  spot.ring2.scale.setScalar(spot.r*pulse*1.34);
  spot.ring2.material.opacity=0.42+0.28*Math.sin(spot.t*3.4+1);
  spot.dot.visible=(spot.t%1.6)<0.8;
}
/*  ══ LAS MARCAS · VARIAS PIEZAS SEÑALADAS A LA VEZ ══════════════════════════════
    El señalador de arriba marca UNA pieza y `enfocar` le mueve la cámara encima. La P3
    necesita otra cosa: **marcar un conjunto sin mover la cámara**, cada grupo de su
    color — `9.1` seis piezas con su letra, `9.4` tres grupos en tres colores, `9.6` los
    respetos de a bordo—. No existía nada parecido.

    ── SE MARCA CON ARO, NO TIÑENDO LA PIEZA, Y ESO ESTÁ MEDIDO ────────
    La vía obvia era `setEmissive`, que ya existe y que usa `selectPart`. **No sirve, y
    no por poco.** Medido con `mide-resalte.js` y su control negativo, teñir la pieza de
    azul y otra de blanco las separa **15,5** en RGB; barriendo la intensidad de 0,25 a
    2,6 va de **35,1 a 20,4** — *nunca llega a 40 y empeora cuanto más se tiñe*. La causa
    es de construcción: el emisivo **suma luz** sobre una superficie que ya está
    iluminada, así que todo tiende al blanco pálido. **No es cuestión de ajuste.**

    El aro, en cambio, se dibuja con `MeshBasicMaterial`, que no recibe luz. Como está
    hoy el señalador —fino y a 0,95 y 0,5 de opacidad— azul contra blanco da **38,3**, a
    un pelo del suelo. **Opaco y con colores saturados: azul-ámbar 101,3 · azul-blanco
    61,0 · ámbar-blanco 83,8.** Los tres distintos, y por eso las marcas nacen opacas.

    ── Y LAS LETRAS NO PUEDEN SER CHAPAS, PORQUE LAS CHAPAS NO EXISTEN AQUÍ ───
    El capítulo viejo tenía un sistema de chapas HTML completo —proyección, oclusión por
    rayo, un ancla fija por pieza— y **sigue en este fichero**. Pero cuelga de
    `DOC.getElementById('badges')`, y en la figura extraída `DOC` devuelve un panel de
    mentira: las chapas se crean, se posicionan y **no se ven**, porque su contenedor no
    está en el DOM de verdad. *Es la quinta vez en este módulo que algo estaba dibujado y
    no alcanzable, y la primera en que lo dibujado tampoco servía.*

    Así que la marca lleva su letra en una capa que **la figura se crea a sí misma**
    dentro de su nodo, sin pedirle nada a la plantilla: una parte nueva la tiene el día
    que se construye.                                                              */
var marcaGroup = new THREE.Group(); marcaGroup.name = "marcaGroup"; scene.add(marcaGroup);
var MARCAS = [], capaLetras = null;
/*  ── Y LA MARCA SE PINCHA ────────────────────────────────────────────────────────
    **Esto no es un adorno: es lo que hace posibles tres pantallas de la P3.** El
    encuadre por zona resuelve el suelo del dedo acercandose, y **una pantalla que marca
    piezas repartidas por todo el motor no puede acercarse**: dejaria fuera de cuadro la
    mitad de lo que enseña. Las dos soluciones se estorban.

    Medido: en `9.6` la respuesta —el rodete— ocupa **566 px** con el motor entero, y el
    suelo son 1 000. Pero en esa pantalla **el rodete lleva un aro encima**, y un aro es
    un blanco grande, opaco y delante de todo. *Si el aro cuenta como su pieza, una pieza
    marcada se puede pinchar por pequeña que sea* — y no regala nada, porque en esas
    pantallas **todos los candidatos van marcados**.

    El blanco no es la banda del aro, que es fina: es un **disco invisible** de su mismo
    radio. Se dibuja con opacidad 0 y `depthTest` apagado, asi que no se ve, no tapa nada
    y el rayo lo encuentra el primero.                                              */

/*  la capa de letras: se crea una vez, dentro del nodo de la figura, y por encima del
    lienzo. `pointer-events:none` porque una letra que se pincha se comería el pinchazo
    de la pieza que está señalando — que es justo lo que `9.4` pregunta.  */
function capa() {
  if (capaLetras) return capaLetras;
  var host = NODO || (LIENZO && LIENZO.parentNode);
  if (!host) return null;
  try {
    if (host.style && !host.style.position) host.style.position = "relative";
    var d = document.createElement("div");
    d.className = "m3dLetras";
    d.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;"
      + "pointer-events:none;overflow:hidden;z-index:5";
    host.appendChild(d);
    capaLetras = d;
  } catch (e) { capaLetras = null; }
  return capaLetras;
}

function letraNueva(txt, hex) {
  var c = capa(); if (!c) return null;
  var e = document.createElement("div");
  var css = "#" + ("000000" + hex.toString(16)).slice(-6);
  e.textContent = txt;
  e.style.cssText = "position:absolute;transform:translate3d(-999px,-999px,0);"
    + "font:700 13px/20px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;"
    + "min-width:20px;height:20px;text-align:center;border-radius:10px;"
    + "background:" + css + ";color:#0b1018;box-shadow:0 0 0 2px rgba(11,16,24,.75);"
    + "will-change:transform";
  c.appendChild(e);
  return e;
}

function sinMarcas() {
  for (var i = 0; i < MARCAS.length; i++) {
    var m = MARCAS[i];
    marcaGroup.remove(m.grupo);
    m.grupo.traverse(function (o) {
      if (o.isMesh) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); } });
    if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
  }
  MARCAS.length = 0;
  marcaGroup.visible = false;
  ANIM.dirty = true; despierta();
}

/*  UNA MARCA POR PIEZA. El radio sale de su esfera envolvente, como el del señalador:
    marcar un depósito y un tornillo con el mismo aro haría el aro mentira en los dos. */
function ponMarcas(lista) {
  sinMarcas();
  var bb = new THREE.Box3(), bs = new THREE.Sphere();
  for (var i = 0; i < lista.length; i++) {
    var it = lista[i], mesh = null;
    for (var k = 0; k < parts.length; k++)
      if (parts[k].userData && parts[k].userData.name === it.pieza) { mesh = parts[k]; break; }
    if (!mesh) { falta("marca:" + it.pieza, "se pidio marcar una pieza que no existe"); continue; }
    var hex = it.color == null ? 0xffd66b : it.color;
    var mat = function (op) {
      return new THREE.MeshBasicMaterial({ color: hex, transparent: op < 1, opacity: op,
        depthTest: false, side: THREE.DoubleSide }); };
    var r = 0.5;
    /*  ── EL SUELO DEL ARO ES UN SUELO DE DEDO, NO DE ESTETICA ────────────────
        El señalador saca su radio de la esfera envolvente de la pieza y lo acota entre
        0,35 y 1,6, y para SEÑALAR esta bien: un aro proporcionado a lo que marca. Pero
        **una marca ademas se pincha**, asi que su radio es el tamaño del blanco — y con
        0,35 las piezas pequeñas quedaban por debajo del suelo del dedo: medido en el
        lienzo del telefono, `Thermostat` **927** px y `Oil filter` **972**, contra los
        1 000 que son un blanco de 15x15.
        Con 0,62 los dos cruzan. *El aro de una pieza pequeña deja de ser proporcionado y
        pasa a ser tocable, que es lo que hace falta cuando ademas es el blanco.*      */
    try { bb.setFromObject(mesh); bb.getBoundingSphere(bs);
          if (isFinite(bs.radius) && bs.radius > 0) r = Math.max(1.05, Math.min(1.6, bs.radius * 1.35)); }
    catch (e) {}
    var g = new THREE.Group();
    /*  OPACO, y el grosor tambien sube: lo medido es que un aro fino y translucido
        pierde el color contra lo que tiene detras.  */
    var aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 10, 44), mat(1));
    var aro2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.028, 10, 44), mat(0.55));
    aro.renderOrder = 998; aro2.renderOrder = 998;
    aro.scale.setScalar(r); aro2.scale.setScalar(r * 1.34);
    g.add(aro, aro2);
    /*  NO HAY DISCO. La primera version ponia uno invisible por marca para que el rayo
        lo cazara, y **un disco es plano**: si el encuadre cambia y el bucle de dibujo
        no vuelve a pasar, se queda mirando a donde miraba antes y visto de canto no
        tiene area. Daba dos estados estables. El blanco se calcula ahora en pantalla,
        en `_unRayo`, sin geometria de por medio.  */
    marcaGroup.add(g);
    MARCAS.push({ mesh: mesh, grupo: g, hex: hex, r: r, pieza: it.pieza,
                  letra: it.letra || null,
                  el: it.letra ? letraNueva(it.letra, hex) : null });
  }
  marcaGroup.visible = MARCAS.length > 0;
  /*  ── SE COLOCAN AQUI, NO SOLO EN EL BUCLE ────────────────────────
      **Las marcas nacian en el origen y esperaban a que `tick` las pusiera en su
      sitio**, y el bucle de dibujo de esta figura SE APARCA cuando nada se mueve. Un
      `despierta()` pide un fotograma, pero no lo garantiza *antes* de que alguien
      pregunte — y quien pregunta es el dedo del alumno.

      SE ENCONTRO MIDIENDO, y por no ser reproducible: la misma pagina, la misma camara
      y las mismas cuatro marcas daban **2 448 px una vez y 144 la siguiente**. No era
      el instrumento — era que la mitad de las veces el pinchazo llegaba antes que el
      primer fotograma, y los discos seguian en el centro de la escena.

      *Es la familia de `walk-angulo`, que leia los pistones sin dejar pintar y canto
      «carrera 0» en los cuatro: **lo que posa una cosa corre dentro del bucle, y quien
      mide fuera del bucle mide lo de antes.*** Colocarlas aqui cuesta una pasada.   */
  updateMarcas();
  ANIM.dirty = true; despierta();
}

var _mp = new THREE.Vector3();
/*  LAS MARCAS NO PULSAN. El señalador pulsa porque señala una cosa y el latido es lo que
    la encuentra; **seis latidos a la vez son ruido**, y ademas la regla del modulo es que
    lo que se muestra se detiene. Asi que esto solo las coloca.                       */
function updateMarcas() {
  if (!marcaGroup.visible) return;
  for (var i = 0; i < MARCAS.length; i++) {
    var m = MARCAS[i];
    /*  una marca sobre una pieza apagada por el montaje no es una marca: es un aro
        flotando donde no hay nada  */
    var puesta = m.mesh.visible;
    m.grupo.visible = puesta;
    if (!puesta) { if (m.el) m.el.style.transform = "translate3d(-999px,-999px,0)"; continue; }
    m.mesh.getWorldPosition(_mp);
    m.grupo.position.copy(_mp);
    m.grupo.quaternion.copy(camera.quaternion);
    if (m.el) {
      _mp.project(camera);
      if (_mp.z > 1 || _mp.x < -1.1 || _mp.x > 1.1 || _mp.y < -1.1 || _mp.y > 1.1) {
        m.el.style.transform = "translate3d(-999px,-999px,0)";
      } else {
        /*  la letra se aparta del centro del aro para no taparlo: arriba y a la
            derecha, a la distancia del propio radio proyectado  */
        m.el.style.transform = "translate3d("
          + ((_mp.x * 0.5 + 0.5) * W + 8).toFixed(1) + "px,"
          + ((-_mp.y * 0.5 + 0.5) * H - 26).toFixed(1) + "px,0)";
      }
    }
  }
}

/*  ══ ACERCAR CON DOS DEDOS ═══════════════════════════════════
    Girar con un dedo ya funcionaba: el tramo de cámara e interacción no tenía ni una
    ancla al DOM, y eso fue media mitad del requisito de móvil, gratis.

    Acercar no. El original sólo lo tenía en la rueda del ratón, y **un teléfono no
    tiene rueda**: la figura se podía girar y no se podía mirar de cerca, que en una
    pantalla de 375 px es justo lo que hace falta.

    Va aparte y no toca el arrastre de un dedo. **Dos dedos son un gesto distinto, y
    mezclarlo con el que ya funciona es como se rompen los que ya funcionan.**   */
(function () {
  var lienzo = renderer && renderer.domElement;
  if (!lienzo) return;
  var d0 = 0;
  function sep(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  lienzo.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) d0 = sep(e.touches);
  }, { passive: true });
  lienzo.addEventListener("touchmove", function (e) {
    if (e.touches.length !== 2 || !d0) return;
    e.preventDefault();
    var d = sep(e.touches);
    if (!d) return;
    orb.r = Math.max(4, Math.min(40, orb.r * (d0 / d)));
    d0 = d;
    ANIM.dirty=true; despierta();
  }, { passive: false });
  lienzo.addEventListener("touchend", function (e) {
    if (e.touches.length < 2) d0 = 0;
  }, { passive: true });
})();

/*  ══ EL ARRANQUE ═══════════════════════════════════════════════
    Va el ultimo a proposito: `tick()` toca el humo y el senalador, y los dos se
    declaran mas arriba pero DESPUES de donde estaba antes este bloque.        */
try{
  buildOccluders(); measureBadgeRadii(); updateBadgeOcclusion();
  applyCut(); applyExplode();
  renderer.render(scene,camera);
  DOC.getElementById('loader').style.display='none';
  animateCam(PRESETS.iso, false);
  //  el arranque despierta el bucle, no lo llama: llamar a `tick()` directo lo
  //  dejaria andando con `bucleVivo` en falso, y el primer `despierta()` duplicaria.
  despierta();
}catch(err){
  console.error(err);
  DOC.getElementById('spin').style.display='none';
  DOC.getElementById('loadtxt').style.display='none';
  DOC.getElementById('err').style.display='block';
}

/*  ══ LA API ════════════════════════════════════════════════
    Todo lo de arriba es el codigo original sin tocar. Esto es lo unico nuevo, y no
    hace calculo: llama a lo que ya existia.                                     */

raiz.Motor3D = {

  /*  UNA MIRILLA PARA MEDIR, y no una función del curso.
      `walk-motor-movil` necesita ver el ángulo y el radio de la cámara para
      comprobar que un dedo gira y dos dedos acercan. **Sin esto la única forma de
      medir un gesto sería mirar píxeles, que es frágil y lento.**
      Los dos guiones bajos son la señal: no se llama desde una pantalla.       */
  /*  LA MIRILLA DEL HUMO. Pinta cada penacho solo, lee los píxeles de la ventana
      donde vive, y devuelve el color medio, cuánto cubre y cuánto se separa del
      fondo. **Es lo que decide si azul y negro son el mismo penacho**, que era la
      duda de Joel, y se contesta midiendo y no mirando.

      La ventana se toma alrededor de la salida del espejo proyectada a pantalla,
      así que sigue valiendo si la cámara cambia.                              */
  __humo: function () {
    var gl = renderer.getContext();
    var W = renderer.domElement.width, H = renderer.domElement.height;

    /*  SE APUNTA AL PENACHO ANTES DE MEDIR. La cámara por defecto mira al motor, y la
        salida del espejo está muy a popa: a 375 px se sale del encuadre, y los tres
        humos daban 0,0,0 — **y el fondo también**, que es lo que lo delató, porque un
        compartimento es #0c131c y no negro puro.

        No era un problema de color: era que no estaba mirando. Y `9.3` va a mirar al
        espejo de todos modos, así que medir aquí es medir lo que el alumno verá.  */
    var _o = { theta: orb.theta, phi: orb.phi, r: orb.r,
               tx: target.x, ty: target.y, tz: target.z };
    orb.theta = 0.55; orb.phi = 1.02; orb.r = 11;
    target.set(11.2, 3.0, 0.3);
    if (typeof updateCam === "function") updateCam();
    /*  dónde cae el penacho en pantalla: se proyecta el medio de su curva  */
    var pv = new THREE.Vector3(11.4, 3.0, 0.3).project(camera);
    var cx = Math.round((pv.x * 0.5 + 0.5) * W);
    var cy = Math.round((pv.y * 0.5 + 0.5) * H);   //  readPixels va de abajo arriba
    var lado = Math.max(40, Math.round(Math.min(W, H) * 0.30));
    var x0 = Math.max(0, cx - (lado >> 1)), y0 = Math.max(0, cy - (lado >> 1));
    lado = Math.min(lado, W - x0, H - y0);

    function lee() {
      renderer.render(scene, camera);
      var px = new Uint8Array(lado * lado * 4);
      gl.readPixels(x0, y0, lado, lado, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    }
    function medio(px) {
      var r = 0, g = 0, b = 0, n = lado * lado;
      for (var i = 0; i < px.length; i += 4) { r += px[i]; g += px[i+1]; b += px[i+2]; }
      return [r / n, g / n, b / n];
    }

    /*  primero el fondo, sin humo  */
    setHumo(null);
    var base = lee(), fondo = medio(base);

    var out = {};
    ["blue", "black", "white"].forEach(function (k) {
      setHumo(k);
      humo.mov = 0;                       //  quieto, para que la medida no baile
      var px = lee(), col = medio(px);
      /*  cobertura: cuántos píxeles cambiaron respecto del fondo  */
      var cambia = 0;
      for (var i = 0; i < px.length; i += 4) {
        var d = Math.abs(px[i] - base[i]) + Math.abs(px[i+1] - base[i+1])
              + Math.abs(px[i+2] - base[i+2]);
        if (d > 12) cambia++;
      }
      out[k] = {
        color: col,
        cobertura: cambia / (lado * lado),
        dFondo: Math.sqrt(col.reduce(function (s, v, j) {
          return s + Math.pow(v - fondo[j], 2); }, 0))
      };
    });
    setHumo(null);
    /*  y la cámara vuelve a donde estaba: una mirilla no deja rastro  */
    orb.theta = _o.theta; orb.phi = _o.phi; orb.r = _o.r;
    target.set(_o.tx, _o.ty, _o.tz);
    if (typeof updateCam === "function") updateCam();
    return { ventana: lado + "x" + lado, fondo: fondo, humos: out,
             donde: cx + "," + cy + " de " + W + "x" + H };
  },

  /*  LA MIRILLA DEL RESALTE, y existe por la misma razon que la del humo: Joel
      pregunto si **tres colores sobre el mismo motor se distinguen de verdad**, y eso
      no se contesta mirando. Se pinta cada pieza con su tinte, se leen los pixeles de
      la ventana donde vive, y se devuelve el color medio y **la separacion de cada par**.

      Se mide ANTES de construir el resaltado multiple, no despues: si dos colores se
      confunden, la funcion que los pinta nace ya inservible para `9.4`.

      Ventana por pieza: un cuadrado alrededor de su posicion proyectada, con lado
      sacado de su esfera envolvente. Asi vale desde cualquier camara.

      **No deja rastro**: apaga los tintes al salir.                              */
  __resalte: function (lista, inten) {
    var gl = renderer.getContext();
    var W = renderer.domElement.width, H = renderer.domElement.height;
    inten = inten == null ? 0.9 : inten;

    function malla(nombre) {
      for (var i = 0; i < parts.length; i++)
        if (parts[i].userData && parts[i].userData.name === nombre) return parts[i];
      return null;
    }
    /*  la ventana de una pieza: donde cae en pantalla y cuanto ocupa  */
    function ventana(mesh) {
      var bb = new THREE.Box3(), bs = new THREE.Sphere();
      bb.setFromObject(mesh); bb.getBoundingSphere(bs);
      var pv = bs.center.clone().project(camera);
      var cx = Math.round((pv.x * 0.5 + 0.5) * W);
      var cy = Math.round((pv.y * 0.5 + 0.5) * H);
      /*  el lado sale del radio proyectado, no de un numero a mano: una pieza grande
          lejos y una pequeña cerca ocupan lo mismo y tienen que medirse igual  */
      var borde = bs.center.clone().add(
        new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(bs.radius));
      var pb = borde.project(camera);
      var lado = Math.max(12, Math.round(Math.abs(pb.x - pv.x) * W * 1.1));
      var x0 = Math.max(0, cx - (lado >> 1)), y0 = Math.max(0, cy - (lado >> 1));
      lado = Math.min(lado, W - x0, H - y0);
      return (lado > 6 && x0 >= 0 && y0 >= 0) ? { x0: x0, y0: y0, lado: lado } : null;
    }
    function lee(v) {
      renderer.render(scene, camera);
      var px = new Uint8Array(v.lado * v.lado * 4);
      gl.readPixels(v.x0, v.y0, v.lado, v.lado, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    }
    function medio(px, n) {
      var r = 0, g = 0, b = 0;
      for (var i = 0; i < px.length; i += 4) { r += px[i]; g += px[i+1]; b += px[i+2]; }
      return [r / n, g / n, b / n];
    }
    var dist = function (a, b) {
      return Math.sqrt(Math.pow(a[0]-b[0],2) + Math.pow(a[1]-b[1],2) + Math.pow(a[2]-b[2],2));
    };

    var out = [], i;
    for (i = 0; i < lista.length; i++) {
      var m = malla(lista[i].pieza);
      if (!m) { out.push({ pieza: lista[i].pieza, error: "no existe" }); continue; }
      if (!m.visible) { out.push({ pieza: lista[i].pieza, error: "no visible" }); continue; }
      var v = ventana(m);
      if (!v) { out.push({ pieza: lista[i].pieza, error: "fuera del encuadre" }); continue; }
      var n = v.lado * v.lado;
      /*  ¿PUEDE ESTA PIEZA TEÑIRSE SIQUIERA? `setEmissive` recorre los hijos y solo
          toca los que tienen material con `emissive`. **Una pieza sin ninguno no se
          tiñe y da cobertura cero — igual que una pieza tapada.** Son dos cosas
          distintas y sin esto se leen como la misma: se cuentan aparte.          */
      var conEm = 0, mallas = 0;
      m.traverse(function (c) {
        if (c.isMesh) { mallas++; if (c.material && c.material.emissive) conEm++; } });
      clearEmissive(m);
      var base = lee(v), cBase = medio(base, n);
      setEmissive(m, lista[i].hex, inten);
      var px = lee(v), cCol = medio(px, n);
      clearEmissive(m);
      /*  cobertura: cuantos pixeles cambio el tinte. Una pieza tapada no cambia ninguno
          y su color medio seria el de lo que tiene delante — que es el cero que hay que
          distinguir de «el color no se ve».  */
      /*  ── SE PROMEDIA LO QUE CAMBIO, NO LA VENTANA ENTERA ──────────────────
          La primera version devolvia el color medio del cuadrado, y **el control
          negativo la tumbo a la primera**: la MISMA pieza teñida de blanco y de negro
          se separaba 21,4, que no es blanco contra negro ni de lejos. La causa no era
          el tinte: era que la pieza ocupa el 30 % de su ventana y el otro 70 % es
          fondo y vecinas, **que no cambian**. Un promedio con dos tercios de constante
          aplasta cualquier diferencia hacia cero.

          Asi que el color del resalte es el de **los pixeles que el tinte movio**. Los
          demas no son del resalte.                                                */
      var cambia = 0, rr = 0, gg = 0, bb = 0;
      for (var k = 0; k < px.length; k += 4) {
        var d = Math.abs(px[k]-base[k]) + Math.abs(px[k+1]-base[k+1]) + Math.abs(px[k+2]-base[k+2]);
        if (d > 12) { cambia++; rr += px[k]; gg += px[k+1]; bb += px[k+2]; }
      }
      var cTint = cambia ? [rr/cambia, gg/cambia, bb/cambia] : null;
      out.push({ pieza: lista[i].pieza, hex: lista[i].hex,
                 ventana: v.lado, sinTinte: cBase, ventanaEntera: cCol,
                 conTinte: cTint,
                 cobertura: cambia / n,
                 mallas: mallas, conEmisivo: conEm,
                 dSinTinte: cTint ? dist(cTint, cBase) : 0 });
    }
    /*  y lo que de verdad pregunto Joel: cada par contra cada par  */
    var pares = [];
    for (i = 0; i < out.length; i++)
      for (var j = i + 1; j < out.length; j++)
        if (out[i].conTinte && out[j].conTinte)
          pares.push({ a: out[i].pieza, b: out[j].pieza,
                       d: dist(out[i].conTinte, out[j].conTinte) });
    return { piezas: out, pares: pares };
  },

  /*  LA MIRILLA DEL SEÑALADOR. Apaga los aros, lee la pantalla entera, los enciende,
      la vuelve a leer, y devuelve **el color medio de los pixeles que cambiaron** —que
      son los del señalador y nada mas—.

      Contesta una pregunta concreta: el señalador se dibuja con `MeshBasicMaterial`,
      que **no recibe luz**, asi que su color en pantalla deberia ser exactamente el que
      se le pidio. Si es asi, marcar por aro conserva el color donde teñir la pieza lo
      pierde, y eso decide como se hace `9.4`.                                     */
  __aro: function (hex, opaco) {
    var gl = renderer.getContext();
    /*  se le puede pedir un color: es lo que decide si TRES aros se distinguen entre
        si, que es la pregunta de `9.4`. Se restaura al salir.  */
    var previo = spot.ring ? spot.ring.material.color.getHex() : null;
    var opPrev = [];
    if (hex != null) spotGroup.traverse(function (c) {
      if (c.isMesh && c.material && c.material.color) c.material.color.setHex(hex); });
    /*  y se puede pedir OPACO. El señalador vive a 0,95 y 0,5, y un aro fino y
        translucido **se mezcla con lo que tiene detras**: el azul pedido (79,155,255)
        llega a pantalla como (178,203,217). Si la opacidad es lo que se lo come, subirla
        tiene que separarlos mas — y eso se mide, no se supone.                     */
    if (opaco) spotGroup.traverse(function (c) {
      if (c.isMesh && c.material) { opPrev.push([c, c.material.opacity]); c.material.opacity = 1; } });
    var W = renderer.domElement.width, H = renderer.domElement.height;
    function lee() {
      renderer.render(scene, camera);
      var px = new Uint8Array(W * H * 4);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    }
    var eraVisible = spotGroup.visible;
    /*  se congela el latido: los aros pulsan, y una medida que baila con el reloj
        no es una medida  */
    var t = spot.t; spot.t = 0.0;
    spotGroup.visible = false;
    var sin = lee();
    spotGroup.visible = true;
    var con = lee();
    var n = 0, r = 0, g = 0, b = 0;
    for (var i = 0; i < con.length; i += 4) {
      var d = Math.abs(con[i]-sin[i]) + Math.abs(con[i+1]-sin[i+1]) + Math.abs(con[i+2]-sin[i+2]);
      if (d > 12) { n++; r += con[i]; g += con[i+1]; b += con[i+2]; }
    }
    spotGroup.visible = eraVisible; spot.t = t;
    var salida = { pixeles: n, color: n ? [r/n, g/n, b/n] : null,
                   pedido: hex != null ? hex : previo };
    if (hex != null && previo != null) spotGroup.traverse(function (c) {
      if (c.isMesh && c.material && c.material.color) c.material.color.setHex(previo); });
    for (var q = 0; q < opPrev.length; q++) opPrev[q][0].material.opacity = opPrev[q][1];
    ANIM.dirty = true; despierta();
    return salida;
  },

  __orb: function () { return { theta: orb.theta, phi: orb.phi, r: orb.r }; },

  montar: function (nodo) {
    NODO = nodo;
    /*  se MUEVE lo que ya se construyó, en vez de reconstruirlo  */
    if (LIENZO && LIENZO.parentNode !== nodo) {
      while (LIENZO.firstChild) nodo.appendChild(LIENZO.firstChild);
    }
    /*  Y SE REAPUNTA `stage`, que es una variable capturada al cargar y sigue
        señalando al div suelto. Mover los hijos arregla DÓNDE está el lienzo;
        esto arregla CONTRA QUÉ se mide, que es lo que `onResize` necesita.  */
    stage = nodo;
    if (typeof onResize === "function") onResize();
    /*  QUE SIGA AJUSTÁNDOSE. Un teléfono que gira, o un panel que se pliega,
        cambian el nodo sin que la ventana cambie de tamaño — y el evento
        `resize` no se entera. `ResizeObserver` sí.                        */
    if (typeof ResizeObserver !== "undefined") {
      try {
        new ResizeObserver(function () {
          if (typeof onResize === "function") onResize();
        }).observe(nodo);
      } catch (e) { /* si no se puede observar, queda el evento de ventana */ }
    }
    return this;
  },

  /*  ── adopta(posDe) · LA FONTANERIA SIN NOMBRE ─────────────
      `posDe` es un mapa {nombre de pieza: posicion de montaje}. Con el, cada malla
      sin nombre recibe -o no- un `userData.montaje`, y `verPiezas(lista, pos)` la
      enciende cuando el montaje llega.

      DOS REGLAS Y NINGUNA MAS, las dos autorizadas:
        A · la malla ya lleva `sys` propio, y los dos extremos de su volumen caen
            junto a piezas de ESE sistema.
        B · no lleva `sys`, y los dos extremos caen junto a piezas **del mismo**
            sistema.
      En los dos casos la posicion es **la mas tardia de los dos extremos**: un tubo
      no puede existir antes que las dos piezas que une.

      LO QUE NO CUMPLE NINGUNA SE QUEDA SIN `montaje` Y SIN ENCENDER. Cruzar dos
      sistemas es contenido, y el contenido no se decide por cercania.

      Se ejecuta una vez; llamarla de nuevo con el mismo mapa no cambia nada.     */
  adopta: function (posDe, decididas) {
    var CERCA = 1.5;              //  medido: el reparto satura de 1.2 en adelante
    var conNombre = [];
    scene.traverse(function (o) {
      if (!o.userData || !o.userData.name) return;
      var b = new THREE.Box3().setFromObject(o), c = new THREE.Vector3();
      b.getCenter(c);
      conNombre.push({ n: o.userData.name, s: o.userData.sys, c: c });
    });
    function masCerca(p, soloSys) {
      var mejor = null, dmin = 1e9;
      for (var i = 0; i < conNombre.length; i++) {
        if (soloSys && conNombre[i].s !== soloSys) continue;
        var d = p.distanceTo(conNombre[i].c);
        if (d < dmin) { dmin = d; mejor = conNombre[i]; }
      }
      return { p: mejor, d: dmin };
    }
    //  `sinAdoptar` lleva el detalle de las que se quedan fuera: es la lista que
    //  Joel tiene que decidir, y sale del MISMO codigo que decide, no de un
    //  analisis paralelo que podria discrepar.
    var res = { A: 0, B: 0, C: 0, D: 0, sin: 0, ocultas: 0, porSys: {}, porPos: {},
                sinAdoptar: [], decididasSinCasar: [] };
    /*  ── LO DECIDIDO MANDA, Y VA PRIMERO ──────────────────────
        Una fila decidida es contenido que Joel ya resolvio: no vuelve a pasar por las
        reglas. Se busca por geometria + color + centro, y **cada fila tiene que casar
        exactamente una malla**: si el modelo cambia y deja de casar, se anota y canta,
        que es lo contrario de asignar de menos en silencio.                       */
    var mapaD = {};
    (decididas || []).forEach(function (d) {
      var k = d.geo + "|" + d.col + "|" + d.c.map(function (x) {
        return Math.round(x * 100) / 100; }).join(",");
      mapaD[k] = { d: d, n: 0 };
    });
    scene.traverse(function (o) {
      if (!o.isMesh) return;
      /*  ni el escenario, ni el humo, ni las sobreimpresiones entran en el reparto  */
      for (var b2 = o; b2; b2 = b2.parent) {
        if (FUERA_DEL_MONTAJE[b2.name]) return; }
      for (var w = o; w; w = w.parent) { if (w.userData && w.userData.name) return; }
      /*  LAS QUE NACEN OCULTAS LAS MUEVE LA ANIMACION: no son fontaneria. Y la
          base se captura AQUI si no existe todavia, porque `adopta()` corre antes
          que el primer `verPiezas` y en el primer intento `visBase` estaba sin
          definir: las trece burbujas y gotas entraban en el reparto.        */
      if (o.userData.visBase === undefined) o.userData.visBase = o.visible !== false;
      if (o.userData.visBase === false) { res.ocultas++; return; }
      var bb = new THREE.Box3().setFromObject(o);
      var a = masCerca(bb.min), z = masCerca(bb.max);
      o.userData.montaje = null;
      /*  primero, lo decidido  */
      var cc = new THREE.Vector3(); bb.getCenter(cc);
      var gg = o.geometry && o.geometry.type
        ? o.geometry.type.replace("Geometry", "") : "?";
      var kk = gg + "|"
        + ((o.material && o.material.color) ? o.material.color.getHexString() : "?")
        + "|" + [cc.x, cc.y, cc.z].map(function (x) {
            return Math.round(x * 100) / 100; }).join(",");
      if (mapaD[kk]) {
        mapaD[kk].n++;
        o.userData.montaje = mapaD[kk].d.pos;
        res.D++;
        res.porPos[o.userData.montaje] = (res.porPos[o.userData.montaje] || 0) + 1;
        return;
      }
      /*  ── REGLA C · DE QUE GRUPO CUELGA ───────────────────────
          El origen manda sobre la vecindad. Un tubo de dos metros pasa cerca de
          todo: el azul del agua salada tenia un extremo junto al interruptor de
          baterias y otro junto a una biela, **y la vecindad daba una respuesta
          falsa**. Colgar de `groups.ref` no.                                   */
      var deGrupo = null;
      for (var gp = o; gp; gp = gp.parent) {
        if (gp.name && gp.name.indexOf("sys:") === 0) { deGrupo = gp.name.slice(4); break; }
      }
      var propio = o.userData.sys || deGrupo || null;
      var g = o.geometry && o.geometry.type ? o.geometry.type.replace("Geometry","") : "?";
      var col = (o.material && o.material.color) ? o.material.color.getHexString() : "?";
      var ctr = new THREE.Vector3(); bb.getCenter(ctr);
      function anota(razon) {
        res.sin++;
        res.sinAdoptar.push({ geo: g, col: col, sys: propio, razon: razon,
          c: [Math.round(ctr.x*100)/100, Math.round(ctr.y*100)/100, Math.round(ctr.z*100)/100],
          aN: a.p ? a.p.n : null, aS: a.p ? a.p.s : null, aD: Math.round(a.d*100)/100,
          bN: z.p ? z.p.n : null, bS: z.p ? z.p.s : null, bD: Math.round(z.d*100)/100 });
      }
      /*  ── SI EL SISTEMA SE SABE, LA DISTANCIA SE MIDE CONTRA SU SISTEMA ──
          Aquí estaba el fallo, y era el criterio recién escrito incumplido una línea
          más abajo: **el origen dice QUÉ es una pieza y la distancia sólo dice
          CUÁNDO entra** — y entonces hay que medirla contra las piezas de su propio
          sistema, no contra todas.

          Se descartaba «por lejos» ANTES de usar el sistema para elegir candidatos.
          Le pasó a la manguera de escape mojado —`Tube` `#191d22`, con `sys:'ref'`
          desde la línea 1250—: su vecina más cercana era un soporte flexible a 1,09,
          que no es `ref`, y su vecina `ref` de verdad —el codo de mezcla, a 2,15—
          quedaba fuera del tope. **La descartaba su propio sistema por no mirarlo.**

          Y no afectaba sólo a ésa: afectaba a **todas las que pasaban por aquí**, que
          elegían extremos entre piezas de cualquier sistema.                     */
      /*  ── EL TOPE ERA PARA INFERIR, NO PARA VETAR ─────────────
          `CERCA` existe porque cuando el sistema **se adivina por los vecinos**, un
          vecino lejano no prueba nada: hay que exigir que los dos extremos toquen
          algo. Pero cuando el sistema **ya está declarado** —por `userData.sys` o por
          el grupo del que cuelga— no se está adivinando nada, y entonces la distancia
          sólo sirve para **ordenar**: cuál de las piezas de ese sistema entra más
          tarde. Vetar por distancia ahí es dejar fuera una pieza cuyo sistema no está
          en duda.

          Primero se hizo mal de dos maneras seguidas, y las dos medidas:

            1 · el tope se aplicaba contra **todas** las piezas, así que una malla
                podía caer por tener cerca algo de otro sistema. Le pasaba a la
                manguera de escape mojado, con `sys:'ref'` desde la línea 1250.
            2 · midiendo contra su propio sistema pero **manteniendo el tope**, el
                reparto perdió cuatro mallas y no recuperó ninguna: 109 → 105
                adoptadas por origen y 1 → 5 sin adoptar. Más correcto en principio
                y peor en la figura.

          Así que el tope se queda **sólo donde hace falta**: cuando el sistema se
          infiere.                                                                */
      if (propio) {
        //  el sistema no está en duda: se ordena con las piezas de ese sistema, y
        //  la distancia no veta.
        var aa = masCerca(bb.min, propio), zz = masCerca(bb.max, propio);
        if (!aa.p || !zz.p) { anota("sin piezas de su sistema"); return; }
        a = aa; z = zz;
      } else {
        //  el sistema se está infiriendo: los dos extremos tienen que TOCAR algo, y
        //  tienen que tocar lo mismo.
        if (!a.p || !z.p || a.d > CERCA || z.d > CERCA) { anota("lejos"); return; }
        if (!(a.p.s && a.p.s === z.p.s)) { anota("cruza"); return; }
      }
      var pa = posDe[a.p.n], pz = posDe[z.p.n];
      if (pa == null || pz == null) { anota("sin posicion"); return; }

      o.userData.montaje = Math.max(pa, pz);
      if (o.userData.sys) res.A++;
      else if (deGrupo && propio === deGrupo) res.C++;
      else res.B++;
      var sy = propio || a.p.s;
      res.porSys[sy] = (res.porSys[sy] || 0) + 1;
      res.porPos[o.userData.montaje] = (res.porPos[o.userData.montaje] || 0) + 1;
    });
    /*  y ninguna fila decidida puede quedarse sin casar, ni casar dos veces  */
    for (var k2 in mapaD) {
      if (mapaD[k2].n !== 1) {
        res.decididasSinCasar.push({ que: mapaD[k2].d.que, casa: mapaD[k2].n });
      }
    }
    ANIM.dirty=true; despierta();
    return res;
  },

  /*  ── verPiezas(lista) · EL MONTAJE FINO ────────────────────
      Enciende SOLO las piezas cuyo nombre esta en la lista, y apaga las demas. Sin
      lista, se quita el filtro y cada pieza vuelve a lo que era.

      POR QUE EXISTE. Las diecisiete posiciones del montaje se expresaban con los
      cuatro interruptores de sistema y daban **cuatro imagenes**: 0-3, 4-8, 9-14 y
      15-16 eran identicas. La fase 1 esta construida sobre que las piezas aparecen
      de una en una -«antes de que haya motor, hay un agujero»- y eso no sobrevive a
      un montaje grueso.

      NO ENCIENDE LO QUE NACIO APAGADO: `visBase` manda. Y una pieza sin nombre no la
      toca — la escenografia del compartimento no es pieza y no se apaga nunca.   */
  verPiezas: function (lista, pos) {
    var enc = null;
    if (lista) { enc = {}; for (var i = 0; i < lista.length; i++) enc[lista[i]] = true; }

    function enEscenario(o) {
      /*  LO QUE EL MONTAJE NO TOCA:
            · `bayGroup` — casco, espuma, bancadas y agua. El escenario.
            · `humoGroup` — los tres penachos. **No son fontaneria del motor**: son lo
              que sale por el escape cuando algo va mal, y los enciende la P3 con
              `setHumo()`. Si el montaje los apagara, `setHumo()` -que enciende el
              grupo, no las mallas- no volveria a mostrarlos nunca.                */
      for (var b = o; b; b = b.parent) {
        if (FUERA_DEL_MONTAJE[b.name]) return true;
      }
      return false;
    }
    /*  la base se captura una sola vez, en la primera llamada: las mallas sin nombre
        no pasan por el registro y no tienen `visBase`. Aqui la escena acaba de
        construirse y nada la ha tocado — burbujas, chorros y gotas siguen como
        nacieron.                                                              */
    function base(o) {
      if (o.userData.visBase === undefined) o.userData.visBase = o.visible !== false;
      return o.userData.visBase !== false;
    }

    /*  ── PASADA 1 · LO REGISTRADO OBEDECE A SU NOMBRE ──────────
        Y se recorre `parts`, no la escena, **porque una pieza registrada puede ser un
        `Group`**. La version anterior solo tocaba mallas y los grupos se quedaban
        encendidos para siempre: cuatro parejas de posiciones daban la misma imagen. */
    for (var k = 0; k < parts.length; k++) {
      var q = parts[k];
      if (enEscenario(q)) continue;
      var nom = q.userData && q.userData.name;
      q.visible = base(q) && (!enc || !nom || !!enc[nom]);
    }

    /*  ── PASADA 2 · LO QUE NO TIENE NOMBRE EN TODA SU CADENA ───
        La fontaneria suelta: 121 mallas colgando de la escena y 22 dentro de un grupo
        de sistema sin nombre propio. Mientras haya filtro se apagan, porque el
        montaje no puede decir en que paso entran. **Eso es deuda declarada**: son 60
        nodos padre y hay que darles posicion antes de construir la fase 2.       */
    scene.traverse(function (q) {
      if (!q.isMesh || enEscenario(q)) return;
      for (var w = q; w; w = w.parent) { if (w.userData && w.userData.name) return; }
      /*  ADOPTADA · `adopta()` le puso posicion, y entra cuando el montaje llega.
          SIN ADOPTAR · se queda apagada mientras haya filtro: cruza dos sistemas o
          esta lejos de todo, y eso lo decide Joel, no la cercania.              */
      var mo = q.userData.montaje;
      q.visible = base(q) && (!enc || (mo != null && pos != null && mo <= pos));
    });

    ANIM.dirty=true; despierta();
    return this;
  },

  /*  CUANTA MALLA SE VE, contando la fontaneria adoptada. `visibles()` cuenta
      piezas con nombre y no veria si los tubos aparecen o no.               */
  mallasVisibles: function () {
    var n = 0;
    scene.traverse(function (q) { if (q.isMesh && seVeDeVerdad(q)) n++; });
    return n;
  },

  /*  y el censo de lo que SE VE ahora mismo, que es como se comprueba que las
      diecisiete posiciones dan diecisiete imagenes distintas.                  */
  visibles: function () {
    var out = [];
    for (var k = 0; k < parts.length; k++) {
      var q = parts[k];
      if (q.userData && q.userData.name && seVeDeVerdad(q)) out.push(q.userData.name);
    }
    out.sort();
    return out;
  },

  verSistemas: function (o) {
    for (var k in o) if (sysState.hasOwnProperty(k)) sysState[k] = !!o[k];
    refreshSys();
    return this;
  },

  despiece: function (v) {
    exT = Math.max(0, Math.min(1, v));
    applyExplode(); if (typeof syncBay === "function") syncBay();
    return this;
  },

  corte: function (v) {
    cutT = Math.max(0, Math.min(1, v));
    applyCut();
    return this;
  },

  enfocar: function (nombre, animar, cerca) {
    /*  `enfocar(null)` NO QUITA NADA, Y NO LO DECIA. Llamaba a `clearFocus`, que no
        existe en este fichero, con un `typeof` delante: la promesa de la cabecera se
        cumplia devolviendo `this` y no haciendo nada. Ahora lo dice: para volver al
        encuadre entero se llama a `verCamara`, que es quien lo pone.            */
    if (nombre == null) return false;
    /*  UNA PIEZA QUE NO ESTA NO PUEDE SER UN ENCUADRE QUE NO PASA NADA. La version
        anterior recorria las piezas, no encontraba el nombre y devolvia `this` en
        silencio: la pantalla salia con el encuadre de la anterior y nada lo decia.
        Ahora se devuelve si se enfoco, y quien llama puede exigirlo.            */
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].userData && parts[i].userData.name === nombre) {
        if (typeof focusOn === "function") focusOn(parts[i], animar, cerca);
        else if (typeof spotOn === "function") spotOn(parts[i]);
        despierta();
        return true;
      }
    }
    return false;
  },

  alSeleccionar: function (fn) { API_ganchos.pick = fn; return this; },

  /*  EL PERDON DEL DEDO, en pixeles de pantalla. Existe para poder MEDIRLO: cuanto
      blanco gana cada pieza con cada radio se barre pinchando, no se estima.  */
  tolerancia: function (px) {
    TOLERANCIA = Math.max(0, px || 0); _haceAnillos(TOLERANCIA); return this;
  },

  /*  EL ANGULO · lo que sustituye a la barra de tiempos y al boton de marcha.  */
  /*  ── LA CAMARA, POR SU NOMBRE ─────────────────────────────
      Los seis preajustes ya existian y solo los alcanzaban los botones del panel
      viejo. Una pantalla que necesita VER DENTRO necesita pedir la camara que lo
      ve: el corte quita la mitad de z negativa, asi que desde el encuadre por
      defecto el motor se sigue viendo cerrado — y eso, en la fase 2, es una
      pantalla que no ensena nada.

      **Esto es la fontaneria; QUE camara usa cada pantalla es del temario.**    */
  verCamara: function (nombre, animar) {
    if (!PRESETS[nombre]) return this;
    animateCam(PRESETS[nombre], animar === false ? false : true);
    despierta();
    return this;
  },

  /*  ══ EL MOTOR EN MARCHA ═══════════════════════════════════════════════════
      POR QUE EXISTE, y no es un mando mas. `INTER.jets` son cinco chorros animados
      en la salida del espejo —el agua saliendo con el escape—, y obedecen a
      `ANIM.run`. **Ninguna funcion publica ponia `ANIM.run`**: lo hacia el boton
      `tgRun` del capitulo viejo, que se quedo alli en la extraccion, y `verAngulo`
      ademas lo apaga a proposito. Asi que la comprobacion mas importante que hay en
      un barco estaba modelada y **era inalcanzable desde una pantalla**.

      LA PANTALLA QUE LO NECESITA ES `6.5`, y su leccion es mirar el escape. Es la
      unica del modulo donde la figura **demuestra** la leccion en vez de ilustrarla:
      se ve el agua salir, y se ve no salir.

      ── Y EL CONFLICTO CON `verAngulo`, MEDIDO Y DECIDIDO ────────────
      `verAngulo` pone `ANIM.run = false` porque su trabajo es **posar** el motor en
      un angulo, y un motor girando no esta en ningun angulo. Asi que las dos cosas
      son excluyentes por naturaleza y **gana la ultima que se llame**, que es
      silencioso. No se arregla aqui —cambiar `verAngulo` romperia la fase 2— sino
      donde se puede parar: **el generador no deja que una pantalla declare `angulo`
      y `marcha` a la vez.**

      EL BUCLE SE QUEDA VIVO mientras el motor gira, que es lo que `sigueVivo()`
      promete. En un telefono eso gasta bateria, y es el precio de la pantalla: la
      unica del modulo que lo paga.                                                */
  enMarcha: function (v, segundos) {
    if (typeof setRun !== "function") {
      falta("setRun", "es lo que arranca el motor, y sin el no hay chorros");
      return this;
    }
    /*  ── SE VACIA EL RELOJ ANTES DE EMPEZAR A CONTAR ───────────────
        `clock.getDelta()` devuelve **todo lo que ha pasado desde la ultima vez que
        se le pregunto**, y el bucle se para cuando no hay nada que mover. Asi que el
        primer fotograma despues de arrancar puede traer un `dt` de segundos —el rato
        que la figura llevaba quieta— y **gastar la cuenta entera de una vez**.

        MEDIDO, y es como se encontro: en el arnes el bucle corre **un solo
        fotograma**, y con un limite de 0,05 s el motor se paraba en unas pasadas y
        no en otras. No era el arnes: era que la cuenta se decidia con un `dt` que no
        tiene nada que ver con lo que el alumno ha visto. En un navegador de verdad
        pasa lo mismo al volver de una pestaña en segundo plano.

        Una llamada de descarte, y la cuenta empieza en cero.                      */
    if (v && typeof clock !== "undefined" && clock.getDelta) clock.getDelta();
    setRun(!!v);
    /*  ── SE MUESTRA Y SE DETIENE, COMO EL HUMO Y LAS BURBUJAS ──────
        La regla del modulo ya estaba escrita para las otras dos animaciones y esta
        tenia que cumplirla: **el agua tiene que verse salir, no tiene que estar
        saliendo diez minutos mientras el alumno lee.** Mientras `ANIM.run` es cierto
        el bucle de dibujo no para —`hayQueMover()` lo dice— y eso es bateria de
        telefono, que es por lo que el bucle se paro en su dia.

        SEIS SEGUNDOS. El humo dura 2,6 y aqui no bastan: un chorro tarda ~1,1 s en
        recorrer su arco, asi que 2,6 son dos pasadas y se lee como un parpadeo. Con
        seis son cinco pasadas —se lee como lo que es, escupiendo y pulsando— y se
        acaba antes de que el alumno termine el primer parrafo.

        `segundos = 0` deja el motor girando sin limite. No lo usa ninguna pantalla:
        esta para que un arnes pueda medir el estado sostenido.                    */
    ANIM.marchaResta = (!v) ? 0
      : (segundos == null ? 6 : (segundos > 0 ? segundos : Infinity));
    return this;
  },

  /*  SI ESTA GIRANDO · para que el arnes pueda comprobar el efecto y no la llamada. */
  marcha: function () { return !!(typeof ANIM !== "undefined" && ANIM && ANIM.run); },
  /*  ══ LA PUERTA DE LOS GESTOS ═══════════════════════════════════════════════
      POR QUE EXISTE, y es la misma historia que `enMarcha` multiplicada por ocho.
      **La geometria del taller esta construida desde antes de que se escribiera el
      temario** — la varilla con su pelicula de aceite, la tapa y la cesta del filtro
      con su suciedad dentro, la tapa de bronce, el rodete con sus palas una a una, la
      correa que se hunde al presionarla, las burbujas del purgado con dos estados, las
      gotas del prensaestopas—. **Y nada de eso era alcanzable desde fuera:** `INTER`
      vive dentro de esta funcion, y la API no lo tocaba.

      MEDIDO el 1 de septiembre de 2026, yendo a fotografiar la varilla fuera:
      `ReferenceError: INTER is not defined`. La maquina del taller estaba hecha y no
      habia puerta.

      ── Y POR QUE LA P2 NO SE PODIA CONSTRUIR SIN ESTO ────────────
      La regla de esa parte es de Joel y es una sola: **cada taller es una secuencia y
      se hace con las manos; si un paso no exige tocar algo, sobra.** Una P2 sin gestos
      no es una P2 mas pobre — es renunciar a la parte.

      ── LA FORMA ────────────────────────────────────────────────
      `gesto(que, como)` y `gestos()` para leer. Un gesto que no existe **deja
      constancia con `falta()`** en vez de callarse: un taller que pide `tapa-filtor`
      con una errata saldria bien montado, con la tapa puesta, y nadie sabria por que.
      Es la caida silenciosa que se llevo `onPick` y `JOURNEY`.

      LOS GESTOS SON DE ESTADO, NO DE ANIMACION: `gesto("cesta", "fuera")` deja la
      cesta fuera hasta que alguien diga lo contrario. Un taller es una secuencia de
      estados, y el alumno llega a cada paso con lo que hizo en el anterior.       */
  gesto: function (que, como) {
    var g = GESTOS[que];
    if (!g) {
      falta("gesto." + que, "los gestos son: " + Object.keys(GESTOS).join(", "));
      return this;
    }
    if (g.estados.indexOf(como) < 0) {
      falta("gesto." + que + "=" + como,
            "`" + que + "` admite: " + g.estados.join(", "));
      return this;
    }
    g.pon(como);
    ESTADO_GESTOS[que] = como;
    ANIM.dirty = true; despierta();
    return this;
  },

  /*  TODO A SU REPOSO · lo pide `MTaller` cada vez que repinta un paso, para que
      retroceder en un taller no deje puesto lo que hizo un paso posterior. **Es el
      primer estado de cada gesto**, que por eso se declara primero en su lista.     */
  reposo: function () {
    for (var k in GESTOS) {
      GESTOS[k].pon(GESTOS[k].estados[0]);
      ESTADO_GESTOS[k] = GESTOS[k].estados[0];
    }
    ANIM.dirty = true; despierta();
    return this;
  },

  /*  COMO ESTA CADA GESTO AHORA · el arnes comprueba el efecto, y esto le dice al
      menos que pedir. **Que un gesto diga «fuera» no prueba que se vea fuera**, y por
      eso el guardia ademas cuenta pixeles.                                        */
  gestos: function () {
    var o = {};
    for (var k in GESTOS) o[k] = ESTADO_GESTOS[k] || GESTOS[k].estados[0];
    return o;
  },

  /*  CUANTO LE QUEDA DE MARCHA, EN SEGUNDOS · `Infinity` si no tiene limite y 0 si
      esta parado. Existe por una razon concreta y medida: **bajo el arnes el bucle de
      dibujo corre un solo fotograma**, asi que el vencimiento del contador cae del
      lado que caiga y no se puede cronometrar desde fuera. Lo que si se puede
      comprobar sin depender de ningun fotograma es que **el presupuesto se pone
      bien**, que es la mitad del mecanismo que un arnes alcanza.                  */
  restaMarcha: function () {
    if (typeof ANIM === "undefined" || !ANIM) return null;
    return ANIM.marchaResta == null ? 0 : ANIM.marchaResta;
  },

  /*  ══ LOS TESTIGOS DEL PANEL ═══════════════════════════════════════════════
      `cual` es 'oil', 'temp' o 'charge'. Encender es subir `emissiveIntensity`, no
      cambiar de malla — por eso esto no cuesta geometria.

      **NO SE ENCIENDE UN TESTIGO QUE NO EXISTE EN SILENCIO.** Un nombre mal escrito
      seria la caida callada de siempre: la pantalla saldria bien montada, con su luz
      apagada, y nadie sabria por que. Se deja constancia con `falta()`.          */
  verTestigo: function (cual, on) {
    var P = (typeof INTER !== "undefined") && INTER.panel;
    if (!P || !P.luces) {
      falta("INTER.panel", "es el panel del mamparo, y sin el no hay testigos");
      return this;
    }
    var lz = P.luces[cual];
    if (!lz) {
      falta("INTER.panel.luces." + cual,
            "los testigos son 'oil', 'temp' y 'charge'");
      return this;
    }
    lz.material.emissiveIntensity = on ? 1.6 : 0;
    ANIM.dirty = true; despierta();
    return this;
  },

  /*  LA AGUJA · `frac` de 0 a 1, de frio a la zona roja. Es un giro del grupo, asi
      que la malla no se toca. Fuera de rango se recorta en vez de dar la vuelta.  */
  verAguja: function (frac) {
    var P = (typeof INTER !== "undefined") && INTER.panel;
    if (!P || !P.aguja) {
      falta("INTER.panel.aguja", "es la aguja de temperatura del panel");
      return this;
    }
    var f = Math.max(0, Math.min(1, frac || 0));
    //  240 grados de recorrido, como un instrumento de verdad, centrados abajo
    P.aguja.rotation.x = (2.09 - f * 4.19);
    ANIM.dirty = true; despierta();
    return this;
  },

  /*  LO QUE EL PANEL ESTA DICIENDO AHORA · el arnes comprueba el efecto, no la
      llamada: dos numeros distintos no prueban que una luz se lea encendida, pero
      sin esto no se puede ni empezar a preguntar.                                */
  panel: function () {
    var P = (typeof INTER !== "undefined") && INTER.panel;
    if (!P || !P.luces) return null;
    var o = {aguja: P.aguja ? P.aguja.rotation.x : null, luces: {}};
    for (var k in P.luces) o.luces[k] = P.luces[k].material.emissiveIntensity > 0;
    return o;
  },

  verAngulo: function (grados) {
    ANIM.run = false;
    ANIM.theta = (((grados % 720) + 720) % 720) * Math.PI / 180;
    ANIM.dirty=true;
    /*  POSA AL MOMENTO, no en el siguiente fotograma. `updateEngine` vive dentro de
        `tick`, asi que antes habia que esperar a que pintara — y desde que el bucle
        se para cuando no hay nada que mover, **ese fotograma puede no llegar**: bajo
        tiempo virtual el reloj salta al siguiente temporizador sin producir uno.
        Y es mejor contrato: quien pide un angulo lo tiene puesto al volver.     */
    updateEngine(0); despierta();
    return this;
  },

  /*  EL RECORRIDO · lo que la fase 3 conduce. `t` va de 0 a 1 por el circuito.  */
  /*  ── CONDUCIR EL RECORRIDO ────────────────────────────────────
      LA VERSION ANTERIOR NO HACIA NADA, y de tres maneras a la vez: llamaba a
      `setFlow(clave, t)` cuando `setFlow(v)` toma UN argumento booleano —asi que `t` se
      perdia ahi mismo—, `setFlow` llamaba a `buildFlows()`, y `buildFlows` regresaba en
      silencio porque `JOURNEY` no estaba. Medido: cero pixeles de diferencia entre
      `t=0` y `t=0,25`, y 218 mallas visibles con recorrido y 218 sin el.

      Y ADEMAS `setFlow` NO ERA LO QUE HACIA FALTA. Enciende el circuito ENTERO, con sus
      puntos dando vueltas sin parar. Lo que una pantalla necesita es **ir por el
      recorrido paso a paso**, que es lo que hace `setLeg`: dibuja UN tramo. `t` elige
      cual, que es exactamente lo que significa conducir el recorrido.                */
  verRecorrido: function (clave, t) {
    var J = (typeof JOURNEY !== "undefined") && JOURNEY[clave];
    if (!J) {
      falta("JOURNEY." + clave, "es el recorrido que esta pantalla conduce");
      return this;
    }
    var pasos = J.steps || [];
    if (!pasos.length) {
      falta("JOURNEY." + clave + ".steps", "un recorrido sin tramos no se puede recorrer");
      return this;
    }
    var x = Math.max(0, Math.min(1, t || 0));
    //  `t` reparte los tramos por igual: con seis pasos, 0 es el primero y 1 el ultimo
    var i = Math.min(pasos.length - 1, Math.floor(x * pasos.length));
    var p = pasos[i];
    if (typeof setLeg === "function") setLeg(p.leg || [], J.color);
    recorridoActual = { clave: clave, t: x, paso: i, de: pasos.length, nombre: p.n };
    despierta();
    return this;
  },

  /*  QUE TRAMO SE ESTA ENSENANDO. Lo pide el mando para su rotulo y el arnes para
      comprobar que `t` mueve algo — sin esto, «lo he puesto» y «se ve» vuelven a ser
      la misma frase, que es como empezo todo esto.                                 */
  recorrido: function () { return recorridoActual; },

  /*  UN ORDEN QUE LA FIGURA CONOCE, EN SU ORDEN · para que una pantalla que manda
      ordenar se pueda comprobar contra el dato en vez de contra lo que escribio quien
      la escribio. **El veredicto lo da el motor, no la pantalla.**

      Dos clases de orden, y las dos viven aqui:
        · los CIRCUITOS, cuyos pasos estan en `JOURNEY`
        · el ORDEN DE ENCENDIDO, que sale de `ANIM.ORDER` — el desfase de cada cilindro
          en el ciclo de 720 grados. El que menos desfase tiene enciende primero, y de
          ahi sale 1-3-4-2 sin que nadie lo escriba a mano en ninguna parte.        */
  ordenDe: function (clave) {
    if (clave === "encendido") {
      if (!ANIM || !ANIM.ORDER) {
        falta("ANIM.ORDER", "es el desfase de cada cilindro, y de ahi sale el encendido");
        return null;
      }
      var cil = ANIM.ORDER.map(function (grados, i) {
        return { n: "Cylinder " + (i + 1), grados: grados };
      });
      cil.sort(function (a, b) { return a.grados - b.grados; });
      return cil.map(function (c) { return { n: c.n }; });
    }
    var J = (typeof JOURNEY !== "undefined") && JOURNEY[clave];
    if (!J) { falta("JOURNEY." + clave, "hace falta para comprobar un orden"); return null; }
    return (J.steps || []).map(function (p) { return { n: p.n }; });
  },

  /*  LO QUE LA FIGURA ECHA EN FALTA. Vacio es lo sano; cualquier cosa aqui significa
      que la extraccion se dejo algo y que una parte de la figura no funciona.      */
  /*  ══ EL HUMO, DESDE UNA PANTALLA ═════════════════════════════════
      `setHumo()` existía desde que se modelaron los tres penachos y **era interna**:
      la geometría estaba hecha, probada por `walk-humo` y medida a 375 px, y no había
      manera de pedirla desde un capítulo. *Es el mismo caso que `enMarcha` y que los
      gestos del taller: la máquina construida y sin manija*, y van tres.

      `9.3` la pide para dejar elegir color, y `9.4` para el mapa. `verHumo(null)` apaga.

      **Devuelve si lo hizo, y no `this`.** Un color que no existe tiene que poder
      exigirse: la versión de `enfocar` que devolvía `this` en silencio dejó pantallas
      saliendo con el encuadre de la anterior y nada lo decía.                      */
  verHumo: function (color) {
    if (typeof setHumo !== "function") {
      falta("setHumo", "es lo que enciende los tres penachos; sin el no hay humo");
      return false;
    }
    if (color == null) { setHumo(null); return true; }
    if (!HUMOS[color]) {
      falta("humo:" + color, "se pidio un humo que no existe — son `blue`, `black` y `white`");
      return false;
    }
    setHumo(color);
    return true;
  },

  /*  QUÉ HUMO HAY PUESTO · para el arnés y para una pantalla que quiera saberlo.  */
  humo: function () { return humo.color; },

  /*  LOS TRES QUE HAY, dichos por la figura y no escritos en el arnés. Lo que se
      escribe a mano se queda viejo callando, y eso ya costó siete instrumentos.  */
  humos: function () { return Object.keys(HUMOS); },

  /*  ══ MARCAR VARIAS PIEZAS A LA VEZ ═══════════════════════════════
      Lo único genuinamente nuevo de la P3. `enfocar` señala UNA y le mueve la cámara
      encima; esto marca un conjunto **sin tocar la cámara**, cada uno de su color y con
      su letra si la lleva.

          F.verResaltadas([{pieza: "Air filter", color: 0xff8c1a, letra: "B"}, …])

      `color` es opcional —por defecto el ámbar del señalador— y `letra` también.
      `verResaltadas([])` o `sinResaltar()` las quita.

      **El color no se elige a ojo:** teñir la pieza no separa tres colores y marcar con
      aro opaco sí, y las dos cosas están medidas en `mide-resalte.js`. Lo que la
      pantalla pasa aquí son colores saturados.

      Devuelve **cuántas marcó**, que no tiene por qué ser cuántas se le pidieron: una
      pieza que no existe se anota en `queFalta` y no se marca. Quien llama puede
      exigir el número.                                                            */
  verResaltadas: function (lista) {
    if (!lista || !lista.length) { sinMarcas(); return 0; }
    /*  se admite una lista de nombres pelados, que es lo que quiere `9.6`: un solo
        grupo, un solo color, sin letras  */
    var L = lista.map(function (x) {
      return typeof x === "string" ? { pieza: x } : x; });
    ponMarcas(L);
    return MARCAS.length;
  },

  sinResaltar: function () { sinMarcas(); return this; },

  /*  QUÉ HAY MARCADO · el arnés lo necesita para comprobar que una pantalla marca lo
      que dice marcar, y en qué color.  */
  resaltadas: function () {
    return MARCAS.map(function (m) {
      return { pieza: m.pieza, color: m.hex, letra: m.letra,
               puesta: !!m.mesh.visible }; });
  },

  queFalta: function () { return LO_QUE_FALTA.slice(); },

  /*  QUE HACE CADA CILINDRO AHORA · para que la pantalla lo pinte, no la figura.  */
  estado: function () {
    var g = ANIM.theta * 180 / Math.PI, out = [];
    for (var c = 0; c < 4; c++) {
      out.push(typeof strokeOf === "function"
        ? ["power", "exhaust", "intake", "compression"][strokeOf(c, g)] : null);
    }
    /*  EL CORTE VIAJA CON EL ESTADO. Sin el no habia forma de comprobar que una
        foto del ciclo ensena el interior: cuatro capturas de un motor CERRADO
        pasan todas las comprobaciones que no miran dentro.                   */
    return { angulo: g, cilindros: out, corte: Math.round(cutT * 100) / 100 };
  },

  /*  EL CENSO · existe para el arnes, y por eso devuelve lo que el arnes cuenta.  */
  censo: function () {
    var porSis = {}, mallas = 0;
    scene.traverse(function (o) { if (o.isMesh) mallas++; });
    for (var i = 0; i < parts.length; i++) {
      var sis = parts[i].userData && parts[i].userData.sys;
      if (sis) porSis[sis] = (porSis[sis] || 0) + 1;
    }
    /*  LO PINCHABLE, que es distinto de lo registrado. Una pieza con `noPick`
        cuenta en `parts` y no en `pickables`, y entonces el alumno la ve y no
        la puede señalar. **Seis preguntas y dos talleres dependen de esto.**  */
    var pick = pickables.map(function (m) {
      return m.userData && m.userData.name; }).filter(Boolean);
    return {
      piezas: parts.length, mallas: mallas, porSistema: porSis,
      pinchables: pick.length, nombresPinchables: pick.sort(),
      nombres: parts.map(function (p) { return p.userData && p.userData.name; })
                    .filter(Boolean)
    };
  }
};

})(typeof window !== "undefined" ? window : this);
