# Calendario de adviento pixel art

Juego web en HTML/CSS/JS puro (sin frameworks ni build). Un edificio de 6 plantas con 24 puertas: el día 1 está abajo a la izquierda y el 24 arriba a la derecha.

## Controles
- **← / →**: andar.
- **↑ / ↓** junto a la escalera (lateral derecho): subir y bajar de planta.
- **Espacio / Enter** delante de una puerta: abrirla.
- En móvil aparecen botones táctiles.

Una puerta solo se abre si su número ≤ el día actual de diciembre. El progreso se guarda en `localStorage`.

## Probarlo en local
`dias.json` se carga con `fetch`, y los navegadores lo bloquean con `file://`. Sirve la carpeta con cualquier servidor estático:

```
py -m http.server 8000
```
y abre <http://localhost:8000/>.

### Simular la fecha
Añade `?debug=1&dia=N` a la URL, por ejemplo `http://localhost:8000/?debug=1&dia=12` (con `dia=0` simulas antes de diciembre). En modo debug el progreso se guarda aparte.

## Contenido (`dias.json`)
Cada día tiene `dia`, `tipo`, `titulo` y según el tipo:

| tipo | campos |
|------|--------|
| `mensaje` | `texto` |
| `foto` | `imagen` (ruta en `fotos/`), `texto`, `alt` opcional |
| `minijuego` | `juego` (nombre del archivo en `juegos/`), `texto`, `recompensa` opcional |

## Añadir un minijuego
Crea `juegos/<nombre>.js` y regístralo (ver `juegos/ejemplo.js`):

```js
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS.<nombre> = {
  iniciarJuego(contenedor, alTerminar) {
    // dibuja en `contenedor`; llama a alTerminar() al ganar
    return () => { /* limpieza opcional */ };
  }
};
```
Se carga solo al entrar en esa puerta.

## Publicar en GitHub Pages
1. Sube el proyecto a un repositorio de GitHub (`index.html` en la raíz del repo).
2. En el repo: **Settings → Pages**.
3. En *Build and deployment* elige **Deploy from a branch**, rama `main` (o la que uses), carpeta `/ (root)`, y guarda.
4. Tras un minuto estará en `https://<usuario>.github.io/<repositorio>/`.

El archivo `.nojekyll` evita que GitHub procese el sitio con Jekyll.
