'use strict';
/* Día 3 — Memory navideño.
   12 cartas (6 parejas): gorro, bufanda, árbol, estrella, regalo y muñeco de nieve.
   Se juega tocando las cartas o con las flechas + Espacio. No se puede perder: "Saltar" sale a los 2 minutos. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia03-memory'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const FIGURAS = ['gorro', 'bufanda', 'arbol', 'estrella', 'regalo', 'muneco'];
    const GIRO = 0.16;                  // segundos de cada medio giro
    const ESPERA_FALLO = 0.8;           // tiempo que se ven dos cartas distintas antes de taparse

    let cartas, elegidas, parejas, intentos, espera, cursor, usaTeclado, chispas, ganada;

    /* ---------- Iconos 16x16 (k = tamaño del píxel) ---------- */
    function icono(ctx, figura, x, y, k) {
      const p = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a * k, y + b * k, w * k, h * k); };
      if (figura === 'gorro') {
        p(C.rojo, 4, 9, 9, 2); p(C.rojo, 5, 7, 7, 2); p(C.rojo, 6, 5, 6, 2); p(C.rojo, 8, 3, 4, 2); p(C.rojo, 10, 2, 3, 1);
        p(C.rojoOsc, 10, 7, 2, 4); p(C.rojoOsc, 10, 5, 2, 2);
        p(C.blanco, 3, 11, 11, 3); p(C.nieve3, 3, 13, 11, 1); p(C.nieve4, 3, 14, 11, 1); p(C.nieve3, 11, 11, 3, 2);
        p(C.blanco, 12, 1, 3, 3); p(C.nieve3, 14, 3, 1, 1);
      } else if (figura === 'bufanda') {
        p(C.verde, 2, 3, 12, 4); p(C.verdeOsc, 2, 6, 12, 1);
        p(C.rojo, 4, 3, 2, 4); p(C.rojo, 10, 3, 2, 4);
        p(C.verde, 9, 7, 4, 6); p(C.verdeOsc, 12, 7, 1, 6); p(C.rojo, 9, 9, 4, 2);
        p(C.crema, 9, 13, 1, 2); p(C.crema, 11, 13, 1, 2); p(C.crema, 10, 14, 1, 1); p(C.crema, 12, 14, 1, 1);
      } else if (figura === 'arbol') {
        p(C.verdeMuyOsc, 7, 3, 2, 2); p(C.verde, 6, 5, 4, 2); p(C.verdeOsc, 5, 7, 6, 2);
        p(C.verde, 4, 9, 8, 2); p(C.verdeOsc, 3, 11, 10, 2);
        p(C.madera, 7, 13, 2, 2);
        p(C.oroClaro, 7, 1, 2, 2);
        p(C.rojo, 6, 8, 1, 1); p(C.oro, 9, 10, 1, 1); p(C.rojo, 5, 12, 1, 1); p(C.lila, 10, 12, 1, 1); p(C.oro, 7, 6, 1, 1);
      } else if (figura === 'estrella') {
        p(C.oro, 7, 1, 2, 4); p(C.oro, 2, 6, 12, 2); p(C.oro, 5, 5, 6, 5);
        p(C.oro, 4, 10, 3, 2); p(C.oro, 9, 10, 3, 2); p(C.oro, 3, 12, 2, 2); p(C.oro, 11, 12, 2, 2);
        p(C.oroClaro, 7, 2, 1, 3); p(C.oroClaro, 3, 6, 4, 1); p(C.oroClaro, 6, 6, 2, 2);
        p(C.naranja, 9, 8, 2, 2); p(C.naranja, 10, 11, 2, 1);
      } else if (figura === 'regalo') {
        p(C.verde, 3, 7, 10, 7); p(C.verdeOsc, 3, 12, 10, 2);
        p(C.verde, 2, 5, 12, 3); p(C.verdeMuyOsc, 2, 7, 12, 1);
        p(C.rojo, 7, 5, 2, 9);
        p(C.rojo, 4, 2, 3, 3); p(C.rojo, 9, 2, 3, 3); p(C.rojoOsc, 5, 3, 1, 1); p(C.rojoOsc, 10, 3, 1, 1); p(C.rojoOsc, 7, 4, 2, 1);
      } else if (figura === 'muneco') {
        p(C.nieve, 4, 8, 8, 7); p(C.nieve, 3, 9, 10, 5); p(C.nieve3, 9, 9, 3, 5); p(C.nieve3, 5, 14, 6, 1);
        p(C.nieve, 5, 3, 6, 5); p(C.nieve3, 9, 4, 2, 4);
        p(C.tinta, 4, 2, 8, 1); p(C.tinta, 5, 0, 6, 2); p(C.rojo, 5, 1, 6, 1);
        p(C.tinta, 6, 4, 1, 1); p(C.tinta, 9, 4, 1, 1); p(C.naranja, 7, 5, 3, 1);
        p(C.rojo, 4, 8, 8, 1); p(C.rojo, 9, 9, 2, 2);
        p(C.tinta, 7, 10, 1, 1); p(C.tinta, 7, 12, 1, 1);
      }
    }

    /* ---------- Disposición: 4x3 en horizontal, 3x4 en vertical ---------- */
    function disposicion(api) {
      const vertical = api.alto > api.ancho * 1.1;
      const cols = vertical ? 3 : 4, filas = vertical ? 4 : 3;
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const dosFilas = api.ancho - api.margenDerecho < 250;               // los marcadores no caben en una fila
      const arriba = 6 + altoCaja + 8 + (dosFilas ? altoCaja + 6 : 0), hueco = 6;
      const disponibleW = api.ancho - 24, disponibleH = api.alto - arriba - 10;
      let w = Math.floor((disponibleW - hueco * (cols - 1)) / cols);
      let h = Math.floor((disponibleH - hueco * (filas - 1)) / filas);
      w = Math.min(w, 64, Math.floor(h / 1.3)); h = Math.round(w * 1.3);
      const x0 = Math.floor((api.ancho - (cols * w + (cols - 1) * hueco)) / 2);
      const y0 = arriba + Math.floor((disponibleH - (filas * h + (filas - 1) * hueco)) / 2);
      return { cols, filas, w, h, k: Math.max(1, Math.min(3, Math.floor((w - 8) / 16))), pos: (i) => ({ x: x0 + (i % cols) * (w + hueco), y: y0 + Math.floor(i / cols) * (h + hueco) }) };
    }

    function reiniciar() {
      const mazo = [...FIGURAS, ...FIGURAS];
      for (let i = mazo.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [mazo[i], mazo[j]] = [mazo[j], mazo[i]]; }
      // giro: 0 = tapada, 1 = destapada; objetivo hacia donde se mueve
      cartas = mazo.map((figura) => ({ figura, giro: 0, objetivo: 0, hecha: false, brillo: 0 }));
      elegidas = []; parejas = 0; intentos = 0; espera = 0; cursor = 0; usaTeclado = false; chispas = []; ganada = 0;
    }

    function voltear(i, api) {
      const c = cartas[i];
      if (!c || c.hecha || c.objetivo === 1 || elegidas.length >= 2) return;
      c.objetivo = 1;
      elegidas.push(i);
      Sonido.efecto('carta');
      if (elegidas.length === 2) {
        intentos++;
        const [a, b] = elegidas.map((j) => cartas[j]);
        if (a.figura === b.figura) {
          espera = GIRO * 2 + 0.1;                                          // se comprueba al terminar de girar
        } else {
          espera = GIRO * 2 + ESPERA_FALLO;
        }
      }
    }

    function actualizar(dt, api) {
      const d = disposicion(api), e = api.entrada;

      // teclado: flechas mueven el cursor, Espacio/Enter voltea
      const mover = { izquierda: -1, derecha: 1, arriba: -d.cols, abajo: d.cols };
      for (const k in mover) if (e.pulsado(k)) {
        usaTeclado = true;
        const n = cursor + mover[k];
        if ((k === 'izquierda' || k === 'derecha') && Math.floor(n / d.cols) !== Math.floor(cursor / d.cols)) continue;
        if (n >= 0 && n < cartas.length) cursor = n;
      }
      if (e.pulsado('toque')) {
        e.pulsado('accion');                                                // el toque también marca "accion": se descarta
        usaTeclado = false;
        const i = cartas.findIndex((c, j) => {
          const q = d.pos(j);
          return e.puntero.x >= q.x && e.puntero.x < q.x + d.w && e.puntero.y >= q.y && e.puntero.y < q.y + d.h;
        });
        if (i >= 0) { cursor = i; voltear(i, api); }
      } else if (e.pulsado('accion')) {
        usaTeclado = true;
        voltear(cursor, api);
      }

      // animación de giro
      for (const c of cartas) {
        if (c.giro < c.objetivo) c.giro = Math.min(c.objetivo, c.giro + dt / (GIRO * 2));
        else if (c.giro > c.objetivo) c.giro = Math.max(c.objetivo, c.giro - dt / (GIRO * 2));
        c.brillo = Math.max(0, c.brillo - dt);
      }

      // resolver la jugada cuando las dos cartas ya se han visto
      if (elegidas.length === 2) {
        espera -= dt;
        if (espera <= 0) {
          const [a, b] = elegidas.map((j) => cartas[j]);
          if (a.figura === b.figura) {
            a.hecha = b.hecha = true; a.brillo = b.brillo = 0.8;
            parejas++;
            Sonido.efecto('pareja');
            for (const j of elegidas) {
              const q = d.pos(j);
              for (let s = 0; s < 10; s++)
                chispas.push({ x: q.x + d.w / 2, y: q.y + d.h / 2, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, vida: 0.5 });
              api.aviso('¡PAREJA!', q.x + d.w / 2, q.y - 2, C.oroClaro);
            }
            if (parejas === FIGURAS.length) ganada = 0.7;                   // un momento para ver la última pareja
          } else {
            a.objetivo = b.objetivo = 0;
            Sonido.efecto('bloqueada');
          }
          elegidas = [];
        }
      }
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); }

      for (let i = chispas.length - 1; i >= 0; i--) {
        const s = chispas[i];
        s.vida -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.vida <= 0) chispas.splice(i, 1);
      }
    }

    /* ---------- Dibujo ---------- */
    // Fondo: la pared del piso nuevo (papel pintado a rayas) y el suelo de madera
    const fondos = {};
    function crearFondo(w, h) {
      const [cv, g] = Sprites.lienzoAux(w, h);
      for (let x = 0; x < w; x += 12) {
        g.fillStyle = '#3a2a4c'; g.fillRect(x, 0, 6, h);
        g.fillStyle = '#32243f'; g.fillRect(x + 6, 0, 6, h);
        g.fillStyle = '#4a3660';
        for (let y = 4 + (x % 24 ? 8 : 0); y < h; y += 16) g.fillRect(x + 2, y, 2, 2);
      }
      Sprites.tramar(g, 0, 0, w, Math.floor(h * 0.4), '#1d1530', (x, y) => 0.6 - y / (h * 0.4) * 0.6);   // penumbra arriba
      const suelo = h - 14;
      g.fillStyle = C.madera; g.fillRect(0, suelo, w, 14);
      g.fillStyle = C.maderaOsc;
      for (let y = suelo + 4; y < h; y += 5) g.fillRect(0, y, w, 1);
      for (let x = 0; x < w; x += 23) g.fillRect(x, suelo + ((x / 23) % 2 ? 0 : 5), 1, 5);
      g.fillStyle = '#c98a3a'; g.fillRect(0, suelo, w, 1);
      return cv;
    }

    // Reverso de la carta: rojo con rombos tramados y una estrella dorada
    function reverso(ctx, x, y, w, h) {
      ctx.fillStyle = C.oro; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.rojoOsc; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = C.rojo; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      ctx.fillStyle = C.rojoOsc;
      for (let yy = y + 3; yy < y + h - 3; yy++)
        for (let xx = x + 3; xx < x + w - 3; xx++)
          if ((Math.abs(((xx - x) % 8) - 4) + Math.abs(((yy - y) % 8) - 4)) === 3) ctx.fillRect(xx, yy, 1, 1);
      const cx = x + Math.floor(w / 2), cy = y + Math.floor(h / 2);
      ctx.fillStyle = C.oro; ctx.fillRect(cx - 1, cy - 4, 3, 9); ctx.fillRect(cx - 4, cy - 1, 9, 3); ctx.fillRect(cx - 2, cy - 2, 5, 5);
      ctx.fillStyle = C.oroClaro; ctx.fillRect(cx - 1, cy - 1, 1, 1);
    }

    function anverso(ctx, x, y, w, h, c, k) {
      ctx.fillStyle = c.hecha ? C.oro : C.nieve3; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = C.crema; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      Sprites.tramar(ctx, x + 1, y + h - 8, w - 2, 7, C.nieve3, (xx, yy) => (yy - (y + h - 8)) / 9);
      icono(ctx, c.figura, x + Math.floor((w - 16 * k) / 2), y + Math.floor((h - 16 * k) / 2), k);
    }

    // Las cartas se dibujan en un lienzo propio y se estrechan para simular el giro.
    const [hoja, gh] = Sprites.lienzoAux(64, 84);
    function carta(ctx, c, x, y, d) {
      const visto = c.giro >= 0.5;                                          // a mitad del giro cambia de cara
      const escalaX = Math.abs(Math.cos(c.giro * Math.PI));
      const w = Math.max(1, Math.round(d.w * escalaX));
      gh.clearRect(0, 0, hoja.width, hoja.height);
      if (visto) anverso(gh, 0, 0, d.w, d.h, c, d.k); else reverso(gh, 0, 0, d.w, d.h);
      ctx.fillStyle = '#140e20'; ctx.fillRect(x + Math.floor((d.w - w) / 2) + 2, y + 2, w, d.h);   // sombra
      ctx.drawImage(hoja, 0, 0, d.w, d.h, x + Math.floor((d.w - w) / 2), y, w, d.h);
      if (c.brillo > 0 && Math.floor(c.brillo * 12) % 2) {
        ctx.fillStyle = C.oroClaro;
        ctx.fillRect(x - 2, y - 2, d.w + 4, 1); ctx.fillRect(x - 2, y + d.h + 1, d.w + 4, 1);
        ctx.fillRect(x - 2, y - 2, 1, d.h + 4); ctx.fillRect(x + d.w + 1, y - 2, 1, d.h + 4);
      }
    }

    // Solo en modo debug: figura y centro (en coordenadas del lienzo) de cada carta, para las pruebas
    if (Dias.debug) window.memoryDebug = () => cartas.map((c, i) => {
      const q = ultima.pos(i);
      return { figura: c.figura, x: q.x + ultima.w / 2, y: q.y + ultima.h / 2 };
    });
    let ultima = null;

    function dibujar(ctx, api) {
      const d = disposicion(api), clave = api.ancho + 'x' + api.alto;
      ultima = d;
      ctx.drawImage(fondos[clave] || (fondos[clave] = crearFondo(api.ancho, api.alto)), 0, 0);
      cartas.forEach((c, i) => { const q = d.pos(i); carta(ctx, c, q.x, q.y, d); });

      // cursor del teclado
      if (usaTeclado && Math.floor(api.t * 3) % 3) {
        const q = d.pos(cursor);
        ctx.fillStyle = C.blanco;
        ctx.fillRect(q.x - 3, q.y - 3, d.w + 6, 2); ctx.fillRect(q.x - 3, q.y + d.h + 1, d.w + 6, 2);
        ctx.fillRect(q.x - 3, q.y - 3, 2, d.h + 6); ctx.fillRect(q.x + d.w + 1, q.y - 3, 2, d.h + 6);
      }
      ctx.fillStyle = C.oroClaro;
      for (const s of chispas) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);

      // marcador
      const e = api.textoEscala, alto = Comun.altoTexto(e) + 8;
      const t1 = `PAREJAS ${parejas}/${FIGURAS.length}`, t2 = `INTENTOS ${intentos}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, alto);
      texto(ctx, t1, 10, 10, C.nieve, { escala: e });
      // el segundo marcador va al centro; si choca con los botones de arriba a la derecha, debajo del primero
      const w2 = Comun.medir(t2, e) + 8;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + alto + 6; }
      Comun.caja(ctx, x2, y2, w2, alto);
      texto(ctx, t2, x2 + 4, y2 + 4, C.lila, { escala: e });
    }

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'MEMORY NAVIDEÑO',
      instruccion: 'DA LA VUELTA A LAS CARTAS DE DOS EN DOS Y ENCUENTRA LAS 6 PAREJAS. TOCA LAS CARTAS, O USA LAS FLECHAS Y ESPACIO.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'wewish',
      reiniciar, actualizar, dibujar
    });
  }
};
