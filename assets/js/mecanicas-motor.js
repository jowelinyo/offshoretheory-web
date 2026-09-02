/*  ═══════════════════════════════════════════════════════════════════════════════
    LOS DOS MANDOS DEL MOTOR · piezas del kit, no de una pantalla
    ───────────────────────────────────────────────────────────────────────────────
    Escrito el 30 de agosto de 2026, paso 6 de la construcción.

    Son dos, y no más:

      MONTAJE     diecisiete posiciones, del hueco vacío al motor completo
      RECORRIDO   lleva un fluido por su circuito — gasóleo, aceite, dulce, salada

    ── POR QUÉ VIVEN AQUÍ Y NO DENTRO DE UNA PANTALLA ─────────────────
    Es la misma razón que `mecanicas.js` para el módulo del RIPA: **once pantallas de
    la P1 usan el montaje y catorce usan el recorrido.** Escritos una vez, una mejora
    las mejora a todas; escritos veintiséis veces, la vigesimosexta se olvida.

    Y hay una segunda, que este proyecto ya pagó dos veces —el dibujo del tope y las
    dos tablas de luces—: **dos copias de lo mismo se separan sin que nadie lo note.**

    ── EL MONTAJE NO ES ESTADO DEL ALUMNO ─────────────────────────────
    **Es consecuencia de dónde está.** Cada una de las 66 pantallas declara su
    posición en el temario —comprobado corriendo `cuenta-motor.py`: 66 de 66— así que
    abrir una pantalla implica su montaje y no hace falta recordar nada.

    Eso resolvió de golpe las cuatro preguntas que parecían pedir estado compartido:
    entrar directo a `P1b`, borrar el progreso, cruzar tres ficheros, y no reiniciarse.
    **Y por eso `visto.js` no se toca**, que es pieza de los treinta y ocho capítulos.

    ── EL DESLIZADOR LLEGA HASTA DONDE LA PANTALLA DECLARA, Y NO MÁS ──
    *(decidido por Joel el 30 de agosto de 2026)*

    En la fase 3 el alumno no puede subir el montaje para mirar la hélice. **Y ese
    «no» ES la lección**: no puede mirarla porque **no existe todavía**, y eso enseña
    que un motor es una pila de sistemas que se apoyan unos en otros. **Un módulo que
    deja saltar al final no enseña orden: enseña un catálogo.**

    Y la alternativa —que llegara hasta donde el alumno haya llegado en el curso—
    **queda DESCARTADA, no pendiente**, por un fallo que la hunde: dos alumnos verían
    pantallas distintas en la misma lección, **y entonces una pregunta que se contesta
    mirando deja de tener una respuesta.**

    ── LO QUE SE MUEVE DENTRO DE UNA PANTALLA NO SE GUARDA ────────────
    Si el alumno mueve el deslizador para explorar, al volver encuentra la posición
    que la pantalla declara. La razón ya estaba escrita en `visto.js` y es la buena:

      «volver a una pantalla a medio resolver es peor que volver a ella entera,
       porque el alumno no sabe qué parte de lo que ve la hizo él.»
    ═══════════════════════════════════════════════════════════════════════════════ */
"use strict";

/*  LO QUE CADA POSICIÓN AÑADE. Sale del temario, y es lo único que este fichero sabe
    del contenido: qué sistemas están encendidos en cada punto del montaje.

    Las diecisiete no encienden diecisiete cosas distintas —el modelo tiene cuatro
    grupos— así que lo que crece es **qué partes de cada grupo se ven**. El motor lo
    hace la figura; aquí sólo se dice hasta dónde.                                */
const MONTAJE_TOPE = 16;

/*  ── LOS CUATRO GRUPOS, POR POSICIÓN ────────────────────────────────
    El modelo agrupa por sistema (`com`, `ref`, `tra`, `est`) y el montaje va por
    FASES, que no es lo mismo. Esta tabla es el puente, y **es la única traducción
    entre el temario y la figura**: si algún día el modelo se reagrupa por fase, esta
    tabla desaparece y no hay que tocar nada más.                                 */
