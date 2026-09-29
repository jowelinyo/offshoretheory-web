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

/*  `preserveDrawingBuffer` NO ES UN CAPRICHO DE RENDIMIENTO: ES LO QUE PERMITE
    MEDIR.  Sin el, leer el lienzo desde fuera --- `canvas.toDataURL()` --- devuelve
    el bufer vacio, y `Page.captureScreenshot` devuelve el ultimo cuadro que compuso
    el navegador, que no se invalida porque una malla se esconda.
        Medido, y por eso esta aqui: escondiendo 260 de las 267 mallas, `mallasVisibles()`
    bajaba de 267 a 7 y **las dos capturas salian byte a byte identicas**. Un guardia
    que mira asi da verde a cualquier cosa.
    Cuesta un poco de memoria de video y no se nota; lo otro se nota el dia que un
    arnes aprueba una pantalla vacia.                                              */
var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true,
  preserveDrawingBuffer:true, powerPreference:'high-performance'});
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
  }catch(e){ /* si PMREM no esta disponible, el modelo se ve igualmente con las luces */ }
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
/*  REGISTRAR SIN MOVER · para lo que no puede salir de donde esta.
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

/* ---------- LA FIGURA: YA NO SE CONSTRUYE, SE CARGA ----------
    ═══════════════════════════════════════════════════════════════════════════
    QUE HABIA AQUI Y QUE HAY AHORA

    Aqui vivian 1 413 lineas --- de la 510 a la 1922 --- que construian el motor
    pieza a pieza con cilindros, cajas y esferas: bloque, ciguenal, culata, frente,
    colectores, refrigeracion, combustible, purga, lubricacion, escape humedo,
    electrico, descompresores, transmision, detalles, y el compartimento. **El 63 %
    del fichero.**  Ahora la figura viene de `assets/modelo/motor.glb`, hecha en
    Blender, y esto es lo que la trae y la enchufa a todo lo que ya habia.

    **LO QUE NO CAMBIA, Y ES LO IMPORTANTE:** al acabar, `parts`, `pickables`,
    `cutMeshes`, `NUMS`, `groups` y `ANIM` quedan exactamente como los dejaba el
    codigo de antes, con los mismos nombres y la misma metadata.  Todo lo que viene
    despues --- el raton, el corte, el despiece, las camaras, los numeros, los
    gestos, la API entera --- no se entera de que la figura ha cambiado de origen.

    **LO QUE SI CAMBIA, Y HAY QUE DECIRLO:** cargar un fichero es ASINCRONO y
    construir no lo era.  El arranque de este fichero pasa a esperar, y `montar()`
    funciona igual se le llame antes o despues de que la figura llegue.

    **Y EL CAPITULO NECESITA SERVIDOR.** Una pagina abierta con doble clic tiene
    origen `null` y el navegador NO le deja leer otro fichero del disco: el `.glb`
    no llegaria. En `offshoretheory.com` no pasa; en local, `VER-EL-CURSO.cmd`.
    ═══════════════════════════════════════════════════════════════════════════ */

/*  ── EL MODELO LLEVA SU sha256 EN EL NOMBRE ──────────────────────────────────
    `motor.<sha8>.glb`, como la lamina de Skelmar --- `skelmar.f4c88793.svg` ---, y
    por las dos razones que ya estan medidas en esta casa:

    LA CACHE. Los capitulos son `chapters/*.html` y el modelo `assets/modelo/...`:
    publicar un modelo nuevo con el mismo nombre deja a los alumnos con el viejo en
    la cache y una figura que no casa con su capitulo. Con el sha en el nombre eso
    no puede pasar --- el nombre cambia con el contenido ---.

    Y LA INTEGRIDAD. Es la unica forma de comprobar, DESDE FUERA y sin manifiesto,
    que lo publicado es lo aprobado: **se hashea el fichero y tiene que dar su
    propio nombre**. Lo comprueba `c31_comun.py` en cada construccion.

    Pide ademas `*.glb -text` en `.gitattributes`: `autocrlf` en un clon convertiria
    el fichero y dejaria de casar con su nombre. Es el mismo fallo que ya se pago
    dos veces esta semana --- en el `.cmd` y en el `git show` de este fichero ---.

    **ESTE ES EL UNICO SITIO DONDE EL SHA SE ESCRIBE A MANO.** Los arneses y el
    generador lo encuentran por patron: un sha en cinco sitios se queda viejo en
    cuatro el dia que se reexporte el modelo.                                    */
var FIGURA = { glb: "../assets/modelo/motor.a4a011cd.glb",
               hdr: "../assets/modelo/estudio.hdr" };

/*  LA METADATA DE LAS 108 PIEZAS --- nombre, sistema, direccion de despiece, si se
    corta, si se pincha, su numero, su descripcion y su nota de patron --- **no se
    ha perdido ni una palabra**: vive en `motor-datos.js`, sacada de este mismo
    fichero ejecutandolo, no leyendolo, porque los nombres de los pistones y los
    inyectores se calculan en un bucle y una expresion regular los habria fallado
    justo a ellos.                                                               */
var DATOS = (typeof raiz !== "undefined" && raiz.MOTOR_DATOS) || null;
var META = {};
(function(){
  if (!DATOS || !DATOS.piezas) return;
  for (var i = 0; i < DATOS.piezas.length; i++){
    var p = DATOS.piezas[i];
    if (p.name && !META[p.name]) META[p.name] = p;
  }
})();

/*  DE LOS SISTEMAS DE BLENDER A LOS CUATRO DE LA CASA.  El modelo nuevo distingue
    siete circuitos porque los enseña por separado; el curso agrupa en cuatro, que
    son los que colorean el indice y los que `verSistemas` enciende.  Cuando la
    pieza ya tiene sistema en la metadata de antes MANDA AQUELLA, para que
    `censo().porSistema` siga dando lo mismo.                                     */
var SIS_BLENDER = { aire:"com", gasoil:"com", aceite:"com", electrico:"com",
                    refrigeracion:"ref", gira:"tra", sujeta:"est" };

/*  EL CONTRATO CON LA FIGURA DE ANTES, Y POR QUE ES UNA CAJA Y NO UN NUMERO.
    El modelo de Blender esta en METROS --- el motor mide 2,34 m con el eje --- y
    esta escena trabaja en sus propias unidades, donde el bloque mide 7,42 de largo.
    Un factor escrito a mano envejeceria en cuanto el modelo cambiara de tamaño, asi
    que **se mide el bloque de la figura nueva al cargarla y se ajusta solo** contra
    esta caja, que es la que ocupaba el bloque de antes. Medido ejecutando el motor
    de hoy, no copiado de ningun sitio.                                           */
var BLOQUE_DE_ANTES = { min: { x: -3.71, y: -1.48, z: -1.18 },
                        max: { x:  3.71, y:  1.37, z:  1.18 } };

/*  EL ESCENARIO, QUE NO ES EL MOTOR Y NO SE APAGA NUNCA.
    `bayGroup` se declaraba dentro de las 1 413 lineas que se fueron, y sin el
    pasaban dos cosas: `syncBay()` reventaba al despiezar, y --- lo que se vio
    primero --- **la primera pantalla salia en negro**. Esa pantalla enseña el
    compartimento vacio, antes de que haya motor, y `verPiezas` apaga todo lo que
    no este en su lista... menos lo que cuelga de un grupo de `FUERA_DEL_MONTAJE`.
    La bañera del modelo nuevo --- el forro y las bancadas --- tiene que colgar de
    aqui por la misma razon por la que colgaba la de antes: la posicion 0 del
    montaje es un hueco vacio, no una pantalla negra.                            */
var bayGroup = new THREE.Group(); bayGroup.name = "bayGroup"; scene.add(bayGroup);
var gridGroup = new THREE.Group(); gridGroup.name = "gridGroup"; scene.add(gridGroup);
var ESCENARIO = { "Bilge": 1, "Structure": 1 };

//  lo pone `Motor3D.quieto(true)`, y solo lo usa quien mide --- la nota larga
//  esta arriba, en `quieto`.
var QUIETO = false;

var figuraLista = false, colaDeLaFigura = [], figuraRota = null;

/*  ── QUIEN ESPERA A LA FIGURA DESDE FUERA ────────────────────────────────────
    `cuandoLaFigura()` es de aqui dentro y solo dispara si la figura MONTA.  Para
    quien espera desde el capitulo eso no basta: si el `.glb` no llega, quedarse
    callado deja al alumno mirando <Building the engine...> para siempre.  Esta
    cola se vacia en los dos casos y dice cual --- `fn(true)` si monto, `fn(false)`
    si no ---.
    *Un aviso que solo llega cuando todo va bien no es un aviso, es una casualidad.*
*/
var colaDeFuera = [];
function avisaDeLaFigura(){
  var l = colaDeFuera; colaDeFuera = [];
  for (var i = 0; i < l.length; i++){
    try { l[i](!figuraRota); } catch(e){ console.error(e); }
  }
}
/*  CUANTAS UNIDADES DE ESTA ESCENA MIDE UN METRO DEL MODELO.  Hace falta
    fuera del cargador: `applyValve()` mueve en unidades del curso y las
    valvulas viven dentro de un envoltorio escalado.                     */
var ESCALA_FIGURA = 1;
function cuandoLaFigura(f){ if (figuraLista) f(); else colaDeLaFigura.push(f); }

/*  LAS ETIQUETAS VIAJAN EN EL NODO, NO EN LA MALLA.  Una pieza con varios
    materiales se exporta como UN nodo con VARIAS primitivas, y el cargador la
    reconstruye como un `Group` con `Mesh` dentro: las `extras` se quedan arriba.  */
function extra(o, clave){
  for (var n = o; n; n = n.parent){
    if (n.userData && n.userData[clave] !== undefined) return n.userData[clave];
  }
  return undefined;
}

