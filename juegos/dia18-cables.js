'use strict';
/* Día 18 — Cables de la luz (tipo Flow).
   En un tablero de 5x5 hay parejas de enchufe y bombilla del mismo color. Se arrastra desde uno de los dos
   para tender el cable, casilla a casilla, hasta el otro. Los cables no se pueden cruzar: pasar por encima
   de otro lo corta. Al unir una pareja, la bombilla se enciende. Tres tableros diseñados a mano, cada vez
   con más cables. Con teclado: flechas para mover el cursor, Espacio para empezar/terminar un cable. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia18-cables'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const N = 5;
    const COLORES = { A: '#e0454b', B: '#4a7ad8', C: '#3fbf5a', D: '#f2c94c', E: '#b06ad8' };
    // Tableros: cada letra es un color; mayúscula = extremo (enchufe o bombilla). Todos tienen solución.
    const TABLEROS = [
      ['A...B', 'CD...', '.....', '.C...', 'EEDAB'],
      ['A...B', 'C....', 'D..A.', '.EC..', 'D..EB'],
      ['A..BC', '.BD..', '..E..', '.ED..', '...AC']
    ];

    let tablero, ronda, extremos, cables, dibujando, cursor, usaTeclado, entreRondas, final, antesAbajo;

    function cargar(n) {
      ronda = n; extremos = {}; cables = {}; dibujando = null; entreRondas = 0;
      tablero = TABLEROS[n].map((f) => [...f]);
      tablero.forEach((fila, y) => fila.forEach((c, x) => { if (c !== '.') (extremos[c] = extremos[c] || []).push([x, y]); }));
      for (const c in extremos) cables[c] = [];
    }

    function reiniciar() { cargar(0); cursor = [0, 0]; usaTeclado = false; final = 0; antesAbajo = false; }

    const esExtremo = (x, y) => (tablero[y][x] !== '.' ? tablero[y][x] : null);
    const iguales = (a, b) => a[0] === b[0] && a[1] === b[1];
    function quienOcupa(x, y) {
      for (const c in cables) { const i = cables[c].findIndex((p) => p[0] === x && p[1] === y); if (i >= 0) return [c, i]; }
      return null;
    }
    const conectado = (c) => { const k = cables[c]; return k.length > 1 && extremos[c].every((e) => k.some((p) => iguales(p, e))); };
    const todos = () => Object.keys(cables).every(conectado);

    // Empezar a tender (o retomar) un cable en la casilla (x, y)
    function empezar(x, y) {
      const ext = esExtremo(x, y);
      if (ext) { cables[ext] = [[x, y]]; dibujando = ext; Sonido.efecto('carta'); return; }
      const oc = quienOcupa(x, y);
      if (oc) { cables[oc[0]] = cables[oc[0]].slice(0, oc[1] + 1); dibujando = oc[0]; }
    }

    // Seguir el cable hasta la casilla (x, y), si es vecina del último tramo
    function extender(x, y) {
      if (!dibujando) return;
      const k = cables[dibujando], u = k[k.length - 1];
      if (Math.abs(u[0] - x) + Math.abs(u[1] - y) !== 1) return;
      if (k.length > 1 && iguales(k[k.length - 2], [x, y])) { k.pop(); return; }           // volver atrás
      if (conectado(dibujando)) return;                                                     // ya llegó: no sigue
      const ext = esExtremo(x, y);
      if (ext && ext !== dibujando) return;                                                 // el extremo de otro color no se pisa
      if (k.some((p) => iguales(p, [x, y]))) { cables[dibujando] = k.slice(0, k.findIndex((p) => iguales(p, [x, y])) + 1); return; }
      const oc = quienOcupa(x, y);
      if (oc && oc[0] !== dibujando) cables[oc[0]] = cables[oc[0]].slice(0, oc[1]);        // corta el cable que se cruza
      k.push([x, y]);
      Sonido.efecto('escalera');
      if (conectado(dibujando)) {
        Sonido.efecto('coger');
        dibujando = null;
        if (todos()) {
          if (ronda < TABLEROS.length - 1) { entreRondas = 1.4; Sonido.efecto('completar'); }
          else { final = 0.001; Sonido.efecto('completar'); }
        }
      }
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 30 + (api.ancho - api.margenDerecho < 240 ? altoCaja + 6 : 0);
      const lado = Math.floor(Math.min((api.ancho - 20) / N, (api.alto - arriba - 12) / N, 56));
      return { lado, x0: Math.floor((api.ancho - lado * N) / 2), y0: arriba + Math.floor((api.alto - arriba - 6 - lado * N) / 2), e, altoCaja, arriba };
    }

    function actualizar(dt, api, d) {
      if (final > 0) { final += dt; if (final > 1.8) api.ganar(); return; }
      if (entreRondas > 0) { entreRondas -= dt; if (entreRondas <= 0) cargar(ronda + 1); return; }
      const e = api.entrada;
      const casilla = (px, py) => { const x = Math.floor((px - d.x0) / d.lado), y = Math.floor((py - d.y0) / d.lado); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
      // dedo / ratón: pulsar en un extremo o cable y arrastrar
      if (e.pulsado('toque')) {
        e.pulsado('accion'); usaTeclado = false;
        const c = casilla(e.puntero.xInicio, e.puntero.yInicio);
        if (c) empezar(c[0], c[1]);
      }
      if (e.puntero.abajo && dibujando && !usaTeclado) {
        const c = casilla(e.puntero.x, e.puntero.y);
        if (c) {
          // si el dedo va rápido y salta casillas, avanzar paso a paso
          for (let paso = 0; paso < 6; paso++) {
            const k = cables[dibujando]; if (!k || !k.length || !dibujando) break;
            const u = k[k.length - 1];
            if (iguales(u, c)) break;
            const dx = Math.sign(c[0] - u[0]), dy = Math.sign(c[1] - u[1]);
            const sig = Math.abs(c[0] - u[0]) >= Math.abs(c[1] - u[1]) ? [u[0] + dx, u[1]] : [u[0], u[1] + dy];
            const largo = k.length; extender(sig[0], sig[1]);
            if (!dibujando || cables[dibujando].length === largo) break;
          }
        }
      }
      if (antesAbajo && !e.puntero.abajo && !usaTeclado) dibujando = null;
      antesAbajo = e.puntero.abajo;
      // teclado
      const mov = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in mov) if (e.pulsado(k)) {
        usaTeclado = true;
        const nx = Math.max(0, Math.min(N - 1, cursor[0] + mov[k][0])), ny = Math.max(0, Math.min(N - 1, cursor[1] + mov[k][1]));
        cursor = [nx, ny];
        if (dibujando) extender(nx, ny);
      }
      if (e.pulsado('accion')) { usaTeclado = true; if (dibujando) dibujando = null; else empezar(cursor[0], cursor[1]); }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function dibujar(ctx, api) {
      const d = disposicion(api), L = d.lado, t = api.t;
      ctx.fillStyle = '#1b1426'; ctx.fillRect(0, 0, api.ancho, api.alto);
      // cuadro eléctrico
      r(ctx, '#8a92b0', d.x0 - 8, d.y0 - 8, L * N + 16, L * N + 16); r(ctx, '#3a3f58', d.x0 - 5, d.y0 - 5, L * N + 10, L * N + 10);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) r(ctx, (x + y) % 2 ? '#262a40' : '#22253a', d.x0 + x * L, d.y0 + y * L, L, L);
      // cables: tramos gruesos entre centros de casillas
      const g = Math.max(4, Math.round(L * 0.24));
      for (const c in cables) {
        const k = cables[c], col = COLORES[c];
        k.forEach((p, i) => {
          const cx = d.x0 + p[0] * L + L / 2, cy = d.y0 + p[1] * L + L / 2;
          r(ctx, col, cx - g / 2, cy - g / 2, g, g);
          if (i > 0) {
            const q = k[i - 1], qx = d.x0 + q[0] * L + L / 2, qy = d.y0 + q[1] * L + L / 2;
            r(ctx, col, Math.min(cx, qx) - g / 2, Math.min(cy, qy) - g / 2, Math.abs(cx - qx) + g, Math.abs(cy - qy) + g);
          }
        });
      }
      // extremos: enchufe (el primero) y bombilla (el segundo), encendida si está unida
      for (const c in extremos) {
        const col = COLORES[c], uni = conectado(c);
        extremos[c].forEach(([x, y], i) => {
          const cx = d.x0 + x * L + L / 2, cy = d.y0 + y * L + L / 2, rr = Math.round(L * 0.32);
          if (i === 0) {                                                    // enchufe
            r(ctx, C.tinta, cx - rr - 1, cy - rr - 1, rr * 2 + 2, rr * 2 + 2); r(ctx, col, cx - rr, cy - rr, rr * 2, rr * 2);
            r(ctx, C.tinta, cx - rr / 2 - 1, cy - 1, 2, 3); r(ctx, C.tinta, cx + rr / 2 - 1, cy - 1, 2, 3);
          } else {                                                          // bombilla
            if (uni) Sprites.tramar(ctx, cx - rr * 2, cy - rr * 2, rr * 4, rr * 4, col, (px, py) => 0.6 - Math.hypot(px - cx, py - cy) / (rr * 2));
            ctx.fillStyle = C.tinta; Sprites.disco(ctx, Math.round(cx), Math.round(cy - 2), rr + 1);
            ctx.fillStyle = uni ? C.oroClaro : col; Sprites.disco(ctx, Math.round(cx), Math.round(cy - 2), rr);
            r(ctx, '#9aa0b0', cx - rr / 2, cy + rr - 3, rr, 4);
            if (uni) r(ctx, C.blanco, cx - rr / 2, cy - rr, 2, 2);
          }
        });
      }
      if (usaTeclado && final === 0 && Math.floor(t * 3) % 3) {
        const x = d.x0 + cursor[0] * L, y = d.y0 + cursor[1] * L;
        r(ctx, C.blanco, x, y, L, 2); r(ctx, C.blanco, x, y + L - 2, L, 2); r(ctx, C.blanco, x, y, 2, L); r(ctx, C.blanco, x + L - 2, y, 2, L);
      }
      const e = d.e;
      const msg = final > 0 ? '¡LUZ EN TODO EL EDIFICIO!' : entreRondas > 0 ? '¡CONECTADO! SIGUIENTE CUADRO' : null;
      if (msg) {
        const em = Comun.medir(msg, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, msg, Math.floor(api.ancho / 2), d.y0 - Comun.altoTexto(em) - 14, C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const unidos = Object.keys(cables).filter(conectado).length;
      const t1 = `CUADRO ${ronda + 1}/${TABLEROS.length}  LUCES ${unidos}/${Object.keys(cables).length}`;
      const t1c = Comun.medir(t1, e) + 14 > api.ancho - api.margenDerecho ? `CUADRO ${ronda + 1}/${TABLEROS.length} · ${unidos}/${Object.keys(cables).length}` : t1;
      Comun.caja(ctx, 6, 6, Comun.medir(t1c, e) + 8, d.altoCaja);
      texto(ctx, t1c, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: tablero y centros de casilla, para las pruebas automáticas
    let ultima = null;
    if (Dias.debug) window.cablesDebug = () => ({ ronda, final: final > 0, entreRondas: entreRondas > 0, extremos, unidos: Object.keys(cables).filter(conectado),
      x0: ultima && ultima.x0, y0: ultima && ultima.y0, lado: ultima && ultima.lado });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'CABLES DE LA LUZ',
      instruccion: 'ARRASTRA DESDE CADA ENCHUFE HASTA LA BOMBILLA DE SU COLOR. LOS CABLES NO SE PUEDEN CRUZAR. 3 CUADROS ELECTRICOS.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'cables',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