/*  LA TABLA VIEJA ESTABA AQUI, Y DABA CUATRO IMAGENES PARA DIECISIETE
    POSICIONES. Expresaba el montaje con los cuatro interruptores de sistema, y
    medido en la figura: 0-3, 4-8, 9-14 y 15-16 eran identicas. El deslizador de
    `1.2`, `1.3` y `1.4` no cambiaba nada, y `1.1` -«antes de que haya motor, hay
    un agujero»- ensenaba el motor entero con 170 mallas.

    Se sustituye por la tabla de piezas de abajo, que enciende por nombre. Los
    interruptores de sistema siguen existiendo para lo que son: el panel de
    sistemas del alumno, no el montaje.                                      */
/*  ═══ LAS DIECISIETE POSICIONES · QUE ANADE CADA UNA ═══════════════
    Transcrita del temario, fase por fase, de sus tablas «pieza · nombre en el
    modelo · montaje». **No se inventa nada aqui**: si una posicion no tuviera pieza
    que encender seria un hueco del temario, no de esta tabla.

    ES ACUMULATIVA. Cada posicion anade a la anterior; `MONTAJE_PIEZAS[n]` se calcula
    sumando de 0 a n. Asi la tabla dice lo mismo que el temario -«montaje 7: deposito,
    decantador y bomba de alimentacion»- y no repite ochenta nombres por fila.       */
const MONTAJE_ANADE = [
  /*  0 · el compartimento vacio ─ casco, espuma y bancadas son escenografia y no
         son piezas registradas: estan siempre. La sentina SI lo es, y es la
         respuesta de `1.1`.                                                      */
  ["Bilge"],
  /*  1 · los soportes  ·  `1.2`                                                  */
  ["Engine mount (flexible mount)"],
  /*  2 · el bloque y el carter  ·  `1.3`                                         */
  ["Engine block", "Oil sump"],
  /*  3 · culata, tapa de balancines y campana  ·  `1.4` — **el motor cerrado**.
         `Timing cover` entra aqui: `1.4` la nombra («se nombra en 1.4, sin
         pantalla») y esta registrada, asi que si no entrara no apareceria nunca. */
  ["Cylinder head & valves", "Rocker cover", "Timing cover", "Bell housing"],
  /*  4 · ciguenal, bielas y pistones ─ DENTRO del bloque  ·  `2.1`               */
  ["Crankshaft", "Connecting rod", "Piston",
   "Piston (cyl. 2)", "Piston (cyl. 3)", "Piston (cyl. 4)"],
  /*  5 · camisas, valvulas e inyectores ─ la camara se cierra  ·  `2.2`          */
  ["Cylinder / liner", "Liner (cyl. 2)", "Liner (cyl. 3)", "Liner (cyl. 4)",
   "Valve spring", "Injector",
   "Injector (cyl. 2)", "Injector (cyl. 3)", "Injector (cyl. 4)"],
  /*  6 · filtro, colectores y turbo ─ el motor puede respirar  ·  `2.7` y `2.8`  */
  //     `Crankcase breather` entra aqui, y NO es un anadido mio: la tabla de
  //     «falta» de la fase 4 dice «esta modelado pero es DE AIRE y se quedo en la
  //     fase 2», y la posicion de aire es esta. El hueco estaba en la tabla de
  //     piezas de la fase 2, que no lo listaba; la prosa si lo colocaba.
  ["Air filter", "Intake manifold", "Exhaust manifold", "Turbocharger", "Crankcase breather",
   "Decompressor lever", "Decompressor (2)", "Decompressor (3)", "Decompressor (4)"],
  /*  7 · deposito, decantador y bomba de alimentacion  ·  `3.1` y `3.2`          */
  ["Fuel tank", "Fuel tank valve", "Primary filter / water separator", "Primary filter element",
   "Lift / priming pump"],
  /*  8 · filtro fino, bomba de inyeccion, purgas y mandos  ·  `3.3` y `3.5`      */
  ["Secondary fuel filter", "Bleed screw (fine filter)", "Injection pump",
   "Bleed screw (injection pump)", "Throttle & stop cables", "Return line"],
  /*  9 · el carter deja de estar mudo ─ colador, bomba, filtro y galeria  ·  `4.1` */
  ["Oil pickup strainer", "Oil pump", "Oil filter", "Main oil gallery"],
  /* 10 · varilla, tapon, sensor y enfriador  ·  `4.4`, `4.5` y `4.7`             */
  ["Oil dipstick", "Oil filler cap", "Oil pressure sender", "Oil cooler",
   "Oil extraction pump"],
  /* 11 · una correa, tres trabajos ─ y el circuito de agua dulce  ·  `5.1`       */
  ["Freshwater (circulating) pump", "Alternator", "Crankshaft pulley (damper)",
   "Idler / tensioner pulley", "Drive belt", "Water jacket (cooling)", "Thermostat"],
  /* 12 · por donde se va el calor  ·  `5.4` y `5.5`                              */
  ["Heat exchanger", "Tube bundle (raw water)", "Heat exchanger anode",
   "Header (expansion) tank", "Temperature sender"],
  /* 13 · dos agujeros en el barco  ·  `6.1` y `6.2`                              */
  ["Seacock", "Raw-water strainer", "Raw-water pump (impeller)"],
  /* 14 · donde el escape se moja  ·  `6.3`                                       */
  ["Vented (anti-siphon) loop", "Exhaust mixing elbow",
   "Waterlock / exhaust silencer", "Exhaust outlet (transom)"],
  /* 15 · el circuito electrico, y la vuelta que nadie mira  ·  `7.1` y `7.2`     */
  ["Engine-start battery", "Domestic battery", "Battery isolator switch",
   "Split-charge relay", "Main positive cable", "Earth (ground) strap",
   "Wiring loom", "Starter motor", "Flywheel",
   /*  LOS BORNES son de la P2 —`flatbatt` los aprieta— y llegan con sus baterias.
       **Una pieza registrada que no esta en ninguna posicion no se ve NUNCA**:
       `verPiezas` enciende lo que la lista nombra y apaga el resto. Las cinco piezas
       nuevas de la P2 dieron cero desde las seis camaras y acercadas, y no era que
       estuvieran tapadas — era que no estaban en el montaje.                       */
   "Battery terminals"],
  /* 16 · la transmision ─ de un agujero vacio a un barco que anda  ·  `8.x`      */
  ["Gearbox / reverse gear", "Flexible coupling", "Propeller shaft",
   "Stern gland (stuffing box)", "Propeller", "Gearbox dipstick",
   //  y lo que el taller `gland` toca: la tuerca —que ya existia sin nombre— y el
   //  engrasador, que es nuevo.
   "Gland packing nut", "Stern tube greaser"]
];


