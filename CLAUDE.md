# Calendario de adviento pixel art

Juego web en HTML/CSS/JS puro, sin frameworks ni build. Se publica en GitHub Pages.

## Reglas
- Nada de dependencias ni npm. Todo debe funcionar abriendo index.html.
- Estilo: píxel gordo, paleta limitada y sombreado con trama (dithering), sin degradados lisos.
- Escena lógica de 320x240 (personaje de 16x24), escalada a la ventana con image-rendering: pixelated.
  El lienzo crece en píxeles lógicos para cubrir toda la ventana; la escena queda centrada.
- Los sprites se dibujan en código (arrays de píxeles o funciones de dibujo), no PNG, salvo las fotos de los días.
- El contenido de cada día vive en dias.json, nunca en el código.
- Cada minijuego es un archivo en juegos/<nombre>.js que exporta
  iniciarJuego(contenedor, alTerminar). Se carga solo cuando se entra en esa puerta.
- Los comentarios y nombres de variables, en español.

## Estructura
index.html, style.css, js/main.js, js/sprites.js, js/edificio.js, js/dias.js, dias.json, fotos/, juegos/