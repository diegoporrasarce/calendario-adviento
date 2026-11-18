# Minijuegos del calendario

Fuente de verdad de los minijuegos de los días 2 a 24. Si el código contradice este archivo, manda este archivo.
Se añaden de uno en uno, en orden de fecha (cada uno solo tiene que estar listo el día de su puerta).

## Historia

- **Día 1:** diálogo de Henar (ya hecho, se queda como está; no es un minijuego).
- **Días 2–11, la mudanza:** la chica se instala en el edificio.
- **Día 12, el terremoto:** el edificio se derrumba dentro del minijuego; al ganar, se salva y vuelve a verse bien.
- **Días 13–23, la reconstrucción:** cada juego trata de arreglar algo tras el terremoto (es ambientación: el edificio del mapa siempre se ve normal).
- **Día 24, la persecución:** un ladrón roba los regalos y hay que alcanzarle.

El edificio del mapa principal no cambia de estado: el derrumbe solo ocurre dentro del minijuego del día 12.

## Reglas comunes

- **Archivo:** `juegos/diaNN-nombre.js` (por ejemplo `juegos/dia02-copos.js`). En `dias.json` el día lleva `"tipo": "minijuego"` y `"juego": "diaNN-nombre"`.
- **Registro** (scripts clásicos, como el resto del proyecto):
  ```js
  window.JUEGOS = window.JUEGOS || {};
  window.JUEGOS['dia02-copos'] = {
    iniciarJuego(contenedor, alTerminar) {
      // ...
      return () => { /* destruir: parar bucles, timers y listeners */ };
    }
  };
  ```
  `alTerminar()` se llama al ganar o al pulsar "Saltar". `iniciarJuego` recibe un tercer argumento con la entrada del día en `dias.json`, para leer palabras, preguntas o fotos.
- **Base compartida `juegos/comun.js`** (se carga desde `index.html`): cada juego llama a
  `Comun.crearJuego(contenedor, alTerminar, { titulo, instruccion, sinDerrota, pantallaCompleta, musica, reiniciar, actualizar, dibujar })`
  y devuelve lo que esta devuelve (su `destruir`). La base pone el lienzo de 320×240 escalado, la entrada unificada
  (`api.entrada`: flechas, Espacio/Enter, toques con `puntero`, botones táctiles y `pulsado(k)`), las pantallas de título
  y derrota, los reintentos, el botón "Saltar" y la celebración. El juego llama a `api.ganar()`, `api.perder(motivo)`, `api.fallo()` (cuenta un fallo para "Saltar" sin pantalla de derrota),
  `api.sacudir(seg)` y `api.aviso(texto, x, y)`. También hay `Comun.texto` (fuente pixel 5×7, mayúsculas; `Comun.medir` y `Comun.altoTexto` para medirla), `Comun.caja`, `Comun.fondoNoche` y `Comun.PALETA`.
  - `musica`: cada minijuego tiene su villancico de dominio público, distinto del del edificio (pistas en `PISTAS` de `js/sonido.js`; al cerrar vuelve el del edificio). Hechas: `deck` (día 2), `wewish` (día 3), `nochedepaz` (día 4), `wenceslao` (día 5), `campanas` (día 6).
  - `pantallaCompleta: true` (recomendado): el lienzo crece hasta llenar toda la pantalla, sin franjas negras. El juego lee `api.ancho` y `api.alto` en cada fotograma (mínimo 320×240).
  - `api.textoEscala` vale 2 cuando el lienzo se ve pequeño: úsalo en los marcadores para que se lean en el móvil.
  - La esquina superior derecha es de los botones de sonido, pantalla completa y cerrar: los marcadores no deben pasar de `api.ancho - api.margenDerecho` (en móvil, ponerlos en dos filas si no caben).
  - En modo debug, `juegoDebug.ganar()` desde la consola gana la partida (para probar).