/*  ═══ LO QUE DECIDIO JOEL, Y NO SE VUELVE A ADIVINAR ═══════════════
    `adopta()` reparte con dos reglas que no adivinan; lo que ninguna alcanza es
    **contenido**. Cuando Joel lo decide, entra aqui con su razon, y la regla deja de
    tener que opinar.

    Se identifican por geometria + color + centro -en una escena determinista son
    estables- y `adopta()` **exige que cada fila case exactamente una malla**: si el
    modelo cambia y una fila deja de casar, canta en vez de asignar de menos.

    ── EL COLOR DICE QUE FLUYE, NO A QUE SISTEMA PERTENECE LA PIEZA ──
    Dudé del gris de la brida del termostato: los azules de la casa -`raw` 0x46a0c4,
    `cool` 0x3a64c0- son del FLUIDO. La fontaneria que lo contiene es metal. **Una
    brida gris con sus dos toricas es exactamente lo que debe ser**, y el gris no dice
    nada en contra de que sea refrigeracion.                                        */
const FONTANERIA_DECIDIDA = [
  /*  ── LOS NUEVE DEL BLOQUE · POSICION 2, con el bloque ────────────
      Discos del diametro de un cilindro en el eje de los cilindros, placas verticales
      finas que bajan al carter, dos cilindros pequenos junto a la bomba de aceite, y
      una brida con su torica. **Conductos internos del bloque y sus juntas**: son
      estructura y entran con el.                                                 */
  /*  AQUI HABIA TRES FILAS MAS -«los tres discos del bloque»- Y ERAN UNA MALA
      IDENTIFICACION MIA. Medida su cadena de padres:  Mesh < gasGroup < sys:com.
      Son las flechas del gas del ciclo de cuatro tiempos, y los colores lo dicen:
      naranja de combustion, gris de escape, azul de admision. **No son conductos
      del bloque.** Como sobreimpresion que son, quedan fuera del montaje y no
      necesitan fila.                                                          */
  { geo: "Box",      col: "6e7a85", c: [-2.4, -0.41, 0],   pos: 2, que: "placa vertical hacia el carter" },
  { geo: "Cylinder", col: "6e7a85", c: [-2.4, -1.06, 0],   pos: 2, que: "conducto bajo, junto a la bomba" },
  { geo: "Box",      col: "6e7a85", c: [0.8, -1.09, 0],    pos: 2, que: "placa vertical hacia el carter" },
  { geo: "Cylinder", col: "6e7a85", c: [2.4, -1.06, 0],    pos: 2, que: "conducto bajo, cilindro 4" },
  { geo: "Box",      col: "aab4be", c: [-2.4, 1.9, 0],     pos: 2, que: "brida" },
  { geo: "Torus",    col: "aab4be", c: [-2.28, 2.22, -0.04], pos: 2, que: "torica de la brida" },

  /*  ── LOS CUATRO DEL TERMOSTATO · POSICION 11 ─────────────────────
      Un tubito vertical de 0,6 de alto, un disco plano y dos anillos, todos en el
      cilindro 1 entre el bloque y la culata. **Un paso de refrigerante que sube a la
      culata es de refrigeracion**, y la 11 es donde entran las camisas de agua y el
      termostato.                                                                 */
  { geo: "Cylinder", col: "aab4be", c: [-2.4, 1.55, 0.36],  pos: 11, que: "paso de refrigerante a la culata" },
  { geo: "Cylinder", col: "6e7a85", c: [-2.4, 1.25, 0.36],  pos: 11, que: "disco del paso" },
  { geo: "Torus",    col: "aab4be", c: [-2.55, 1.64, 0.27], pos: 11, que: "torica del paso" },
  { geo: "Torus",    col: "14181d", c: [-2.46, 1.49, 0.9],  pos: 11, que: "torica del paso" },

  /*  ── LA ABRAZADERA TURBO-CODO · POSICION 14, con el codo ─────────
      Donde el escape se encuentra con el agua salada. Esa union esta en la frontera
      **por definicion**, y el temario ya mete el codo de mezcla en la 14.        */
  { geo: "Torus", col: "aab4be", c: [3.64, 1.04, -1.19], pos: 14, que: "abrazadera turbo-codo" },

  /*  ── EL TUBO AZUL LARGO · POSICION 13 ────────────────────────────
      IDENTIFICADO POR SU ORIGEN, no por sus extremos. Sus extremos caian junto al
      interruptor de baterias y a una biela -dos piezas sin nada que ver entre si-
      porque es un tubo de dos metros que pasa cerca de todo: **la vecindad daba una
      respuesta falsa.** El fuente no: `motor3d.js:1025`,
          hoseRun(groups.ref, [...], 0.1, rawH);   // filtro -> bomba sal
      Es la manguera de agua salada del filtro a la bomba de rodete, y la 13 es donde
      entran esas dos piezas. Tiene dos hermanas identicas en 1024 y 1026.      */
  { geo: "Tube", col: "46a0c4", c: [-2.4, -0.9, -1.47], pos: 13,
    que: "manguera de agua salada, filtro -> bomba de rodete" }
];

