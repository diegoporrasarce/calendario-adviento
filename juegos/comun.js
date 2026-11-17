'use strict';
/* Base compartida de los minijuegos (ver MINIJUEGOS.md).
   Cada juego describe solo su mecánica y Comun.crearJuego se encarga del resto:
   lienzo de 320x240 escalado, teclado y táctil, pantalla de título, reintentos,
   botón "Saltar" y celebración de victoria. */
const Comun = (() => {
  const ANCHO = 320, ALTO = 240;

  // Colores del juego principal (paleta limitada)
  const PALETA = {
    noche: '#0b1030', nocheClara: '#1b2350', nocheOscura: '#05060f', tinta: '#16161c',
    nieve: '#f4f8ff', nieve2: '#dbe5f5', nieve3: '#c5d3ea', nieve4: '#8e9ecb',
    hielo: '#cfe4ff', hielo2: '#9fd0ff', hielo3: '#5a8fe0',
    rojo: '#c8383f', rojoOsc: '#9c2630', rojoClaro: '#e8384f',
    verde: '#3f8a5c', verdeOsc: '#2c6e48', verdeMuyOsc: '#1b4d33',
    oro: '#f2c94c', oroClaro: '#ffe27a', naranja: '#f08a2c', crema: '#f3ecd8',
    magenta: '#6e1c84', lila: '#c8a0ff', lilaClaro: '#e6c8ff', blanco: '#ffffff',
    madera: '#8f5524', maderaOsc: '#5c3414', piel: '#f6cfae'
  };

  /* ---------- Lienzo escalado y centrado en el contenedor ---------- */
  // Mide al menos 320x240 lógicos. Con pantallaCompleta, el lienzo crece (en píxeles del mismo tamaño)
  // hasta llenar toda la pantalla, sin franjas negras: el juego lee `info.ancho` e `info.alto` en cada fotograma.
  function crearLienzo(contenedor, pantallaCompleta) {
    const lienzo = document.createElement('canvas');
    lienzo.width = ANCHO; lienzo.height = ALTO;
    lienzo.className = 'lienzo-juego';
    contenedor.appendChild(lienzo);
    const ctx = lienzo.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const info = { lienzo, ctx, ancho: ANCHO, alto: ALTO, escala: 1 };
    function ajustar() {
      const r = contenedor.getBoundingClientRect();
      if (!r.width || !r.height) return;
      let s = Math.min(r.width / ANCHO, r.height / ALTO);
      if (s >= 2) s = Math.floor(s);          // píxeles enteros cuando cabe, como en la escena
      const ancho = pantallaCompleta ? Math.max(ANCHO, Math.min(960, Math.ceil(r.width / s))) : ANCHO;
      const alto = pantallaCompleta ? Math.max(ALTO, Math.min(640, Math.ceil(r.height / s))) : ALTO;
      if (ancho !== lienzo.width || alto !== lienzo.height) {
        lienzo.width = ancho; lienzo.height = alto; ctx.imageSmoothingEnabled = false;
      }
      info.ancho = ancho; info.alto = alto; info.escala = s;
      lienzo.style.width = Math.floor(ancho * s) + 'px';
      lienzo.style.height = Math.floor(alto * s) + 'px';
    }
    const observador = new ResizeObserver(ajustar);
    observador.observe(contenedor);
    ajustar();
    info.destruir = () => { observador.disconnect(); lienzo.remove(); };
    return info;
  }

  /* ---------- Entrada unificada: flechas, Espacio/Enter, toques y botones táctiles ---------- */
  function crearEntrada(lienzo) {
    const MAPA = { ArrowLeft: 'izquierda', ArrowRight: 'derecha', ArrowUp: 'arriba', ArrowDown: 'abajo', Space: 'accion', Enter: 'accion' };
    const e = { izquierda: false, derecha: false, arriba: false, abajo: false, accion: false, puntero: { x: 0, y: 0, abajo: false } };
    const pulsados = new Set();
    const quitar = [];
    const escuchar = (el, ev, fn, op) => { el.addEventListener(ev, fn, op); quitar.push(() => el.removeEventListener(ev, fn, op)); };

    escuchar(window, 'keydown', (ev) => {
      const k = MAPA[ev.code];
      if (!k) return;
      ev.preventDefault();
      if (!e[k] && !ev.repeat) pulsados.add(k);
      e[k] = true;
    });
    escuchar(window, 'keyup', (ev) => { const k = MAPA[ev.code]; if (k) e[k] = false; });
    escuchar(window, 'blur', () => { for (const k of Object.values(MAPA)) e[k] = false; e.puntero.abajo = false; });

    // Toques y ratón sobre el lienzo, en coordenadas lógicas (0..320, 0..240)
    const posicion = (ev) => {
      const r = lienzo.getBoundingClientRect();
      e.puntero.x = Math.floor(((ev.clientX - r.left) / r.width) * lienzo.width);
      e.puntero.y = Math.floor(((ev.clientY - r.top) / r.height) * lienzo.height);
    };
    escuchar(lienzo, 'pointerdown', (ev) => {
      ev.preventDefault();
      lienzo.setPointerCapture(ev.pointerId);
      posicion(ev);
      e.puntero.abajo = true;
      pulsados.add('toque'); pulsados.add('accion');
    });
    escuchar(lienzo, 'pointermove', (ev) => posicion(ev));
    for (const ev of ['pointerup', 'pointercancel']) escuchar(lienzo, ev, () => { e.puntero.abajo = false; });
    escuchar(lienzo, 'contextmenu', (ev) => ev.preventDefault());

    // Botones táctiles de la barra inferior (◀ ▶ ▲ ▼ ABRIR)
    document.querySelectorAll('#tactil .tecla').forEach((b) => {
      const k = b.dataset.tecla === 'accion' ? 'accion' : b.dataset.tecla;
      escuchar(b, 'pointerdown', () => { if (!e[k]) pulsados.add(k); e[k] = true; });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) escuchar(b, ev, () => { e[k] = false; });
    });

    // pulsado(k): true una sola vez por pulsación
    e.pulsado = (k) => { const si = pulsados.has(k); pulsados.delete(k); return si; };
    e.limpiar = () => pulsados.clear();
    e.destruir = () => quitar.forEach((f) => f());
    return e;
  }

  /* ---------- Texto pixel (fuente propia de 5x7, mayúsculas) ---------- */
  // Cada glifo: 7 filas de 5 bits (16 = píxel de la izquierda ... 1 = el de la derecha).
  const LETRA_W = 5, LETRA_H = 7, AVANCE = 6;
  const FUENTE = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14],
    D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14],
    J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], 'Ñ': [14, 0, 17, 25, 21, 19, 17],
    O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13],
    R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10],
    X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31],
    3: [30, 1, 1, 14, 1, 1, 30], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14],
    9: [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '!': [4, 4, 4, 4, 4, 0, 4], '¡': [4, 0, 4, 4, 4, 4, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], '¿': [4, 0, 4, 8, 16, 17, 14], '.': [0, 0, 0, 0, 0, 12, 12],
    ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '-': [0, 0, 0, 14, 0, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16], '%': [24, 25, 2, 4, 8, 19, 3],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '·': [0, 0, 0, 12, 12, 0, 0],
    "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0]
  };
  // Mayúsculas y sin tildes (la Ñ se conserva). Lo que no está en la fuente sale como '?'.
  function normalizar(texto) {
    return [...String(texto).toUpperCase()].map((c) => {
      if (FUENTE[c]) return c;
      const base = c.normalize('NFD')[0];
      return FUENTE[base] ? base : '?';
    }).join('');
  }
  const medir = (texto, escala = 1) => Math.max(0, normalizar(texto).length * AVANCE - 1) * escala;
  const altoTexto = (escala = 1) => LETRA_H * escala;

  // opciones: { escala, centro (x es el centro), sombra (color, 1 px abajo a la derecha por cada nivel de escala) }
  function texto(ctx, cadena, x, y, color, opciones = {}) {
    const escala = opciones.escala || 1;
    const t = normalizar(cadena);
    let cx = Math.round(opciones.centro ? x - medir(t, escala) / 2 : x);
    if (opciones.sombra) texto(ctx, t, (opciones.centro ? x : cx) + escala, y + escala, opciones.sombra, { ...opciones, sombra: null });
    ctx.fillStyle = color;
    for (const c of t) {
      const g = FUENTE[c];
      for (let fila = 0; fila < LETRA_H; fila++)
        for (let col = 0; col < LETRA_W; col++)
          if (g[fila] & (16 >> col)) ctx.fillRect(cx + col * escala, y + fila * escala, escala, escala);
      cx += AVANCE * escala;
    }
  }

  // Parte un texto en líneas que quepan en `ancho` píxeles.
  function envolver(cadena, ancho, escala = 1) {
    const lineas = [];
    let actual = '';
    for (const palabra of String(cadena).split(/\s+/)) {
      const prueba = actual ? actual + ' ' + palabra : palabra;
      if (medir(prueba, escala) > ancho && actual) { lineas.push(actual); actual = palabra; }
      else actual = prueba;
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  // Caja con borde de píxel para mensajes.
  function caja(ctx, x, y, w, h) {
    ctx.fillStyle = PALETA.oro; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = PALETA.rojoOsc; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = PALETA.noche; ctx.fillRect(x, y, w, h);
  }

  // Panel centrado: título grande y líneas de texto. `e` = escala del texto (2 en pantallas pequeñas).
  function panel(ctx, titulo, lineas, pie, t, alto = ALTO, e = 1, ancho = ANCHO) {
    const w = Math.min(ancho - 12, e > 1 ? 308 : 280);
    const cuerpo = lineas.flatMap((l) => envolver(l, w - 16, e));
    const pies = pie ? envolver(pie, w - 16, e) : [];
    const salto = altoTexto(e) + 3 * e;                                   // alto de línea con interlineado
    const et = medir(titulo, e + 1) <= w - 16 ? e + 1 : e;               // el título, un tamaño más grande si cabe
    const arriba = 8 + altoTexto(et) + 8;                                 // margen + título + separación
    const h = arriba + cuerpo.length * salto + (pies.length ? 4 + pies.length * salto : 0) + 4;
    const cx = Math.floor(ancho / 2), x = cx - Math.floor(w / 2), y = Math.floor((alto - h) / 2);
    caja(ctx, x, y, w, h);
    texto(ctx, titulo, cx, y + 8, PALETA.oroClaro, { escala: et, centro: true, sombra: PALETA.tinta });
    cuerpo.forEach((l, i) => texto(ctx, l, cx, y + arriba + i * salto, PALETA.nieve, { centro: true, escala: e }));
    if (Math.floor(t * 2.5) % 2 === 0)
      pies.forEach((l, i) => texto(ctx, l, cx, y + arriba + 4 + (cuerpo.length + i) * salto, PALETA.lila, { centro: true, escala: e }));
  }

  /* ---------- Fondo de noche reutilizable (cielo tramado y estrellas) ---------- */
  const cielos = {};
  function fondoNoche(ctx, t, alto = ALTO, ancho = ANCHO) {
    const clave = ancho + 'x' + alto;
    if (!cielos[clave]) {
      // se pinta de una vez con ImageData (rápido incluso a pantalla completa)
      const [cv, g] = Sprites.lienzoAux(ancho, alto);
      const tonos = [[5, 6, 15], [11, 16, 48], [20, 24, 60], [31, 26, 74], [44, 26, 88]];
      const img = g.createImageData(ancho, alto), px = img.data;
      for (let y = 0; y < alto; y++)
        for (let x = 0; x < ancho; x++) {
          const c = tonos[Math.min(4, Math.floor((y / alto) * 4 + Sprites.umbral(x, y)))], o = (y * ancho + x) * 4;
          px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
      cielos[clave] = cv;
    }
    ctx.drawImage(cielos[clave], 0, 0);
    const n = Math.floor((40 * ancho * alto) / (ANCHO * ALTO));
    for (let i = 0; i < n; i++) {
      const x = (i * 97 + Math.floor(i / 7) * 13) % ancho, y = (i * 53) % (alto - 90);
      if ((Math.floor(t * 2) + i) % 7 === 0) continue;       // algunas titilan
      ctx.fillStyle = i % 3 ? PALETA.nieve : PALETA.lilaClaro;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /* ---------- Marco del juego: fases, reintentos, "Saltar" y victoria ---------- */
  // cfg: { titulo, instruccion, sinDerrota, pantallaCompleta, reiniciar(api), actualizar(dt, api), dibujar(ctx, api) }
  // api: { entrada, t, ancho, alto, textoEscala, margenDerecho, ganar(), perder(motivo), sacudir(segundos), aviso(texto, x, y, color) }
  //   ancho/alto: tamaño lógico del lienzo (320x240, o más si pantallaCompleta: llena toda la pantalla)
  //   textoEscala: 2 cuando el lienzo se ve pequeño (móvil), para que el texto se lea
  function crearJuego(contenedor, alTerminar, cfg) {
    const pantalla = crearLienzo(contenedor, cfg.pantallaCompleta);
    const { ctx, lienzo, destruir: quitarLienzo } = pantalla;
    const entrada = crearEntrada(lienzo);
    let fase = 'titulo', tFase = 0, intentos = 0, tJugando = 0, temblor = 0, motivo = '', terminado = false;
    const confeti = [], avisos = [];

    const saltar = document.createElement('button');
    saltar.type = 'button';
    saltar.className = 'boton-pixel saltar oculto';
    saltar.textContent = 'Saltar';
    saltar.addEventListener('click', () => { saltar.blur(); terminar(); });
    contenedor.appendChild(saltar);
    const mostrarSaltar = () => saltar.classList.remove('oculto');

    const api = {
      entrada, t: 0,
      get ancho() { return pantalla.ancho; },
      get alto() { return pantalla.alto; },
      get textoEscala() { return pantalla.escala < 2 ? 2 : 1; },
      // ancho lógico de la esquina superior derecha ocupada por los botones de sonido, pantalla completa y cerrar
      get margenDerecho() { return Math.ceil(132 / pantalla.escala); },
      ganar() {
        if (fase !== 'jugando') return;
        fase = 'victoria'; tFase = 0;
        Sonido.efecto('completar');
        const colores = [PALETA.rojo, PALETA.oro, PALETA.verde, PALETA.nieve, PALETA.lila];
        for (let i = 0; i < Math.floor(90 * pantalla.ancho / ANCHO); i++)
          confeti.push({ x: Math.random() * pantalla.ancho, y: -Math.random() * 120, vy: 30 + Math.random() * 50,
                         f: Math.random() * 6, c: colores[i % colores.length] });
      },
      perder(texto) {
        if (fase !== 'jugando') return;
        fase = 'perdido'; tFase = 0; motivo = texto || '';
        intentos++;
        Sonido.efecto('perder');
        if (intentos >= 3) mostrarSaltar();
      },
      sacudir(seg) { temblor = Math.max(temblor, seg); },
      // texto flotante que sube y desaparece (por ejemplo "+1")
      aviso(texto, x, y, color) { avisos.push({ texto, x, y, color: color || PALETA.nieve, vida: 0.8 }); }
    };

    function empezar() {
      entrada.limpiar();
      avisos.length = 0;
      cfg.reiniciar(api);
      fase = 'jugando'; tFase = 0;
      Sonido.efecto('empezar');
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      cancelAnimationFrame(reloj);
      alTerminar();
    }

    cfg.reiniciar(api);              // la pantalla de título enseña el escenario de fondo
    if (Dias.debug) window.juegoDebug = api;   // solo en modo debug, para probar (p. ej. juegoDebug.ganar())

    let reloj = 0, ultimo = performance.now();
    function bucle(ahora) {
      const dt = Math.max(0, Math.min(0.05, (ahora - ultimo) / 1000));
      ultimo = ahora;
      api.t += dt; tFase += dt;
      temblor = Math.max(0, temblor - dt);

      if (fase === 'titulo' && tFase > 0.3 && entrada.pulsado('accion')) empezar();
      else if (fase === 'perdido' && tFase > 0.8 && entrada.pulsado('accion')) empezar();
      else if (fase === 'jugando') {
        tJugando += dt;
        if (cfg.sinDerrota && tJugando > 120) mostrarSaltar();
        cfg.actualizar(dt, api);
      }
      if (fase !== 'jugando') entrada.pulsado('toque');
      if (fase === 'victoria' && tFase > 2.6) { terminar(); return; }

      ctx.save();
      if (temblor > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4));
      cfg.dibujar(ctx, api);
      ctx.restore();

      for (let i = avisos.length - 1; i >= 0; i--) {
        const a = avisos[i];
        a.vida -= dt; a.y -= 14 * dt;
        if (a.vida <= 0) { avisos.splice(i, 1); continue; }
        texto(ctx, a.texto, a.x, Math.round(a.y), a.color, { centro: true, sombra: PALETA.tinta, escala: api.textoEscala });
      }

      const e = api.textoEscala;
      if (fase === 'titulo') {
        panel(ctx, cfg.titulo, [cfg.instruccion], 'PULSA ESPACIO O TOCA PARA EMPEZAR', api.t, api.alto, e, api.ancho);
      } else if (fase === 'perdido') {
        panel(ctx, '¡OH, NO!', [motivo, intentos >= 3 ? 'SI TE ATASCAS, PUEDES SALTARLO' : ''].filter(Boolean),
              'PULSA PARA REINTENTAR', api.t, api.alto, e, api.ancho);
      } else if (fase === 'victoria') {
        for (const c of confeti) {
          c.y += c.vy * dt * (api.alto / ALTO);
          ctx.fillStyle = c.c;
          ctx.fillRect(Math.round(c.x + Math.sin(api.t * 4 + c.f) * 3), Math.round(c.y), 2, Math.floor(api.t * 8 + c.f) % 2 ? 2 : 1);
        }
        const rebote = Math.round(Math.abs(Math.sin(api.t * 5)) * -4);
        texto(ctx, '¡CONSEGUIDO!', Math.floor(api.ancho / 2), Math.floor(api.alto / 2) - 20 + rebote, PALETA.oroClaro, { escala: 3, centro: true, sombra: PALETA.tinta });
      }
      reloj = requestAnimationFrame(bucle);
    }
    reloj = requestAnimationFrame(bucle);

    // destruir(): para el bucle y quita listeners y elementos
    return () => {
      terminado = true;
      cancelAnimationFrame(reloj);
      entrada.destruir();
      saltar.remove();
      quitarLienzo();
    };
  }

  return { ANCHO, ALTO, PALETA, crearLienzo, crearEntrada, texto, medir, altoTexto, envolver, caja, panel, fondoNoche, crearJuego };
})();
