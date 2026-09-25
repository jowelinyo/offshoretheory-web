# -*- coding: utf-8 -*-
u"""REGENERA `sitemap.xml` · escaparate de offshoretheory.com

    python tools/sitemap.py            lo escribe
    python tools/sitemap.py --mirar    solo dice que saldria, no escribe

POR QUE EXISTE, Y LA FECHA QUE LO DECIDIO. El 25 de septiembre de 2026 se publico el
SEO de los 44 capitulos y el sitemap se rehizo A MANO, con un guion suelto que no vivia
en este repositorio. Salio bien en lo grande --- los 44 con su fecha --- y mal en lo
pequeno: `index.html`, `privacy.html` y `waitlist.html` cambiaron EN ESE MISMO COMMIT y
sus `<lastmod>` se quedaron con la fecha vieja, porque cuando se genero el sitemap esos
cambios todavia no estaban commiteados. Hubo que arreglarlo en un segundo commit.

  · LAS FECHAS SALEN DE `git log`, no de hoy ni de la fecha del fichero. `<lastmod>`
    dice cuando cambio la PAGINA, y eso solo lo sabe el historial. La fecha del disco
    cambia con un `touch`; la de hoy miente en cuanto no se publica todo cada dia.
  · Y POR ESO ESTE GUION SE NIEGA A CORRER SI UNA PAGINA TIENE CAMBIOS SIN COMMITEAR:
    su `<lastmod>` diria una fecha anterior a su contenido, que es exactamente el fallo
    que lo hizo nacer. Primero se commitea la pagina, despues se genera el sitemap.

QUE ENTRA Y QUE NO
  · Entran `index.html`, las demas paginas de la raiz y los `chapters/*.html`.
  · NO ENTRA LO QUE SE DECLARA `noindex`. No hay lista de excluidos escrita a mano: se
    LEE la pagina. `course.html` lleva `<meta name="robots" content="noindex">` desde
    el 25 de septiembre de 2026 y por eso se cae sola; el dia que alguien se lo quite,
    vuelve al sitemap sin tocar este fichero. *Una lista a mano es una lista que se
    queda vieja.*
  · NI LOS FICHEROS DE VERIFICACION de los buscadores --- `google*.html` y compania ---,
    que no son paginas: son un recibo que el buscador pide ver en su sitio.
  · Ni nada que no sea `.html`: el sitemap lista paginas, no recursos. La lamina, las
    fuentes y las fotos no van.
"""
import io
import os
import re
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DOMINIO = u"https://offshoretheory.com/"
SALIDA = os.path.join(RAIZ, u"sitemap.xml")

#  LAS PRIORIDADES, DECLARADAS. Son una pista para el buscador, no una nota: dicen que
#  paginas son el curso y cuales el papeleo.
PORTADA = u"1.0"
CAPITULO = u"0.7"
OTRA = u"0.3"

#  Lo que no es una pagina aunque acabe en `.html`.
RECIBOS = re.compile(r"^(google[0-9a-f]+\.html|BingSiteAuth\.xml|"
                     r"yandex_[0-9a-f]+\.html)$", re.I)
NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]*content=["\'][^"\']*'
                     r'noindex', re.I)


def git(*a):
    u"""Lo que dice git, SIN tocarle los espacios.

    Aqui habia un `.strip()` de toda la salida, y se comia el espacio de la PRIMERA
    columna de `git status --porcelain`: ` M index.html` llegaba como `M index.html`,
    la ruta salia cortada un caracter y el guardia de <sin commitear> no reconocia
    ningun fichero --- corria tan contento con `index.html` modificado ---. Lo cazo su
    control negativo el mismo dia que se escribio, y por eso el control existe.
    *Un `strip` puesto por costumbre, sobre una salida donde la columna cero significa
    algo.* Quien necesite quitar el salto final que lo quite el.
    """
    r = subprocess.run([u"git", u"-C", RAIZ] + list(a), capture_output=True,
                       encoding=u"utf-8", errors=u"replace")
    if r.returncode != 0:
        raise SystemExit(u"  PARADO: `git %s` ha fallado:\n  %s"
                         % (u" ".join(a), (r.stderr or u"").strip()[:300]))
    return r.stdout or u""


def fecha(rel):
    u"""Cuando se commiteo por ultima vez esa pagina. Un vacio PARA, no se salta.

    Un `git log` sin resultado significa una de dos: o el fichero no esta en ningun
    commit, o la ruta no casa --- el pathspec que no casa devuelve vacio, y el vacio se
    lee igual que <no ha cambiado nunca> ---. Las dos son motivo de parar: un
    `<lastmod>` inventado es peor que no tenerlo.
    """
    d = git(u"log", u"-1", u"--format=%cs", u"--", rel).strip()
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
        raise SystemExit(
            u"  PARADO: `%s` no tiene fecha de commit (`git log` devolvio %r).\n"
            u"  O no esta en ningun commit, o la ruta no casa. Sin fecha no se\n"
            u"  inventa una: se commitea la pagina y se vuelve a generar." % (rel, d))
    return d