/*  EL MAPA NOMBRE -> POSICION, calculado y no escrito a mano. Lo usa
    `Motor3D.adopta()` para darle posicion a la fontaneria sin nombre.        */
const MONTAJE_POS = (function () {
  const m = {};
  MONTAJE_ANADE.forEach(function (fila, n) {
    fila.forEach(function (nom) { if (m[nom] == null) m[nom] = n; });
  });
  return m;
})();

/*  y la acumulada, que es la que usa la mecanica  */
const MONTAJE_PIEZAS = MONTAJE_ANADE.map(function (_, n) {
  return MONTAJE_ANADE.slice(0, n + 1).reduce(function (a, b) { return a.concat(b); }, []);
});


/*  ═══ M-MONTAJE ═══════════════════════════════════════════════════
    Un deslizador que va del hueco vacío al motor entero.

    ENSEÑA SIN QUE SE TOQUE NADA, que es el primer principio de la casa: puesto en su
    posición ya muestra el motor hasta ahí. Lo que el alumno gana moviéndolo es ver
    **el orden**, que es lo que la fase 1 enseña con las juntas y la 8 con el arco.  */
function MMontaje(o) {
  o = o || {};
  const fig = o.figura;                 //  la pieza 3D · `Motor3D`
  const tope = Math.max(0, Math.min(MONTAJE_TOPE, o.tope != null ? o.tope : MONTAJE_TOPE));
  const inicio = Math.max(0, Math.min(tope, o.inicio != null ? o.inicio : tope));
  let n = inicio;

  function pinta() {
    if (!fig) return;
    /*  POR PIEZA, NO POR SISTEMA. Los cuatro interruptores no pueden expresar
        diecisiete pasos: daban cuatro imagenes. Aqui se enciende por nombre.    */
    const k = Math.max(0, Math.min(MONTAJE_TOPE, n));
    /*  LA FONTANERIA SE ADOPTA UNA VEZ POR FIGURA. Es un recorrido de la escena
        con una caja envolvente por malla; hacerlo en cada movimiento del
        deslizador se notaria. `fig.__adoptado` lo recuerda.                 */
    if (fig.adopta && !fig.__adoptado) {
      fig.__adoptado = fig.adopta(MONTAJE_POS, FONTANERIA_DECIDIDA);
    }
    if (fig.verPiezas) fig.verPiezas(MONTAJE_PIEZAS[k], k);
    if (o.alMover) o.alMover(n);
  }

  pinta();                              //  ← enseña recién montado, sin un gesto

  return {
    /*  EL CONTRATO DE LA CASA: toda mecánica devuelve algo de `ensena()` recién
        montada y sin que se toque nada. Un mando que nace mudo no pasa.        */
    ensena() {
      return n === 0
        ? "an empty engine compartment"
        : "the engine, built as far as step " + n + " of " + tope;
    },
    mueve(v) {
      const x = Math.max(0, Math.min(tope, Math.round(v)));
      if (x === n) return n;
      n = x; pinta();
      return n;
    },
    /*  NO SE GUARDA. Cada pantalla declara su posición y se vuelve a ella.     */
    reinicia() { n = inicio; pinta(); return n; },
    donde() { return n; },
    tope() { return tope; }
  };
}

