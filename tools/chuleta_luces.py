# -*- coding: utf-8 -*-
u"""LA CHULETA DE LUCES Y MARCAS · un A4 de dos caras, para imprimir

    python tools/chuleta_luces.py              la escribe en assets/descargas/
    python tools/chuleta_luces.py --gris       ademas, una version en escala de grises
    python tools/chuleta_luces.py --mirar      dice que haria, y no escribe

QUE ES. El cebo del escaparate: se entrega por correo a quien deja su direccion. **No se
enlaza desde ninguna pagina y no va al sitemap**, por eso su nombre lleva ocho caracteres
al azar: una direccion que no se adivina.

DE DONDE SALE EL CONTENIDO NAUTICO · NI UNA LINEA SE ESCRIBE AQUI
Todo sale de `tools/luces-datos.json`, que es una extraccion de los cuatro ficheros del
modulo de luces de la academia, hecha cargandolos en node y preguntandoles. El JSON dice
de que commit salio cada cosa. Bloque por bloque:

  cara 1, las luces ....... `buques.js`  · `seenFrom(nave, 0)`, lo que se ve de proa
  cara 1, que es cada una . `colregs.js` · `VESSEL[...].label`
  cara 1, la regla ........ `anexo1.js`  · `CITA[...].r`
  cara 2, las marcas ...... `anexo1.js`  · `MARCAS_DIA`
  cara 2, lo que suena .... `sonido.js`  · `NIEBLA`, con su `dice`, su `por` y su cita

SE IMPRIME EN BLANCO Y NEGRO SIN PERDER NADA. Es lo que decide el diseno entero: una
chuleta que hay que imprimir en color no se imprime. Cada luz lleva **su color escrito**
y **su inicial dentro del circulo**, y el circulo va con borde negro; las marcas son
siluetas negras. Quitarle el color no le quita informacion --- y eso se comprueba: con
`--gris` sale la misma pagina en gris y se mide que lleva el mismo texto.
"""
import io
import json
import os
import re
import secrets
import sys

from reportlab.lib.colors import Color, black, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DATOS = os.path.join(AQUI, u"luces-datos.json")
DESTINO = os.path.join(RAIZ, u"assets", u"descargas")

AN, AL = A4                      # 595.28 x 841.89 pt
MARGEN = 38
CAB = u"Offshore Theory · offshoretheory.com"
PIE = (u"Independent study aid. Not affiliated with or accredited by the RYA. "
       u"Always refer to the official COLREGs.")

#  ── LOS COLORES, Y SU NOMBRE ───────────────────────────────────────────────
#  El nombre va SIEMPRE al lado: es lo que hace que la hoja valga en blanco y negro.
#  Los tonos son oscuros a proposito --- una luz verde clara sobre papel blanco se
#  imprime como un gris casi vacio ---.
TINTA = {u"white": Color(1, 1, 1), u"red": Color(.80, .11, .13),
         u"green": Color(.07, .53, .27), u"yellow": Color(.90, .70, .05)}
INICIAL = {u"white": u"W", u"red": u"R", u"green": u"G", u"yellow": u"Y"}

#  ── COMO SE LLAMA CADA LUZ EN LA HOJA ──────────────────────────────────────
#  Las claves son las de `buques.js`; el nombre es el del reglamento.
COMO = {u"masthead": u"masthead", u"starboard": u"starboard sidelight",
        u"port": u"port sidelight", u"stern": u"sternlight",
        u"allround": u"all-round"}
CORTO = {u"masthead": u"masthead", u"starboard": u"green sidelight",
         u"port": u"red sidelight", u"stern": u"sternlight",
         u"allround": u"all-round"}


def datos():
    if not os.path.isfile(DATOS):
        raise SystemExit(u"  PARADO: no esta `tools/luces-datos.json`, y de ahi sale "
                         u"todo el contenido nautico.")
    return json.load(io.open(DATOS, encoding=u"utf-8"))