def sucias(rels):
    u"""Las paginas con cambios sin commitear. Se pregunta SIN pathspec, a proposito.

    `git status --porcelain -- <ruta>` con una ruta que no casa devuelve vacio, y ese
    vacio dice <limpio> cuando en realidad dice <no he mirado>. Se pide el estado del
    repositorio entero y el cruce se hace aqui.
    """
    fuera = []
    est = {}
    for l in git(u"status", u"--porcelain").split(u"\n"):
        if not l.strip():
            continue
        ruta = l[3:]
        if u" -> " in ruta:
            ruta = ruta.split(u" -> ")[-1]
        est[ruta.strip().strip(u'"').replace(u"\\", u"/")] = l[:2]
    for r in rels:
        if r in est:
            fuera.append((r, est[r]))
    return fuera


def paginas():
    u"""Las paginas que van al sitemap, con su prioridad, en el orden de siempre."""
    out = []
    raiz = sorted(f for f in os.listdir(RAIZ) if f.endswith(u".html"))
    #  `index.html` primero y con su prioridad; se publica como `/`, sin nombre
    if u"index.html" not in raiz:
        raise SystemExit(u"  PARADO: no hay `index.html`, y es la portada.")
    out.append((u"index.html", u"", PORTADA))
    for f in raiz:
        if f == u"index.html" or RECIBOS.match(f):
            continue
        out.append((f, f, OTRA))
    ch = os.path.join(RAIZ, u"chapters")
    for f in sorted(os.listdir(ch)):
        if f.endswith(u".html"):
            out.append((u"chapters/" + f, u"chapters/" + f, CAPITULO))
    #  y se cae lo que la propia pagina declara `noindex`
    dentro, fuera = [], []
    for rel, url, pri in out:
        t = io.open(os.path.join(RAIZ, rel.replace(u"/", os.sep)),
                    encoding=u"utf-8").read()
        (fuera if NOINDEX.search(t[:t.find(u"</head>") + 7] or t) else
         dentro).append((rel, url, pri))
    return dentro, fuera


def main():
    solomirar = u"--mirar" in sys.argv
    dentro, fuera = paginas()
    recibos = sorted(f for f in os.listdir(RAIZ)
                     if f.endswith(u".html") and RECIBOS.match(f))

    #  ── LAS PAGINAS TIENEN QUE ESTAR COMMITEADAS, O LA FECHA MIENTE ────────
    mal = sucias([r for r, _, _ in dentro])
    if mal:
        print(u"  PARADO: %d pagina(s) con cambios sin commitear. Su `<lastmod>`\n"
              u"  diria una fecha anterior a su contenido:" % len(mal))
        for r, e in mal:
            print(u"     [%s] %s" % (e, r))
        print(u"")
        print(u"  Commitea la pagina y vuelve a generar. Es el orden que hay que")
        print(u"  respetar: primero la pagina, despues el sitemap que la fecha.")
        return 1

    filas = [(DOMINIO + url, fecha(rel), pri) for rel, url, pri in dentro]
    x = [u'<?xml version="1.0" encoding="UTF-8"?>',
         u'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lm, pri in filas:
        x += [u"  <url>",
              u"    <loc>%s</loc>" % loc,
              u"    <lastmod>%s</lastmod>" % lm,
              u"    <priority>%s</priority>" % pri,
              u"  </url>"]
    x += [u"</urlset>", u""]
    texto = u"\n".join(x)

    print(u"paginas en el sitemap: %d" % len(filas))
    for loc, lm, pri in filas[:4]:
        print(u"   %-52s %s  %s" % (loc, lm, pri))
    print(u"   ... y %d capitulos" % (len(filas) - 4))
    if fuera:
        print(u"fuera por declararse `noindex`: %s"
              % u", ".join(r for r, _, _ in fuera))
    if recibos:
        print(u"fuera por ser recibos de verificacion: %s" % u", ".join(recibos))
    if solomirar:
        print(u"(--mirar: no se ha escrito nada)")
        return 0
    io.open(SALIDA, u"w", encoding=u"utf-8", newline=u"\n").write(texto)
    print(u"escrito `sitemap.xml`, %d bytes" % len(texto))
    return 0


if __name__ == "__main__":
    sys.exit(main())