/*  ═══ M-RECORRIDO ═════════════════════════════════════════════════
    Lleva un fluido por su circuito, de 0 a 1.

    **UNO SOLO, PARAMETRIZADO POR FLUIDO.** Gasóleo, aceite, agua dulce y agua salada
    son la misma mecánica cuatro veces: un camino, una posición sobre él, y la cámara
    siguiendo. Lo único que cambia es qué circuito y qué dice cada tramo.

    Y eso no es economía de código: **es lo que hace que la fase 4 no tenga que
    enseñar a usar un mando nuevo.** El alumno aprendió a recorrer con el gasóleo, que
    es el más fácil de imaginar, y llega al aceite sabiendo conducirlo.            */
const RECORRIDOS = {
  fuel:  {clave: "fuel",  fluido: "diesel"},
  lube:  {clave: "lube",  fluido: "oil"},
  cool:  {clave: "cool",  fluido: "coolant"},
  raw:   {clave: "raw",   fluido: "seawater"},
  elec:  {clave: "elec",  fluido: "current"},
  tra:   {clave: "tra",   fluido: "drive"}
};

function MRecorrido(o) {
  o = o || {};
  const fig = o.figura;
  const cfg = RECORRIDOS[o.circuito];
  if (!cfg) throw new Error("circuito desconocido: " + o.circuito);
  let t = o.inicio != null ? Math.max(0, Math.min(1, o.inicio)) : 0;

  function pinta() {
    if (fig && fig.verRecorrido) fig.verRecorrido(cfg.clave, t);
    if (o.alMover) o.alMover(t);
  }
  pinta();

  return {
    ensena() {
      return "the " + cfg.fluido + " at the start of its circuit";
    },
    mueve(v) {
      const x = Math.max(0, Math.min(1, v));
      if (x === t) return t;
      t = x; pinta();
      return t;
    },
    reinicia() { t = o.inicio != null ? o.inicio : 0; pinta(); return t; },
    donde() { return t; },
    fluido() { return cfg.fluido; }
  };
}

/*  ═══ EL ÁNGULO DE CIGÜEÑAL ═══════════════════════════════════════
    No es un tercer mando: es el mismo `M1` de la casa sobre otra magnitud, y la fase
    2 es la única que lo usa. Se escribe aquí porque el kit es donde viven los mandos,
    no porque haga falta compartirlo.                                             */