- **Estilo:** el del juego principal: píxel gordo, paleta limitada, sombreado con trama, sin degradados lisos. Sprites dibujados en código. La protagonista es siempre la chica de `js/sprites.js`.
- **Pantalla:** el minijuego ocupa toda la escena (no una ventanita), para que se vea bien en el móvil.
- **Controles:** flechas y Espacio/Enter en teclado, y táctil. Todo tiene que poder jugarse en el móvil.
- **Antes de empezar:** pantalla con el título y una instrucción de una línea.
- **Perder:** se puede reintentar sin límite. Tras 3 intentos fallidos aparece "Saltar". En los juegos donde no se puede perder (memory, puzles, sopa de letras…), "Saltar" aparece a los 2 minutos.
- **Ganar:** breve celebración y después el mensaje del día de `dias.json` (`recompensa`).
- **Duración objetivo:** entre 30 y 90 segundos.
- **Contenido:** textos, palabras, preguntas y fotos van en `dias.json`, nunca en el código. Los campos que tenga que rellenar el usuario se dejan con `TODO:`.
- **Privacidad:** el repositorio es público, así que todo lo de `dias.json` y `fotos/` se puede leer en GitHub. Las respuestas (palabra del Wordle, quiz) pueden guardarse codificadas para que no se vean a simple vista.

### Al añadir cada día
1. Crear el juego y registrarlo en `dias.json`.
2. Probar con `py -m http.server 8000` y `?debug=1&dia=NN&abrir=NN`: que se gana, que se pierde y se reintenta, que "Saltar" aparece, que al cerrar y volver a entrar no queda nada colgado, y que funciona con tamaño de móvil.
3. Un commit por día: `Día NN: <nombre>`.

## Días

Cada día tiene la descripción del usuario. Las **propuestas** son recomendaciones pendientes de confirmar al hacer ese día.

| Día | Juego | Descripción |
|---|---|---|
| 2 | Atrapa copos | Caen copos y hay que cogerlos moviéndose a izquierda y derecha. 20 copos para ganar. |
| 3 | Memory navideño | 6 parejas de cartas pixel: gorro, bufanda, árbol, estrella… |
| 4 | Riega la planta | Pulsar en el momento justo, cuando la barra está en verde, tres veces seguidas. |
| 5 | Enciende las ventanas | Cuadrícula de luces: al pulsar una cambian también las de al lado (Lights Out). Hay que encenderlas todas. |
| 6 | Sube la escalera | Juego de ritmo: pulsar ↑ al compás para subir 6 pisos antes de que acabe el tiempo. |
| 7 | Muñeco de nieve | Hacer rodar bolas de nieve y apilarlas sin que se caigan. |
| 8 | El gato del vecino | Un gato se ha escondido en el edificio y hay que encontrarlo detrás de las macetas o ventanas. |
| 9 | Chocolate caliente | Llenar la taza parando la barra en el punto exacto, sin desbordarla. |
| 10 | Adivina la palabra | Wordle de 5 letras con una palabra vuestra. |
| 11 | Decorar el árbol | Colocar adornos en el árbol del portal. Al terminar todo está precioso… y empieza a temblar. |
| 12 | Salva la Navidad | Ver detalle abajo. |
| 13 | Apila ladrillos | Ladrillos que se mueven de lado a lado; hay que soltarlos encima de la torre (tipo Stack). |
| 14 | Arregla las tuberías | Girar piezas para conectar el agua de principio a fin. |
| 15 | Pinta la fachada | Repasar con el rodillo todas las zonas sin pintar antes de que se acabe el tiempo. |
| 16 | Puzzle deslizante | Recomponer una foto vuestra rota por el terremoto (3×3). |
| 17 | Esquiva bolas de nieve | Los vecinos montan una guerra de bolas; hay que aguantar 30 segundos sin que te den. |
| 18 | Cables de la luz | Unir cada color con su enchufe sin que se crucen. |
| 19 | Quiz | 5 preguntas sobre vosotros. Cada acierto repone una ventana. |
| 20 | Sopa de letras | Palabras de vuestra historia escondidas entre los escombros. |
| 21 | Ascensor | Llevar a cada vecino a su piso; aparecen pidiendo planta y hay que ser rápida. |
| 22 | Reparte los regalos | Lanzar regalos por las chimeneas desde el tejado calculando la fuerza. |
| 23 | La estrella del tejado | Subir por el edificio en un pequeño plataformas y colocar la estrella. |
| 24 | La persecución | Ver detalle abajo. |

