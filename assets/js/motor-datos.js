/*  LOS DATOS DEL MOTOR --- generado, no se edita a mano.

    QUE HAY AQUI Y POR QUE NO ESTA DENTRO DE `motor3d.js`:

    · `piezas` --- LA METADATA DE LAS 108 PIEZAS del motor de siempre: nombre,
      sistema, direccion y magnitud de despiece, si se secciona, si se pincha, su
      numero de indice, **su descripcion y su nota de patron**. No se ha perdido
      ni una palabra al cambiar la figura: 99 descripciones y 32 numeros.
      *Se saco EJECUTANDO el motor viejo y volcando `parts`, no leyendo el fuente:
      los nombres de pistones e inyectores se calculan en un bucle
      --- `p===0?'Piston':'Piston (cyl. '+(p+1)+')'` --- y una expresion regular
      habria fallado justo en esos doce.*

    · `cinematica` --- la biela-manivela: carrera, largo de biela, altura de
      compresion, donde cae cada cilindro, el desfase de cada codo y el orden de
      encendido. Es LO MISMO con lo que se construyo la figura en Blender.

    · `reposo` y `estados` --- los 18 gestos de los talleres con todos sus
      estados. El primero de cada lista es el de reposo, como siempre.

    Va como `.js` y no como `.json` a proposito: una etiqueta `<script>` se carga
    en orden y sin red, y asi no hay dos cargas asincronas que ordenar.          */
/*  UNA FICHA MENOS QUE PIEZAS TENIA EL MOTOR VIEJO, y a proposito:
    `Note on the ignition key` --- la tarjeta de <NO IMPELLER> atada a la llave ---
    se creaba en `motor3d.js` con `visible = false` y **ninguna linea la encendia
    nunca**. Estaba en `parts` y no se veia jamas. No se lleva al modelo nuevo: una
    ficha sin cuerpo es una pieza que el curso cree tener.
    *Si algun dia esa nota tiene que aparecer de verdad, es un gesto y se hace como
    los otros dieciocho.*                                                          */