function MAngulo(o) {
  o = o || {};
  const fig = o.figura;
  let g = o.inicio != null ? o.inicio : 0;

  function pinta() {
    if (fig && fig.verAngulo) fig.verAngulo(g);
    if (o.alMover) o.alMover(g, fig && fig.estado ? fig.estado() : null);
  }
  pinta();

  return {
    /*  ── LO QUE ENSEÑA EL MANDO SALE DE LA FIGURA, NO DEL MANDO ──────
        La primera versión devolvía una frase fija —«cylinder one, at the start of
        its cycle»— que era verdad sólo en 0°: el alumno movía el ciguëñal medio
        ciclo y el rótulo seguía diciendo lo mismo. **Un rótulo que no cambia con lo
        que rotula es peor que ninguno**, porque parece una medida.

        Ahora se pregunta a `estado()`, que lee el tiempo de los cuatro cilindros de
        `strokeOf` — el mismo cálculo que mueve los pistones.                     */
    ensena() {
      const e = fig && fig.estado ? fig.estado() : null;
      const t = e && e.cilindros ? e.cilindros[0] : null;
      if (!t) return Math.round(g) + "\u00B0 of 720\u00B0";
      return "cyl 1 \u00B7 " + t.charAt(0).toUpperCase() + t.slice(1)
        + " \u00B7 " + Math.round(g) + "\u00B0 of 720\u00B0";
    },
    /*  y los cuatro, para quien los quiera: el orden de encendido se ve aquí.  */
    cilindros() {
      const e = fig && fig.estado ? fig.estado() : null;
      return e && e.cilindros ? e.cilindros : null;
    },
    mueve(v) {
      const x = ((Math.round(v) % 720) + 720) % 720;
      if (x === g) return g;
      g = x; pinta();
      return g;
    },
    reinicia() { g = o.inicio != null ? o.inicio : 0; pinta(); return g; },
    donde() { return g; }
  };
}

/*  ── GIRAR Y ACERCAR NO SON MANDOS ──────────────────────────────────
    Están siempre, en las once pantallas y en los once talleres, y **no cuentan**:
    son la cámara, no la lección. La figura los trae de serie —un dedo gira, dos
    acercan— y ninguna pantalla los enciende ni los apaga.

    Se escribe aquí para que nadie los cuente como el mando de una fase.          */

/*  ── Y LO QUE SE ANIMA SOLO SE DETIENE ──────────────────────────────
    Regla del módulo, y estos tres mandos están del lado bueno: **lo que el alumno
    conduce no se detiene nunca**, porque lo conduce él. Lo que arranca solo —las
    burbujas del purgado, el humo, los chorros del espejo— se muestra unos segundos
    y se para, y eso lo lleva la figura.                                          */

/*  ── `MOrden` · PONER TRES COSAS EN SU ORDEN ────────────────────────
    POR QUÉ EXISTE, y no es una forma más de preguntar. Hay lecciones del módulo que
    **son** un orden: el sentido del purgado, el orden de encendido, la secuencia del
    WOBBLE. Preguntar por un orden con opciones convierte *ordenar* en *reconocer la
    frase que lo dice*, que es otra cosa y más fácil.

    Y HAY UNA RAZÓN MÁS FUERTE, que es la que lo decidió: **un orden se puede verificar
    contra el dato.** `JOURNEY.fuel` trae los pasos del circuito en su orden real, así
    que un arnés puede exigir que el orden que la pantalla declara coincida con el del
    circuito, y cantar si alguien cambia uno de los dos y no el otro. El acierto de una
    pregunta de opciones es una cadena escrita a mano que nadie contrasta.

    ── EL GESTO ES TOCAR, NO ARRASTRAR ──────────────────────────────
    Arrastrar en un teléfono es frágil, y un blanco de arrastre choca con el mínimo de
    44×44 de la casa. Aquí **se toca en orden**: cada elemento se numera al pulsarlo, y
    volver a pulsarlo lo quita —y quita también a los que iban detrás, porque un orden
    con un hueco en medio no es un orden—.

    No se juzga hasta que están los tres. Antes no hay respuesta que juzgar.        */
