# Offshore Theory

Este repositorio contiene **únicamente el material público y gratuito**: los cuatro
bloques abiertos —balizamiento, luces y marcas de buques, reglas de rumbo y gobierno, y
las flashcards— repartidos en ocho páginas y sus catorce tipografías.

El **curso completo vive en un repositorio privado separado**, y de él no se copia aquí
nada más que los ficheros que ya están en este árbol.

**Ningún contenido de pago puede añadirse aquí nunca** — ni una página, ni un índice que
lo enumere, ni un enlace que apunte a él.

---

## El orden de publicar, y no se puede saltar

`copia.py` vive en el repositorio del curso y **pisa `chapters/`, `notes/`,
`privacy.html` y `waitlist.html`** cada vez que corre. Las etiquetas de `<head>` que
esas páginas necesitan para los buscadores —canonical, favicon, `og:image`, la tarjeta
de redes, los títulos propios de las notas y su JSON-LD— **no las pone el curso**: las
pone este repositorio, y se pierden en cada copia.

**Así que después de cada `copia.py`, y antes de commitear:**

```
python tools/seo_head.py     # las vuelve a poner. Es idempotente.
python tools/sitemap.py      # el sitemap, con las fechas de los commits
git add <lo que cambió> && git commit
python tools/indexnow.py <solo las URL que cambiaron>
```

**`seo_head.py` no sale del `<head>`**, y eso está comprobado y no supuesto: inserta
todo antes del primer `<style>`, que en las 76 páginas es la frontera de la cabecera, y
se para si delante de ese punto aparece cualquier etiqueta que no sea `html`, `head`,
`meta`, `title` o `link`. Hace falta porque **24 de los 44 capítulos no abren `<head>`**
—van de `<html>` directos a las metas— y buscar `</head>` los habría dejado fuera sin
decir nada.

*El día que el curso ponga estas etiquetas por su cuenta, `seo_head.py` no hará nada:
sólo añade lo que falta.*
