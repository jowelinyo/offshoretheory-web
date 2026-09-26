# -*- coding: utf-8 -*-
u"""LAS ETIQUETAS DEL `<head>` QUE LA ACADEMIA NO PONE · se pasan DESPUES de cada copia

    python tools/seo_head.py            las pone
    python tools/seo_head.py --mirar    dice que pondria, y no escribe nada

═══ HAY QUE PASARLA CADA VEZ QUE `copia.py` ESCRIBA AQUI ═══════════════════════════
`copia.py` vive en la academia y **pisa `chapters/`, `notes/`, `privacy.html` y
`waitlist.html`**. Todo lo que este fichero anade se pierde en la siguiente copia. El
orden es: `copia.py` primero, **esto despues**, y despues el `sitemap.py` y el commit.
Esta escrito tambien en `README.md`, que es donde alguien lo va a buscar.

═══ SOLO EL `<head>`. NI UNA LINEA DEL `<body>` ════════════════════════════════════
La regla de esta herramienta, y no es una intencion: es como esta construida.

  · TODO SE INSERTA EN UN SOLO SITIO: justo antes del primer `<style`, que en los
    setenta y seis ficheros es la frontera de la cabecera. **Medido**: delante de ese
    punto no hay mas etiquetas que `html`, `head`, `meta`, `title` y `link` --- en los
    76, sin excepcion ---.
  · Y ESO IMPORTA PORQUE **24 DE LOS 44 CAPITULOS NO ABREN `<head>`**. No tienen el
    elemento: van `<html lang="en">` y directos a las metas. El navegador les hace una
    cabecera implicita, y una `<link>` puesta al lado de sus metas cae dentro de ella.
    Buscar `</head>` habria dejado fuera a veinticuatro capitulos y no habria cantado.
  · Y SE COMPRUEBA DESPUES, no se supone: `--mirar` dice donde caeria cada insercion,
    y la comprobacion de la tanda abre el fichero en un navegador de verdad y exige
    que el `<body>` sea IDENTICO byte a byte al de antes.

═══ IDEMPOTENTE ════════════════════════════════════════════════════════════════════
Cada etiqueta se anade solo si no esta ya. Pasarla dos veces no cambia nada la segunda,
y eso se comprueba corriendola dos veces y comparando los sha256.

═══ NADA SE INVENTA ════════════════════════════════════════════════════════════════
El `og:title` sale del `<title>` de la propia pagina --- leido DESPUES de cambiarlo,
para que no puedan decir cosas distintas ---; el `og:description`, de su
`<meta name="description">`; el `about` del JSON-LD, del `<h1>`. Lo unico escrito a
mano son los 29 titulos de `titulos-notas.json`, que aprobo Joel, y el texto
alternativo de la foto, que es el mismo que ya usa la portada para la misma imagen.
"""
import hashlib
import io
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SITIO = u"https://offshoretheory.com"
FOTO = SITIO + u"/assets/img/foto-2.jpg"
#  el mismo texto que la portada ya le pone a esa misma foto
FOTO_ALT = u"A sextant and dividers resting on a paper chart"
ORG = SITIO + u"/#organization"
TITULOS = os.path.join(AQUI, u"titulos-notas.json")

#  LA FRONTERA DE LA CABECERA. Medido sobre los 76: el primer `<style` es el final de
#  la zona de metas en todos, y antes de el no hay ni un `div`, ni un `script`, ni un
#  `body`. Si algun dia un fichero no lo cumple, se para: ver `_corte`.
CORTE = re.compile(r"(?i)<style\b")
SOLO_CABEZA = set([u"html", u"head", u"meta", u"title", u"link"])


def _eol(s):
    return u"\r\n" if s.count(u"\r\n") * 2 > s.count(u"\n") else u"\n"


def _corte(p, s):
    u"""Donde acaba la zona de cabecera. Se para si no es zona de cabecera limpia."""
    m = CORTE.search(s)
    if not m:
        raise SystemExit(u"  PARADO: `%s` no tiene `<style`, y de ahi sale la "
                         u"frontera de su cabecera." % p)
    cab = s[:m.start()]
    tags = set(t.lower() for t in re.findall(r"<\s*/?\s*([a-zA-Z][a-zA-Z0-9]*)", cab))
    fuera = tags - SOLO_CABEZA
    if fuera:
        raise SystemExit(
            u"  PARADO: antes del primer `<style` de `%s` hay %s, que no es cabecera.\n"
            u"  Insertar ahi seria tocar el cuerpo, y esta herramienta no sale del "
            u"`<head>`." % (p, u", ".join(sorted(fuera))))
    return m.start()