### Día 12 — Salva la Navidad
Al entrar en la puerta, la pantalla tiembla, caen cascotes y el edificio se derrumba en una animación. La chica queda en la calle entre escombros y los regalos están repartidos por las ruinas.
El minijuego es correr entre los escombros esquivando piedras que caen y recoger 10 regalos antes de que se acabe el tiempo. Si pierde, puede reintentarlo sin límite. Al ganar, el edificio se salva y vuelve a verse bien.

### Día 24 — La persecución
Cuando la chica entra en la puerta, aparece de noche el personaje del ladrón (el autor del calendario), coge el saco de regalos y sale corriendo por los tejados.
El minijuego es un runner lateral: la chica corre sola por los tejados de la ciudad, salta chimeneas y huecos (Espacio o tocar la pantalla) y recoge los regalos que se le caen al ladrón. Tres fases cada vez más rápidas; al final lo alcanza.
Al ganar, escena final: el ladrón devuelve el saco (o resulta que los robaba por un motivo tierno; pendiente de elegir), nieva sobre el edificio iluminado y aparece el mensaje principal con una foto.
Necesita: una imagen del autor para su sprite y retrato, el texto del final y la foto.

### Hechos
- **2 — Atrapa copos:** 20 copos en 60 s, carámbanos que quitan 3, copos grandes. Mensaje escrito.
- **3 — Memory:** 12 cartas con giro animado, 4×3 en horizontal y 3×4 en vertical; toque o flechas + Espacio. Sin derrota ("Saltar" a los 2 min).
- **4 — Riega la planta:** barra con zona verde que se estrecha y se acelera; 5 aciertos seguidos (con capullo antes de abrirse) y florece la flor de Pascua. Un fallo vuelve a empezar la racha (cuenta para "Saltar").
- **5 — Enciende las ventanas:** Lights Out 4×4 sobre la fachada; tableros generados desde "todo encendido" con 5 pulsaciones al azar (siempre con solución); botón REINICIAR y, desde 35 pulsaciones en total, botón PISTA que señala una ventana que falta pulsar; toque o flechas + Espacio. Sin derrota.
- **6 — Sube la escalera:** ritmo sincronizado con la música (`Sonido.pulsoMusica()`, descontando la latencia); flechas al principio de cada compás y algunas dobles; acierto = peldaño, fallo = resbala (nunca por debajo del último piso). 6 pisos (24 peldaños) en 40 s.

### Propuestas pendientes de confirmar
- **2:** algún carámbano que reste, para que tenga reto. En el móvil, tocar la mitad izquierda o derecha de la pantalla.
- **4:** la zona verde se estrecha en cada acierto y la planta crece.
- **5:** tableros generados desde el resuelto (siempre con solución), botón de reiniciar. 4×4, o 3×3 si se prefiere más fácil.
- **6:** al compás de la música del juego, con margen generoso (en el móvil el sonido llega con retraso).
- **7:** solo apilar: la bola se balancea y se suelta al tocar; 3 bolas.
- **8:** pistas (cola asomando, maullido más fuerte cuanto más cerca).
- **9:** para que no se parezca al día 4: mantener pulsado para echar chocolate y soltar a tiempo; el líquido sigue cayendo un instante.
- **10:** teclado en pantalla con Ñ; se acepta cualquier palabra de 5 letras; sin tildes.
- **13:** meta de 12 bloques.
- **14:** se genera un camino con solución y se giran las piezas al azar.
- **15:** en el móvil, se pinta arrastrando el dedo.
- **16:** miniatura de la foto como guía.
- **17:** 3 vidas en lugar de "que no te den ninguna".
- **18:** 2 o 3 tableros diseñados a mano.
- **20:** palabras sin tildes, selección arrastrando.
- **23:** corto y con saltos generosos (las plataformas son lo más difícil en el móvil).