# =============================================================================
#  LAS PIEZAS QUE SE DIBUJAN
# =============================================================================
def columna(c, x, y, luces, r=5.2, paso=13.0, gris=False):
    u"""Las luces apiladas como se ven de proa, de la mas alta a la mas baja.

    DE PROA SE APILAN DE VERDAD, no es una licencia del dibujo: el desplazamiento
    lateral de una luz es su posicion a proa por el seno del aspecto, y el seno de
    cero es cero. Lo dice `anexo1.js` y es la razon de que un buque de proa sea lo
    mas dificil de juzgar de noche.
    """
    orden = sorted(luces, key=lambda l: -l.get(u"z", 0))
    #  los dos costados van a la misma altura y uno al lado del otro, que es como se
    #  ven: si se apilaran, la hoja diria que el verde esta mas alto que el rojo
    filas, usados = [], set()
    for i, l in enumerate(orden):
        if i in usados:
            continue
        par = None
        for j in range(i + 1, len(orden)):
            if j not in usados and abs(orden[j].get(u"z", 0) - l.get(u"z", 0)) < .01 \
                    and {l[u"kind"], orden[j][u"kind"]} == {u"starboard", u"port"}:
                par, usados = j, usados | {j}
                break
        usados.add(i)
        filas.append([l] if par is None else
                     sorted([l, orden[par]], key=lambda q: q[u"kind"] != u"port"))
    #  ── LA COLUMNA CUELGA DE ARRIBA, no se centra ───────────────────────────
    #  Centrada, una columna de seis pisos se mete 39 pt POR DEBAJO del renglon y
    #  pisa la fila siguiente. Colgada de la misma linea que el titulo, lo que crece
    #  crece hacia abajo y la fila solo tiene que ser igual de alta que ella.
    alto = (len(filas) - 1) * paso
    for k, fila in enumerate(filas):
        yy = y - k * paso
        for l in fila:
            dx = 0 if len(fila) == 1 else (-8 if l[u"kind"] == u"port" else 8)
            col = TINTA[l[u"colour"]]
            if gris:
                g = 0.30 * col.red + 0.59 * col.green + 0.11 * col.blue
                col = Color(g, g, g)
            c.setFillColor(col)
            c.setStrokeColor(black)
            c.setLineWidth(0.7)
            c.circle(x + dx, yy, r, stroke=1, fill=1)
            #  LA INICIAL DENTRO. Es la mitad de lo que hace que valga en gris.
            c.setFont(u"Helvetica-Bold", 5.6)
            c.setFillColor(black if l[u"colour"] in (u"white", u"yellow") else white)
            c.drawCentredString(x + dx, yy - 1.9, INICIAL[l[u"colour"]])
    return alto


def escribeLuces(luces):
    u"""Las luces en palabras, de arriba abajo. Sin esto la hoja no vale en gris."""
    orden = sorted(luces, key=lambda l: -l.get(u"z", 0))
    fuera, vistos = [], set()
    for l in orden:
        if l[u"kind"] in (u"starboard", u"port"):
            if u"lados" in vistos:
                continue
            vistos.add(u"lados")
            fuera.append(u"sidelights")
            continue
        fuera.append(u"%s %s" % (l[u"colour"], CORTO[l[u"kind"]]))
    return u", ".join(fuera)


FORMA = {u"ball": u"ball", u"cone": u"cone, point down",
         u"coneUp": u"cone, point up", u"diamond": u"diamond",
         u"cylinder": u"cylinder"}


def marca(c, x, y, cual, r=6.0):
    u"""Una marca de dia, en negro. En una silueta el color nunca hizo falta."""
    c.setStrokeColor(black)
    c.setFillColor(black)
    c.setLineWidth(0.8)
    if cual == u"ball":
        c.circle(x, y, r, stroke=1, fill=1)
    elif cual == u"cone":                       # vertice abajo
        p = c.beginPath()
        p.moveTo(x - r, y + r)
        p.lineTo(x + r, y + r)
        p.lineTo(x, y - r)
        p.close()
        c.drawPath(p, stroke=1, fill=1)
    elif cual == u"coneUp":                     # vertice arriba
        p = c.beginPath()
        p.moveTo(x - r, y - r)
        p.lineTo(x + r, y - r)
        p.lineTo(x, y + r)
        p.close()
        c.drawPath(p, stroke=1, fill=1)
    elif cual == u"diamond":
        p = c.beginPath()
        p.moveTo(x, y + r)
        p.lineTo(x + r * .8, y)
        p.lineTo(x, y - r)
        p.lineTo(x - r * .8, y)
        p.close()
        c.drawPath(p, stroke=1, fill=1)
    elif cual == u"cylinder":
        c.rect(x - r * .75, y - r, r * 1.5, r * 2, stroke=1, fill=1)