window.MOTOR_DATOS = {
 "cinematica": {
  "biela": 0.14,
  "ciclo": [
   0.0,
   540.0,
   180.0,
   360.0
  ],
  "cilindros": [
   -0.162,
   -0.054,
   0.054,
   0.162
  ],
  "codo": 0.045,
  "compresion": 0.042,
  "correa": [
   [
    -0.328,
    -0.11599999999999999,
    0.112
   ],
   [
    -0.328,
    -0.11564068417770004,
    0.10651789992675782
   ],
   [
    -0.328,
    -0.11456888470414087,
    0.10112960010569413
   ],
   [
    -0.328,
    -0.11280294036547404,
    0.09592729584066623
   ],
   [
    -0.328,
    -0.06189992867825622,
    -0.02563978996846101
   ],
   [
    -0.328,
    -0.058023702053557405,
    -0.03349999999999998
   ],
   [
    -0.328,
    -0.05315467379951276,
    -0.04078701574358429
   ],
   [
    -0.328,
    -0.04737615433949871,
    -0.04737615433949866
   ],
   [
    -0.328,
    -0.0407870157435843,
    -0.05315467379951275
   ],
   [
    -0.328,
    -0.03350000000000003,
    -0.058023702053557384
   ],
   [
    -0.328,
    -0.025639789968461,
    -0.06189992867825622
   ],
   [
    -0.328,
    -0.017340876021868883,
    -0.06471703036136758
   ],
   [
    -0.328,
    -0.008745254878743459,
    -0.0664268057120453
   ],
   [
    -0.328,
    -1.23077003314309e-17,
    -0.067
   ],
   [
    -0.328,
    0.008745254878743435,
    -0.0664268057120453
   ],
   [
    -0.328,
    0.017340876021868862,
    -0.06471703036136758
   ],
   [
    -0.328,
    0.025639789968460978,
    -0.06189992867825623
   ],
   [
    -0.328,
    0.03350000000000001,
    -0.05802370205355739
   ],
   [
    -0.328,
    0.04078701574358423,
    -0.053154673799512796
   ],
   [
    -0.328,
    0.047376154339498676,
    -0.0473761543394987
   ],
   [
    -0.328,
    0.05315467379951275,
    -0.04078701574358431
   ],
   [
    -0.328,
    0.05802370205355738,
    -0.03350000000000003
   ],
   [
    -0.328,
    0.06189992867825622,
    -0.025639789968461002
   ],
   [
    -0.328,
    0.1406402655078499,
    0.18413681359668224
   ],
   [
    -0.328,
    0.14194370061496112,
    0.18797660960182183
   ],
   [
    -0.328,
    0.14273479070258813,
    0.1919536880411784
   ],
   [
    -0.328,
    0.14300000000000002,
    0.196
   ],
   [
    -0.328,
    0.14273479070258813,
    0.2000463119588216
   ],
   [
    -0.328,
    0.14194370061496112,
    0.20402339039817816
   ],
   [
    -0.328,
    0.1406402655078499,
    0.2078631864033178
   ],
   [
    -0.328,
    0.1388467875173176,
    0.2115
   ],
   [
    -0.328,
    0.13659395354902829,
    0.21487160429927035
   ],
   [
    -0.328,
    0.13392031021678297,
    0.217920310216783
   ],
   [
    -0.328,
    0.13087160429927033,
    0.2205939535490283
   ],
   [
    -0.328,
    0.1275,
    0.2228467875173176
   ],
   [
    -0.328,
    0.12386318640331778,
    0.2246402655078499
   ],
   [
    -0.328,
    0.12002339039817815,
    0.22594370061496113
   ],
   [
    -0.328,
    0.02724693326287058,
    0.2510459231360939
   ],
   [
    -0.328,
    0.02365473338216145,
    0.2517604561184667
   ],
   [
    -0.328,
    0.02,
    0.252
   ],
   [
    -0.328,
    0.016345266617838555,
    0.2517604561184667
   ],
   [
    -0.328,
    0.012753066737129424,
    0.2510459231360939
   ],
   [
    -0.328,
    0.009284863893777494,
    0.24986862691031603
   ],
   [
    -0.328,
    0.006000000000000007,
    0.2482487113059643
   ],
   [
    -0.328,
    0.0029546799877558233,
    0.2462138935281546
   ],
   [
    -0.328,
    0.0002010101267766705,
    0.24379898987322335
   ],
   [
    -0.328,
    -0.10369848480983498,
    0.141698484809835
   ],
   [
    -0.328,
    -0.10732084029223188,
    0.1375679800183663
   ],
   [
    -0.328,
    -0.11037306695894641,
    0.133
   ],
   [
    -0.328,
    -0.11280294036547404,
    0.12807270415933378
   ],
   [
    -0.328,
    -0.11456888470414087,
    0.12287039989430588
   ],
   [
    -0.328,
    -0.11564068417770004,
    0.11748210007324218
   ]
  ],
  "fases": [
   0.0,
   180.0,
   180.0,
   0.0
  ],
  "orden": [
   1,
   3,
   4,
   2
  ]
 },
 "estados": {
  "bornes": [
   "sucios",
   "limpios"
  ],
  "burbujas": [
   "ninguna",
   "con-aire",
   "limpias"
  ],
  "cesta": [
   "dentro",
   "fuera"
  ],
  "correa": [
   "quieta",
   "pulsada"
  ],
  "descompresores": [
   "cerrados",
   "levantados"
  ],
  "elemento-decantador": [
   "puesto",
   "fuera"
  ],
  "filtro-aceite": [
   "puesto",
   "fuera"
  ],
  "filtro-fino": [
   "puesto",
   "fuera"
  ],
  "goteo": [
   "seco",
   "gotas",
   "chorro"
  ],
  "llave-deposito": [
   "abierta",
   "cerrada"
  ],
  "manivela": [
   "guardada",
   "encajada"
  ],
  "palanca-cebado": [
   "arriba",
   "abajo"
  ],
  "palas": [
   "todas",
   "faltan-dos"
  ],
  "rodete": [
   "dentro",
   "fuera"
  ],
  "suciedad": [
   "dentro",
   "vaciada"
  ],
  "tapa-bomba": [
   "puesta",
   "fuera"
  ],
  "tapa-filtro": [
   "puesta",
   "fuera"
  ],
  "varilla": [
   "dentro",
   "fuera",
   "limpia"
  ]
 },
 "piezas": [
  {
   "cut": true,
   "desc": "Cast structure (painted here, as on a real marine engine) that houses the cylinder liners, the crankshaft main bearings and the internal oil and coolant passages. It is the “skeleton” of the engine.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1,
   "n": 31,
   "name": "Engine block",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Look for oil or water leaks at its joints, and check the anodes and mounts. A stain under the engine almost always starts here."
  },
  {
   "cut": true,
   "desc": "Reservoir at the bottom of the engine where the oil collects. The pump draws it through a strainer and delivers it under pressure to the bearings, camshaft and pistons.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 2.4,
   "n": 32,
   "name": "Oil sump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the level with the dipstick before every trip (the “O” in WOBBLE = Oil). Milky oil = water getting in; a level that rises on its own = possible diesel."
  },
  {
   "cut": true,
   "desc": "Housing that joins the block to the gearbox and encloses the flywheel. A side window usually exposes the ring gear for timing the engine.",
   "ex": [
    1,
    0,
    0
   ],
   "exMag": 1,
   "n": null,
   "name": "Bell housing",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Keep this area clean and dry: oil drips from the rear crankshaft seal or the gearbox bell show up here."
  },
  {
   "cut": false,
   "desc": "Anti-vibration support that ties the engine to the boat’s bearers. The rubber block isolates the hull from engine vibration.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Engine mount (flexible mount)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the rubber isn’t cracked or crushed and that the nuts are tight. Sagging mounts throw the shaft out of line and punish the stern gland."
  },
  {
   "cut": false,
   "desc": "Anti-vibration support that ties the engine to the boat’s bearers. The rubber block isolates the hull from engine vibration.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Engine mount (flexible mount)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the rubber isn’t cracked or crushed and that the nuts are tight. Sagging mounts throw the shaft out of line and punish the stern gland."
  },
  {
   "cut": false,
   "desc": "Anti-vibration support that ties the engine to the boat’s bearers. The rubber block isolates the hull from engine vibration.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Engine mount (flexible mount)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the rubber isn’t cracked or crushed and that the nuts are tight. Sagging mounts throw the shaft out of line and punish the stern gland."
  },
  {
   "cut": false,
   "desc": "Anti-vibration support that ties the engine to the boat’s bearers. The rubber block isolates the hull from engine vibration.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Engine mount (flexible mount)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the rubber isn’t cracked or crushed and that the nuts are tight. Sagging mounts throw the shaft out of line and punish the stern gland."
  },
  {
   "cut": false,
   "desc": "Turns the up-and-down motion of the pistons into rotation. On an in-line four the crankpins are set so cylinders 1 and 4 rise together while 2 and 3 fall, giving a firing order of 1-3-4-2 and one power stroke every half turn.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1,
   "n": 13,
   "name": "Crankshaft",
   "noExplodeAnim": true,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Not an on-board maintenance item, but its turning depends on oil: low pressure = risk of damaging the main and big-end bearings."
  },
  {
   "cut": false,
   "desc": "Plunger that takes the pressure of the burning gases and passes it to the connecting rod. Its rings seal the chamber and control the oil on the cylinder wall.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": 11,
   "name": "Piston",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Blue smoke from the exhaust usually means worn rings or valve guides (the engine is “burning oil”). It’s a diagnosis you should know how to read."
  },
  {
   "cut": false,
   "desc": "Plunger that takes the pressure of the burning gases and passes it to the connecting rod. Its rings seal the chamber and control the oil on the cylinder wall.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.12,
   "n": null,
   "name": "Piston (cyl. 2)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Blue smoke from the exhaust usually means worn rings or valve guides (the engine is “burning oil”). It’s a diagnosis you should know how to read."
  },
  {
   "cut": false,
   "desc": "Links the piston to the crankshaft and converts the piston’s linear thrust into turning torque. It works in tension and compression thousands of times a minute.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.3,
   "n": 12,
   "name": "Connecting rod",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal part; its health depends on lubrication. A dry metallic knock at idle can betray play in the big-end bearing."
  },
  {
   "cut": false,
   "desc": "Plunger that takes the pressure of the burning gases and passes it to the connecting rod. Its rings seal the chamber and control the oil on the cylinder wall.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.24,
   "n": null,
   "name": "Piston (cyl. 3)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Blue smoke from the exhaust usually means worn rings or valve guides (the engine is “burning oil”). It’s a diagnosis you should know how to read."
  },
  {
   "cut": false,
   "desc": "Plunger that takes the pressure of the burning gases and passes it to the connecting rod. Its rings seal the chamber and control the oil on the cylinder wall.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.36,
   "n": null,
   "name": "Piston (cyl. 4)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Blue smoke from the exhaust usually means worn rings or valve guides (the engine is “burning oil”). It’s a diagnosis you should know how to read."
  },
  {
   "cut": true,
   "desc": "Bore in which the piston travels up and down. It is usually a replaceable liner; this is where the diesel is compressed and burned.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": 10,
   "name": "Cylinder / liner",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "com",
   "visBase": true,
   "yacht": "Its wear (going oval) reduces compression and power. It explains why an old engine starts worse from cold."
  },
  {
   "cut": true,
   "desc": "Bore in which the piston travels up and down. It is usually a replaceable liner; this is where the diesel is compressed and burned.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Liner (cyl. 2)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "com",
   "visBase": true,
   "yacht": "Its wear (going oval) reduces compression and power. It explains why an old engine starts worse from cold."
  },
  {
   "cut": true,
   "desc": "Bore in which the piston travels up and down. It is usually a replaceable liner; this is where the diesel is compressed and burned.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Liner (cyl. 3)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "com",
   "visBase": true,
   "yacht": "Its wear (going oval) reduces compression and power. It explains why an old engine starts worse from cold."
  },
  {
   "cut": true,
   "desc": "Bore in which the piston travels up and down. It is usually a replaceable liner; this is where the diesel is compressed and burned.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Liner (cyl. 4)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "com",
   "visBase": true,
   "yacht": "Its wear (going oval) reduces compression and power. It explains why an old engine starts worse from cold."
  },
  {
   "cut": true,
   "desc": "Closes the top of the cylinders and forms the combustion chamber. It houses the valves, injectors and coolant passages.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": 14,
   "name": "Cylinder head & valves",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "The head gasket is critical: if it fails it mixes water, oil and gases (white smoke, milky oil, overheating). Watch the temperature and the look of the oil."
  },
  {
   "cut": true,
   "desc": "Cover that closes the top of the cylinder head and contains the oil that lubricates the valves and rockers. It carries the oil filler cap.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.4,
   "n": null,
   "name": "Rocker cover",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "This is where you top up the oil. A worn cover gasket lets oil weep down the sides of the head."
  },
  {
   "cut": false,
   "desc": "Opening through which oil is added to the engine, on top of the rocker cover.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.6,
   "n": null,
   "name": "Oil filler cap",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Fill with the correct oil and don’t overfill. Wipe around it before opening so no dirt gets in."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": false,
   "desc": "Closes the valve firmly after the camshaft has opened it, ensuring the chamber seals on every cycle.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Valve spring",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Internal head component; no on-board attention required."
  },
  {
   "cut": true,
   "desc": "Atomises the diesel at very high pressure into the chamber, at exactly the right instant, so it ignites from the heat of the compressed air (there is no spark plug).",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.7,
   "n": 6,
   "name": "Injector",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Dirty injectors give black smoke, hesitation and hard starting. Calibration is a workshop job, but their failure is diagnosed by the smoke."
  },
  {
   "cut": true,
   "desc": "Atomises the diesel at very high pressure into the chamber, at exactly the right instant, so it ignites from the heat of the compressed air (there is no spark plug).",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.7,
   "n": null,
   "name": "Injector (cyl. 2)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Dirty injectors give black smoke, hesitation and hard starting. Calibration is a workshop job, but their failure is diagnosed by the smoke."
  },
  {
   "cut": true,
   "desc": "Atomises the diesel at very high pressure into the chamber, at exactly the right instant, so it ignites from the heat of the compressed air (there is no spark plug).",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.7,
   "n": null,
   "name": "Injector (cyl. 3)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Dirty injectors give black smoke, hesitation and hard starting. Calibration is a workshop job, but their failure is diagnosed by the smoke."
  },
  {
   "cut": true,
   "desc": "Atomises the diesel at very high pressure into the chamber, at exactly the right instant, so it ignites from the heat of the compressed air (there is no spark plug).",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.7,
   "n": null,
   "name": "Injector (cyl. 4)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Dirty injectors give black smoke, hesitation and hard starting. Calibration is a workshop job, but their failure is diagnosed by the smoke."
  },
  {
   "cut": true,
   "desc": "Internal cavities in the block and head through which the coolant flows around each cylinder to carry away the heat of combustion.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 0.6,
   "n": 23,
   "name": "Water jacket (cooling)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": "You can’t see or touch them, but if they fur up with scale or salt they lose cooling. The correct antifreeze keeps them clean."
  },
  {
   "cut": false,
   "desc": null,
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 1.4,
   "n": null,
   "name": "Timing cover",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": false,
   "desc": "A crank that engages the nose of the crankshaft, for starting a small diesel by hand with the decompressors lifted.",
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Starting handle",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": false,
   "yacht": "Thumb on the same side as your fingers, and never wrap it round. A handle that kicks back breaks wrists."
  },
  {
   "cut": false,
   "desc": "Pulley on the nose of the crankshaft that drives the accessory belt (water pump and alternator) and damps torsional vibration.",
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Crankshaft pulley (damper)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "If the belt squeals or slips, check here: an oily pulley or a slack belt rob you of charging and cooling."
  },
  {
   "cut": true,
   "desc": "Circulates the coolant (fresh water + antifreeze) through the block, the head and the heat exchanger. It is driven by the crankshaft belt.",
   "ex": [
    -0.9487,
    0.3162,
    0
   ],
   "exMag": 2.2,
   "n": 21,
   "name": "Freshwater (circulating) pump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "It usually shares a belt with the alternator: a slack or broken belt stops circulation and the engine overheats (WOBBLE: Belts)."
  },
  {
   "cut": false,
   "desc": "Generator that charges the batteries and powers the electrical loads while the engine runs, driven by the crankshaft belt.",
   "ex": [
    -0.6155,
    0.4924,
    0.6155
   ],
   "exMag": 2.4,
   "n": null,
   "name": "Alternator",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the tension and condition of its belt (the “B” in WOBBLE: Belts). If it’s a shared belt and it breaks, you lose both charging and cooling."
  },
  {
   "cut": true,
   "desc": "Belt-driven rubber-vane pump (impeller) that draws in seawater and pushes it through the circuit to the heat exchanger. The bronze cover gives access to the impeller.",
   "ex": [
    -0.6804,
    -0.2722,
    -0.6804
   ],
   "exMag": 2.4,
   "n": 18,
   "name": "Raw-water pump (impeller)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "THE star item of the RYA syllabus: the rubber impeller is destroyed in seconds if it runs dry. Carry a spare and learn to change it (the bronze cover comes off). Check it every season."
  },
  {
   "cut": false,
   "desc": null,
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Idler / tensioner pulley",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": false,
   "desc": "One belt from the crankshaft pulley drives the alternator, the freshwater pump and the raw-water pump.",
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 1.4,
   "n": null,
   "name": "Drive belt",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "The B in WOBBLE. About a centimetre of give at the longest span, no cracks, no glaze, no black dust. When it goes you lose both cooling circuits AND your charging at the same moment."
  },
  {
   "cut": false,
   "desc": "Electric motor that spins the flywheel (via its ring gear) to start the diesel. It draws a large current from the batteries for a moment.",
   "ex": [
    0.4243,
    -0.5657,
    -0.7071
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Starter motor",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "A “click” with no cranking is usually a flat battery or loose/corroded starter connections rather than the motor itself. Check the terminals and earth."
  },
  {
   "cut": false,
   "desc": "A hand pump with a tube that goes down the dipstick hole. On most marine engines the sump drain plug cannot be reached, so this is how the old oil comes out.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1,
   "n": null,
   "name": "Oil extraction pump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "It lives in the locker, not on the engine. Carry one, and carry a container that holds more than the sump does — finding out halfway through that it does not is a bad afternoon."
  },
  {
   "cut": false,
   "desc": "Measures the oil level in the sump. Pull it out, wipe it, push it fully home and pull it again to read between the min./max. marks.",
   "ex": [
    -0.2481,
    0.7442,
    0.6202
   ],
   "exMag": 2.4,
   "n": null,
   "name": "Oil dipstick",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "The “O” in WOBBLE: check the level cold and on level trim before every trip. Sudden changes in level or colour warn of trouble."
  },
  {
   "cut": false,
   "desc": "Screw-on (spin-on) cartridge that cleans the oil circulating through the engine, trapping metal particles and carbon.",
   "ex": [
    0,
    0,
    1
   ],
   "exMag": 2.4,
   "n": null,
   "name": "Oil filter",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Changed with the oil at every service. Oil the new seal and tighten by hand; carry a filter wrench and a spare on board."
  },
  {
   "cut": true,
   "desc": "Distributes the air (clean, and pressurised if there is a turbo) to the intake valves of each cylinder.",
   "ex": [
    0,
    0.2873,
    0.9578
   ],
   "exMag": 2.4,
   "n": 8,
   "name": "Intake manifold",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Leaks at its joints let the engine breathe unfiltered air and lose performance. Keep the flanges tight and crack-free."
  },
  {
   "cut": true,
   "desc": "Collects the burned gases from the cylinders and carries them to the turbo and the mixing elbow. On a marine engine it is usually water-cooled.",
   "ex": [
    0,
    0.2873,
    -0.9578
   ],
   "exMag": 2.4,
   "n": 15,
   "name": "Exhaust manifold",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "An internal leak in the water-cooled manifold can put seawater into the cylinders. The colour of the smoke here tells you everything (blue/black/white)."
  },
  {
   "cut": true,
   "desc": "Uses the energy of the exhaust gases to drive a turbine that compresses the intake air. More air = more fuel burned = more power.",
   "ex": [
    0.4851,
    0.4851,
    -0.7276
   ],
   "exMag": 2.6,
   "n": 9,
   "name": "Turbocharger",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Let it idle to cool before shutting down after running under load: stopping it hot “bakes” the turbo oil and shortens its life."
  },
  {
   "cut": true,
   "desc": "Cleans the air before it enters the engine, trapping dust and salt. On a boat it also guards against water droplets.",
   "ex": [
    0.2857,
    0.4286,
    0.8571
   ],
   "exMag": 2.4,
   "n": 7,
   "name": "Air filter",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Keep it clean and dry: a dirty filter chokes the engine (black smoke, lack of power). Check it after rough weather."
  },
  {
   "cut": true,
   "desc": "Point where the seawater that has already cooled the engine is injected into the exhaust gases, cooling and silencing them before they leave at the stern.",
   "ex": [
    0.6509,
    0.3906,
    -0.6509
   ],
   "exMag": 2.4,
   "n": 24,
   "name": "Exhaust mixing elbow",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "If no water comes out of the exhaust, STOP the engine! It signals a cooling failure (impeller, strainer or pump). The elbow clogs with carbon over the years."
  },
  {
   "cut": true,
   "desc": "Like a “marine radiator”: inside, seawater flows through a tube bundle and cools the coolant (fresh water) around it, WITHOUT the two liquids ever mixing.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.6,
   "n": 19,
   "name": "Heat exchanger",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Its tubes block with salt and scale; when dirty it overheats the engine. Check the anode that protects it from corrosion."
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": true,
   "desc": null,
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Tube bundle (raw water)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": true,
   "sys": "ref",
   "visBase": true,
   "yacht": null
  },
  {
   "cut": false,
   "desc": "Takes up the expansion of the coolant as it heats and lets you top up the level. Its cap holds the pressure of the closed circuit.",
   "ex": [
    -0.2873,
    0.9578,
    0
   ],
   "exMag": 2.2,
   "n": 20,
   "name": "Header (expansion) tank",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Check the level COLD (never open the cap hot: pressurised steam comes out!). A falling level = possible leak or head gasket."
  },
  {
   "cut": false,
   "desc": "A soft zinc rod screwed into the heat exchanger shell. It is meant to be eaten away so that the tube bundle is not.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Heat exchanger anode",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Look at it, and replace it before it disappears. An anode that has gone completely is not a job finished — it is a job that stopped protecting anything some time ago."
  },
  {
   "cut": true,
   "desc": "Thermal valve: keeps the coolant recirculating until ~80–85 °C and then opens the path to the heat exchanger to hold the temperature steady.",
   "ex": [
    -0.5345,
    0.8018,
    0.2673
   ],
   "exMag": 2.2,
   "n": 22,
   "name": "Thermostat",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Stuck closed = overheating; stuck open = an engine that never warms up and runs poorly. It’s cheap, so carry a spare."
  },
  {
   "cut": false,
   "desc": "Through-hull valve where the seawater that cools the engine comes in. It is the start of the raw-water circuit.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.8,
   "n": 16,
   "name": "Seacock",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Know EVERY seacock and keep tapered wooden bungs tied near each one. Close it if you work on the circuit or in the event of flooding."
  },
  {
   "cut": true,
   "desc": "Holds back weed, bags and dirt from the seawater before the pump, so they cannot block the circuit. Its clear bowl lets you see the debris.",
   "ex": [
    -0.4243,
    0.5657,
    -0.7071
   ],
   "exMag": 2.2,
   "n": 17,
   "name": "Raw-water strainer",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Check and clean it often, especially in weed or plastic. If the engine overheats, a clogged basket is the first suspect (along with the impeller)."
  },
  {
   "cut": false,
   "desc": "Stores the diesel. The whole fuel-supply circuit to the engine starts here.",
   "ex": [
    -0.9578,
    0,
    0.2873
   ],
   "exMag": 1.6,
   "n": 1,
   "name": "Fuel tank",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Keep it full to reduce condensation (water) and “diesel bug”. Know where the shut-off valve and tap are in case of fire or a leak."
  },
  {
   "cut": false,
   "desc": "The shut-off valve at the tank outlet. It closes the fuel supply to the engine.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.4,
   "n": null,
   "name": "Fuel tank valve",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Know where it is before you need it: it is the first thing you close for a fuel leak or a fire, and the first thing you close before changing a filter."
  },
  {
   "cut": false,
   "desc": "First line of defence for the fuel: it traps large particles and, above all, separates WATER from the diesel in its clear lower bowl.",
   "ex": [
    -0.7276,
    0.4851,
    0.4851
   ],
   "exMag": 2.2,
   "n": 2,
   "name": "Primary filter / water separator",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "A star maintenance item: check the bowl daily and drain it if you see water or dirt. Water in the diesel is the No.1 cause of engine stoppage."
  },
  {
   "cut": true,
   "desc": "The pleated cartridge inside the primary filter bowl. It is what actually traps the dirt, and it is what you replace.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Primary filter element",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Look at the old one before you throw it away: what is on it tells you what is in your tank, and whether one set of filters is going to be enough."
  },
  {
   "cut": true,
   "desc": "Draws diesel from the tank through the filters and sends it to the injection pump. Its hand lever lets you prime/bleed the circuit.",
   "ex": [
    -0.4575,
    0.4575,
    0.7625
   ],
   "exMag": 2.2,
   "n": 3,
   "name": "Lift / priming pump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Its lever lets you bleed the air after changing filters or running out of diesel. Knowing how to bleed is an essential on-board skill."
  },
  {
   "cut": true,
   "desc": "Final fine filtration: it traps the smallest particles just before the injection pump, protecting the precision injectors.",
   "ex": [
    0.2981,
    0.5963,
    0.7454
   ],
   "exMag": 2.2,
   "n": 4,
   "name": "Secondary fuel filter",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Changed at every service. After changing it you must bleed the air with the priming pump or the engine won’t start."
  },
  {
   "cut": true,
   "desc": "Generates the very high fuel pressure and delivers it to each injector at the exact moment in the cycle. It is the “heart” of diesel control.",
   "ex": [
    0,
    0.4472,
    0.8944
   ],
   "exMag": 2.4,
   "n": 5,
   "name": "Injection pump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Sealed and precision-built: not touched on board. Clean, water-free diesel is what keeps it alive; hence the obsession with filters."
  },
  {
   "cut": false,
   "desc": "Carries the fuel that was not burned back to the tank, taking heat and any trapped air with it.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Return line",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "It is thin, it is often old rubber, and a leak in it does not drip fuel out — it lets air IN. A hidden cause of an engine that keeps stopping."
  },
  {
   "cut": false,
   "desc": "A small screw on top of the filter housing. Opening it lets trapped air escape while fuel is pumped through.",
   "ex": [
    0,
    0.8321,
    0.5547
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Bleed screw (fine filter)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "This is where bleeding starts after any filter change. Have a rag and a container ready — diesel will come out."
  },
  {
   "cut": false,
   "desc": "The second bleed point, on the injection pump body. Air trapped here stops the pump delivering fuel.",
   "ex": [
    0,
    0.8321,
    0.5547
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Bleed screw (injection pump)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Bleed in order: filter first, then the pump. Only go to the injectors if it still will not start."
  },
  {
   "cut": true,
   "desc": "A coarse mesh sitting in the lowest part of the sump. The oil pump draws through it, so large debris can never reach the pump or the bearings.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 2,
   "n": null,
   "name": "Oil pickup strainer",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "You do not service it afloat, but it is why oil changes matter: sludge in the sump eventually blocks this strainer and starves the engine of oil."
  },
  {
   "cut": true,
   "desc": "A gear pump driven directly from the crankshaft. It lifts oil from the sump and pushes it, under pressure, through the filter and on into the engine.",
   "ex": [
    -0.7071,
    -0.5657,
    0.4243
   ],
   "exMag": 2,
   "n": null,
   "name": "Oil pump",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "It has no adjustment. What you monitor is its result: oil pressure. If the alarm sounds, stop the engine at once."
  },
  {
   "cut": true,
   "desc": "The main drilled passage running the length of the block. From it, smaller drillings feed every main bearing, the big ends and the camshaft.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.2,
   "n": null,
   "name": "Main oil gallery",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": true,
   "sys": "est",
   "visBase": true,
   "yacht": "Invisible in service, but it explains why clean oil matters: these drillings are narrow and sludge blocks them."
  },
  {
   "cut": true,
   "desc": "A small heat exchanger where seawater cools the engine oil. Hot oil loses its film strength, so keeping it cool protects the bearings.",
   "ex": [
    0.4082,
    -0.4082,
    0.8165
   ],
   "exMag": 2,
   "n": null,
   "name": "Oil cooler",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "It sits in the raw-water circuit, so it is another place salt and scale build up. An internal failure mixes oil and seawater — check for milky oil."
  },
  {
   "cut": false,
   "desc": "A loop taken above the waterline with a small air valve at its top. It breaks any siphon that could otherwise pull seawater down into the exhaust and back into the engine after you stop.",
   "ex": [
    0.1881,
    0.9407,
    -0.2822
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Vented (anti-siphon) loop",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "The valve furs up with salt. If it blocks, seawater can siphon into a cylinder and hydraulic-lock the engine — expensive. Check and clean it every season; carry a spare valve."
  },
  {
   "cut": true,
   "desc": "A drum at the low point of the exhaust. It holds a slug of water that silences the gases and, crucially, stops seawater running back down the pipe into the engine when it is stopped.",
   "ex": [
    0.4243,
    -0.5657,
    -0.7071
   ],
   "exMag": 2.2,
   "n": null,
   "name": "Waterlock / exhaust silencer",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "Never crank an engine repeatedly without it firing: each turn pumps more water into this drum until it backs up into the cylinders. If it will not start, find out why before you keep cranking."
  },
  {
   "cut": false,
   "desc": "Where the cooled exhaust gases and the seawater leave the boat together, through the transom or the topsides.",
   "ex": [
    0.9578,
    0,
    -0.2873
   ],
   "exMag": 1.8,
   "n": null,
   "name": "Exhaust outlet (transom)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "ref",
   "visBase": true,
   "yacht": "THIS is where you look every time you start the engine. Water spitting out with the exhaust means the whole raw-water circuit is working. No water = stop the engine at once."
  },
  {
   "cut": false,
   "desc": "The two posts on top of the battery and the clamps bolted to them. All the starting current passes through these two joints.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Battery terminals",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Green or white powder on a post is resistance, and resistance is where a large current turns into heat. Clean them once a year and smear them with petroleum jelly."
  },
  {
   "cut": false,
   "desc": "A battery dedicated to starting the engine, kept isolated from the domestic supply so the lights and fridge can never flatten it.",
   "ex": [
    -0.6509,
    0.3906,
    -0.6509
   ],
   "exMag": 2,
   "n": null,
   "name": "Engine-start battery",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "If the engine has not fired after about ten seconds of cranking, STOP. Something else is wrong and you are only flattening the battery you will need."
  },
  {
   "cut": false,
   "desc": "The service battery bank that runs lights, instruments and the fridge. Kept separate from the starting battery.",
   "ex": [
    -0.4575,
    0.4575,
    -0.7625
   ],
   "exMag": 2,
   "n": null,
   "name": "Domestic battery",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "On non-sealed batteries check the acid level. When one starts needing regular topping up, its life is nearly over."
  },
  {
   "cut": false,
   "desc": "The main switch that disconnects the batteries from the boat. Turning it off makes the whole system safe to work on.",
   "ex": [
    -0.3841,
    0.5121,
    -0.7682
   ],
   "exMag": 2,
   "n": null,
   "name": "Battery isolator switch",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Know where it is before you need it — it is your first move in an electrical fire. Never switch it off while the engine is running or you can destroy the alternator."
  },
  {
   "cut": false,
   "desc": "The heavy red cable carrying the starting current from the battery to the starter motor. It is thick because a starter can draw several hundred amps for a few seconds.",
   "ex": [
    -0.4575,
    0.4575,
    -0.7625
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Main positive cable",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Check the terminals are tight and free of green corrosion. A poor connection here drops the voltage and gives you slow, laboured cranking."
  },
  {
   "cut": false,
   "desc": "Lets the alternator charge both battery banks while the engine runs, but separates them when it stops — so the domestic side can never flatten the starting battery.",
   "ex": [
    -0.4243,
    0.5657,
    -0.7071
   ],
   "exMag": 1.8,
   "n": null,
   "name": "Split-charge relay",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "If the engine battery keeps going flat, suspect this or its wiring. It is what keeps your one guaranteed start in reserve."
  },
  {
   "cut": false,
   "desc": "The heavy negative cable bonding the battery to the engine block. Every starting amp returns through it.",
   "ex": [
    -0.4575,
    0.4575,
    -0.7625
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Earth (ground) strap",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "A corroded earth is a classic fault: the starter clicks but will not turn the engine, even though the battery is fine. Clean the terminals yearly and smear them with Vaseline."
  },
  {
   "cut": false,
   "desc": "A lever that holds the exhaust valve open so the cylinder cannot build compression. With them lifted, the engine can be turned by hand.",
   "ex": [
    0,
    0.9578,
    -0.2873
   ],
   "exMag": 2,
   "n": null,
   "name": "Decompressor lever",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Essential for hand-starting: a diesel has far too much compression to turn by hand otherwise. Also useful to spin the engine over while bleeding the fuel."
  },
  {
   "cut": false,
   "desc": "A lever that holds the exhaust valve open so the cylinder cannot build compression. With them lifted, the engine can be turned by hand.",
   "ex": [
    0,
    0.9578,
    -0.2873
   ],
   "exMag": 2,
   "n": null,
   "name": "Decompressor (2)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Essential for hand-starting: a diesel has far too much compression to turn by hand otherwise. Also useful to spin the engine over while bleeding the fuel."
  },
  {
   "cut": false,
   "desc": "A lever that holds the exhaust valve open so the cylinder cannot build compression. With them lifted, the engine can be turned by hand.",
   "ex": [
    0,
    0.9578,
    -0.2873
   ],
   "exMag": 2,
   "n": null,
   "name": "Decompressor (3)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Essential for hand-starting: a diesel has far too much compression to turn by hand otherwise. Also useful to spin the engine over while bleeding the fuel."
  },
  {
   "cut": false,
   "desc": "A lever that holds the exhaust valve open so the cylinder cannot build compression. With them lifted, the engine can be turned by hand.",
   "ex": [
    0,
    0.9578,
    -0.2873
   ],
   "exMag": 2,
   "n": null,
   "name": "Decompressor (4)",
   "noExplodeAnim": false,
   "noPick": true,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "Essential for hand-starting: a diesel has far too much compression to turn by hand otherwise. Also useful to spin the engine over while bleeding the fuel."
  },
  {
   "cut": false,
   "desc": "Heavy disc that stores energy and smooths the rotation between firing strokes. Its ring gear meshes with the starter motor to start the engine.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.6,
   "n": 25,
   "name": "Flywheel",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "No maintenance needed, but its ring gear is what the starter “bites”: a “click” with no cranking is usually the starter or battery, not the flywheel."
  },
  {
   "cut": false,
   "desc": "The gearbox has its own oil and its own dipstick, separate from the engine.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.2,
   "n": null,
   "name": "Gearbox dipstick",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Check the book: some boxes take automatic transmission fluid and some take engine oil, and they are not interchangeable. \"I checked the oil\" usually means somebody checked one of the two."
  },
  {
   "cut": true,
   "desc": "Reduces engine revs to those suited to the propeller and selects ahead, neutral and astern (it reverses the shaft’s rotation).",
   "ex": [
    0.995,
    0.0995,
    0
   ],
   "exMag": 1.8,
   "n": 26,
   "name": "Gearbox / reverse gear",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "It has its own oil/ATF: check the level with its dipstick and watch for leaks. Always change gear at idle to spare the clutch."
  },
  {
   "cut": false,
   "desc": "Joins the gearbox to the propeller shaft, absorbing small misalignments and vibration, protecting both gearbox and stern gland.",
   "ex": [
    1,
    0,
    0
   ],
   "exMag": 2,
   "n": 27,
   "name": "Flexible coupling",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Check the bolts don’t work loose and the rubber isn’t cracked. Marked misalignment vibrates, heats the stern gland and wears the shaft."
  },
  {
   "cut": false,
   "desc": "Stainless-steel bar that carries the drive from the gearbox to the propeller, passing through the hull at the stern gland.",
   "ex": [
    1,
    0,
    0
   ],
   "exMag": 1.4,
   "n": 29,
   "name": "Propeller shaft",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Make sure it isn’t bent (vibration) or corroded. The shaft anode protects it galvanically: replace it when it’s half consumed."
  },
  {
   "cut": false,
   "desc": "Seals the point where the shaft passes through the hull so water cannot get in, while still letting it turn. They come as packed glands or mechanical-face seals.",
   "ex": [
    0.7071,
    -0.7071,
    0
   ],
   "exMag": 2,
   "n": 28,
   "name": "Stern gland (stuffing box)",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "A packed gland should drip a few drops a minute when running (otherwise it overheats). It’s one of the boat’s few controlled “leaks”."
  },
  {
   "cut": false,
   "desc": "The nut that squeezes the packing against the shaft. It is adjusted a flat at a time, never more.",
   "ex": [
    1,
    0,
    0
   ],
   "exMag": 1.2,
   "n": null,
   "name": "Gland packing nut",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Nip it down a flat, run her, and look again. Tighten it until the drip stops and you have cooked the packing and scored the shaft."
  },
  {
   "cut": false,
   "desc": "A screw-down cup of waterproof grease that keeps grease in the stern tube bearing and the sea out of it.",
   "ex": [
    0,
    1,
    0
   ],
   "exMag": 1.4,
   "n": null,
   "name": "Stern tube greaser",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "A turn every couple of hours under way, and topped up when it empties. It is the easiest thing on a boat to forget, because nothing happens for a long time when you do."
  },
  {
   "cut": false,
   "desc": "Turns the shaft’s rotation into thrust, “screwing” itself through the water to drive the boat ahead or astern.",
   "ex": [
    1,
    0,
    0
   ],
   "exMag": 1.6,
   "n": 30,
   "name": "Propeller",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "tra",
   "visBase": true,
   "yacht": "Check it by diving: weed, fishing line or a chipped blade rob performance and cause vibration. Keep its anode in good shape."
  },
  {
   "cut": false,
   "desc": "The bundle of cables connecting the alternator, starter motor, senders and the boat’s instrument panel.",
   "ex": [
    0,
    0.9578,
    0.2873
   ],
   "exMag": 1.2,
   "n": null,
   "name": "Wiring loom",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "Vibration and salt loosen and corrode connections. Check terminals, fuses and earth: many engine “breakdowns” are really electrical."
  },
  {
   "cut": false,
   "desc": "Carries crankcase gases and vapours back to the intake to be burned, preventing pressure build-up and emissions to the atmosphere.",
   "ex": [
    0,
    0.5547,
    0.8321
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Crankcase breather",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "If it blocks, the engine pressurises the crankcase and can push oil past the seals. Keep the hose and its filter clean."
  },
  {
   "cut": false,
   "desc": "Measures the oil pressure and sends it to the gauge or the panel alarm. It is your early warning of a lubrication failure.",
   "ex": [
    -0.4286,
    0.2857,
    0.8571
   ],
   "exMag": 1.8,
   "n": null,
   "name": "Oil pressure sender",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "If the oil-pressure alarm sounds, STOP the engine at once and find the cause: running on without pressure melts the bearings."
  },
  {
   "cut": false,
   "desc": "Measures the coolant temperature and sends it to the gauge or the panel alarm.",
   "ex": [
    -0.4575,
    0.7625,
    0.4575
   ],
   "exMag": 1.8,
   "n": null,
   "name": "Temperature sender",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "If it reads high or the alarm sounds, suspect the cooling: impeller, strainer, belt or thermostat. Check that water is coming out of the exhaust."
  },
  {
   "cut": false,
   "desc": "Connect the throttle lever and the stop control at the helm to the governor on the injection pump.",
   "ex": [
    0,
    0.6402,
    0.7682
   ],
   "exMag": 1.6,
   "n": null,
   "name": "Throttle & stop cables",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "com",
   "visBase": true,
   "yacht": "The STOP cable cuts the fuel to shut the diesel down (it isn’t switched off with a “key” like a petrol engine). Check both controls move smoothly."
  },
  {
   "cut": false,
   "desc": "The lowest part of the engine compartment, under the engine itself. There is nearly always a little water in it.",
   "ex": [
    0,
    -1,
    0
   ],
   "exMag": 0,
   "n": null,
   "name": "Bilge",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "The B in WOBBLE. Everything the engine leaks ends up here, so a look under the boards tells you about oil, coolant, seawater and diesel at once — for free, every time."
  },
  {
   "cut": false,
   "desc": "The engine instrument panel: a temperature gauge and the three warning lights — oil pressure, temperature and charge. On a real boat it is in the cockpit or on the bulkhead, where you can see it from the helm.",
   "ex": [
    -1,
    0,
    0
   ],
   "exMag": 0,
   "n": null,
   "name": "Engine panel",
   "noExplodeAnim": false,
   "noPick": false,
   "noRecv": false,
   "noShadow": false,
   "sys": "est",
   "visBase": true,
   "yacht": "The lights come on with the key and go out when she fires. One that stays on, or comes on under way, is telling you to stop and look — and the oil one you obey before you understand it."
  }
 ],
 "reposo": {
  "bornes": "sucios",
  "burbujas": "ninguna",
  "cesta": "dentro",
  "correa": "quieta",
  "descompresores": "cerrados",
  "elemento-decantador": "puesto",
  "filtro-aceite": "puesto",
  "filtro-fino": "puesto",
  "goteo": "seco",
  "llave-deposito": "abierta",
  "manivela": "guardada",
  "palanca-cebado": "arriba",
  "palas": "todas",
  "rodete": "dentro",
  "suciedad": "dentro",
  "tapa-bomba": "puesta",
  "tapa-filtro": "puesta",
  "varilla": "dentro"
 }
};