/*  ── LOS GESTOS, QUE CAMBIAN DE NATURALEZA ────────────────────────────────────
    Antes cada uno de los 18 MOVIA una malla con coordenadas escritas a mano.  En
    el modelo nuevo **cada estado esta construido como geometria aparte** --- la
    varilla dentro, fuera y limpia son tres varillas --- y el gesto solo enciende
    una y apaga las otras.  Se ve igual y se dice mucho mas facil.
    Y una pieza puede depender de VARIOS gestos a la vez: el rotor de la bomba
    depende de si esta dentro o fuera **y** de si le faltan palas, asi que las dos
    claves viajan separadas por comas y tienen que coincidir las dos.            */
var NODOS_GESTO = [];
function casaElGesto(o){
  var g = o.userData.gesto;
  if (g === undefined) return true;
  var gg = String(g).split(","), ee = String(o.userData.estado).split(",");
  for (var i = 0; i < gg.length; i++){
    var puesto = ESTADO_GESTOS[gg[i]];
    if (puesto === undefined) puesto = (GESTOS[gg[i]] && GESTOS[gg[i]].estados[0]);
    if (puesto !== ee[i]) return false;
  }
  return true;
}
function refrescaGestos(){
  for (var i = 0; i < NODOS_GESTO.length; i++){
    var o = NODOS_GESTO[i];
    var v = casaElGesto(o);
    o.visible = v;
    /*  `visBase` ES LO QUE EL MONTAJE PROGRESIVO RESPETA: una pieza que nace
        apagada no se puede encender sin inventarse un estado. Al cambiar de gesto
        hay que actualizarlo, o `verPiezas` volveria a encender el estado viejo. */
    o.userData.visBase = v;
  }
}

/*  ── QUE SE SECCIONA ──────────────────────────────────────────────────────────
    La lista blanca de once nombres que habia en `rebuildCut()` se queda sin
    trabajo: **cada pieza del modelo nuevo trae su propio `corta`**, puesto en
    Blender, y asi no hay dos listas que puedan discrepar el dia que se renombre
    una pieza. La regla es la misma: se corta lo que ENVUELVE y lo que se mueve se
    queda entero, que es lo unico que hace util un corte con el motor en marcha. */
function seCorta(nodo){
  var c = extra(nodo, "corta");
  if (c !== undefined) return !!c;
  var m = META[nodo.userData && nodo.userData.name];
  return !!(m && m.cut);
}

/*  ── Y AQUI SE ENCHUFA TODO ───────────────────────────────────────────────── */
function montaLaFigura(gltf){
  var traido = gltf.scene;

  /*  1 · LA ESCALA Y EL SITIO, medidos y no escritos.  Se busca el bloque en la
      figura nueva, se compara con la caja que ocupaba el de antes, y se ajusta.  */
  var bloque = null;
  traido.traverse(function(o){
    if (!bloque && o.userData && o.userData.pieza === "Engine block") bloque = o;
  });
  if (bloque){
    traido.updateWorldMatrix(true, true);
    var cb = new THREE.Box3().setFromObject(bloque);
    var tam = cb.getSize(new THREE.Vector3()), cen = cb.getCenter(new THREE.Vector3());
    var k = (BLOQUE_DE_ANTES.max.x - BLOQUE_DE_ANTES.min.x) / (tam.x || 1);
    traido.scale.setScalar(k);
    traido.updateWorldMatrix(true, true);
    traido.position.set(
      (BLOQUE_DE_ANTES.min.x + BLOQUE_DE_ANTES.max.x) / 2 - cen.x * k,
      (BLOQUE_DE_ANTES.min.y + BLOQUE_DE_ANTES.max.y) / 2 - cen.y * k,
      (BLOQUE_DE_ANTES.min.z + BLOQUE_DE_ANTES.max.z) / 2 - cen.z * k);
    traido.updateWorldMatrix(true, true);
  }
  /*  y se aplanan escala y posicion a los nodos, porque `reg()` guarda
      `userData.home = mesh.position.clone()` y el despiece parte de ahi: si la
      escala viviera en un padre que luego se descarta, el despiece saldria mal. */
  var raizTmp = new THREE.Group();
  raizTmp.copy(traido, false);

  /*  2 · UNA PIEZA POR NOMBRE **Y POR MOVIMIENTO**.
      Por nombre, porque eso es lo que `parts` promete y lo que `_pieza()` busca. Y
      por movimiento ademas, porque hay cuatro bielas que se llaman igual y cada una
      se mueve con su piston: agrupadas por nombre serian una sola y el motor giraria
      con una biela. *El motor de antes hacia lo mismo --- 108 piezas y 92 nombres ---
      asi que esto no es una licencia: es volver a lo que habia.*                  */
  var porClave = {}, orden = [];
  var hijos = traido.children.slice();
  for (var i = 0; i < hijos.length; i++){
    var nd = hijos[i];
    var nombre = nd.userData && nd.userData.pieza;
    if (!nombre) continue;
    var clave = nombre + "\u0000" + (nd.userData.mueve || "");
    if (!porClave[clave]){ porClave[clave] = { nombre: nombre, nodos: [],
                                               mueve: nd.userData.mueve || null };
                           orden.push(clave); }
    porClave[clave].nodos.push(nd);
    if (nd.userData.gesto !== undefined) NODOS_GESTO.push(nd);
  }

  var _v = new THREE.Vector3(), _caja3 = new THREE.Box3();
  ANIM.piezasAnimadas = {};

  for (var j = 0; j < orden.length; j++){
    var g = porClave[orden[j]], nom = g.nombre, nodos = g.nodos;
    var m = META[nom] || {};
    var sis = m.sys || SIS_BLENDER[nodos[0].userData.sistema] || "est";

    /*  CADA PIEZA, EN SU SITIO Y EN UNIDADES DEL CURSO.
        El envoltorio se coloca en el CENTRO de lo que envuelve --- medido, no
        supuesto --- y los nodos de dentro se corren lo mismo en sentido contrario.
        Con eso `userData.home` es el sitio de verdad de esa pieza y el despiece la
        separa de donde esta, no del origen.                                       */
    _caja3.makeEmpty();
    for (var q = 0; q < nodos.length; q++) _caja3.expandByObject(nodos[q]);
    var centro = _caja3.isEmpty() ? new THREE.Vector3() : _caja3.getCenter(_v.clone());

    var pieza = new THREE.Group();
    pieza.name = nom;
    pieza.scale.copy(traido.scale);
    pieza.position.copy(centro);
    var atras = centro.clone().sub(traido.position).divideScalar(traido.scale.x || 1);
    for (var q2 = 0; q2 < nodos.length; q2++){
      nodos[q2].position.sub(atras);
      pieza.add(nodos[q2]);
    }

    var meta = { name: nom,
                 ex: m.ex ? new THREE.Vector3(m.ex[0], m.ex[1], m.ex[2])
                          : new THREE.Vector3(0, 1, 0),
                 exMag: m.exMag != null ? m.exMag : 2.0,
                 noPick: !!m.noPick, noShadow: !!m.noShadow, noRecv: !!m.noRecv,
                 noExplodeAnim: !!m.noExplodeAnim };
    if (m.desc) meta.desc = m.desc;
    if (m.yacht) meta.yacht = m.yacht;
    if (ESCENARIO[nom]){
      bayGroup.add(pieza);
      regEnSitio(pieza, sis, meta);
    } else {
      reg(pieza, sis, meta);
    }
    if (seCorta(nodos[0])) markCut(pieza);
    if (m.n != null && !ANIM.piezasAnimadas[nom]) { num(m.n, nom, sis, pieza);
                                                    ANIM.piezasAnimadas[nom] = 1; }
    g.pieza = pieza;
    g.centro = centro;
  }

  /*  3 · LO QUE SE MUEVE, Y EN LAS UNIDADES EN QUE ESTA ESCENA SABE MOVERLO.
      Se anima EL ENVOLTORIO, que vive en unidades del curso, y no el nodo de dentro,
      que esta en metros dentro de un padre escalado. Y las cuentas de la
      biela-manivela salen del modelo --- `motor-datos.js`, las mismas con las que se
      construyo la figura --- convertidas a esta escala, no del motor de antes: sus
      constantes eran de otra geometria y el piston habria salido por la culata.   */
  var CIN = (DATOS && DATOS.cinematica) || null;
  var valvulas = {};
  for (var j2 = 0; j2 < orden.length; j2++){
    var gg = porClave[orden[j2]];
    if (!gg.mueve) continue;
    var dos = String(gg.mueve).split(":"), que = dos[0], val = dos[1], cual = dos[2];
    if (que === "ciguenal"){ ANIM.crank = gg.pieza; CRANK_Y = gg.centro.y; }
    else if (que === "piston") ANIM.pistons.push({ m: gg.pieza, c: +val, x: gg.centro.x });
    else if (que === "biela")  ANIM.rods.push({ m: gg.pieza, c: +val, x: gg.centro.x });
    else if (que === "gira")   ANIM.spin.push({ o: gg.pieza, r: parseFloat(val) || 1 });
    else if (que === "correa") INTER.belt = gg.pieza;
    else if (que === "marca")  (INTER.marcasCorrea = INTER.marcasCorrea || []).push(gg.pieza);
    else if (que === "valvula"){
      //  `valvula:<cilindro>:<in|ex>:<cabeza|vastago|muelle>`
      valvulas[val] = valvulas[val] || {};
      valvulas[val][cual] = valvulas[val][cual] || {};
      valvulas[val][cual][dos[3]] = gg.pieza;
    }
  }
  ANIM.pistons.sort(function(a, b){ return a.c - b.c; });
  ANIM.rods.sort(function(a, b){ return a.c - b.c; });

  ESCALA_FIGURA = traido.scale.x || 1;
  if (CIN){
    //  el codo y la biela, del modelo y a esta escala
    ANIM.OFF = CIN.codo * ESCALA_FIGURA;
    ANIM.L   = CIN.biela * ESCALA_FIGURA;
  }
  if (ANIM.pistons.length){
    //  la cara de culata: el techo de la carrera, que es lo que el gas necesita
    DECK_Y = CRANK_Y + (CIN ? (CIN.codo + CIN.biela + CIN.compresion) * ESCALA_FIGURA : 3);
  }

  /*  LAS VALVULAS.  Vuelven a moverse: en Blender llevan `mueve` --- cabeza,
      vastago y muelle, una entrada por cilindro con las dos valvulas dentro --- y
      aqui se montan con la forma que `applyValve()` espera desde siempre.        */
  /*  LA FORMA QUE `updateEngine` ESPERA, Y NO OTRA: una entrada por cilindro con
      **las dos valvulas dentro** --- `{in: ..., ex: ...}` ---, porque no abren a la
      vez. La primera version puso una sola por cilindro y `VV['in']` salia
      `undefined`: `applyValve` reventaba en el PRIMER cuadro, se llevaba por delante
      el bucle de dibujo, y la pagina no volvia a pintar nunca mas.
      *Y eso no se veia como un error: se veia como una pantalla que no responde.* */
  function unaValvula(v){
    if (!v || !v.cabeza || !v.vastago || !v.muelle) return null;
    return { stem: v.vastago, head: v.cabeza, spring: v.muelle,
             y0: { stem: v.vastago.position.y, head: v.cabeza.position.y,
                   spring: v.muelle.position.y } };
  }
  Object.keys(valvulas).sort().forEach(function(k){
    var adm = unaValvula(valvulas[k]["in"]), esc = unaValvula(valvulas[k].ex);
    if (!adm || !esc) return;
    ANIM.valves.push({ "in": adm, ex: esc, rocker: null });
  });

  montaEfectos();

  /*  4 · EL PANEL DE INSTRUMENTOS.  `verTestigo`, `verAguja` y `panel` hablan con
      `INTER.panel`, y eso son dos testigos y una aguja que el modelo de Blender no
      trae --- es una pieza de tablero, no de motor ---. Se reconstruyen aqui,
      colgadas de la pieza que si existe, para que esas tres no se queden mudas.  */
  var tablero = null;
  for (var t = 0; t < parts.length; t++)
    if (parts[t].userData.name === "Engine panel") tablero = parts[t];
  if (tablero) INTER.panel = panelDeInstrumentos(tablero);

  figuraLista = true;
  while (colaDeLaFigura.length) { try { colaDeLaFigura.shift()(); } catch(e){ console.error(e); } }
  avisaDeLaFigura();
}