def tira(c, x, y, tramos, ancho=76.0, alto=5.0, gris=False):
    u"""La senal, dibujada: un prolongado es una barra larga y un corto una corta.

    LA ESCALA ES LA DEL REGLAMENTO, no una decorativa: un corto es un segundo y un
    prolongado son cinco, y aqui miden eso mismo en proporcion. Asi la tira ENSENA la
    diferencia en vez de ilustrarla.
    """
    total = sum(tramos) + max(0, len(tramos) - 1) * 1.0
    k = ancho / float(total or 1)
    c.setFillColor(Color(.25, .25, .25) if not gris else Color(.25, .25, .25))
    c.setStrokeColor(black)
    c.setLineWidth(0.4)
    xx = x
    for t in tramos:
        c.rect(xx, y, t * k, alto, stroke=1, fill=1)
        xx += t * k + 1.0 * k


# =============================================================================
#  LAS DOS CARAS
# =============================================================================
def marco(c, titulo, sub):
    c.setFillColor(Color(.42, .42, .42))
    c.setFont(u"Helvetica", 7)
    c.drawString(MARGEN, AL - MARGEN + 10, CAB)
    c.setFillColor(black)
    c.setFont(u"Helvetica-Bold", 15)
    c.drawString(MARGEN, AL - MARGEN - 8, titulo)
    c.setFillColor(Color(.35, .35, .35))
    c.setFont(u"Helvetica", 8.4)
    c.drawString(MARGEN, AL - MARGEN - 21, sub)
    c.setStrokeColor(Color(.75, .75, .75))
    c.setLineWidth(0.5)
    c.line(MARGEN, AL - MARGEN - 28, AN - MARGEN, AL - MARGEN - 28)
    c.setFillColor(Color(.45, .45, .45))
    c.setFont(u"Helvetica", 6.4)
    c.drawString(MARGEN, MARGEN - 16, PIE)


def caraNoche(c, d, gris=False):
    marco(c, u"Lights — what she shows by night",
          u"Seen from right ahead. Every light is named as well as coloured, so this "
          u"sheet works in black and white.")
    cita = d[u"cita"]
    y = AL - MARGEN - 52
    ANCHO = (AN - 2 * MARGEN)
    for b in d[u"buques"]:
        clave = u"fondeada" if b[u"como"] == u"fondeada" else b[u"key"]
        regla = (cita.get(clave) or {}).get(u"r", u"")
        que = u"at anchor" if b[u"como"] == u"fondeada" else b[u"label"]
        if b[u"key"] == u"fishingTrawl":
            que = u"engaged in fishing — trawling"
        elif b[u"key"] == u"fishingOther":
            que = u"engaged in fishing — other than trawling"
        elif b[u"key"] == u"towing":
            que = u"towing"
        elif b[u"key"] == u"nuc" and not b[u"makingWay"]:
            que = b[u"label"] + u", not making way"
        #  ── EL ALTO DE LA FILA LO MANDA LA COLUMNA ──────────────────────────
        #  Iba fijo en 52 pt y la columna crece con las luces: la de <restringida
        #  para maniobrar> tiene SEIS pisos --- 78 pt --- y se metia dentro del
        #  renglon de la siguiente. Se veia en la captura y en ningun sitio mas: el
        #  texto extraido del PDF salia perfecto, porque el texto no se solapaba; lo
        #  que se solapaba eran los circulos.
        alto = columna(c, MARGEN + 22, y + 7, b[u"luces"], gris=gris)
        c.setFillColor(black)
        c.setFont(u"Helvetica-Bold", 9)
        c.drawString(MARGEN + 56, y + 6, que[:1].upper() + que[1:])
        c.setFillColor(Color(.40, .40, .40))
        c.setFont(u"Helvetica", 7.4)
        extra = u"  ·  %s" % b[u"nota"] if b[u"nota"] else u""
        c.drawString(MARGEN + 56, y - 4, u"%s%s" % (regla, extra))
        c.setFillColor(Color(.15, .15, .15))
        c.setFont(u"Helvetica", 8)
        c.drawString(MARGEN + 56, y - 15, escribeLuces(b[u"luces"]))
        if b[u"remolcado"]:
            c.setFillColor(Color(.40, .40, .40))
            c.setFont(u"Helvetica-Oblique", 7.4)
            c.drawString(MARGEN + 56, y - 25,
                         u"the vessel towed shows: %s" % escribeLuces(b[u"remolcado"]))
        texto = 33 if b[u"remolcado"] else 23
        paso = max(texto + 13, alto + 18)
        c.setStrokeColor(Color(.88, .88, .88))
        c.setLineWidth(0.4)
        c.line(MARGEN, y - paso + 8, MARGEN + ANCHO, y - paso + 8)
        y -= paso + 6


