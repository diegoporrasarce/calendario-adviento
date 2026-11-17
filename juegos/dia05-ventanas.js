'use strict';
/* Día 5 — Enciende las ventanas (Lights Out).
   Fachada con 4x4 ventanas: al tocar una cambian ella y sus vecinas de arriba, abajo, izquierda y derecha.
   Hay que encenderlas todas. El tablero se genera pulsando ventanas al azar desde "todo encendido",
   así que siempre tiene solución. Botón para volver al tablero inicial y, a partir de 35 pulsaciones,
   botón de pista que señala una ventana que hay que pulsar. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia05-ventanas'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const N = 4, TOTAL = N * N;
    const PULSACIONES_AZAR = 5;          // cuántas pulsaciones al azar desordenan el tablero
    const PISTA_DESDE = 35;              // pulsaciones (en total, aunque se reinicie) para que aparezca la pista
    const REINICIAR = TOTAL, PISTA = TOTAL + 1;   // posiciones del cursor de teclado en los botones

    // pendientes: ventanas que faltan por pulsar para resolver desde el estado actual
    // (pulsar una ventana dos veces la deja igual, así que cada pulsación la quita o la añade)
    let luces, inicial, solucion, pendientes, pulsaciones, totales, pista, cursor, usaTeclado, destellos, ganada;

    const vecinas = (i) => {
      const f = Math.floor(i / N), c = i % N, v = [i];
      if (f > 0) v.push(i - N);
      if (f < N - 1) v.push(i + N);
      if (c > 0) v.push(i - 1);
      if (c < N - 1) v.push(i + 1);
      return v;
    };
    const conmutar = (tablero, i) => { for (const j of vecinas(i)) tablero[j] = !tablero[j]; };

    function generar() {
      for (;;) {
        const t = new Array(TOTAL).fill(true), elegidas = new Set();
        while (elegidas.size < PULSACIONES_AZAR) elegidas.add(Math.floor(Math.random() * TOTAL));
        for (const i of elegidas) conmutar(t, i);
        const apagadas = t.filter((x) => !x).length;
        if (apagadas >= 5) return { t, elegidas };                          // que no salga casi resuelto
      }
    }

    function reiniciar() {
      const g = generar();
      inicial = g.t; solucion = g.elegidas;
      luces = [...inicial];
      pendientes = new Set(solucion);
      pulsaciones = 0; totales = 0; pista = -1; cursor = 0; usaTeclado = false; ganada = 0;
      destellos = new Array(TOTAL).fill(0);
    }

    function pulsar(i) {
      conmutar(luces, i);
      pulsaciones++; totales++;
      if (pendientes.has(i)) pendientes.delete(i); else pendientes.add(i);
      if (i === pista) pista = -1;
      for (const j of vecinas(i)) destellos[j] = 0.25;
      Sonido.efecto('carta');
    }

    /* ---------- Disposición: rejilla centrada y botón de reiniciar debajo ---------- */
    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 10 + (api.ancho - api.margenDerecho < 270 ? altoCaja + 6 : 0);
      const boton = { h: altoCaja + 6 };
      const abajo = boton.h + 16;
      const hueco = 8;
      let w = Math.floor(Math.min((api.ancho - 30 - hueco * (N - 1)) / N, (api.alto - arriba - abajo - hueco * (N - 1)) / N / 1.15));
      w = Math.min(w, 52);
      const h = Math.round(w * 1.15);
      const anchoRejilla = N * w + (N - 1) * hueco, altoRejilla = N * h + (N - 1) * hueco;
      const x0 = Math.floor((api.ancho - anchoRejilla) / 2);
      const y0 = arriba + Math.floor((api.alto - arriba - abajo - altoRejilla) / 2);
      // botones debajo de la rejilla: REINICIAR y, cuando toca, PISTA
      const botones = [{ id: REINICIAR, texto: 'REINICIAR', color: C.lila }];
      if (totales >= PISTA_DESDE) botones.push({ id: PISTA, texto: 'PISTA', color: C.oroClaro });
      for (const b of botones) { b.w = Comun.medir(b.texto, e) + 16; b.h = boton.h; b.y = y0 + altoRejilla + 12; }
      let bx = Math.floor((api.ancho - (botones.reduce((a, b) => a + b.w, 0) + 12 * (botones.length - 1))) / 2);
      for (const b of botones) { b.x = bx; bx += b.w + 12; }
      return { w, h, hueco, x0, y0, botones, arriba, pos: (i) => ({ x: x0 + (i % N) * (w + hueco), y: y0 + Math.floor(i / N) * (h + hueco) }) };
    }

    function actualizar(dt, api) {
      const d = disposicion(api), e = api.entrada;
      for (let i = 0; i < TOTAL; i++) destellos[i] = Math.max(0, destellos[i] - dt);
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); return; }

      // teclado: flechas por la rejilla; desde la fila de abajo, ↓ lleva a los botones (← → entre ellos)
      const hayPista = d.botones.length > 1;
      if (cursor === PISTA && !hayPista) cursor = REINICIAR;
      if (e.pulsado('izquierda')) { usaTeclado = true; if (cursor === PISTA) cursor = REINICIAR; else if (cursor < TOTAL && cursor % N > 0) cursor--; }
      if (e.pulsado('derecha')) { usaTeclado = true; if (cursor === REINICIAR && hayPista) cursor = PISTA; else if (cursor < TOTAL && cursor % N < N - 1) cursor++; }
      if (e.pulsado('arriba')) { cursor = cursor >= TOTAL ? TOTAL - N : Math.max(cursor % N, cursor - N); usaTeclado = true; }
      if (e.pulsado('abajo')) { if (cursor < TOTAL) cursor = cursor >= TOTAL - N ? REINICIAR : cursor + N; usaTeclado = true; }

      let elegida = -1;
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        usaTeclado = false;
        const { x, y } = e.puntero;
        const b = d.botones.find((k) => x >= k.x && x < k.x + k.w && y >= k.y && y < k.y + k.h);
        if (b) elegida = b.id;
        else for (let i = 0; i < TOTAL; i++) {
          const q = d.pos(i);
          if (x >= q.x - 3 && x < q.x + d.w + 3 && y >= q.y - 3 && y < q.y + d.h + 3) { elegida = i; break; }
        }
      } else if (e.pulsado('accion')) { elegida = cursor; usaTeclado = true; }

      if (elegida === REINICIAR) {                                          // volver al tablero inicial
        luces = [...inicial]; pulsaciones = 0;
        pendientes = new Set(solucion); pista = -1;
        destellos.fill(0.25);
        Sonido.efecto('cerrar');
      } else if (elegida === PISTA) {                                       // señalar una ventana que falta pulsar
        const faltan = [...pendientes];
        pista = faltan[Math.floor(Math.random() * faltan.length)];
        Sonido.efecto('abrir');
      } else if (elegida >= 0) {
        pulsar(elegida);
        if (luces.every(Boolean)) { ganada = 1.2; Sonido.efecto('pareja'); }
      }
    }

    /* ---------- Dibujo ---------- */
    // Fachada de ladrillo de noche (una por tamaño de pantalla)
    const fondos = {};
    function crearFondo(w, h) {
      const [cv, g] = Sprites.lienzoAux(w, h);
      g.fillStyle = '#4a1f1c'; g.fillRect(0, 0, w, h);
      const tonos = ['#7a3328', '#73302a', '#823a2c', '#6c2d26'];
      for (let fila = 0, y = 0; y < h; fila++, y += 6) {
        for (let x = -((fila % 2) * 6); x < w; x += 12) {
          g.fillStyle = tonos[(Math.abs(x * 7 + fila * 13)) % 4];
          g.fillRect(x, y, 11, 5);
          g.fillStyle = '#8f4433'; g.fillRect(x, y, 11, 1);
        }
      }
      Sprites.tramar(g, 0, 0, w, h, '#2a0f18', (x) => (Math.abs(x - w / 2) / (w / 2) - 0.55) * 1.4);   // sombra solo hacia los bordes
      return cv;
    }

    // Luz derramada y cristal apagado: tramas que se generan una vez por tamaño de ventana
    const tramas = {};
    function tramasVentana(w, h) {
      const clave = w + 'x' + h;
      if (tramas[clave]) return tramas[clave];
      const [luz, gl] = Sprites.lienzoAux(w + 10, h + 10);
      Sprites.tramar(gl, 0, 0, w + 10, h + 10, '#b0602e', (xx, yy) => {
        const dx = Math.max(5 - xx, 0, xx - (w + 5)), dy = Math.max(5 - yy, 0, yy - (h + 5));
        return dx + dy === 0 ? 0 : 0.5 - (dx + dy) / 10;
      });
      const [apagada, ga] = Sprites.lienzoAux(w, h);
      ga.fillStyle = '#141a3c'; ga.fillRect(0, 0, w, h);
      Sprites.tramar(ga, 0, 0, w, h, '#1f2a5a', (xx, yy) => (xx + yy) / (w + h) * 0.9);
      return (tramas[clave] = { luz, apagada });
    }

    function ventana(ctx, x, y, w, h, encendida, destello, t, i) {
      const r = (c, a, b, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, ww, hh); };
      const tr = tramasVentana(w, h);
      if (encendida) ctx.drawImage(tr.luz, x - 5, y - 5);                  // luz derramada sobre el ladrillo
      r(C.crema, -3, -3, w + 6, 3); r('#b9b2a6', -3, h, w + 6, 3);          // dintel y alféizar
      r(C.nieve, -3, h - 1, w + 6, 1);
      r('#2b1a14', -1, -1, w + 2, h + 2);
      if (encendida) {
        r('#ffe9a0', 0, 0, w, Math.floor(h / 2)); r('#f0a93a', 0, Math.floor(h / 2), w, h - Math.floor(h / 2));
        for (let xx = 0; xx < w; xx += 2) r('#f0a93a', xx, Math.floor(h / 2) - 1, 1, 1);
        // cortinas y, en algunas, una silueta o una vela
        const cort = [C.rojo, C.verde, C.lila, C.crema][i % 4];
        r(cort, 0, 0, w, 2); r(cort, 0, 0, 3, h); r(cort, w - 3, 0, 3, h);
        if (i % 5 === 1) { r('#5a3418', Math.floor(w / 2) - 3, h - 9, 6, 9); r('#5a3418', Math.floor(w / 2) - 2, h - 13, 4, 4); }
        if (i % 5 === 3) { r(C.crema, w - 9, h - 7, 2, 5); r(C.naranja, w - 9, h - 9 + (Math.floor(t * 4 + i) % 2), 2, 2); }
      } else {
        ctx.drawImage(tr.apagada, x, y);
        r('#3a4a8a', 2, 2, 2, 1); r('#3a4a8a', 2, 2, 1, 2);                // reflejo
      }
      r('#2b1a14', Math.floor(w / 2) - 1, 0, 2, h); r('#2b1a14', 0, Math.floor(h / 2) - 1, w, 2);   // cruz de la ventana
      if (destello > 0) {                                                   // destello al cambiar
        ctx.fillStyle = C.blanco;
        ctx.fillRect(x - 2, y - 2, w + 4, 1); ctx.fillRect(x - 2, y + h + 1, w + 4, 1);
        ctx.fillRect(x - 2, y - 2, 1, h + 4); ctx.fillRect(x + w + 1, y - 2, 1, h + 4);
      }
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), clave = api.ancho + 'x' + api.alto;
      ctx.drawImage(fondos[clave] || (fondos[clave] = crearFondo(api.ancho, api.alto)), 0, 0);
      const fiesta = ganada > 0;
      luces.forEach((on, i) => {
        const q = d.pos(i);
        ventana(ctx, q.x, q.y, d.w, d.h, on, fiesta ? (Math.floor(api.t * 8 + i) % 3 === 0 ? 1 : 0) : destellos[i], api.t, i);
      });

      // botones (REINICIAR y, si ya toca, PISTA)
      const e = api.textoEscala;
      for (const b of d.botones) {
        Comun.caja(ctx, b.x, b.y, b.w, b.h);
        texto(ctx, b.texto, b.x + 8, b.y + Math.floor((b.h - Comun.altoTexto(e)) / 2), b.color, { escala: e });
      }

      // ventana de la pista: marco dorado grueso que parpadea y una flecha encima
      if (pista >= 0 && !fiesta) {
        const q = d.pos(pista), o = Math.floor(api.t * 4) % 2;
        ctx.fillStyle = o ? C.oroClaro : C.oro;
        ctx.fillRect(q.x - 6, q.y - 6, d.w + 12, 3); ctx.fillRect(q.x - 6, q.y + d.h + 3, d.w + 12, 3);
        ctx.fillRect(q.x - 6, q.y - 6, 3, d.h + 12); ctx.fillRect(q.x + d.w + 3, q.y - 6, 3, d.h + 12);
        const fx = q.x + Math.floor(d.w / 2), fy = q.y - 14 - o * 2;
        ctx.fillRect(fx - 4, fy, 9, 2); ctx.fillRect(fx - 3, fy + 2, 7, 2); ctx.fillRect(fx - 2, fy + 4, 5, 2); ctx.fillRect(fx - 1, fy + 6, 3, 2);
      }

      // cursor del teclado
      if (usaTeclado && Math.floor(api.t * 3) % 3) {
        const b = d.botones.find((k) => k.id === cursor);
        const q = b ? { x: b.x, y: b.y } : d.pos(cursor);
        const w = b ? b.w : d.w, h = b ? b.h : d.h;
        ctx.fillStyle = C.blanco;
        ctx.fillRect(q.x - 5, q.y - 5, w + 10, 2); ctx.fillRect(q.x - 5, q.y + h + 3, w + 10, 2);
        ctx.fillRect(q.x - 5, q.y - 5, 2, h + 10); ctx.fillRect(q.x + w + 3, q.y - 5, 2, h + 10);
      }

      // marcadores
      const altoCaja = Comun.altoTexto(e) + 8;
      const t1 = `ENCENDIDAS ${luces.filter(Boolean).length}/${TOTAL}`, t2 = `PULSACIONES ${pulsaciones}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const w2 = Comun.medir(t2, e) + 8;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, altoCaja);
      texto(ctx, t2, x2 + 4, y2 + 4, C.lila, { escala: e });
    }

    // Solo en modo debug: estado y solución (pulsar esas ventanas desde el tablero inicial lo resuelve)
    if (Dias.debug) window.ventanasDebug = () => ({ luces, solucion: [...solucion], pendientes: [...pendientes], pulsaciones, totales, pista });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ENCIENDE LAS VENTANAS',
      instruccion: 'AL TOCAR UNA VENTANA CAMBIAN ELLA Y SUS VECINAS DE ARRIBA, ABAJO Y LOS LADOS. ¡ENCIENDE LAS 16!',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'wenceslao',
      reiniciar, actualizar, dibujar
    });
  }
};