/*  ── LOS EFECTOS: EL GAS, EL GOTEO Y LAS BURBUJAS ───────────────────────────
    No son piezas del motor y por eso no vienen del `.glb`: son lo que PASA dentro
    de el.  El curso ya sabe moverlos --- `updateEngine` para el gas, `updateDrips`
    y `updateBubbles` para los otros dos ---; lo unico que les faltaba era que
    alguien les llenara `ANIM.gas`, `INTER.drips` y `INTER.bubbles`.               */
function piezaLlamada(nombre){
  for (var i = 0; i < parts.length; i++)
    if (parts[i].userData && parts[i].userData.name === nombre) return parts[i];
  return null;
}

function centroDe(nombre){
  for (var i = 0; i < parts.length; i++){
    if (parts[i].userData && parts[i].userData.name === nombre){
      var b = new THREE.Box3().setFromObject(parts[i]);
      if (!b.isEmpty()) return b.getCenter(new THREE.Vector3());
    }
  }
  return null;
}

function montaEfectos(){
  /*  EL GAS DEL CILINDRO.  Un cilindro por cada uno, entre la corona del piston y
      la cara de culata: `updateEngine` le cambia la altura, el color y la
      transparencia segun el tiempo en que va --- azul al admitir, ambar al
      comprimir, naranja al explotar ---. **Es lo que hace que los cuatro tiempos se
      vean y no solo se lean.**                                                    */
  for (var i = 0; i < ANIM.pistons.length; i++){
    var P = ANIM.pistons[i];
    var mt = new THREE.MeshStandardMaterial({ color: 0x6ab0e0, transparent: true,
      opacity: 0.20, emissive: 0x1d3a52, emissiveIntensity: 0.3,
      depthWrite: false, side: THREE.DoubleSide });
    var r = (DATOS && DATOS.cinematica ? DATOS.cinematica.codo * 2 : 0.09)
            * ESCALA_FIGURA * 0.47;
    var g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 28, 1, true), mt);
    g.renderOrder = 3;
    gasGroup.add(g);
    ANIM.gas.push({ m: g, c: P.c, x: P.x, mat: mt });
  }

  /*  EL GOTEO DEL PRENSAESTOPAS.  Ocho gotas dando vueltas: `updateDrips` las baja
      segun `INTER.dripRate`, que es lo que pone el gesto `goteo`.  Seco no es
      <ninguna gota>: es **demasiado apretado**, y por eso el reposo del taller es
      seco y el alumno tiene que aflojarlo hasta ver gotear.                       */
  /*  Y CUELGAN DE SU PIEZA, NO DE LA ESCENA.  Colgadas de la escena funcionaban
      --- se ven, caen, cambian con el gesto --- hasta que una pantalla llama a
      `verPiezas(lista)`: su segunda pasada apaga toda malla que no tenga un nombre
      por encima, y unas gotas sueltas no lo tienen. **El taller del prensaestopas
      se habria quedado sin gotas justo en las pantallas que lo enseñan.**
      Colgadas del prensaestopas heredan su nombre, se encienden con el y se apagan
      con el, que ademas es lo que son: agua de ESA pieza.
      *La escala se invierte porque la pieza vive escalada y `updateDrips` mueve en
      unidades del curso.*                                                        */
  var piezaGland = piezaLlamada("Stern gland (stuffing box)");
  if (piezaGland){
    var gr = new THREE.Group(); gr.name = "dripGroup";
    gr.scale.setScalar(1 / (ESCALA_FIGURA || 1));
    piezaGland.add(gr);
    var agua = { color: 0x7fb6cc, transparent: true, opacity: 0.85,
                 roughness: 0.15, metalness: 0.0 };
    INTER.drips = [];
    for (var d = 0; d < 8; d++){
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8),
                             new THREE.MeshStandardMaterial(agua));
      m.visible = false; gr.add(m);
      INTER.drips.push({ m: m, t: d / 8 });
    }
    INTER.dripGroup = gr; INTER.dripRate = 0;
  }

  /*  LAS BURBUJAS DEL PURGADO.  La leccion del taller no es que salgan: es **que
      dejen de salir**, que es cuando se aprieta el tornillo.                      */
  var piezaPurga = piezaLlamada("Bleed screw (injection pump)");
  if (piezaPurga){
    var gb = new THREE.Group(); gb.name = "bubbleGroup";
    gb.scale.setScalar(1 / (ESCALA_FIGURA || 1));
    gb.visible = false; piezaPurga.add(gb);
    INTER.bubbles = [];
    for (var b2 = 0; b2 < 10; b2++){
      var mb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xcfe3ec, transparent: true,
          opacity: 0.8, roughness: 0.1 }));
      gb.add(mb);
      INTER.bubbles.push({ m: mb, t: b2 / 10 });
    }
    INTER.bubbleGroup = gb; INTER.bubbleOn = 0;
  }
}

/*  LOS DOS TESTIGOS Y LA AGUJA, que son lo unico que se sigue dibujando a mano.  */
function panelDeInstrumentos(tablero){
  var g = new THREE.Group();
  /*  LA ESCALA SE INVIERTE, Y SIN ESTO SALE UNA BOLA QUE TAPA MEDIO MOTOR.
      El tablero es una pieza y las piezas viven en un envoltorio escalado --- un
      metro del modelo son ~14,8 unidades de esta escena ---.  Los dos testigos y la
      aguja se calculan de la caja del tablero, que se mide en unidades de la escena,
      asi que al colgarlos del tablero se multiplicaban otra vez por catorce.
      *Medido en la foto: el testigo rojo ocupaba 4,5 anchos de pantalla.*         */
  g.scale.setScalar(1 / (ESCALA_FIGURA || 1));
  tablero.add(g);
  var caja = new THREE.Box3().setFromObject(tablero);
  var c = caja.getCenter(new THREE.Vector3()), s = caja.getSize(new THREE.Vector3());
  g.position.set(0, 0, 0);
  var r = Math.max(0.06, s.y * 0.10);
  var luces = [];
  for (var i = 0; i < 2; i++){
    var l = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10),
              new THREE.MeshStandardMaterial({ color: i ? 0x8a2b20 : 0xa07818,
                emissive: 0x000000, metalness: 0.0, roughness: 0.5 }));
    l.position.set(c.x - tablero.position.x + (i ? r * 2.4 : -r * 2.4),
                   c.y - tablero.position.y + s.y * 0.22,
                   c.z - tablero.position.z + s.z * 0.55);
    g.add(l); luces.push(l);
  }
  var aguja = new THREE.Group();
  var a = new THREE.Mesh(new THREE.BoxGeometry(r * 0.35, s.y * 0.30, r * 0.35),
            new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.2, roughness: 0.5 }));
  a.position.y = s.y * 0.15;
  aguja.add(a);
  aguja.position.set(c.x - tablero.position.x, c.y - tablero.position.y - s.y * 0.10,
                     c.z - tablero.position.z + s.z * 0.55);
  g.add(aguja);
  return { luces: luces, aguja: aguja };
}

