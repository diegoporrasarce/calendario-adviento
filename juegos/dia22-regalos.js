'use strict';
/* Día 22 — Reparte los regalos.
   Desde el tejado, la chica lanza regalos a la chimenea de las casas vecinas: se mantiene pulsado (Espacio o
   el dedo) para cargar la fuerza y se suelta para lanzar. El viento cambia en cada tiro y empuja el regalo.
   Hay que meter 5 regalos con 12. Cada vez la chimenea está en una casa distinta. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia22-regalos'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 5, REGALOS = 12, G = 260, ANG = 0.8;                     // ángulo fijo del lanzamiento (rad)
    const V_MIN = 90, V_MAX = 250, T_CARGA = 1.1;
    const ESC_W = 320, ESC_H = 200, TEJADO_Y = 112, MANO = [44, 92];      // de dónde sale el regalo

    let casas, objetivo, viento, carga, cargando, vuelo, dentro, quedan, final, aviso, avisoT, intento;

    // Simula el lanzamiento con cada fuerza y devuelve una carga (0..1) que mete el regalo, o null si ninguna
    function cargaBuena() {
      const c = casas[objetivo], bocaY = c.techo - 18;
      for (let k = 0; k <= 100; k++) {
        const v = V_MIN + (V_MAX - V_MIN) * (k / 100);
        let x = MANO[0], y = MANO[1], vx = Math.cos(ANG) * v, vy = -Math.sin(ANG) * v;
        for (let s = 0; s < 600; s++) {
          const dt = 1 / 120, ay = y;
          vx += viento * dt; vy += G * dt; x += vx * dt; y += vy * dt;
          if (vy > 0 && ay <= bocaY && y >= bocaY) { if (Math.abs(x - (c.chim + 5)) <= 5) return k / 100; break; }
          if (casas.some((q) => x > q.x && x < q.x + q.w && y > q.techo)) break;
        }
      }
      return null;
    }
    const nuevoViento = () => { viento = Math.round((Math.random() * 2 - 1) * 30); };   // px/s²: + derecha, - izquierda

    function nuevaRonda() {
      // tres casas a distinta distancia; una tiene la chimenea marcada (el objetivo). Siempre alcanzable.
      do {
        casas = [0, 1, 2].map((i) => {
          const x = 120 + i * 66 + Math.floor(Math.random() * 20), alto = 60 + Math.floor(Math.random() * 40);
          return { x, w: 54, techo: ESC_H - alto, chim: x + 12 + Math.floor(Math.random() * 26) };
        });
        objetivo = Math.floor(Math.random() * casas.length);
        nuevoViento();
      } while (cargaBuena() === null);
    }

    function reiniciar() {
      dentro = 0; quedan = REGALOS; final = 0; aviso = null; avisoT = 0; carga = 0; cargando = false; vuelo = null; intento = 0;
      nuevaRonda();
    }

    function decir(t, c) { aviso = { t, c }; avisoT = 1.3; }

    function lanzar() {
      const v = V_MIN + (V_MAX - V_MIN) * carga;
      vuelo = { x: MANO[0], y: MANO[1], vx: Math.cos(ANG) * v, vy: -Math.sin(ANG) * v, t: 0 };
      quedan--; carga = 0; cargando = false; intento++;
      Sonido.efecto('saltar');
    }

    function actualizar(dt, api) {
      if (avisoT > 0) avisoT -= dt;
      if (final > 0) { final += dt; if (final > 1.6) api.ganar(); return; }
      const e = api.entrada;
      const pulsando = e.accion || e.puntero.abajo;
      const nueva = e.pulsado('toque') | e.pulsado('accion');             // solo empieza a cargar con una pulsación nueva
      if (!vuelo) {
        if (!cargando && nueva && quedan > 0) cargando = true;
        if (cargando && pulsando) carga = Math.min(1, carga + dt / T_CARGA);
        else if (cargando) lanzar();
      } else {
        // el regalo vuela: gravedad y viento
        vuelo.t += dt;
        vuelo.vx += viento * dt; vuelo.vy += G * dt;
        const antesY = vuelo.y;
        vuelo.x += vuelo.vx * dt; vuelo.y += vuelo.vy * dt;
        const c = casas[objetivo], bocaY = c.techo - 18;
        // entra si cruza la boca de la chimenea bajando
        if (vuelo.vy > 0 && antesY <= bocaY && vuelo.y >= bocaY && Math.abs(vuelo.x - (c.chim + 5)) <= 7) {
          dentro++; vuelo = null;
          Sonido.efecto('pareja'); decir('¡DENTRO!', C.oroClaro);
          if (dentro >= META) { final = 0.001; Sonido.efecto('completar'); return; }
          nuevaRonda();
        } else if (vuelo.y > ESC_H + 20 || vuelo.x > ESC_W + 30 || vuelo.x < -30 || casas.some((k) => vuelo.x > k.x && vuelo.x < k.x + k.w && vuelo.y > k.techo)) {
          vuelo = null;
          Sonido.efecto('golpe'); decir('¡UY! CASI', C.lila);
          do nuevoViento(); while (cargaBuena() === null);                 // el viento cambia (sin dejarlo imposible)
        }
      }
      if (!vuelo && quedan <= 0 && dentro < META && final === 0) api.perder(`TE QUEDASTE SIN REGALOS: ${dentro} DE ${META} EN LA CHIMENEA`);
    }

    /* ---------- Dibujo (escena de 320 x 200) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function regalo(ctx, x, y) {
      r(ctx, C.rojo, x - 4, y - 4, 8, 8); r(ctx, C.oro, x - 1, y - 4, 2, 8); r(ctx, C.oro, x - 4, y - 1, 8, 2); r(ctx, C.oro, x - 3, y - 6, 2, 2); r(ctx, C.oro, x + 1, y - 6, 2, 2);
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 8 + (api.ancho - api.margenDerecho < 280 ? altoCaja + 6 : 0);
      const K = Math.max(1, Math.min(3, Math.floor(Math.min(api.ancho / (ESC_W + 6), (api.alto - arriba - 4) / ESC_H))));
      return { K, x0: Math.floor((api.ancho - ESC_W * K) / 2), y0: arriba + Math.max(0, Math.floor((api.alto - arriba - ESC_H * K) / 2)), e, altoCaja };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(d.x0, d.y0); ctx.scale(d.K, d.K);
      // el edificio de la chica (izquierda) con su tejado nevado
      r(ctx, '#5e2620', 0, TEJADO_Y, 90, ESC_H - TEJADO_Y);
      for (let y = TEJADO_Y + 4, f = 0; y < ESC_H; y += 4, f++) for (let x = -(f % 2) * 4; x < 90; x += 8) r(ctx, (x + f) % 5 ? '#8a3a2a' : '#7a3326', Math.max(0, x), y, 7, 3);
      r(ctx, C.nieve, 0, TEJADO_Y - 3, 94, 4);
      // casas vecinas: tejado nevado y chimenea (la del objetivo, marcada)
      casas.forEach((c, i) => {
        r(ctx, '#6b3a28', c.x, c.techo, c.w, ESC_H - c.techo);
        for (let y = c.techo + 8; y < ESC_H - 6; y += 16) for (let x = c.x + 6; x < c.x + c.w - 10; x += 18) r(ctx, (x + y) % 3 ? '#ffe9a0' : '#3a2f45', x, y, 8, 8);
        r(ctx, '#4a3238', c.x - 4, c.techo - 4, c.w + 8, 6); r(ctx, C.nieve, c.x - 5, c.techo - 6, c.w + 10, 3);
        const objetivoMarcado = i === objetivo;
        r(ctx, '#7a3a2c', c.chim, c.techo - 18, 10, 16); r(ctx, '#cfc8bd', c.chim - 1, c.techo - 20, 12, 3); r(ctx, '#1d1216', c.chim + 2, c.techo - 19, 6, 1);
        if (objetivoMarcado) {
          const o = Math.floor(t * 3) % 2;
          r(ctx, C.oroClaro, c.chim + 3, c.techo - 34 - o, 4, 8); r(ctx, C.oroClaro, c.chim + 1, c.techo - 28 - o, 8, 2); r(ctx, C.oroClaro, c.chim + 3, c.techo - 26 - o, 4, 2);   // flecha
        }
      });
      // la chica en el tejado, con el saco de regalos
      Sprites.personaje(ctx, 36, TEJADO_Y - 2, 1, cargando ? 'andar' : 'idle', t);
      r(ctx, '#6b4a2a', 18, TEJADO_Y - 14, 9, 12); r(ctx, '#8a6238', 18, TEJADO_Y - 14, 9, 2);
      // trayectoria orientativa mientras se carga (puntos)
      if (cargando && !vuelo) {
        const v = V_MIN + (V_MAX - V_MIN) * carga;
        let x = MANO[0], y = MANO[1], vx = Math.cos(ANG) * v, vy = -Math.sin(ANG) * v;
        ctx.fillStyle = C.blanco;
        for (let k = 0; k < 9; k++) { for (let s = 0; s < 6; s++) { vx += viento * 0.016; vy += G * 0.016; x += vx * 0.016; y += vy * 0.016; } ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      }
      if (vuelo) regalo(ctx, vuelo.x, vuelo.y); else regalo(ctx, MANO[0], MANO[1]);
      // veleta del viento
      r(ctx, C.tinta, 8, 8, 64, 14); texto(ctx, 'VIENTO', 11, 11, C.nieve);
      const fx = 54 + Math.round(viento / 30 * 8);
      r(ctx, C.hielo2, Math.min(54, fx), 13, Math.abs(fx - 54) + 1, 3);
      if (viento !== 0) r(ctx, C.hielo2, fx + (viento > 0 ? 0 : -2), 11, 3, 7);
      ctx.restore();

      // barra de fuerza
      const e = d.e;
      const bw = Math.min(160, api.ancho - 40), bx = Math.floor((api.ancho - bw) / 2), by = d.y0 + ESC_H * d.K + 6 < api.alto - 14 ? d.y0 + ESC_H * d.K + 6 : api.alto - 16;
      Comun.caja(ctx, bx, by, bw, 8);
      ctx.fillStyle = carga > 0.8 ? C.rojoClaro : carga > 0.45 ? C.oro : C.verde;
      ctx.fillRect(bx, by, Math.round(bw * carga), 8);
      texto(ctx, 'FUERZA', bx - Comun.medir('FUERZA') - 6 > 0 ? bx - Comun.medir('FUERZA') - 6 : bx, bx - Comun.medir('FUERZA') - 6 > 0 ? by + 1 : by - 10, C.nieve);
      if (avisoT > 0 || final > 0) {
        const msg = final > 0 ? '¡TODOS REPARTIDOS!' : aviso.t, col = final > 0 ? C.oroClaro : aviso.c;
        const em = Comun.medir(msg, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, msg, Math.floor(api.ancho / 2), d.y0 + 30 * d.K, col, { escala: em, centro: true, sombra: C.tinta });
      }
      const t1 = `CHIMENEAS ${dentro}/${META}  REGALOS ${quedan}`;
      const t1c = Comun.medir(t1, e) + 14 > api.ancho - api.margenDerecho ? `${dentro}/${META} · QUEDAN ${quedan}` : t1;
      Comun.caja(ctx, 6, 6, Comun.medir(t1c, e) + 8, d.altoCaja);
      texto(ctx, t1c, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: estado y una carga que entra, para las pruebas automáticas
    if (Dias.debug) window.regalosDebug = () => ({ dentro, quedan, final: final > 0, carga, vuelo: !!vuelo, cargando, cargaBuena: cargaBuena() });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'REPARTE LOS REGALOS',
      instruccion: 'MANTEN PULSADO (ESPACIO O EL DEDO) PARA COGER FUERZA Y SUELTA PARA LANZAR EL REGALO A LA CHIMENEA MARCADA. ¡OJO CON EL VIENTO! METE 5 CON 12 REGALOS.',
      pantallaCompleta: true,
      musica: 'reparto',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api),
      dibujar
    });
  }
};
