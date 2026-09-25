# -*- coding: utf-8 -*-
u"""AVISA A LOS BUSCADORES DE QUE ALGO HA CAMBIADO · IndexNow

    python tools/indexnow.py                      avisa de las URL del sitemap
    python tools/indexnow.py <url> <url> ...       avisa solo de esas
    python tools/indexnow.py --mirar              dice que enviaria, y no envia

QUE ES ESTO. IndexNow es un aviso: se le dice a un punto de entrada que estas URL han
cambiado, y Bing, Yandex, Seznam y Naver lo reparten entre ellos. **No es un sitemap**:
el sitemap dice lo que hay, y esto dice lo que acaba de cambiar. Un sitemap se descubre
cuando al buscador le apetece pasar; un aviso llega cuando se manda.

  · Google NO usa IndexNow. Para Google esta el sitemap y Search Console. Esto no
    sustituye a nada: se suma.
  · Y NO SE AVISA DE LO QUE NO HA CAMBIADO. Avisar de las setenta y siete cada vez que
    se toca una pagina es ruido, y el protocolo lo trata como tal --- su codigo 429
    existe para eso ---. Por eso acepta una lista: lo normal despues de una publicacion
    es nombrar lo que se publico.

══ LA CLAVE NO SE ESCRIBE AQUI: SE BUSCA ════════════════════════════════════════════
El protocolo pide una clave y un sitio donde el buscador pueda comprobarla. La clave
vive en un fichero `<clave>.txt` en la raiz, con la clave dentro y nada mas --- igual
que el recibo de Google: es un recibo, no una pagina, y no va al sitemap ---.

Este fichero **no lleva la clave escrita**: la busca en la raiz por su forma. Dos copias
de una clave son dos claves, y la segunda es la que se queda vieja.

══ Y NO SE ENVIA NADA SI LA CLAVE NO ESTA EN VIVO ═══════════════════════════════════
Lo primero que hace el buscador al recibir el aviso es pedir `keyLocation` y comparar.
Si el fichero no esta publicado todavia --- y en GitHub Pages tarda su minuto ---, el
aviso se rechaza, y ese rechazo es lo mismo que no haber avisado. Asi que se pide
`https://<host>/<clave>.txt` ANTES de enviar y se compara su contenido letra por letra.

*Un aviso mandado a ciegas contesta 202 y no sirve de nada: 202 significa <recibido, la
clave pendiente de comprobar>. El que no valida se pierde en silencio, que es la peor
clase de fallo que hay en esta casa.*
"""
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
HOST = u"offshoretheory.com"
SITIO = u"https://" + HOST
PUNTO = u"https://api.indexnow.org/indexnow"
SITEMAP = os.path.join(RAIZ, u"sitemap.xml")

#  Un aviso admite hasta diez mil URL en una peticion. Aqui no se llega, pero si un dia
#  se llega hay que partirlo, y mas vale que reviente diciendolo.
TOPE = 10000

#  ── QUE SIGNIFICA CADA CODIGO, del protocolo ───────────────────────────────
#  Se escriben los seis: un codigo sin su significado obliga a buscarlo fuera justo el
#  dia que algo va mal, y ese dia nadie busca nada.
CODIGOS = {
    200: (True, u"OK. Las URL se han enviado y la clave es valida."),
    202: (True, u"Aceptado: las URL estan recibidas y LA CLAVE ESTA PENDIENTE de "
                u"comprobacion. No es un fallo, pero tampoco es una confirmacion: si "
                u"la clave no cuadra, el aviso se cae despues y en silencio."),
    400: (False, u"Peticion mal formada. El cuerpo no es el que el protocolo espera."),
    403: (False, u"Prohibido: LA CLAVE NO ES VALIDA. O el fichero no esta donde dice "
                 u"`keyLocation`, o esta y no contiene esa clave."),
    422: (False, u"No se puede procesar: o las URL no son de este host, o la clave no "
                 u"tiene la forma que el protocolo pide."),
    429: (False, u"Demasiadas peticiones. Se ha avisado de mas, o demasiado seguido. "
                 u"NO se reintenta en bucle: se espera y se avisa de menos cosas."),
}


def clave():
    u"""(clave, fichero) buscando en la raiz por la forma del nombre.

    SE NIEGA SI NO HAY EXACTAMENTE UNA. Cero es que no se ha creado; dos es que alguien
    dejo la vieja al rotar, y entonces cual es la buena no lo sabe nadie --- y el
    buscador comprobaria la que le digamos, no la que este bien ---.
    """
    hay = sorted(f for f in os.listdir(RAIZ)
                 if re.match(r"^[0-9a-f]{32}\.txt$", f)
                 and os.path.isfile(os.path.join(RAIZ, f)))
    if len(hay) != 1:
        raise SystemExit(
            u"  PARADO: en la raiz hay %d ficheros de clave y tiene que haber UNO.\n"
            u"  %s\n"
            u"  Si se esta rotando la clave, la vieja se retira DESPUES de que la nueva\n"
            u"  este en vivo, y nunca las dos a la vez." % (len(hay), hay or u"(ninguno)"))
    f = hay[0]
    k = io.open(os.path.join(RAIZ, f), encoding=u"utf-8").read()
    if k.strip() != f[:-4]:
        raise SystemExit(
            u"  PARADO: `%s` no contiene su propia clave.\n"
            u"  Dentro hay %r y el nombre dice %r. El buscador compara justo eso."
            % (f, k[:60], f[:-4]))
    if k != k.strip():
        raise SystemExit(
            u"  PARADO: `%s` lleva espacios o un salto de linea.\n"
            u"  El contenido tiene que ser la clave y nada mas: un salto de mas es una\n"
            u"  clave distinta para quien la compara byte a byte." % f)
    return k, f