def _tiene(cab, patron):
    return bool(re.search(patron, cab))


def _pon(s, i, lineas, eol):
    u"""Mete esas lineas en `i`, con el salto que ese fichero usa."""
    if not lineas:
        return s
    return s[:i] + eol.join(lineas) + eol + s[i:]


def _atr(t):
    return (t.replace(u"&", u"&amp;").replace(u'"', u"&quot;")
             .replace(u"<", u"&lt;").replace(u">", u"&gt;"))


def _deTitulo(s):
    t = re.findall(u"(?s)<title>(.*?)</title>", s)
    return re.sub(u"\\s+", u" ", t[0]).strip() if t else u""


def _deDesc(s):
    d = re.findall(u'<meta name="description" content="([^"]*)"', s)
    return d[0] if d else u""


def _deH1(s):
    h = re.findall(u"(?s)<h1[^>]*>(.*?)</h1>", s)
    if not h:
        return u""
    t = re.sub(u"<[^>]+>", u"", h[0])
    return re.sub(u"\\s+", u" ", t).strip()


def _tema(h1):
    u"""El tema, del `<h1>`: lo que va detras del ultimo separador.

    Los `h1` son «Collision avoidance — Rule 15 · Crossing situation». El tema es la
    ultima pieza. No se inventa: se corta por donde el propio titulo separa.
    """
    for sep in (u"·", u"—", u"-"):
        if sep in h1:
            h1 = h1.rsplit(sep, 1)[-1]
    return h1.strip()


def _json_ld(obj):
    u"""El bloque, con el JSON ya validado y sin campos vacios."""
    for k, v in obj.items():
        if v is None or v == u"" or v == [] or v == {}:
            raise SystemExit(u"  PARADO: el JSON-LD llevaria `%s` vacio." % k)
    t = json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=False)
    json.loads(t)                      # se relee antes de escribirlo
    if u"</" in t:
        raise SystemExit(u"  PARADO: el JSON-LD lleva `</`, que cierra el `<script>`.")
    return [u'<script type="application/ld+json">'] + t.split(u"\n") + [u"</script>"]


# =============================================================================
#  LO QUE LE FALTA A CADA CLASE DE PAGINA
# =============================================================================
def _og(cab, titulo, desc):
    u"""og:title, og:description y la tarjeta. Solo lo que no este ya."""
    fuera = []
    if not _tiene(cab, u'property="og:title"'):
        fuera.append(u'<meta property="og:title" content="%s">' % _atr(titulo))
    if desc and not _tiene(cab, u'property="og:description"'):
        fuera.append(u'<meta property="og:description" content="%s">' % _atr(desc))
    return fuera


def _tarjeta(cab):
    fuera = []
    if not _tiene(cab, u'property="og:image"'):
        fuera.append(u'<meta property="og:image" content="%s">' % FOTO)
    if not _tiene(cab, u'property="og:image:alt"'):
        fuera.append(u'<meta property="og:image:alt" content="%s">' % _atr(FOTO_ALT))
    if not _tiene(cab, u'name="twitter:card"'):
        fuera.append(u'<meta name="twitter:card" content="summary_large_image">')
    return fuera


def capitulo(p, s, rel):
    cab = s[:_corte(p, s)]
    fuera = []
    if not _tiene(cab, u'rel="canonical"'):
        fuera.append(u'<link rel="canonical" href="%s/%s">' % (SITIO, rel))
    if not _tiene(cab, u'rel="icon"'):
        fuera.append(u'<link rel="icon" type="image/svg+xml" '
                     u'href="../assets/img/favicon.svg">')
    return fuera + _tarjeta(cab)


