'use strict';
/* Día 14 — Arregla las tuberías.
   Tablero de 5x5: el agua sale del depósito de la izquierda y tiene que llegar al fregadero de la derecha.
   Al tocar una pieza (o elegirla con las flechas y pulsar Espacio) gira 90°. El agua se ve avanzar por
   lo que ya está conectado. El tablero se crea a partir de un camino válido y luego se giran las piezas
   al azar, así que siempre tiene solución. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia14-tuberias'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const N = 5;
    const NORTE = 1, ESTE = 2, SUR = 4, OESTE = 8;
    const DIRS = [[NORTE, 0, -1, SUR], [ESTE, 1, 0, OESTE], [SUR, 0, 1, NORTE], [OESTE, -1, 0, ESTE]];
    const girar = (m) => ((m << 1) | (m >> 3)) & 15;                       // 90° en el sentido de las agujas
    const RELLENO = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11];                  // rectas, codos y tes

    let celdas, entrada, salida, conAgua, giros, cursor, usaTeclado, final, flash;

    // Camino al azar (sin cruzarse) de la columna 0 a la última; null si se atasca
    function caminoAlAzar(fe, fs) {
      const visto = new Set(), camino = [];
      function ir(x, y) {
        camino.push([x, y]); visto.add(x + ',' + y);
        if (x === N - 1 && y === fs) return true;
        const opciones = DIRS.map(([, dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !visto.has(a + ',' + b));
        opciones.sort(() => Math.random() - 0.5);
        for (const [a, b] of opciones) if (ir(a, b)) return true;
        camino.pop();
        return false;
      }
      return ir(0, fe) ? camino : null;
    }

    function generar() {
      for (;;) {
        entrada = Math.floor(Math.random() * N); salida = Math.floor(Math.random() * N);
        const camino = caminoAlAzar(entrada, salida);
        if (!camino || camino.length < 9) continue;                        // que tenga recorrido
        const sol = [];
        for (let i = 0; i < N * N; i++) sol.push(RELLENO[Math.floor(Math.random() * RELLENO.length)]);
        camino.forEach(([x, y], i) => {
          let m = 0;
          const enlazar = (a) => { if (!a) return; const d = DIRS.find(([, dx, dy]) => x + dx === a[0] && y + dy === a[1]); m |= d[0]; };
          enlazar(camino[i - 1]); enlazar(camino[i + 1]);
          if (i === 0) m |= OESTE;
          if (i === camino.length - 1) m |= ESTE;
          sol[y * N + x] = m;
        });
        celdas = sol.map((m, i) => ({ m, objetivo: camino.some(([x, y]) => y * N + x === i) ? m : null }));
        for (const c of celdas) { const k = Math.floor(Math.random() * 4); for (let j = 0; j < k; j++) c.m = girar(c.m); }
        if (!calcularAgua()) return;                                        // que no empiece ya resuelto
      }
    }

    // Recorre las tuberías conectadas desde la entrada; devuelve si el agua llega al fregadero
    function calcularAgua() {
      conAgua = new Set();
      const ini = entrada * N;
      if (!(celdas[ini].m & OESTE)) return false;
      const cola = [ini]; conAgua.add(ini);
      while (cola.length) {
        const i = cola.shift(), x = i % N, y = Math.floor(i / N);
        for (const [d, dx, dy, opuesta] of DIRS) {
          if (!(celdas[i].m & d)) continue;
          const a = x + dx, b = y + dy;
          if (a < 0 || b < 0 || a >= N || b >= N) continue;
          const j = b * N + a;
          if (!conAgua.has(j) && celdas[j].m & opuesta) { conAgua.add(j); cola.push(j); }
        }
      }
      const fin = salida * N + N - 1;
      return conAgua.has(fin) && !!(celdas[fin].m & ESTE);
    }

    function reiniciar() {
      generar();
      giros = 0; cursor = entrada * N; usaTeclado = false; final = 0; flash = new Array(N * N).fill(0);
    }

    function girarCelda(i) {
      celdas[i].m = girar(celdas[i].m); giros++; flash[i] = 0.15;
      Sonido.efecto('carta');
      if (calcularAgua()) { final = 0.001; Sonido.efecto('agua'); }
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 14 + (api.ancho - api.margenDerecho < 240 ? altoCaja + 6 : 0);
      const lado = Math.floor(Math.min((api.ancho - 120) / N, (api.alto - arriba - 16) / N, 48));
      const x0 = Math.floor((api.ancho - lado * N) / 2), y0 = arriba + Math.floor((api.alto - arriba - 10 - lado * N) / 2);
      return { lado, x0, y0, e, altoCaja };
    }

    function actualizar(dt, api, d) {
      for (let i = 0; i < flash.length; i++) flash[i] = Math.max(0, flash[i] - dt);
      if (final > 0) { final += dt; if (final > 2.2) api.ganar(); return; }
      const e = api.entrada;
      const mover = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in mover) if (e.pulsado(k)) {
        usaTeclado = true;
        const x = Math.max(0, Math.min(N - 1, cursor % N + mover[k][0])), y = Math.max(0, Math.min(N - 1, Math.floor(cursor / N) + mover[k][1]));
        cursor = y * N + x;
      }
      if (e.pulsado('toque')) {
        e.pulsado('accion'); usaTeclado = false;
        const cx = Math.floor((e.puntero.x - d.x0) / d.lado), cy = Math.floor((e.puntero.y - d.y0) / d.lado);
        if (cx >= 0 && cy >= 0 && cx < N && cy < N) { cursor = cy * N + cx; girarCelda(cursor); }
      } else if (e.pulsado('accion')) { usaTeclado = true; girarCelda(cursor); }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    // Tubería de una casilla: brazos desde el centro hacia cada conexión (metal, o con agua)
    function tuberia(ctx, x, y, lado, m, agua, t) {
      const g = Math.max(4, Math.round(lado * 0.28)), c = Math.round(lado / 2), a0 = c - Math.floor(g / 2);
      const brazo = (d) => {
        if (d === NORTE) return [x + a0, y, g, c + Math.ceil(g / 2)];
        if (d === SUR) return [x + a0, y + a0, g, lado - a0];
        if (d === OESTE) return [x, y + a0, c + Math.ceil(g / 2), g];
        return [x + a0, y + a0, lado - a0, g];
      };
      for (const [d] of DIRS) if (m & d) { const [bx, by, bw, bh] = brazo(d); r(ctx, '#2c2f3e', bx - 1, by - 1, bw + 2, bh + 2); }
      for (const [d] of DIRS) if (m & d) {
        const [bx, by, bw, bh] = brazo(d);
        r(ctx, '#8a92b0', bx, by, bw, bh);
        if (d === NORTE || d === SUR) r(ctx, '#c6cbd8', bx, by, 1, bh); else r(ctx, '#c6cbd8', bx, by, bw, 1);
        if (agua) {
          const ai = Math.max(1, g - 4);
          const [wx, wy, ww, wh] = d === NORTE || d === SUR ? [bx + 2, by, ai, bh] : [bx, by + 2, bw, ai];
          r(ctx, '#3a7ad8', wx, wy, ww, wh);
          // brillo que corre por el agua
          const o = Math.floor(t * 30) % 8;
          if (d === NORTE || d === SUR) { for (let k = o; k < wh; k += 8) r(ctx, '#9fd0ff', wx, wy + k, 1, 2); }
          else { for (let k = o; k < ww; k += 8) r(ctx, '#9fd0ff', wx + k, wy, 2, 1); }
        }
      }
      r(ctx, agua ? '#3a7ad8' : '#6a7190', x + a0, y + a0, g, g);                // codo / unión central
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), L = d.lado, t = api.t;
      // pared de ladrillo vista por dentro (la obra)
      ctx.fillStyle = '#2a1a1c'; ctx.fillRect(0, 0, api.ancho, api.alto);
      for (let y = 0, f = 0; y < api.alto; y += 8, f++) for (let x = -(f % 2) * 8; x < api.ancho; x += 16) r(ctx, (x + y) % 3 ? '#3a2224' : '#432628', x, y, 15, 7);
      // tablero
      r(ctx, C.tinta, d.x0 - 4, d.y0 - 4, L * N + 8, L * N + 8);
      for (let i = 0; i < N * N; i++) {
        const x = d.x0 + (i % N) * L, y = d.y0 + Math.floor(i / N) * L;
        r(ctx, (i + Math.floor(i / N)) % 2 ? '#3a3f58' : '#343852', x, y, L, L);
        tuberia(ctx, x, y, L, celdas[i].m, conAgua.has(i), t);
        if (flash[i] > 0) { r(ctx, C.blanco, x, y, L, 1); r(ctx, C.blanco, x, y + L - 1, L, 1); r(ctx, C.blanco, x, y, 1, L); r(ctx, C.blanco, x + L - 1, y, 1, L); }
      }
      // depósito de entrada (izquierda) y fregadero de salida (derecha)
      const yi = d.y0 + entrada * L, ys = d.y0 + salida * L, g = Math.max(4, Math.round(L * 0.28));
      const dx = Math.max(6, Math.min(36, d.x0 - 34));                         // tubo corto si hay poco sitio (el depósito no se sale)
      r(ctx, '#6a7190', d.x0 - dx, yi + L / 2 - g / 2, dx, g); r(ctx, '#3a7ad8', d.x0 - dx, yi + L / 2 - g / 2 + 2, dx, Math.max(1, g - 4));
      r(ctx, '#9aa0b0', d.x0 - dx - 26, yi - 14, 28, L + 18); r(ctx, '#3a7ad8', d.x0 - dx - 24, yi - 2, 24, L + 4); r(ctx, '#9fd0ff', d.x0 - dx - 24, yi - 2, 24, 2);
      texto(ctx, 'AGUA', Math.max(Comun.medir('AGUA') / 2 + 2, d.x0 - dx - 12), yi - 24, C.hielo2, { centro: true });
      const llega = final > 0;
      r(ctx, '#6a7190', d.x0 + L * N, ys + L / 2 - g / 2, dx, g);
      if (llega) r(ctx, '#3a7ad8', d.x0 + L * N, ys + L / 2 - g / 2 + 2, dx, Math.max(1, g - 4));
      const fx = d.x0 + L * N + dx - 2;
      r(ctx, '#c6cbd8', fx, ys + L / 2 - 4, 30, 20); r(ctx, '#8a92b0', fx + 2, ys + L / 2 - 2, 26, 16);
      if (llega) { const nivel = Math.min(14, Math.floor(final * 10)); r(ctx, '#3a7ad8', fx + 2, ys + L / 2 + 14 - nivel, 26, nivel); }
      texto(ctx, 'FREGADERO', Math.min(api.ancho - Comun.medir('FREGADERO') / 2 - 2, fx + 15), ys - 10, C.nieve, { centro: true });   // sin salirse por la derecha
      // cursor del teclado
      if (usaTeclado && final === 0 && Math.floor(t * 3) % 3) {
        const x = d.x0 + (cursor % N) * L, y = d.y0 + Math.floor(cursor / N) * L;
        r(ctx, C.oroClaro, x - 2, y - 2, L + 4, 2); r(ctx, C.oroClaro, x - 2, y + L, L + 4, 2); r(ctx, C.oroClaro, x - 2, y - 2, 2, L + 4); r(ctx, C.oroClaro, x + L, y - 2, 2, L + 4);
      }
      const e = d.e;
      if (final > 0) {
        const em = Comun.medir('¡EL AGUA YA CORRE!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡EL AGUA YA CORRE!', Math.floor(api.ancho / 2), d.y0 - Comun.altoTexto(em) - 8, C.hielo2, { escala: em, centro: true, sombra: C.tinta });
      }
      const t1 = `GIROS ${giros}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: giros que necesita cada casilla del camino y su posición, para las pruebas
    let ultima = null;
    if (Dias.debug) window.tuberiasDebug = () => ({
      final: final > 0, conAgua: conAgua.size,
      celdas: celdas.map((c, i) => {
        let k = 0, m = c.m;
        if (c.objetivo !== null) while (m !== c.objetivo && k < 4) { m = girar(m); k++; }
        return { giros: c.objetivo === null ? 0 : k, x: ultima ? ultima.x0 + (i % N) * ultima.lado + ultima.lado / 2 : 0, y: ultima ? ultima.y0 + Math.floor(i / N) * ultima.lado + ultima.lado / 2 : 0 };
      })
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ARREGLA LAS TUBERIAS',
      instruccion: 'TOCA LAS PIEZAS PARA GIRARLAS (O FLECHAS Y ESPACIO) HASTA QUE EL AGUA LLEGUE DEL DEPOSITO AL FREGADERO.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'fontanera',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