function MOrden(o) {
  o = o || {};
  const piezas = (o.piezas || []).slice();     //  como se le enseñan, ya barajadas
  const bueno = (o.orden || []).slice();       //  el orden correcto
  let puestos = [];                            //  lo que el alumno lleva puesto

  function avisa() {
    if (o.alMover) o.alMover(puestos.slice(), puestos.length === bueno.length);
  }

  return {
    /*  el número que le toca a cada uno, o 0 si aún no se ha tocado  */
    numeroDe(pieza) { return puestos.indexOf(pieza) + 1; },
    lista() { return piezas.slice(); },
    puestos() { return puestos.slice(); },
    completo() { return puestos.length === bueno.length; },

    /*  TOCAR · pone el siguiente número, o quita desde ése hacia atrás  */
    toca(pieza) {
      const i = puestos.indexOf(pieza);
      if (i >= 0) puestos = puestos.slice(0, i);   //  quita éste y los de detrás
      else if (puestos.length < bueno.length) puestos.push(pieza);
      avisa();
      return puestos.slice();
    },

    reinicia() { puestos = []; avisa(); return puestos; },

    /*  ¿ACIERTA? Sólo tiene sentido con los tres puestos, y se compara posición a
        posición: un orden es correcto entero o no lo es.                        */
    acierta() {
      if (puestos.length !== bueno.length) return null;
      for (let k = 0; k < bueno.length; k++) if (puestos[k] !== bueno[k]) return false;
      return true;
    },

    /*  y QUÉ ORDEN es el bueno, para que el arnés lo pueda cotejar con el dato  */
    elBueno() { return bueno.slice(); }
  };
}

/*  ═══ `MTaller` · UNA SECUENCIA DE GESTOS ═══════════════════════════════════
    LA QUINTA MECÁNICA, y la de la P2 entera. Las cuatro anteriores conducen una
    magnitud —la posición del montaje, el ángulo, el tramo del recorrido, el orden—;
    ésta conduce **un trabajo**: una lista de pasos, cada uno con su gesto sobre la
    figura.

    LA REGLA DE LA PARTE, de Joel: **cada taller es una secuencia y se hace con las
    manos; si un paso no exige tocar algo, sobra.** Por eso un paso sin `gesto` no es
    un paso — y este mecanismo lo dice en voz alta en vez de dejarlo pasar.

    ── EL ENCUADRE SE PONE UNA VEZ ───────────────────────────────
    *(criterio de Joel, 1 de septiembre de 2026)* **Un mecánico se coloca una vez.** La
    cámara que salta rompe lo que un taller enseña, que es la secuencia: si el encuadre
    cambia entre el paso 3 y el 4, el alumno se reorienta en vez de ver una cosa
    después de otra sobre la misma escena.

    Así que el taller enfoca **al abrir**, y sobre `fijo` — la pieza que NO se mueve,
    el vaso del filtro, el cuerpo de la bomba—, porque el conjunto crece al abrirse y
    encuadrar sobre él pone la cámara donde estaba antes de empezar el trabajo.

    **Un paso puede pedir su propio encuadre, y se reserva para cuando el taller cambia
    de sitio de verdad** — de la bomba al intercambiador a buscar las palas. Ahí sí
    mueves la cabeza; levantar una tapa no.

    ── Y LOS GESTOS SE ACUMULAN ──────────────────────────────────
    Ir al paso 4 deja la figura como la dejaron los pasos 1, 2 y 3: **un taller es lo
    que llevas hecho, no una foto suelta.** Por eso `vaA` rehace desde el principio en
    vez de aplicar sólo el gesto del paso — así retroceder también funciona, y el
    alumno puede volver atrás sin que la figura mienta.                              */