/*  ── Y LA CARGA, que es lo unico que aqui es de verdad nuevo ───────────────── */
(function cargaLaFigura(){
  if (typeof THREE.GLTFLoader === "undefined"){
    figuraRota = "falta GLTFLoader.js";
    console.error("motor3d: " + figuraRota); avisaDeLaFigura(); return;
  }
  var cargador = new THREE.GLTFLoader();
  if (typeof MeshoptDecoder !== "undefined") cargador.setMeshoptDecoder(MeshoptDecoder);
  else console.warn("motor3d: sin meshopt_decoder, el modelo comprimido no abrira");

  /*  EL ENTORNO VA PRIMERO Y NO ES UN ADORNO: el salto de realismo de esta figura
      vino del entorno y del suavizado por angulo, no de añadir vertices. Sin el,
      el metal no refleja nada y todo parece plastico. Si no llega, se sigue: una
      figura sin reflejos es peor, pero una figura que no carga es inservible.   */
  if (typeof THREE.RGBELoader !== "undefined"){
    try {
      new THREE.RGBELoader().load(FIGURA.hdr, function(tex){
        var pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        scene.environment = pmrem.fromEquirectangular(tex).texture;
        tex.dispose(); pmrem.dispose();
        ANIM.dirty = true; if (typeof despierta === "function") despierta();
      }, undefined, function(){ console.warn("motor3d: el entorno no cargo"); });
    } catch(e){ console.warn("motor3d: el entorno no cargo", e); }
  }

  cargador.load(FIGURA.glb, function(gltf){
    try { montaLaFigura(gltf); }
    catch(err){ figuraRota = String(err); console.error(err); avisaDeLaFigura(); }
  }, undefined, function(err){
    figuraRota = "el modelo no se pudo leer --- ¿esta el capitulo abierto con doble "
               + "clic? necesita servidor: VER-EL-CURSO.cmd";
    console.error("motor3d: " + figuraRota, err);
    avisaDeLaFigura();
  });
})();

/* Los flujos se construyen a partir de los MISMOS tramos que usan los recorridos
   guiados, así el trazado siempre coincide con lo que se ensena paso a paso.
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
      tres humos daban 0,0,0»— y aun asi construi `9.3` sin preajuste que lo ensenara.
      **Lo dijo la foto: una pantalla del color del humo, sin humo.**

      Estos valores son los de la mirilla, que es la unica vista de la que sabemos que
      el penacho entra entera. *Van tres cosas del humo que estaban hechas y no
      alcanzables: la geometria, la puerta, y ahora la camara.*                     */
  escape:{theta:0.55,        phi:1.02, r:17, tx:8.0,  ty:2.2,  tz:0.3},

  /*  ── LA OCTAVA · LA HELICE, DESDE FUERA DEL BARCO ────────────────────────
      Y nace del mismo fallo que la septima, que ya esta contado dos parrafos arriba:
      **`8.7` manda pinchar la helice y la helice no se ve desde NINGUNA de las
      siete.**  Medido barriendolas una a una, apagandola y encendiendola: cero en
      las siete.  No era un encuadre mal elegido --- era que no habia encuadre.

      La razon es de geometria y se dice en una linea: **las siete miran al motor
      desde dentro del compartimento**, y la helice esta fuera, detras del espejo.
      Medido en unidades de esta escena: el forro acaba en x=18,0 y la helice tiene
      su centro en x=20,5. Por muy atras que se ponga `stern` --- que mira al motor,
      no al barco --- siempre tiene el espejo por delante.

      Asi que esta se pone FUERA: por popa, un poco a estribor y algo por encima,
      mirando adelante a la helice.  Entra ella, su eje saliendo de la bocina y el
      trozo de casco del que sale, que es lo que hace entender donde esta.
      *El objetivo es el centro de la helice, medido, no elegido.*                */
  helice:{theta:1.22,        phi:1.15, r:9,  tx:20.5, ty:-1.7, tz:-0.3}
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
  /*  ── EL ESCENARIO NO ROBA PINCHAZOS ─────────────────────────────────────────
      El forro del casco y las bancadas se ven SIEMPRE --- cuelgan de `bayGroup`,
      que el montaje no apaga --- y el motor vive dentro de ellos. Al pinchar una
      pieza pequeña desde fuera, el rayo atraviesa el casco primero y el casco se
      lleva el acierto: medido, **nueve de las treinta y ocho piezas que las
      pantallas mandan señalar devolvian `Bilge` o `Structure`**.
      Y no se puede arreglar quitandolos de `pickables`, porque `Bilge` es una de
      las que se piden pinchar --- dos pantallas ---.
      ASI QUE EL ESCENARIO SE QUEDA EL ULTIMO: se recorren los impactos y, si hay
      alguno que no sea escenario, gana ese. El casco solo se lleva el pinchazo
      cuando de verdad no hay nada debajo, que es cuando el alumno lo esta
      señalando a el.                                                            */
  /*  ── EN UNA PANTALLA MARCADA, LO MARCADO GANA EL PINCHAZO ───────────────────
      El arnes lo dice con sus palabras: **<en una pantalla marcada, lo que no lleva
      aro no se puede pinchar>**.  Y al reves tambien tiene que valer: **lo que lleva
      aro TIENE que poder pincharse**, o la pregunta no se puede acertar.

      El aro se dibuja con `depthTest:false`, o sea delante de todo --- eso ya estaba
      bien ---, pero el pinchazo va contra la geometria y se lo lleva lo que este
      delante: el turbo detras del colector de admision, la bomba de agua detras de
      la tapa de distribucion. El alumno veia el aro perfectamente y pinchaba otra
      cosa.  *Medido: 0 aciertos de los 1 000 que hacen un blanco de dedo.*

      La regla es la misma que la del escenario, un escalon mas arriba: cuando hay
      marcas puestas, un impacto en una pieza marcada gana a cualquier impacto
      anterior en una que no lo esta.  **Fuera de las pantallas marcadas no cambia
      nada**, porque `MARCAS` esta vacio.                                          */
  var marcada = {};
  if (typeof MARCAS !== "undefined")
    for (var q = 0; q < MARCAS.length; q++)
      if (MARCAS[q] && MARCAS[q].pieza) marcada[MARCAS[q].pieza] = 1;
  var hayMarcas = false; for (var _k in marcada) { hayMarcas = true; break; }

  var delEscenario = null, primera = null;
  for(var i=0;i<hits.length;i++){
    if(recortado(hits[i])) continue;
    var t=topMesh(hits[i].object);
    if(!(t&&seVeDeVerdad(t))) continue;
    var nm = t.userData && t.userData.name;
    if(ESCENARIO[nm]){
      if(!delEscenario) delEscenario={pieza:t, lejos:hits[i].distance};
      continue;
    }
    if(hayMarcas){
      //  se busca una marcada mas adentro; si la hay, gana ella
      if(marcada[nm]) return {pieza:t, lejos:hits[i].distance};
      if(!primera) primera={pieza:t, lejos:hits[i].distance};
      continue;
    }
    return {pieza:t, lejos:hits[i].distance};
  }
  return primera || delEscenario;
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
   Es un mapa 3D: solo debe verse el número de lo que esta realmente a la vista.
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
/*  ── ¿HAY ALGO ENTRE LA CAMARA Y ESTA PIEZA? ─────────────────────────────────
    Y **lo que el corte se ha llevado no cuenta**, que es el arreglo del 28 de
    septiembre de 2026.

    EL SINTOMA: `2.1` --- la pantalla de los pistones y el cigueñal, con el motor
    abierto --- no atenuaba nada. El capitulo tiene una salvaguarda sensata
    --- *si no se ve ninguna de las piezas que se destacan, no atenuar*, porque
    apagar el motor para senalar algo invisible deja la pantalla en gris y sin
    leccion --- y esa salvaguarda pregunta aqui. Aqui se contestaba **cero**.

    LA CAUSA, Y ES EXACTAMENTE LA MISMA QUE YA ESTA CONTADA EN `recortado()`: el
    corte de three.js es del SOMBREADOR --- el fragmento no se pinta y la geometria
    sigue ahi ---, asi que el rayo choca con la pared del bloque que ya no se
    dibuja. Los cuatro pistones se ven perfectamente y el rayo decia que no.
    *Se fotografio antes de tocar nada: los cuatro, a la vista.*

    Y EL ARREGLO YA ESTABA ESCRITO, EN LA VENTANILLA DE AL LADO. `recortado(hit)`
    nacio para el PINCHAZO, por este mismo fallo, con esta misma causa y con una
    medida igual de tajante --- <Crankshaft 0 0 0 0 0 0> desde las seis camaras ---.
    Nadie lo llevo al rayo del dibujo porque son dos rayos distintos; pero el fallo
    es uno. **Aqui pasan los dos usos --- los rotulos y `atenua` ---, asi que se
    arregla una vez.**                                                            */