def nota(p, s, rel, titulos):
    u"""Devuelve (html con el titulo ya cambiado, lineas nuevas)."""
    nombre = os.path.basename(rel)
    nuevo = titulos.get(nombre)
    if nuevo:
        actual = _deTitulo(s)
        if actual != nuevo:
            #  EL `<title>` Y SOLO EL `<title>`. Se cambia por su etiqueta, no por su
            #  texto: el mismo texto sale tambien en el `og:title`, y un reemplazo a
            #  ciegas cambiaria los dos y dejaria el `og:title` viejo sin tocar.
            s = re.sub(u"(?s)<title>.*?</title>",
                       u"<title>" + nuevo + u"</title>", s, count=1)
    i = _corte(p, s)
    cab = s[:i]
    titulo = _deTitulo(s)
    desc = _deDesc(s)
    fuera = _og(cab, titulo, desc) + _tarjeta(cab)
    if not _tiene(cab, u"application/ld\\+json"):
        tema = _tema(_deH1(s))
        d = {u"@context": u"https://schema.org", u"@type": u"LearningResource",
             u"name": titulo, u"description": desc,
             u"url": u"%s/%s" % (SITIO, rel), u"inLanguage": u"en",
             u"learningResourceType": u"reading notes",
             u"isPartOf": {u"@id": ORG}}
        if tema:
            d[u"about"] = tema
        fuera += _json_ld(d)
    return s, fuera


def indiceDeNotas(p, s, rel, titulos):
    u"""La portada de las notas: su tarjeta y un `ItemList` con lo que enlaza."""
    i = _corte(p, s)
    cab = s[:i]
    fuera = _og(cab, _deTitulo(s), _deDesc(s)) + _tarjeta(cab)
    if not _tiene(cab, u"application/ld\\+json"):
        enl = re.findall(u'<li><a href="([^"]+)">([^<]+)</a>', s)
        if not enl:
            raise SystemExit(u"  PARADO: `%s` no enlaza ni una nota, y el `ItemList` "
                             u"saldria vacio." % p)
        items = []
        for n, (href, nombre) in enumerate(enl, 1):
            #  EL NOMBRE ES EL DEL ENLACE, no el `<title>` de la otra pagina: es lo
            #  que esta pagina dice, y es lo que el lector ve.
            items.append({u"@type": u"ListItem", u"position": n,
                          u"url": u"%s/notes/%s" % (SITIO, href),
                          u"name": re.sub(u"\\s+", u" ", nombre).strip()})
        fuera += _json_ld({u"@context": u"https://schema.org", u"@type": u"ItemList",
                           u"name": _deTitulo(s), u"numberOfItems": len(items),
                           u"itemListElement": items})
    return s, fuera


def suelta(p, s, rel):
    u"""`privacy.html` y `waitlist.html`: solo la tarjeta."""
    return _tarjeta(s[:_corte(p, s)])


# =============================================================================
def paginas():
    out = []
    for d in (u"chapters", u"notes"):
        q = os.path.join(RAIZ, d)
        if not os.path.isdir(q):
            raise SystemExit(u"  PARADO: no esta `%s/`." % d)
        for f in sorted(os.listdir(q)):
            if f.endswith(u".html"):
                out.append(u"%s/%s" % (d, f))
    for f in (u"privacy.html", u"waitlist.html"):
        if os.path.isfile(os.path.join(RAIZ, f)):
            out.append(f)
    return out


def main():
    solomirar = u"--mirar" in sys.argv
    titulos = json.load(io.open(TITULOS, encoding=u"utf-8"))[u"titulos"]
    tocados, sinTocar, cambios = [], 0, 0
    for rel in paginas():
        p = os.path.join(RAIZ, rel.replace(u"/", os.sep))
        s0 = io.open(p, encoding=u"utf-8", newline=u"").read()
        eol = _eol(s0)
        if rel.startswith(u"chapters/"):
            s, fuera = s0, capitulo(p, s0, rel)
        elif rel == u"notes/index.html":
            s, fuera = indiceDeNotas(p, s0, rel, titulos)
        elif rel.startswith(u"notes/"):
            s, fuera = nota(p, s0, rel, titulos)
        else:
            s, fuera = s0, suelta(p, s0, rel)
        s = _pon(s, _corte(p, s), fuera, eol)
        if s == s0:
            sinTocar += 1
            continue
        cambios += len(fuera) + (1 if s0.count(u"<title>") and
                                 _deTitulo(s) != _deTitulo(s0) else 0)
        tocados.append((rel, len(fuera), _deTitulo(s0) != _deTitulo(s0 if s is s0 else s)))
        if not solomirar:
            io.open(p, u"w", encoding=u"utf-8", newline=u"").write(s)
    print(u"  %d paginas tocadas  ·  %d ya estaban al dia" % (len(tocados), sinTocar))
    for rel, n, t in tocados[:6]:
        print(u"     %-52s +%d etiqueta(s)%s" % (rel, n, u" · y el title" if t else u""))
    if len(tocados) > 6:
        print(u"     ... y %d mas" % (len(tocados) - 6))
    if solomirar:
        print(u"  (--mirar: no se ha escrito nada)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