def caraDia(c, d, gris=False):
    marco(c, u"Shapes and sound — by day, and when you cannot see",
          u"The same rules said twice: once for the dark, once for the daylight, once "
          u"for the fog.")
    y = AL - MARGEN - 52
    c.setFillColor(black)
    c.setFont(u"Helvetica-Bold", 10)
    c.drawString(MARGEN, y, u"Day shapes")
    y -= 6
    c.setStrokeColor(Color(.75, .75, .75))
    c.line(MARGEN, y, AN - MARGEN, y)
    y -= 20
    #  ── LA TABLA DE MARCAS ES LA DEL MODULO, con sus nombres ───────────────
    #  `5.S1` del capitulo declara las SEIS que hay y como se llama cada una en
    #  ingles --- `rot` y `quien` ---. Derivar los rotulos de `VESSEL` era escribir
    #  contenido nautico por mi cuenta, y ademas se dejaba fuera `velaYMotor`, que no
    #  es un tipo de buque sino un estado: un velero a motor lleva las luces de un
    #  buque de propulsion mecanica y **solo el cono de dia dice lo que es**. Se vio
    #  comparando la hoja contra el modulo: la unica marca del modulo que no aparecia.
    cita = d[u"cita"]
    for cl in d[u"clases_marca"]:
        clave = cl[u"clave"]
        formas = d[u"marcas"].get(clave) or []
        regla = cl.get(u"regla") or (cita.get(clave) or {}).get(u"r", u"")
        for i, f in enumerate(formas):
            marca(c, MARGEN + 22, y + 10 - i * 15, f)
        c.setFillColor(black)
        c.setFont(u"Helvetica-Bold", 9)
        c.drawString(MARGEN + 56, y + 6, cl[u"rot"])
        c.setFillColor(Color(.40, .40, .40))
        c.setFont(u"Helvetica", 7.4)
        c.drawString(MARGEN + 56, y - 4, regla)
        c.setFillColor(Color(.15, .15, .15))
        c.setFont(u"Helvetica", 8)
        c.drawString(MARGEN + 56, y - 15, cl[u"quien"])
        y -= max(38, 16 + 15 * len(formas))
    #  Y LA QUE NO LLEVA NINGUNA SE DICE, que es media leccion: un buque de motor, un
    #  velero a vela sola y un practico no tienen silueta de dia.
    c.setFillColor(Color(.30, .30, .30))
    c.setFont(u"Helvetica-Oblique", 8)
    sin = [b[u"label"] for b in d[u"buques"]
           if not (d[u"marcas"].get(b[u"key"]) or []) and b[u"como"] != u"fondeada"]
    orden = []
    for x in sin:
        if x not in orden:
            orden.append(x)
    c.drawString(MARGEN, y + 4, u"No shape at all: %s." % u"; ".join(orden))
    y -= 14

    y -= 6
    c.setFillColor(black)
    c.setFont(u"Helvetica-Bold", 10)
    c.drawString(MARGEN, y, u"Sound signals in restricted visibility")
    y -= 6
    c.setStrokeColor(Color(.75, .75, .75))
    c.line(MARGEN, y, AN - MARGEN, y)
    y -= 8
    c.setFillColor(Color(.40, .40, .40))
    c.setFont(u"Helvetica-Oblique", 7.2)
    c.drawString(MARGEN, y, u"A short blast is about one second; a prolonged blast is "
                            u"four to six. The bars are drawn to that scale.")
    y -= 16
    #  ── DOS LINEAS POR SENAL, y no tres columnas ────────────────────────────
    #  En tres columnas, «The bell forward, then the gong aft, five seconds each» se
    #  metia encima de su propio motivo, y la del practico encima de su cita. Un
    #  rotulo que pisa a otro no se ve en el texto extraido del PDF --- las cadenas
    #  salen enteras y en orden --- : solo se ve en la captura.
    for k, s in d[u"niebla"].items():
        tira(c, MARGEN, y + 1, s[u"tramos"], gris=gris)
        c.setFillColor(black)
        c.setFont(u"Helvetica-Bold", 8.4)
        c.drawString(MARGEN + 88, y + 1, s[u"dice"][:1].upper() + s[u"dice"][1:])
        c.setFillColor(Color(.45, .45, .45))
        c.setFont(u"Helvetica", 7)
        c.drawRightString(AN - MARGEN, y + 1, s[u"cita"])
        c.setFillColor(Color(.30, .30, .30))
        c.setFont(u"Helvetica", 7.8)
        c.drawString(MARGEN + 88, y - 9, s[u"por"])
        y -= 23