function rayClear(aim, mesh, list){
  _rd.copy(aim).sub(camera.position);
  var d=_rd.length();
  if(d<0.35) return true;
  _rd.multiplyScalar(1/d);
  bRay.set(camera.position, _rd);
  bRay.near=0; bRay.far=d-0.16;
  var hits=bRay.intersectObjects(list, true);
  for(var h=0;h<hits.length;h++){
    if(recortado(hits[h])) continue;          //  el corte se lo llevo: no tapa
    if(!ownsHit(hits[h].object, mesh)) return false;
  }
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
/*  ── EL GRADO DE TRANSPARENCIA DE LO ATENUADO · 0,20 ──────────────────────────
    Lo atenuado se queda sin color, con menos luz **y al 20 % de opacidad**: la pieza
    que la pantalla ensena va solida y en su color, y el motor entero se vuelve una
    silueta detras de ella.  `null` devuelve el comportamiento de antes --- solido y
    en gris ---, y cualquier numero entre 0 y 1 pone otro grado.

    **EL 20 % LO ELIGIO JOEL MIRANDO, y hay que decir contra que.**  Este fichero
    llevaba anos con una nota que descartaba justo esto --- <al 28 % el motor se
    convertia en una radiografia> ---, y la nota no estaba equivocada: **lo que
    describe es exactamente lo que pasa.**  A 20 % se ven los pistones a traves del
    bloque.  Lo que ha cambiado no es la medida, es la decision: eso que se llamaba
    radiografia es lo que Joel quiere que se vea.

    SE ELIGIO CON QUINCE FOTOS DELANTE --- `GRADOS-DE-TRANSPARENCIA.html` ---: tres
    pantallas de verdad (una pieza grande, una pequena y los pistones dentro del
    bloque) por cinco columnas (lo de antes y 65, 50, 35 y 20 %).  Con las cuatro
    medidas comprobadas: los aros de marcado siguen dando entre 18 198 y 26 290
    pixeles contra un suelo de 1 000, y el pinchazo da 15 984 en las cinco --- la
    misma cifra exacta ---, porque un rayo va contra la geometria y la opacidad no le
    dice nada.
    *Si alguna pantalla deja de entenderse a este grado, se anota y se dice: el grado
    no se cambia por cuenta propia.*                                               */
var OPACO_ATENUADO = 0.20;

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
/*  LOS 18 GESTOS · AHORA SON ESTADOS DE VERDAD.

    Aqui habia 18 funciones `pon(v)`, cada una moviendo una malla concreta con
    coordenadas escritas a mano --- `INTER.strLid.position.y = ... + 0.75` ---.

    En el modelo nuevo **cada estado esta construido como geometria aparte**: la
    varilla dentro, fuera y limpia son tres varillas, y el gesto enciende una y
    apaga las otras. Por eso las 18 funciones se quedan en una sola, y por eso se
    borran en vez de dejarlas: *una funcion que existe y no hace nada es peor que
    un fallo, porque no se ve.*

    Los estados y cual es el de reposo --- el primero de cada lista, como siempre
    --- vienen de `motor-datos.js`, sacados del mismo sitio donde se construyo la
    geometria: si estuvieran escritos aqui tambien, el dia que discrepen el sintoma
    seria una pieza que no aparece nunca y nada que lo explique.                 */
var GESTOS = {};
(function armaGestos(){
  var E = (DATOS && DATOS.estados) || {};
  Object.keys(E).forEach(function(k){
    GESTOS[k] = { estados: E[k], pon: function(v){
      ESTADO_GESTOS[k] = v;
      /*  DOS DE LOS DIECIOCHO NO ENCIENDEN GEOMETRIA, MANDAN SOBRE UN EFECTO.
          El goteo y las burbujas no son piezas que esten o no esten: son un ritmo,
          y el ritmo lo llevan `updateDrips` y `updateBubbles`. Se les pone el
          mando y ellos hacen el resto.                                          */
      if (k === "goteo"){
        INTER.dripRate = (v === "seco") ? 0 : (v === "gotas" ? 0.55 : 2.2);
        if (INTER.dripGroup) INTER.dripGroup.visible = (v !== "seco");
      } else if (k === "burbujas"){
        INTER.bubbleOn = (v === "ninguna") ? 0 : (v === "con-aire" ? 1 : 2);
        if (INTER.bubbleGroup) INTER.bubbleGroup.visible = (v !== "ninguna");
      }
      refrescaGestos();
    } };
  });
})();

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
/*  LA LISTA BLANCA SE FUE, Y NO SE SUSTITUYE POR OTRA.
    Aqui habia once nombres escritos a mano. Ahora **cada pieza del modelo trae su
    propio `corta`**, puesto en Blender junto a la geometria, asi que no hay dos
    listas que puedan discrepar el dia que se renombre una pieza. El reparto sigue
    siendo el mismo criterio: se secciona lo que ENVUELVE --- bloque, culata, tapa
    de balancines, carter, campana, tapa de distribucion, caja, intercambiador con
    su haz, bocina y bañera --- y **lo que se mueve se queda entero**, que es lo
    unico que hace util un corte con el motor en marcha.
    Lo llena `montaLaFigura()` con `markCut()`, que es el mismo de siempre.      */
var clipPlane=new THREE.Plane(new THREE.Vector3(0,0,1), 0);
renderer.localClippingEnabled=true;
var cutT=0, cutV=DOC.getElementById('cut'), cutVlabel=DOC.getElementById('cutV');
cuandoLaFigura(function isolateCutMaterials(){
  for(var i=0;i<cutMeshes.length;i++){ cutMeshes[i].traverse(function(c){ if(c.isMesh&&c.material&&!c.userData._cutMat){ c.material=c.material.clone(); c.userData._cutMat=true; c.userData._origSide=c.material.side; } }); }
});
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
  /*  Y SI NO HAY VALVULA, NO PASA NADA.  Un `undefined` aqui tumbaba el bucle de
      dibujo entero y la pagina se quedaba con el ultimo cuadro para siempre ---
      sin error a la vista, solo una figura que no responde. **Un fotograma no
      puede matar la funcion.**                                                  */
  if (!v || !v.stem || !v.head || !v.spring) return;
  /*  EL ALZADO VA EN UNIDADES DEL CURSO y la valvula cuelga de un envoltorio que
      esta escalado: un `0,17` crudo aqui la sacaria por el techo de la culata.   */
  var d=lift*0.17/(ESCALA_FIGURA || 1);
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
/*  APRETAR LA CORREA YA NO ES DEFORMARLA.  Antes esta funcion reconstruia la
    geometria del tubo para hundirlo; ahora la correa quieta y la pulsada son dos
    correas, y el gesto `correa` enciende una. Se queda como puerta por si alguien
    la llama: lo hace el gesto, que es quien sabe.
    *La flecha es real y esta medida: 12,7 mm sobre un tramo de 224 mm, el 5,7 %,
    que es lo que hunde un pulgar en una correa bien tensada.*                   */
function beltDeflect(mm){
  if (GESTOS["correa"]) GESTOS["correa"].pon(mm > 0.01 ? "pulsada" : "quieta");
}
/* burbujas de aire saliendo por el tornillo de purga */
function updateBubbles(dt){
  if(!INTER.bubbles) return;
  if(CONGELADO) dt=0;      //  por lo mismo que el goteo
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
  //  CONGELADA, LA FASE NO AVANZA. `quieto()` la pone a cero y dibuja, pero **puede
  //  quedar un `requestAnimationFrame` pedido de antes**: ese fotograma entraba aqui
  //  con un `dt` real y volvia a mover las gotas, asi que dos fotos congeladas salian
  //  distintas por ~1 000 pixeles. Medido: seca 0, sin tocar 0, goteando 1 019.
  if(CONGELADO) dt=0;
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

/*  ── CONGELADO · la figura deja de pedir fotogramas, sin deshacer nada ───────────
    **Para qué existe, y no es para el alumno.** Hay estados de esta figura que son
    correctos y no terminan nunca: el prensaestopas gotea siempre, el motor en marcha
    anda siempre. Para quien la mira eso esta bien. Para quien la MIDE no: un arnés
    saca su foto con `--virtual-time-budget`, y **el tiempo virtual sólo avanza cuando
    la cola de tareas se vacía**, así que una página que nunca se queda quieta obliga a
    Chrome a pintar miles de fotogramas antes de darse por terminada.

    Medido con el gesto `goteo`: seis llamadas idénticas daban **8,4 · 8,5 · 23,3 ·
    59,0 · 19,1 · 50,5 s**, y alguna cruzaba los 120 y se perdía. El mismo gesto en
    `seco` —lo único distinto es que la figura se para— daba **4,4 a 5,7**. *Y eso
    hacía que `walk-motor3d` acusara a un gesto distinto en cada pasada.*

    **Y `reposo()` no sirve para esto**, que es lo que lo hace una puerta nueva y no un
    parámetro: `reposo()` devuelve todos los gestos a su primer estado, o sea que
    deshace justo lo que se quiere fotografiar.

    QUÉ HACE Y QUÉ NO. Dibuja un fotograma más —para que la foto sea del estado que se
    pidió— y deja de pedir el siguiente. **No toca ningún estado**: `gestos()`,
    `marcha()` y todo lo demás siguen diciendo lo mismo. `quieto(false)` lo suelta.  */
var CONGELADO = false;

function hayQueMover(){
  if (CONGELADO) return false;
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
  //  congelada, un despertar no arranca nada: si arrancara, la primera orden de la API
  //  posterior a `quieto()` deshacia el congelado sin que nadie lo pidiera.
  if (CONGELADO || bucleVivo) return;
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
    375 px son 1125 pixeles reales, y eso en una GPU de móvil se nota al primer
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
    figura que muestra algo imposible ensena a esperar algo imposible. El mapa de
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
    partículas **y se pueden medir en pixeles**, que es lo que decide si de verdad se
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
    —la primera fue `applyCut`—. Los bloques del capítulo viejo no estan separados por
    función: estan separados por cuándo se escribieron.

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
    es de construcción: el emisivo **suma luz** sobre una superficie que ya esta
    iluminada, así que todo tiende al blanco pálido. **No es cuestión de ajuste.**

    El aro, en cambio, se dibuja con `MeshBasicMaterial`, que no recibe luz. Como esta
    hoy el señalador —fino y a 0,95 y 0,5 de opacidad— azul contra blanco da **38,3**, a
    un pelo del suelo. **Opaco y con colores saturados: azul-ámbar 101,3 · azul-blanco
    61,0 · ámbar-blanco 83,8.** Los tres distintos, y por eso las marcas nacen opacas.

    ── Y LAS LETRAS NO PUEDEN SER CHAPAS, PORQUE LAS CHAPAS NO EXISTEN AQUÍ ───
    El capítulo viejo tenía un sistema de chapas HTML completo —proyección, oclusión por
    rayo, un ancla fija por pieza— y **sigue en este fichero**. Pero cuelga de
    `DOC.getElementById('badges')`, y en la figura extraída `DOC` devuelve un panel de
    mentira: las chapas se crean, se posicionan y **no se ven**, porque su contenedor no
    esta en el DOM de verdad. *Es la quinta vez en este módulo que algo estaba dibujado y
    no alcanzable, y la primera en que lo dibujado tampoco servía.*

    Así que la marca lleva su letra en una capa que **la figura se crea a sí misma**
    dentro de su nodo, sin pedirle nada a la plantilla: una parte nueva la tiene el día
    que se construye.                                                              */
/*  EL COLOR AL QUE SE APAGA LO QUE YA ESTABA. No es un gris inventado: es el gris
    claro del propio compartimento, para que lo atenuado se funda con lo que tiene
    detras en vez de teñirse de algo que no esta en la escena. */
var FONDO_APAGADO = new THREE.Color(0xdfe4e8);

var marcaGroup = new THREE.Group(); marcaGroup.name = "marcaGroup"; scene.add(marcaGroup);
var MARCAS = [], capaLetras = null;
/*  ── Y LA MARCA SE PINCHA ────────────────────────────────────────────────────────
    **Esto no es un adorno: es lo que hace posibles tres pantallas de la P3.** El
    encuadre por zona resuelve el suelo del dedo acercandose, y **una pantalla que marca
    piezas repartidas por todo el motor no puede acercarse**: dejaria fuera de cuadro la
    mitad de lo que ensena. Las dos soluciones se estorban.

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
    de la pieza que esta señalando — que es justo lo que `9.4` pregunta.  */
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
  destapaLosAros();
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
/*  ── Y LO QUE TAPA UNA PIEZA MARCADA SE TRANSPARENTA ─────────────────────────
    Que la pieza gane el pinchazo arregla la pregunta; no arregla la pantalla. El
    alumno seguiria pinchando un aro con un colector de admision dentro, acertando
    sin entender por que.  Asi que **lo que tapa se pone a 0,30**: se ve la pieza
    marcada y se ve, en voz baja, lo que tiene delante.

    Y SOLO LO QUE TAPA, no el motor entero --- **y esto sigue haciendo falta aunque
    el motor entero se atenue ya al 20 %**, que es lo que parecia dejarlo sin trabajo.
    No lo deja, y la razon es de reparto: `atenua` solo actua donde una pantalla
    ESTRENA piezas, y **las cinco pantallas marcadas del modulo estan todas en la
    posicion 16 y ninguna estrena ninguna** --- medido ---, asi que en una pantalla
    con aros `atenua` no llega a correr nunca.  Lo unico que transparenta ahi es
    esto.
    Un rayo de la camara al centro de cada pieza marcada dice quien esta por medio, y
    son cuatro o cinco.  *Las dos cosas se reparten el modulo y no se pisan: el 20 %
    manda donde se monta, esto manda donde se marca.*                              */
var TAPAN = [], _rayoAro = null, _tTapan = 0;

function destapaLosAros(){
  for (var i = 0; i < TAPAN.length; i++){
    var o = TAPAN[i];
    if (o.userData._matTapa){ o.material = o.userData._matTapa; o.userData._matTapa = null; }
  }
  TAPAN.length = 0;
}

function transparentaLoQueTapa(lista){
  destapaLosAros();
  if (!lista || !lista.length) return;
  if (!_rayoAro) _rayoAro = new THREE.Raycaster();
  var caja = new THREE.Box3(), centro = new THREE.Vector3(), dir = new THREE.Vector3();
  var yaEsta = {};
  for (var k = 0; k < lista.length; k++){
    var nom = lista[k] && (lista[k].pieza || lista[k]);
    var pz = null;
    for (var i = 0; i < parts.length; i++)
      if (parts[i].userData && parts[i].userData.name === nom) { pz = parts[i]; break; }
    if (!pz || !seVeDeVerdad(pz)) continue;
    caja.setFromObject(pz);
    if (caja.isEmpty()) continue;
    caja.getCenter(centro);
    dir.copy(centro).sub(camera.position);
    var lejos = dir.length();
    _rayoAro.set(camera.position, dir.normalize());
    _rayoAro.far = lejos * 0.98;          //  se para justo antes de la pieza marcada
    var toca = _rayoAro.intersectObjects(pickables, true);
    for (var h = 0; h < toca.length; h++){
      var t = topMesh(toca[h].object);
      if (!t || !t.userData || !t.userData.name) continue;
      if (t.userData.name === nom) continue;
      /*  el escenario no: el casco y las bancadas son el sitio, y volverlos de
          cristal deja el motor flotando en el aire.                             */
      if (ESCENARIO[t.userData.name] || yaEsta[t.userData.name]) continue;
      yaEsta[t.userData.name] = 1;
      t.traverse(function(o){
        if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
        if (o.userData._matTapa) return;
        o.userData._matTapa = o.material;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.30;
        o.material.depthWrite = false;
        o.material.needsUpdate = true;
        TAPAN.push(o);
      });
    }
  }
}

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
    /*  ── Y UN CUARTO MAS DE GROSOR CUANDO EL COLOR NO TIENE SATURACION ────────────
        En `9.4` los tres grupos del humo van en ambar, azul y blanco, y **el blanco cae
        sobre la pared blanca del compartimento**. Medido aislando la pieza —marcada ella
        sola, con el control sin marca dando CERO pixeles—, la tinta que pone cada aro
        en la misma geometria y el mismo encuadre: **blanco 24, azul 30, ambar 48**.

        Probadas las tres palancas, **dos no hacen nada**: el TONO da x0,6 a x1,1 —blanco
        puro, blanco frio, gris azulado, gris humo— y apagar mas el FONDO da x1,1. Lo
        unico que mueve es el GROSOR: x1,5 -> x3,1, x2 -> x5,0, x3 -> x9,4.

        **Se sube x1,25 y no mas**, porque ya x1,5 pone 74 contra los 48 del ambar e
        invertiria el problema: el humo blanco pasaria a ser el mas gritado de los tres.
        *El umbral de saturacion es el mismo 0,18 que ya usa `atenua`, y por eso separa
        limpio: el blanco `0xf2f4f6` da 0,016, el ambar 0,898 y el azul 0,797.*         */
    var _r = (hex >> 16 & 255) / 255, _g = (hex >> 8 & 255) / 255, _b = (hex & 255) / 255;
    var _mx = Math.max(_r, _g, _b), _mn = Math.min(_r, _g, _b);
    var grueso = (_mx > 0 ? (_mx - _mn) / _mx : 0) < 0.18 ? 1.25 : 1;
    var aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055 * grueso, 10, 44), mat(1));
    var aro2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.028 * grueso, 10, 44), mat(0.55));
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
  /*  LO QUE TAPA DEPENDE DE DONDE SE MIRA, asi que se recalcula --- pero no en cada
      fotograma: cuatro rayos contra trescientas mallas sesenta veces por segundo es
      tirar maquina. Cuatro veces por segundo va de sobra para una camara que se
      mueve con una transicion.                                                    */
  if (MARCAS.length && Date.now() - _tTapan > 250){
    _tTapan = Date.now();
    transparentaLoQueTapa(MARCAS);
  }  if (!marcaGroup.visible) return;
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
/*  EL ARRANQUE YA NO ES INMEDIATO, Y ESTE ES EL UNICO SITIO DONDE <mantener la
    API igual> NO SALE GRATIS.  Antes la figura estaba construida en cuanto se
    evaluaba el fichero y aqui se podia medir, cortar y dibujar de una vez. Ahora
    hay que esperar a que llegue el `.glb`.
    Lo de dentro es exactamente lo que habia; lo unico que cambia es CUANDO corre.
    Quien llame a `montar()` antes de que llegue no nota nada: el lienzo ya esta
    puesto y la figura aparece cuando aparece.                                   */