function MTaller(o) {
  o = o || {};
  const fig = o.figura;
  const pasos = (o.pasos || []).slice();
  const fijo = o.fijo || null;
  const camara = o.camara || null;
  let i = 0;

  if (!pasos.length) throw new Error("un taller sin pasos no es un taller");

  function encuadra(paso) {
    if (!fig) return;
    //  el encuadre propio de un paso manda; si no lo trae, no se toca nada
    if (paso && paso.camara && fig.verCamara) fig.verCamara(paso.camara, false);
    if (paso && paso.enfoque && fig.enfocar) fig.enfocar(paso.enfoque, false, true);
  }

  function pinta() {
    if (!fig) { if (o.alPaso) o.alPaso(i, pasos[i]); return; }
    //  1 · todo a su reposo, para que retroceder no deje nada puesto
    if (fig.reposo) fig.reposo();
    //  2 · los gestos de los pasos hechos, en orden
    for (let k = 0; k <= i; k++) {
      const p = pasos[k];
      if (p && p.gesto && fig.gesto) fig.gesto(p.gesto[0], p.gesto[1]);
    }
    //  3 · y el encuadre del paso, si lo pide
    encuadra(pasos[i]);
    if (o.alPaso) o.alPaso(i, pasos[i]);
  }

  //  el encuadre inicial: una vez, y sobre lo que no se mueve
  if (fig) {
    if (camara && fig.verCamara) fig.verCamara(camara, false);
    if (fijo && fig.enfocar) fig.enfocar(fijo, false, true);
  }
  pinta();

  return {
    donde() { return i; },
    cuantos() { return pasos.length; },
    paso() { return pasos[i]; },
    vaA(n) {
      const x = Math.max(0, Math.min(pasos.length - 1, n | 0));
      if (x === i) return i;
      i = x; pinta();
      return i;
    },
    siguiente() { return this.vaA(i + 1); },
    anterior() { return this.vaA(i - 1); },
    terminado() { return i === pasos.length - 1; },
  };
}

/*  ══ EL MANDO DEL HUMO ══════════════════════════════════════════════════════════
    LA SEXTA MECANICA, y la mas pequeña de las seis. `9.3` deja al alumno cambiar el
    color del humo que sale por el espejo, y **eso es una eleccion entre tres, no un
    recorrido**: por eso no es un deslizador. Un deslizador entre azul, negro y blanco
    sugeriria que hay algo en medio, y no lo hay — son tres estados de un motor y cada
    uno manda a un sitio distinto.

    LOS TRES NO SE ESCRIBEN AQUI. Se le preguntan a la figura con `humos()`, que los
    saca de `HUMOS`. **Lo que se escribe a mano se queda viejo callando**, y en este
    modulo esa factura se pago siete veces el mismo dia.

    Y `ensena()` no dice el color: dice **a donde te manda**, que es la leccion de la
    pantalla. Un rotulo que repite el boton que acabas de pulsar no enseña nada — es
    la misma leccion que `MAngulo` aprendio con su frase fija.                    */
function MHumo(o) {
  o = o || {};
  const fig = o.figura;
  //  los que la figura tiene, en el orden en que la pantalla los cuenta
  const ORDEN = ["blue", "black", "white"];
  const hay = (fig && fig.humos) ? fig.humos() : ORDEN.slice();
  const COLORES = ORDEN.filter(c => hay.indexOf(c) >= 0)
                       .concat(hay.filter(c => ORDEN.indexOf(c) < 0));
  const MANDA = {
    blue:  "oil getting into the chamber \u00B7 rings, bores, valve guides",
    black: "fuel burning badly \u00B7 air first, then injection",
    white: "water, or fuel that is not burning at all \u00B7 the head gasket"
  };
  let cual = o.inicio && COLORES.indexOf(o.inicio) >= 0 ? o.inicio : COLORES[0];

  function pinta() {
    if (fig && fig.verHumo) fig.verHumo(cual);
    if (o.alMover) o.alMover(cual);
  }
  pinta();

  return {
    colores() { return COLORES.slice(); },
    cual() { return cual; },
    ensena() {
      const c = cual.charAt(0).toUpperCase() + cual.slice(1);
      return c + " \u00B7 " + (MANDA[cual] || "");
    },
    /*  UN COLOR QUE NO EXISTE NO SE PONE Y NO SE CALLA. La figura ya lo anota en
        `queFalta`, y aqui se devuelve el que quedo puesto para que quien llame pueda
        exigirlo. *Un mando que acepta cualquier cosa dibuja la nada en silencio*, que
        es lo que `MRecorrido` aprendio con los circuitos inventados.            */
    mueve(v) {
      if (COLORES.indexOf(v) < 0) return cual;
      if (v === cual) return cual;
      cual = v;
      pinta();
      return cual;
    },
    reinicia() {
      const v = o.inicio && COLORES.indexOf(o.inicio) >= 0 ? o.inicio : COLORES[0];
      return this.mueve(v) === v ? v : (cual = v, pinta(), v);
    }
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MMontaje, MRecorrido, MAngulo, MOrden, MTaller, MHumo,
                     MONTAJE_TOPE, MONTAJE_ANADE, MONTAJE_PIEZAS,
                     MONTAJE_POS, FONTANERIA_DECIDIDA, RECORRIDOS };
}