def construye(ruta, d, gris=False):
    c = canvas.Canvas(ruta, pagesize=A4)
    c.setTitle(u"Lights and shapes — Offshore Theory")
    c.setAuthor(u"Offshore Theory")
    c.setSubject(u"COLREGs lights, shapes and sound signals")
    caraNoche(c, d, gris)
    c.showPage()
    caraDia(c, d, gris)
    c.showPage()
    c.save()
    return os.path.getsize(ruta)


def main():
    solomirar = u"--mirar" in sys.argv
    tambienGris = u"--gris" in sys.argv
    d = datos()
    print(u"  datos de `tools/luces-datos.json`, del commit %s de la academia"
          % d[u"_de_donde"][u"commit"][:10])
    print(u"  %d buques  ·  %d marcas  ·  %d senales de niebla"
          % (len(d[u"buques"]), len(d[u"marcas"]), len(d[u"niebla"])))
    #  ── EL NOMBRE NO SE ADIVINA ─────────────────────────────────────────────
    #  Ocho caracteres al azar. No es seguridad: es que la unica manera de llegar sea
    #  el correo, y que un enlace suelto no circule por ahi sin dejar la direccion.
    ya = [f for f in (os.listdir(DESTINO) if os.path.isdir(DESTINO) else [])
          if re.match(r"^lights-and-shapes-[0-9a-f]{8}\.pdf$", f)]
    if ya:
        print(u"  ya hay %d en `assets/descargas/`: %s" % (len(ya), u", ".join(ya)))
    nombre = u"lights-and-shapes-%s.pdf" % secrets.token_hex(4)
    if solomirar:
        print(u"  (--mirar: se llamaria `%s` y no se ha escrito nada)" % nombre)
        return 0
    if not os.path.isdir(DESTINO):
        os.makedirs(DESTINO)
    ruta = os.path.join(DESTINO, nombre)
    n = construye(ruta, d)
    print(u"  escrito  assets/descargas/%s  ·  %d bytes" % (nombre, n))
    if tambienGris:
        g = os.path.join(DESTINO, nombre.replace(u".pdf", u"-gris.pdf"))
        ng = construye(g, d, gris=True)
        print(u"  y en gris assets/descargas/%s  ·  %d bytes"
              % (os.path.basename(g), ng))
    return 0


if __name__ == "__main__":
    sys.exit(main())