cuandoLaFigura(function arranque(){
try{
  buildOccluders(); measureBadgeRadii(); updateBadgeOcclusion();
  refrescaGestos();
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
});

/*  ══ LA API ════════════════════════════════════════════════
    Todo lo de arriba es el codigo original sin tocar. Esto es lo unico nuevo, y no
    hace calculo: llama a lo que ya existia.                                     */

raiz.Motor3D = {

  /*  UNA MIRILLA PARA MEDIR, y no una función del curso.
      `walk-motor-movil` necesita ver el ángulo y el radio de la cámara para
      comprobar que un dedo gira y dos dedos acercan. **Sin esto la única forma de
      medir un gesto sería mirar pixeles, que es frágil y lento.**
      Los dos guiones bajos son la señal: no se llama desde una pantalla.       */
  /*  LA MIRILLA DEL HUMO. Pinta cada penacho solo, lee los pixeles de la ventana
      donde vive, y devuelve el color medio, cuánto cubre y cuánto se separa del
      fondo. **Es lo que decide si azul y negro son el mismo penacho**, que era la
      duda de Joel, y se contesta midiendo y no mirando.

      La ventana se toma alrededor de la salida del espejo proyectada a pantalla,
      así que sigue valiendo si la cámara cambia.                              */
  __humo: function () {
    var gl = renderer.getContext();
    var W = renderer.domElement.width, H = renderer.domElement.height;

    /*  SE APUNTA AL PENACHO ANTES DE MEDIR. La cámara por defecto mira al motor, y la
        salida del espejo esta muy a popa: a 375 px se sale del encuadre, y los tres
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
      /*  cobertura: cuántos pixeles cambiaron respecto del fondo  */
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
        señalando al div suelto. Mover los hijos arregla DÓNDE esta el lienzo;
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
          algo. Pero cuando el sistema **ya esta declarado** —por `userData.sys` o por
          el grupo del que cuelga— no se esta adivinando nada, y entonces la distancia
          sólo sirve para **ordenar**: cuál de las piezas de ese sistema entra más
          tarde. Vetar por distancia ahí es dejar fuera una pieza cuyo sistema no esta
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
        //  el sistema no esta en duda: se ordena con las piezas de ese sistema, y
        //  la distancia no veta.
        var aa = masCerca(bb.min, propio), zz = masCerca(bb.max, propio);
        if (!aa.p || !zz.p) { anota("sin piezas de su sistema"); return; }
        a = aa; z = zz;
      } else {
        //  el sistema se esta infiriendo: los dos extremos tienen que TOCAR algo, y
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

  /*  LA ESCENA, PARA MEDIR Y SOLO PARA MEDIR.  Los arneses tienen que poder
      preguntarle a la geometria QUE LLEVA PUESTO cada malla en vez de creerse una
      lista escrita a mano --- que gesto mueve que pieza, por ejemplo ---. Sin esto
      la unica manera de saberlo es escribir la tabla dos veces.  No la modifica
      nadie: se devuelve para leerla.                                            */
  /*  ── AVISAME CUANDO LA FIGURA ESTE ───────────────────────────────────────
      El capitulo tiene que poder esperarla.  Desde que la figura viene de un `.glb`
      de 3,5 MB, `montar()` devuelve **antes** de que haya una sola pieza, y todo lo
      que la pantalla le pide en ese instante --- marcar, enfocar, atenuar --- se lo
      pide a una escena vacia y se pierde sin ruido.
      `fn` recibe `true` si monto y `false` si no llego; si ya se sabe, se llama en
      el acto.                                                                    */
  cuandoMonte: function (fn) {
    if (typeof fn !== "function") return this;
    if (figuraLista || figuraRota) fn(!figuraRota);
    else colaDeFuera.push(fn);
    return this;
  },

  /*  Y POR QUE NO LLEGO, para que el capitulo pueda decirselo al alumno en vez de
      dejarle un cartel de <cargando> que no se va nunca.                        */
  porQueNoCargo: function () { return figuraRota; },

  __escena: function () { return scene; },

  /*  EL GRADO DE TRANSPARENCIA DE LO ATENUADO, para poder elegirlo mirando.
      `null` --- lo de fabrica --- deja lo atenuado solido, que es lo que el curso
      hace hoy. Un numero lo vuelve semitransparente. **No se guarda en ningun
      sitio**: es una puerta para probar, no un ajuste.                            */
  __transparencia: function (op) {
    if (op !== undefined) {
      OPACO_ATENUADO = (op == null) ? null : Math.max(0.05, Math.min(1, +op));
      //  lo atenuado se vuelve a pintar con el grado nuevo: `atenua` clona el
      //  material una vez y lo reusa, asi que hay que devolverlo y repetirlo.
      var d = this.__ultimaAtenua;
      if (d) { this.atenua(null); this.atenua(d.lista, d.alfa); }
    }
    return OPACO_ATENUADO;
  },


  /*  Y LA CAMARA, por lo mismo: un arnes tiene que poder preguntar DONDE CAE una
      pieza en pantalla --- proyectarla --- en vez de deducirlo. Se devuelve para
      leerla.                                                                     */
  __camara: function () { return camera; },

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
  /*  ── QUIETA · para quien MIDE, no para quien ensena ──────────────────────
      Un arnes fotografia y cuenta; **no mide animaciones**.  Y una animacion que
      no termina --- el motor en marcha, que corre con `marchaResta = Infinity`, o
      los tres penachos de humo --- deja la pagina sin cerrar bajo el reloj virtual
      de Chrome: el arnes espera dos minutos, se le mata y dice <no se pudo medir>.

      SALIO EN `9.2` Y `9.3` el dia que `tira-c31` empezo a recorrer las pantallas
      **con la figura montada**. Antes pulsaba antes de que hubiera figura, asi que
      el capitulo no llegaba a arrancar nada: *no es que no colgara, es que no se
      la hacia trabajar.*  **Y el capitulo esta bien**: en un navegador de verdad,
      pinchando `Next` cuatro veces, contesta en 2 ms --- medido ---.

      SE INTENTARON TRES ATAJOS ANTES Y LOS TRES FALLARON, que es lo que justifica
      que esto viva aqui y no en el arnes: parar las animaciones DESPUES de medir
      --- no llega a correr, porque la sonda tampoco ---; topar
      `requestAnimationFrame` por reloj --- `Date.now()` no sigue al reloj virtual
      ---; y toparlo por fotogramas --- los resultados bailaban entre corridas ---.
      *Perseguir al reloj de Chrome fue el error; quitarle el trabajo es el
      arreglo.*

      Asi que el que mide lo dice una vez, al cargar, y **la pantalla ya no puede
      arrancar nada**: `enMarcha` y `verHumo` obedecen en falso. No se toca nada
      mas --- ni el corte, ni los gestos, ni el goteo ---, que son de un solo tiro
      y terminan.                                                                */
  quieto: function (v) {
    QUIETO = !!v;
    if (QUIETO) {
      if (typeof setRun === "function") setRun(false);
      if (typeof setHumo === "function") setHumo(null);
    }
    return this;
  },

  enMarcha: function (v, segundos) {
    if (QUIETO) v = false;
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
  /*  ── QUIETO · congela el dibujo sin deshacer nada ────────────────────────────
      **Es una puerta para quien MIDE, no para quien ensena.** Un capítulo no la
      necesita: el goteo tiene que gotear. Un arnés sí, porque su foto la toma Chrome
      cuando se agota el tiempo virtual, y una página que nunca se queda quieta hace
      que eso tarde entre cinco y treinta veces más — y a veces más que el plazo.

      Dibuja UN fotograma antes de parar, para que la foto sea del estado que se pidió
      y no del anterior. Y **no toca ningún estado**: `gestos()` y `marcha()` siguen
      contestando lo mismo. `quieto(false)` la suelta y vuelve a andar.             */
  quieto: function (v) {
    if (typeof renderer === "undefined" || !renderer) {
      falta("renderer", "sin el lienzo montado no hay bucle que congelar");
      return this;
    }
    CONGELADO = (v === false) ? false : true;
    if (CONGELADO) {
      /*  ── Y LAS FASES QUE CORREN CON EL RELOJ VUELVEN A SU PRINCIPIO ───────────
          **Parar el bucle no basta para que una foto sea repetible.** Las gotas y las
          burbujas llevan una fase que se acumula con el tiempo real —`D.t += dt*rate`—
          asi que congelar deja cada gota donde le pillo, y **dos fotos del mismo estado
          salen distintas**. Medido por el control de dos lados de `walk-motor3d` en su
          primera vuelta: **1 258 pixeles de diferencia entre dos capturas congeladas**.

          *Para una foto, donde va la gota es arbitrario; que sea la misma cada vez no
          lo es.* Asi que al congelar se ponen al principio de su recorrido: el estado
          es el mismo —gotea o no gotea— y el dibujo pasa a ser el mismo tambien.     */
      try {
        /*  ── Y NO A CERO: REPARTIDAS ─────────────────────────────────────────────
            La primera version las pon\u00eda todas en `t = 0`, y **a cero la gota est\u00e1
            todav\u00eda dentro del prensaestopas**: se apilaban donde no se ven, y el gesto
            `goteo` pas\u00f3 a mover **0 p\u00edxeles** — el arn\u00e9s lo caz\u00f3 al instante y dijo que
            no mov\u00eda nada. *Determinista no basta: tiene que ser determinista Y ser lo
            que la pantalla ense\u00f1a.* Repartidas por su recorrido son las dos cosas, y
            adem\u00e1s es como se ve un goteo de verdad: un reguero, no una gota.        */
        if (INTER.drips) for (var _d = 0; _d < INTER.drips.length; _d++)
          INTER.drips[_d].t = _d / INTER.drips.length;
        if (INTER.bubbles) for (var _b = 0; _b < INTER.bubbles.length; _b++)
          INTER.bubbles[_b].t = _b / INTER.bubbles.length;
        updateDrips(0); updateBubbles(0);
      } catch (e) {}
      try { renderer.render(scene, camera); } catch (e) {}
    }
    else despierta();
    return this;
  },

  /*  Y SE PUEDE PREGUNTAR, porque un arnés que congela tiene que poder comprobar que
      lo consiguió: **pedirlo no es hacerlo** es la regla de esta casa.            */
  congelado: function () { return !!CONGELADO; },

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
    if (QUIETO) color = null;
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
      aro opaco sí, y las dos cosas estan medidas en `mide-resalte.js`. Lo que la
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

  /*  ══ ATENUAR LO QUE YA ESTABA ════════════════════════════════════
      **Lo que una pantalla monta va solido; lo montado antes, apagado.** Con el motor
      medio montado el alumno no sabe donde mirar: la pieza que la pantalla explica
      tiene el mismo peso visual que las cuarenta que ya estaban.

      No es el resaltado de la P3. Aquel señala una RESPUESTA y va con aro; esto es la
      VISTA POR DEFECTO de cada pantalla, y va con opacidad.

      ── SE CLONA EL MATERIAL, Y NO ES UN DETALLE ───────────────────
      Medido antes de escribir una linea: **663 mallas comparten 320 materiales, 33 de
      ellos entre varias, y uno lo usan 101 mallas.** Tocar `material.opacity` a secas
      atenuaria piezas que la pantalla no ha nombrado —hasta cien de golpe— y el fallo
      se veria como «se apaga medio motor al azar». Asi que la primera vez que una
      malla se atenua se le CLONA el material y se guarda el original; al restaurar se
      devuelve. Clonar cuesta una vez por malla y por sesion.

      ── Y SE MULTIPLICA, NO SE FIJA ────────────────────────────────
      **35 mallas ya son transparentes** —los vasos de los filtros, la camisa de agua—,
      y fijarles 0,25 las volveria mas opacas que su vaso de cristal. Se multiplica su
      opacidad de base, que es lo unico que conserva lo que ya significaba.        */
  /*  el color al que se lleva lo apagado: el del propio compartimento, para que lo
      atenuado se funda con el fondo en vez de teñirse de un gris que no esta en la
      escena  */
  __fondo: function () { return FONDO_APAGADO.getHex(); },

  atenua: function (destacadas, alfa) {
    /*  se recuerda la ultima llamada para poder repetirla al cambiar el grado de
        transparencia: los materiales se clonan una vez y no se enteran solos.     */
    this.__ultimaAtenua = destacadas ? { lista: destacadas, alfa: alfa } : null;
    var enc = {};
    if (destacadas) for (var i = 0; i < destacadas.length; i++) enc[destacadas[i]] = true;
    /*  ── EL 0,55 SALE DE UNA MEDIDA, Y LA MEDIDA DICE ALGO QUE NO ESPERABA ────
        Medido con `mide-atenuado.js` sobre la posicion 13 —tres piezas nuevas contra
        cuarenta ya puestas, que es el caso malo—, comparando el color y la luz de lo
        que cubre cada grupo:

            apagado      lo nuevo destaca en color      el contexto conserva
            ninguno              x1,1                        100 %
            95 %                 x4,9                         99 %
            70 %                 x4,7                         95 %
            55 %                 x4,6                         92 %
            40 %                 x4,4                         88 %
            28 %                 x4,2                         84 %

        **El trabajo lo hace quitar el color, no bajar la luz.** La separacion salta de
        x1,1 a x4,9 en cuanto se desatura, y a partir de ahi **empeora** cuanto mas se
        oscurece: oscurecer aplasta tambien la poca saturacion que queda. Lo unico que
        aporta bajar la luz es un segundo indicio, y cuesta contexto.

        0,55 es donde las dos dejan de competir en brillo —la luz de lo nuevo y la de lo
        viejo se igualan, x1,00— asi que **toda la diferencia es el color**, con el
        contexto todavia al 92 %.                                                    */
    var a = alfa == null ? 0.55 : alfa;

    /*  ── Y SI LO DESTACADO NO TIENE COLOR, SE APAGA MAS ────────────────────
        **El limite del metodo, encontrado con una foto.** En `2.3` el atenuado
        funcionaba —616 mallas apagadas, dos destacadas a la vista— y la pantalla salia
        entera gris: lo que esa pantalla añade es el lado del aire —filtro, colectores,
        turbo, descompresores— y **esas piezas son grises por diseño**. El destacado les
        conserva su color, y su color es el gris.

        El criterio no cambia: **lo que distingue es el contraste**, y el color es la
        forma de conseguirlo cuando la pieza tiene color. Cuando no lo tiene, el unico
        canal que queda es la luz — y entonces si hay que oscurecer mas, que es
        justamente lo que la medida desaconsejaba para las piezas con color.

        Se mira la saturacion media de lo destacado y se decide con ella. No es un caso
        especial escrito a mano: **es la misma regla leida en la pieza que toca**.    */
    if (alfa == null && !quita) {
      var sSum = 0, sN = 0;
      for (var y = 0; y < parts.length; y++) {
        var pq = parts[y];
        if (!pq.userData || !enc[pq.userData.name]) continue;
        pq.traverse(function (o) {
          if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color) return;
          var cb = o.userData._colBase || o.material.color;
          var hi = Math.max(cb.r, cb.g, cb.b), lo = Math.min(cb.r, cb.g, cb.b);
          sSum += hi ? (hi - lo) / hi : 0; sN++;
        });
      }
      var sat = sN ? sSum / sN : 1;
      //  el umbral sale de la paleta: el verde del bloque satura 0,50 y el gris del
      //  aire 0,08. Por debajo de 0,18 no hay color que conservar.
      if (sat < 0.18) a = 0.24;
      this.__satDestacado = Math.round(sat * 1000) / 1000;
      this.__alfaUsado = a;
    }
    var quita = !destacadas || !destacadas.length;

    function escenario(o) {
      for (var b = o; b; b = b.parent) if (FUERA_DEL_MONTAJE[b.name]) return true;
      return false;
    }
    /*  ¿esta malla cuelga de una pieza destacada? se sube por los padres, porque una
        pieza registrada puede ser un `Group` con veinte mallas dentro  */
    function esDestacada(o) {
      for (var b = o; b; b = b.parent)
        if (b.userData && b.userData.name && enc[b.userData.name]) return true;
      return false;
    }
    scene.traverse(function (o) {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      if (escenario(o)) return;
      if (quita || esDestacada(o)) {
        if (o.userData._matVivo) { o.material = o.userData._matVivo; o.userData._matVivo = null; }
        return;
      }
      if (!o.userData._matVivo) {
        o.userData._matVivo = o.material;
        o.material = o.material.clone();
        o.userData._opBase = o.userData._matVivo.opacity != null ? o.userData._matVivo.opacity : 1;
        o.userData._colBase = o.userData._matVivo.color
          ? o.userData._matVivo.color.clone() : new THREE.Color(0x808080);
        o.userData._metBase = o.userData._matVivo.metalness != null
          ? o.userData._matVivo.metalness : 0;
      }
      /*  ── SE APAGA, Y DESDE EL 28 DE SEPTIEMBRE TAMBIEN SE TRANSPARENTA ──
          **ESTA NOTA DECIA LO CONTRARIO Y SE DEJA ENTERA DEBAJO**, porque la medida
          que la escribio sigue siendo cierta y hay que poder leerla:

            > La primera version bajaba la OPACIDAD, y la foto la tumbo: al 28 % el
            > motor se convertia en una radiografia --- se veian los pistones y el
            > cigueñal a traves del bloque ---. Destacaba lo nuevo, si, y a costa de
            > volver el motor una cosa que no es.

          Lo que cambio no es la foto: **es lo que se quiere ver en ella.**  Joel
          eligio el 20 % con quince fotos delante, sabiendo que a ese grado se ven los
          pistones a traves del bloque --- se lo dijeron las fotos y lo dijo el que se
          las dio ---.  *Una medida puede seguir siendo verdad y haber dejado de ser
          el criterio.*

          Asi que ahora se hacen las dos cosas: se lleva el color hacia el fondo del
          compartimento, se le apaga el brillo propio **y se baja la opacidad a
          `OPACO_ATENUADO`**.  Lo de siempre se recupera poniendolo a `null`.
          La opacidad de base se sigue respetando --- se toma la menor de las dos ---,
          asi que un vaso de cristal no se vuelve mas opaco por atenuarlo.        */
      /*  ── NI TRANSPARENTE NI MAS CLARO: SIN COLOR Y CON MENOS LUZ ────────
          La segunda version llevaba el color hacia el gris claro del compartimento, y
          **la foto volvio a tumbarla**: el motor atenuado salia MAS BRILLANTE que sin
          atenuar — la cosa mas luminosa del cuadro era justamente la que se queria
          callar. *Apagar no es aclarar.*

          Lo que se hace es lo que hace el ojo cuando algo pasa a segundo plano: **se
          le quita el color y se le baja la luz.** El color se lleva a su propio gris
          —su luminancia, asi que una pieza clara sigue siendo clara respecto de una
          oscura y no se pierde la forma— y ese gris se multiplica. El color se
          convierte entonces en lo que distingue lo nuevo, que es todo el punto.    */
      var b0 = o.userData._colBase;
      var gris = 0.2126 * b0.r + 0.7152 * b0.g + 0.0722 * b0.b;
      var k = 0.30 + 0.70 * a;
      o.material.color.setRGB(gris * k, gris * k, gris * k);
      if (o.material.emissive) o.material.emissive.setRGB(0, 0, 0);
      /*  el metal apagado sigue reflejando y devuelve el brillo que se le acaba de
          quitar: un cromado atenuado sale mas claro que el bloque sin atenuar  */
      if (o.material.metalness != null) o.material.metalness = o.userData._metBase * a;

      /*  ── Y SI SE HA PEDIDO GRADO, ADEMAS SE TRANSPARENTA ────────────────────
          `depthWrite` tiene que irse con la transparencia y no es un detalle: una
          malla transparente que SIGUE escribiendo profundidad tapa igual a la que
          tiene detras --- se veria translucida y no dejaria ver nada ---, que es
          justo lo contrario de lo que se pide.
          La opacidad de base se respeta: un vaso de cristal no se vuelve mas opaco
          por atenuarlo, asi que se toma la menor de las dos.                      */
      if (OPACO_ATENUADO != null) {
        o.material.transparent = true;
        o.material.opacity = Math.min(o.userData._opBase, OPACO_ATENUADO);
        o.material.depthWrite = false;
      }
    });
    ANIM.dirty = true; despierta();

    /*  ── ¿SE VE LO QUE SE HA DESTACADO? ────────────────────────────────────
        **No se apaga el motor entero para señalar algo que no se ve.** `2.3` añade los
        pistones, las camisas y el cigueñal —o sea la posicion 6 entera— y los ensena
        con el motor CERRADO desde babor: atenuar dejaba la pantalla en gris con el
        destacado dentro del bloque, invisible. *Lo canto la foto, no una comprobacion.*

        Se usa el mismo rayo que decide si se ve la chapa de una pieza: se tira desde la
        camara a la cara delantera de cada destacada y se mira si algo se interpone.
        **Devuelve cuantas se ven de verdad**, y quien llama decide: cero destacadas a
        la vista, atenuar no arregla nada y estorba.                                 */
    var seVen = 0;
    if (!quita && typeof rayClear === "function" && typeof occluders !== "undefined") {
      var _p = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3();
      for (var z = 0; z < parts.length; z++) {
        var pz = parts[z];
        if (!pz.visible || !pz.userData || !enc[pz.userData.name]) continue;
        pz.getWorldPosition(_p);
        _d.copy(camera.position).sub(_p);
        var dd = _d.length();
        if (dd < 0.6) { seVen++; continue; }
        _d.multiplyScalar(1 / dd);
        var bb2 = new THREE.Box3(), bs2 = new THREE.Sphere();
        var rr2 = 0.3;
        try { bb2.setFromObject(pz); bb2.getBoundingSphere(bs2);
              if (isFinite(bs2.radius) && bs2.radius > 0) rr2 = Math.min(1.1, bs2.radius * 0.8); }
        catch (e) {}
        _a.copy(_p).addScaledVector(_d, rr2);
        if (rayClear(_a, pz, occluders)) seVen++;
      }
    }
    this.__seVen = seVen;
    return this;
  },

  /*  CUANTAS DE LAS DESTACADAS SE VEN DE VERDAD · lo deja `atenua`.  */
  seVenDestacadas: function () { return this.__seVen || 0; },

  /*  LA SATURACION DE LO DESTACADO Y EL APAGADO QUE SE USO · para el arnes.  */
  __apagado: function () {
    return { satDestacado: this.__satDestacado, alfa: this.__alfaUsado };
  },

  /*  QUE HAY ATENUADO · para el arnes y para el boton de la pantalla.  */
  atenuadas: function () {
    var n = 0;
    scene.traverse(function (o) { if (o.isMesh && o.userData && o.userData._matVivo) n++; });
    return n;
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
