# Minijuegos del calendario

Fuente de verdad de los minijuegos de los días 2 a 24. Si el código contradice este archivo, manda este archivo.
Se añaden de uno en uno, en orden de fecha (cada uno solo tiene que estar listo el día de su puerta).

## Historia

- **Día 1:** diálogo de Henar (ya hecho, se queda como está; no es un minijuego).
- **Días 2–11, la mudanza:** la chica se instala en el edificio.
- **Día 12, el terremoto:** el edificio se derrumba dentro del minijuego; al ganar, se salva y vuelve a verse bien.
- **Días 13–23, preparando la Navidad:** el edificio ya se salvó en el día 12 y no se reconstruye nada. Los juegos y los mensajes hablan del piso nuevo, el barrio, los vecinos y los preparativos (como mucho se recuerda el susto del terremoto).
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
  (`api.entrada`: flechas, Espacio/Enter, toques con `puntero` (con `xInicio`/`yInicio` = dónde se pulsó, para arrastrar), botones táctiles y `pulsado(k)`), las pantallas de título
  y derrota, los reintentos, el botón "Saltar" y la celebración. El juego llama a `api.ganar()`, `api.perder(motivo)`, `api.fallo()` (cuenta un fallo para "Saltar" sin pantalla de derrota),
  `api.sacudir(seg)` y `api.aviso(texto, x, y)`. También hay `Comun.texto` (fuente pixel 5×7, mayúsculas; `Comun.medir` y `Comun.altoTexto` para medirla), `Comun.caja`, `Comun.fondoNoche` y `Comun.PALETA`.
  - `musica`: cada minijuego tiene su villancico de dominio público, distinto del del edificio (pistas en `PISTAS` de `js/sonido.js`; al cerrar vuelve el del edificio). Hechas: `deck` (día 2), `wewish` (día 3), `nochedepaz` (día 4), `wenceslao` (día 5), `campanas` (día 6), `alegria` (día 7), `noel` (día 8), `caballeros` (día 9), `reyes` (día 10), `tannenbaum` (día 11), `heraldo` (día 12), `fieles` (día 13), `fontanera` (día 14), `pintura`, `puzle`, `bolas`, `cables` y `bolos` (días 15–19); `sopa`, `trineo` (con cascabeles), `reparto` y `estrella` (días 20–23); las de los días 14 a 23 son melodías originales.
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
| 9 | Chocolate caliente | Prepararse una taza mezclando y preparando los ingredientes, con nata por encima, estilo Overcooked. |
| 10 | Adivina la palabra | Wordle de 5 letras con una palabra vuestra. |
| 11 | Decorar el árbol | Con tiempo: sale un árbol decorado de referencia y hay que copiarlo. 3 veces, cada vez más difícil. Al terminar todo está precioso… y empieza a temblar. |
| 12 | Salva la Navidad | Animación del derrumbe del mismo edificio de la pantalla principal; luego saltos tipo Doodle Jump por los escombros del edificio. Ver detalle abajo. |
| 13 | Apila ladrillos | Ladrillos que se mueven de lado a lado; hay que soltarlos encima de la torre (tipo Stack). |
| 14 | Arregla las tuberías | Girar piezas para conectar el agua de principio a fin. |
| 15 | Pinta la fachada | Repasar con el rodillo todas las zonas sin pintar antes de que se acabe el tiempo. |
| 16 | Puzzle deslizante | Recomponer una foto vuestra rota por el terremoto (3×3). |
| 17 | Esquiva bolas de nieve | Los vecinos montan una guerra de bolas; hay que aguantar 30 segundos sin que te den. |
| 18 | Cables de la luz | Unir cada color con su enchufe sin que se crucen. |
| 19 | Bolos de nieve | Lanzar una bola de nieve contra 10 muñecos de nieve en triángulo: dirección y fuerza con indicadores que oscilan. |
| 20 | Sopa de letras | Palabras de vuestra historia escondidas en una sopa de letras. |
| 21 | Trineo por la cuesta | Bajar en trineo por la calle nevada esquivando obstáculos y recogiendo regalos hasta llegar a la meta. |
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
- **7 — Muñeco de nieve:** la pieza se balancea y se suelta al pulsar: base, cuerpo, cabeza y sombrero, cada vez más rápido. Centrada = ¡PERFECTO!; algo torcida aguanta; muy descentrada rueda y se rompe (derrota y reintento). Al final se añaden solos ojos, nariz, bufanda, botones y brazos.
- **8 — El gato del vecino:** 10 escondites en la fachada (4 cortinas, 3 macetas, 3 cajas de la mudanza). Pistas: la cola asoma cada pocos segundos y al fallar sale FRÍO / TEMPLADO / ¡CALIENTE!. Tras 3 fallos el gato cambia de sitio. Encontrarlo 3 veces. Sin derrota.
- **9 — Chocolate caliente (estilo Overcooked):** cocina vista desde arriba con nevera, tazas, cazo, cacao, nata, nubes, entrega y papelera. Leche al cazo → se calienta (4 s) → cacao → remover 6 veces → el chocolate se queda en el cazo y se recoge con una taza → nata y nubes → entregar. La leche caliente sin cacao se quema a los 9 s. Un solo pedido (con todo) en 90 s. Receta siempre a la vista a la izquierda de la cocina (debajo en móvil vertical) con el paso actual resaltado. Flechas + Espacio, o tocar el puesto (la chica va sola).
- **10 — Adivina la palabra:** Wordle de 5 letras y 6 intentos; palabra en `dias.json` (`palabra`). Teclado del ordenador o en pantalla (con Ñ); cualquier combinación de 5 letras vale; sin tildes; letras repetidas como en el original. Al agotar los intentos se pierde (sin revelar la palabra) y se reintenta.
- **11 — Decorar el árbol (copiar el modelo):** a la derecha, un árbol de MODELO decorado; hay que colgar cada adorno en su mismo hueco antes de que se acabe el tiempo. 3 rondas: 4, 6 y 8 adornos + estrella, con 45, 40 y 40 s (la caja trae siempre los 8, así que sobran). Poner uno donde no va lo devuelve a la caja y resta 3 s. Si se acaba el tiempo se repite la ronda. Al terminar la tercera, luces y temblor creciente ("...¿Y ESTE TEMBLOR?") como gancho del día 12. Arrastrar, o flechas + Espacio para coger y colgar.
- **12 — ¡Salva la Navidad!:** derrumbe del mismo edificio de la pantalla principal (`Edificio.imagenFondo()` + sus puertas): tiembla, se agrieta y cae a trozos del tejado a la planta baja entre cascotes y polvo, con la cámara bajando. Después, saltos tipo Doodle Jump: la chica rebota sola sobre trozos del edificio y se dirige con ← → (o tocando a un lado; sale por un borde y entra por el otro). Mapa único (semilla fija, siempre igual) en una columna de 240 px con paredes de escombros: cada plataforma está a 34–52 px por encima de la anterior (el salto llega a 96) y a 70 px de lado como mucho (en un salto se recorren 145). El camino principal no tiene trampas; más arriba alguna plataforma se balancea despacio, y hay escombros extra que se desmoronan que no hace falta pisar. Recoger 10 regalos subiendo; si se deja uno atrás, se escapa a una plataforma más arriba (siempre se puede ganar). Caer por abajo = reintentar sin repetir el derrumbe. Al ganar, el edificio se vuelve a levantar igual que estaba (el mapa principal no cambia).
- **13 — Apila ladrillos:** tipo Stack; el bloque va y viene y se suelta con Espacio/↑/toque; lo que sobresale se corta y cae; casi exacto (±3 px) = ¡PERFECTO! y conserva el ancho; si no toca el muro, se pierde. 12 hiladas, cada vez más rápido.
- **14 — Arregla las tuberías:** 5×5; del depósito (izquierda) al fregadero (derecha). Tocar (o flechas + Espacio) gira la pieza 90°; el agua se ve avanzar por lo conectado. Se genera un camino válido y se giran las piezas al azar (siempre tiene solución); el resto son rectas, codos y tes de relleno. Sin derrota.
- **15 — Pinta la fachada:** andamio colgante; flechas o seguir el dedo; el rodillo pinta la casilla que toca (6×10 menos 6 ventanas). La lluvia despinta casillas. 100 % en 45 s.
- **16 — Puzzle deslizante:** 3×3 con la foto de `dias.json` (`imagen`) y miniatura guía; se desordena con movimientos válidos (siempre resoluble). Tocar pieza junto al hueco o flechas. Sin derrota.
- **17 — Esquiva bolas de nieve:** bolas en parábola desde las ventanas (su sombra marca dónde caen: moverse) y rasantes desde los lados con aviso «!» (agacharse con ↓ o tocando el suelo). 30 s con 3 vidas.
- **18 — Cables de la luz:** tipo Flow 5×5, arrastrar de enchufe a bombilla del mismo color; cruzar un cable lo corta. 3 cuadros diseñados a mano (no hace falta llenar el tablero). Sin derrota.
- **19 — Bolos de nieve:** pista vista desde arriba con canales de nieve a los lados y 10 muñequitos en triángulo. Por tirada: la flecha oscila (← → mueven la bola por la línea) y Espacio/tocar fija la dirección; luego oscila la fuerza y se fija igual. Física sencilla: la bola (que engorda al rodar) tira muñecos y estos empujan a otros; si cae al canal ya no toca nada. Los caídos se retiran entre tiradas. Hay que tirar los 10 en 3 tiradas; si no, se pierde y se repite.
- **20 — Sopa de letras:** 10×10 con 6 palabras de `dias.json` (`palabras`, sin tildes, 3–10 letras) en horizontal, vertical y diagonal, también al revés; se marcan arrastrando de la primera a la última letra (o flechas + Espacio en inicio y final). Sin derrota.
- **21 — Trineo por la cuesta:** en primera persona (pseudo-3D): la calle con bordillos rojos y blancos se pierde hacia el horizonte con curvas suaves, con abetos, farolas y pueblo al fondo; abajo, la punta del trineo y las manoplas con la cuerda. ← → (o tocar a un lado) para esquivar muñecos, abetos, rocas y otros trineos, y recoger 12 regalos. Cada vez más rápido (16 → 44 u/s); las filas llegan cada ~0,8 s y entre dos obstáculos siempre cabe el trineo. Al chocar: destello rojo, parada breve, -1 regalo y 2 s sin chocar. Sin derrota; al final, arco de META.
- **22 — Reparte los regalos:** mantener pulsado para cargar la fuerza y soltar; ángulo fijo, sin viento y trayectoria orientativa mientras se carga. Chimeneas anchas (22 px); hay que meter 5 en la marcada, con regalos ilimitados (sin derrota). Cada ronda se comprueba por simulación que existe una fuerza que entra.
- **23 — La estrella del tejado:** el edificio por dentro, en corte: la chica sube con la estrella por escaleras en zigzag, planta a planta, hasta el tejado. En cada planta un vecino la saluda al pasar (bocadillo con el texto de `saludos` en `dias.json`; en la 4.ª está el gato). ← → andan (también por la escalera), ↑ avanza, ↓ retrocede, con el dedo se mantiene pulsado por encima. Sin derrota.

### Propuestas pendientes de confirmar
- **2:** algún carámbano que reste, para que tenga reto. En el móvil, tocar la mitad izquierda o derecha de la pantalla.
- **4:** la zona verde se estrecha en cada acierto y la planta crece.
- **5:** tableros generados desde el resuelto (siempre con solución), botón de reiniciar. 4×4, o 3×3 si se prefiere más fácil.
- **6:** al compás de la música del juego, con margen generoso (en el móvil el sonido llega con retraso).
- **7:** solo apilar: la bola se balancea y se suelta al tocar; 3 bolas.
- **8:** pistas (cola asomando, maullido más fuerte cuanto más cerca).
- **10:** teclado en pantalla con Ñ; se acepta cualquier palabra de 5 letras; sin tildes.
- **13:** meta de 12 bloques.
- **14:** se genera un camino con solución y se giran las piezas al azar.
- **15:** en el móvil, se pinta arrastrando el dedo.
- **16:** miniatura de la foto como guía.
- **17:** 3 vidas en lugar de "que no te den ninguna".
- **18:** 2 o 3 tableros diseñados a mano.
- **20:** palabras sin tildes, selección arrastrando.
- **23:** corto y con saltos generosos (las plataformas son lo más difícil en el móvil).