def urlsDelSitemap():
    u"""Las URL que el sitemap declara. Si no hay sitemap, se para."""
    if not os.path.isfile(SITEMAP):
        raise SystemExit(u"  PARADO: no hay `sitemap.xml`, y de ahi salen las URL.")
    t = io.open(SITEMAP, encoding=u"utf-8").read()
    u = re.findall(r"<loc>\s*(.*?)\s*</loc>", t)
    if not u:
        raise SystemExit(u"  PARADO: `sitemap.xml` no declara ni una `<loc>`.\n"
                         u"  Un cero no es una ausencia hasta que se comprueba.")
    return u


def enVivo(k, f):
    u"""Comprueba que la clave se sirve, y que sirve ESA clave. Se para si no."""
    url = u"%s/%s" % (SITIO, f)
    try:
        r = urllib.request.urlopen(url, timeout=30)
        cuerpo = r.read().decode(u"utf-8", u"replace")
        codigo = r.status
    except urllib.error.HTTPError as e:
        raise SystemExit(
            u"  PARADO: `%s` da %s en vivo.\n"
            u"  El buscador pide justo esa direccion para validar el aviso, asi que\n"
            u"  enviarlo ahora seria mandarlo a la basura. Publica el fichero y espera\n"
            u"  a que se sirva." % (url, e.code))
    except Exception as e:
        raise SystemExit(u"  PARADO: no se puede pedir `%s` (%s)." % (url, e))
    if cuerpo.strip() != k:
        raise SystemExit(
            u"  PARADO: `%s` responde %s pero lo que sirve no es la clave.\n"
            u"  Sirve %r y la clave es %r." % (url, codigo, cuerpo[:80], k))
    print(u"  la clave se sirve en vivo: %s  ·  %s  ·  %d bytes, exactos"
          % (url, codigo, len(cuerpo.encode(u"utf-8"))))
    return url


def avisa(k, keyLocation, urls, solomirar=False):
    cuerpo = {u"host": HOST, u"key": k, u"keyLocation": keyLocation,
              u"urlList": urls}
    datos = json.dumps(cuerpo, ensure_ascii=False).encode(u"utf-8")
    print(u"")
    print(u"  el aviso: %d URL en UNA peticion a %s" % (len(urls), PUNTO))
    print(u"     host ......... %s" % HOST)
    print(u"     key .......... %s" % k)
    print(u"     keyLocation .. %s" % keyLocation)
    print(u"     cuerpo ....... %d bytes" % len(datos))
    for u in urls[:3]:
        print(u"     %s" % u)
    if len(urls) > 3:
        print(u"     ... y %d mas" % (len(urls) - 3))
    if solomirar:
        print(u"")
        print(u"  (--mirar: no se ha enviado nada)")
        return 0
    pet = urllib.request.Request(
        PUNTO, data=datos,
        headers={u"Content-Type": u"application/json; charset=utf-8"})
    try:
        r = urllib.request.urlopen(pet, timeout=60)
        codigo, texto = r.status, r.read().decode(u"utf-8", u"replace")
    except urllib.error.HTTPError as e:
        codigo, texto = e.code, e.read().decode(u"utf-8", u"replace")
    except Exception as e:
        print(u"")
        print(u"  NO SE HA PODIDO ENVIAR: %s" % e)
        return 1
    bien, que = CODIGOS.get(codigo, (False, u"codigo que el protocolo no documenta."))
    print(u"")
    print(u"  ── LA RESPUESTA ──")
    print(u"  codigo %s  ·  %s" % (codigo, u"CORRECTO" if bien else u"NO CORRECTO"))
    print(u"  %s" % que)
    if texto.strip():
        print(u"  el cuerpo de la respuesta: %r" % texto[:300])
    else:
        print(u"  el cuerpo de la respuesta viene vacio, que es lo normal.")
    #  Y NO SE REINTENTA. Un reintento en bucle es como se llega al 429, y el 429 es
    #  una puerta que se cierra: si algo falla, se dice y se para.
    return 0 if bien else 1


def main():
    args = [a for a in sys.argv[1:] if a != u"--mirar"]
    solomirar = u"--mirar" in sys.argv
    k, f = clave()
    print(u"  clave encontrada en `%s`" % f)
    urls = args or urlsDelSitemap()
    print(u"  %d URL %s" % (len(urls),
                            u"nombradas a mano" if args else u"leidas de `sitemap.xml`"))
    #  ── TODAS TIENEN QUE SER DE ESTE HOST ───────────────────────────────────
    #  El protocolo lo exige --- su 422 es justo esto ---, y una URL de otro sitio en
    #  la lista tumba el aviso ENTERO, no solo la suya.
    ajenas = [u for u in urls if not u.startswith(SITIO + u"/") and u != SITIO + u"/"]
    if ajenas:
        raise SystemExit(u"  PARADO: %d URL no son de %s, y eso tumba el aviso "
                         u"entero:\n%s"
                         % (len(ajenas), HOST,
                            u"".join(u"     %s\n" % x for x in ajenas[:8])))
    if len(urls) > TOPE:
        raise SystemExit(u"  PARADO: %d URL y el tope de una peticion es %d."
                         % (len(urls), TOPE))
    if len(set(urls)) != len(urls):
        raise SystemExit(u"  PARADO: hay URL repetidas en la lista.")
    keyLocation = enVivo(k, f)
    return avisa(k, keyLocation, urls, solomirar)


if __name__ == "__main__":
    sys.exit(main())
