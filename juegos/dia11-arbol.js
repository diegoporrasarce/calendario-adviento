'use strict';
/* Día 11 — Decorar el árbol.
   En el portal hay un árbol con huecos marcados. Se arrastran desde la caja 8 adornos y la estrella
   (la estrella solo va en la punta). Con teclado: flechas para elegir hueco y Espacio para colgar el
   siguiente adorno. Al colocar el último, todo brilla… y la pantalla empieza a temblar (gancho del día 12). */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia11-arbol'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    // escena de 320x230: huecos del árbol (el 0 es la punta, para la estrella) y adornos de la caja
    const HUECOS = [[170, 34], [160, 78], [186, 92], [166, 112], [140, 130], [194, 128], [168, 150], [132, 168], [206, 168]];
    const ADORNOS = ['estrella', 'bolaRoja', 'bolaDorada', 'bolaAzul', 'campana', 'baston', 'lazo', 'bolaMorada', 'jengibre'];
    const CAJA = { x: 10, y: 98, w: 74, h: 116 };
    const enCaja = (i) => ({ x: CAJA.x + 19 + (i % 2) * 36, y: CAJA.y + 16 + Math.floor(i / 2) * 21 });
    const RADIO = 16;                     // distancia para que un adorno "encaje" en un hueco

    let colocados, arrastrando, cursor, usaTeclado, final, avisoTxt, chispas, antesAbajo;

    function reiniciar() {
      colocados = HUECOS.map(() => null);   // hueco → índice de adorno
      arrastrando = null; cursor = 1; usaTeclado = false; final = 0; avisoTxt = null; chispas = []; antesAbajo = false;
    }

    const usado = (a) => colocados.includes(a);
    const libres = () => HUECOS.map((_, i) => i).filter((i) => colocados[i] === null);
    const puedeIr = (a, h) => colocados[h] === null && (ADORNOS[a] === 'estrella' ? h === 0 : h !== 0);

    function colgar(a, h) {
      colocados[h] = a;
      Sonido.efecto(ADORNOS[a] === 'estrella' ? 'pareja' : 'coger');
      const [x, y] = HUECOS[h];
      for (let k = 0; k < 8; k++) chispas.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, vida: 0.4 });
      if (colocados.every((c) => c !== null)) { final = 0.001; avisoTxt = '¡QUE BONITO HA QUEDADO!'; }
    }

    function decir(t) { avisoTxt = t; avisoVida = 1.4; }
    let avisoVida = 0;

    function actualizar(dt, api, d) {
      avisoVida = Math.max(0, avisoVida - dt);
      for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.vida -= dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.vida <= 0) chispas.splice(i, 1); }

      // final: brillo y, después, un temblor cada vez más fuerte
      if (final > 0) {
        final += dt;
        if (final > 1.4 && avisoTxt !== '...¿Y ESTE TEMBLOR?') { avisoTxt = '...¿Y ESTE TEMBLOR?'; }
        if (final > 1.4) {
          api.sacudir(0.1 + (final - 1.4) * 0.2);
          if (Math.floor(final * 4) !== Math.floor((final - dt) * 4)) Sonido.efecto('golpe');
        }
        if (final > 3.6) api.ganar();
        return;
      }

      const e = api.entrada;
      const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K;
      // arrastrar con el ratón o el dedo: se coge lo que hay donde se pulsó (aunque el dedo ya se haya movido)
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        usaTeclado = false;
        const px = (e.puntero.xInicio - d.x0) / d.K, py = (e.puntero.yInicio - d.y0) / d.K;
        let a = ADORNOS.findIndex((_, i) => !usado(i) && Math.hypot(px - enCaja(i).x, py - enCaja(i).y) < 15);
        if (a < 0) {                                                       // también se puede volver a coger uno ya colgado
          const h = HUECOS.findIndex(([x, y], i) => colocados[i] !== null && Math.hypot(px - x, py - y) < 12);
          if (h >= 0) { a = colocados[h]; colocados[h] = null; }
        }
        if (a >= 0) { arrastrando = a; Sonido.efecto('carta'); }
      }
      if (arrastrando !== null && antesAbajo && !e.puntero.abajo) {        // se suelta
        let mejor = -1, dist = RADIO;
        HUECOS.forEach(([x, y], h) => { const dd = Math.hypot(px - x, py - y); if (puedeIr(arrastrando, h) && dd < dist) { dist = dd; mejor = h; } });
        if (mejor >= 0) colgar(arrastrando, mejor);
        else {
          if (ADORNOS[arrastrando] === 'estrella' && Math.hypot(px - HUECOS[0][0], py - HUECOS[0][1]) > RADIO && py < 150) decir('LA ESTRELLA VA EN LA PUNTA');
          Sonido.efecto('cerrar');
        }
        arrastrando = null;
      }
      antesAbajo = e.puntero.abajo;

      // teclado: flechas entre los huecos libres y Espacio para colgar el siguiente adorno
      const dirs = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in dirs) if (e.pulsado(k)) {
        usaTeclado = true;
        const [dx, dy] = dirs[k], [ox, oy] = HUECOS[cursor];
        let mejor = -1, puntos = Infinity;
        libres().forEach((h) => {
          if (h === cursor) return;
          const vx = HUECOS[h][0] - ox, vy = HUECOS[h][1] - oy, avance = vx * dx + vy * dy;
          if (avance <= 2) return;
          const p = avance + Math.abs(vx * dy + vy * dx) * 2;
          if (p < puntos) { puntos = p; mejor = h; }
        });
        if (mejor >= 0) cursor = mejor;
      }
      if (colocados[cursor] !== null) cursor = libres()[0] ?? 0;
      if (e.pulsado('accion')) {
        usaTeclado = true;
        const quedan = ADORNOS.map((_, i) => i).filter((i) => !usado(i));
        const a = cursor === 0 ? quedan.find((i) => ADORNOS[i] === 'estrella') : quedan.find((i) => ADORNOS[i] !== 'estrella');
        if (a !== undefined) colgar(a, cursor);
        else decir(cursor === 0 ? 'YA NO QUEDA ESTRELLA' : 'SOLO QUEDA LA ESTRELLA: ¡A LA PUNTA!');
        if (colocados[cursor] !== null && libres().length) cursor = libres().includes(0) && libres().length === 1 ? 0 : libres().find((h) => h !== 0) ?? 0;
      }
    }

    /* ---------- Dibujo (escena de 320x230) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // Los adornos se dibujan al doble de tamaño para que se vean bien en el árbol
    function adorno(ctx, tipo, x, y, t) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(2, 2);
      adornoBase(ctx, tipo, 0, 0, t);
      ctx.restore();
    }
    function adornoBase(ctx, tipo, x, y, t) {
      const bola = (c, o) => { r(ctx, c, x - 3, y - 2, 7, 5); r(ctx, c, x - 2, y - 3, 5, 7); r(ctx, o, x + 1, y + 1, 2, 2); r(ctx, C.blanco, x - 2, y - 2, 1, 1); r(ctx, C.oro, x - 1, y - 5, 3, 2); };
      switch (tipo) {
        case 'estrella':
          r(ctx, C.oro, x - 1, y - 7, 3, 15); r(ctx, C.oro, x - 7, y - 1, 15, 3); r(ctx, C.oro, x - 3, y - 3, 7, 7);
          r(ctx, C.oro, x - 5, y + 3, 3, 3); r(ctx, C.oro, x + 3, y + 3, 3, 3);
          r(ctx, C.oroClaro, x - 1, y - 6, 1, 6); r(ctx, C.oroClaro, x - 6, y - 1, 6, 1);
          if (Math.floor(t * 4) % 2) { r(ctx, C.blanco, x, y - 9, 1, 2); r(ctx, C.blanco, x + 9, y, 2, 1); }
          break;
        case 'bolaRoja': bola(C.rojo, C.rojoOsc); break;
        case 'bolaDorada': bola(C.oro, '#b88a1e'); break;
        case 'bolaAzul': bola('#4a7ad8', '#2c4a90'); break;
        case 'bolaMorada': bola('#9a5ad0', '#6a3498'); break;
        case 'campana':
          r(ctx, C.oro, x - 2, y - 4, 5, 2); r(ctx, C.oro, x - 3, y - 2, 7, 4); r(ctx, C.oro, x - 4, y + 2, 9, 2); r(ctx, '#b88a1e', x - 1, y + 4, 3, 2);
          r(ctx, C.oroClaro, x - 2, y - 2, 1, 3); r(ctx, C.rojo, x - 1, y - 6, 3, 2);
          break;
        case 'baston':
          r(ctx, C.blanco, x - 1, y - 2, 2, 9); r(ctx, C.blanco, x, y - 5, 4, 2); r(ctx, C.blanco, x + 3, y - 4, 2, 3);
          r(ctx, C.rojo, x - 1, y, 2, 1); r(ctx, C.rojo, x - 1, y + 3, 2, 1); r(ctx, C.rojo, x - 1, y + 6, 2, 1); r(ctx, C.rojo, x + 1, y - 5, 1, 2); r(ctx, C.rojo, x + 4, y - 3, 1, 1);
          break;
        case 'lazo':
          r(ctx, C.rojo, x - 5, y - 3, 4, 5); r(ctx, C.rojo, x + 2, y - 3, 4, 5); r(ctx, C.rojoOsc, x - 1, y - 2, 3, 3);
          r(ctx, C.rojo, x - 3, y + 1, 2, 5); r(ctx, C.rojo, x + 2, y + 1, 2, 5); r(ctx, C.rojoClaro, x - 4, y - 2, 1, 2);
          break;
        case 'jengibre':
          r(ctx, '#b0602a', x - 2, y - 6, 5, 4); r(ctx, '#b0602a', x - 3, y - 2, 7, 5); r(ctx, '#b0602a', x - 5, y - 1, 11, 2);
          r(ctx, '#b0602a', x - 3, y + 3, 2, 3); r(ctx, '#b0602a', x + 2, y + 3, 2, 3);
          r(ctx, C.blanco, x - 1, y - 5, 1, 1); r(ctx, C.blanco, x + 1, y - 5, 1, 1); r(ctx, C.blanco, x, y, 1, 1); r(ctx, C.rojo, x, y - 2, 1, 1);
          break;
      }
    }

    // Portal (fondo) y árbol, dibujados una vez
    let fondo = null;
    function crearFondo() {
      const [cv, g] = Sprites.lienzoAux(320, 230);
      const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      // pared del portal con zócalo de madera, buzones y la puerta de la calle
      R('#3a2e48', 0, 0, 320, 200);
      for (let x = 0; x < 320; x += 16) R('#42344f', x, 0, 8, 160);
      R('#6b3a28', 0, 160, 320, 40); R('#8a4f30', 0, 160, 320, 2); for (let x = 8; x < 320; x += 20) R('#5a3020', x, 166, 1, 32);
      R('#9aa0b0', 236, 60, 60, 40); for (let i = 0; i < 6; i++) { R('#6a7088', 239 + (i % 3) * 19, 63 + Math.floor(i / 3) * 18, 17, 15); R('#2c2f3e', 243 + (i % 3) * 19, 68 + Math.floor(i / 3) * 18, 9, 2); }
      R('#2b1a14', 20, 16, 44, 78); R('#6b3a28', 23, 19, 38, 75); R('#ffe9a0', 27, 24, 30, 22); R('#f6cf63', 54, 62, 3, 3);
      R('#0b1030', 29, 26, 26, 18); for (let k = 0; k < 6; k++) R(C.nieve, 31 + (k * 7) % 22, 28 + (k * 5) % 14, 1, 1);
      // suelo de baldosas
      for (let y = 200; y < 230; y += 8) for (let x = 0; x < 320; x += 8) R(((x + y) / 8) % 2 ? '#c9b48e' : '#a8946e', x, y, 8, 8);
      // árbol: pisos de ramas tramados, tronco y maceta
      const cx = 170;
      R('#5a3418', cx - 5, 184, 10, 12); R('#8a3f22', cx - 14, 192, 28, 10); R('#c0643a', cx - 12, 194, 24, 8); R('#d9824e', cx - 12, 194, 3, 8);
      for (let y = 42; y < 188; y++) {
        const piso = Math.floor((y - 42) / 37), f = ((y - 42) % 37) / 37;
        const hw = Math.round(8 + (y - 42) / 146 * 46 * (0.7 + 0.3 * f) + piso * 2);
        for (let x = -hw; x <= hw; x++) {
          const u = Sprites.umbral(cx + x, y), v = x / hw * 0.5 + 0.5 + (f < 0.2 && piso > 0 ? 0.3 : 0);
          g.fillStyle = v > 0.85 + u * 0.2 ? '#1b4d33' : v > 0.5 + u * 0.3 ? '#2c6e48' : v > 0.2 + u * 0.2 ? '#3f8a5c' : '#55a070';
          g.fillRect(cx + x, y, 1, 1);
        }
      }
      // un poco de nieve en las puntas de las ramas
      for (let p = 0; p < 4; p++) { const y = 42 + p * 37 + 34, hw = Math.round(8 + (y - 42) / 146 * 46 + p * 2); R(C.nieve, cx - hw, y, 5, 2); R(C.nieve, cx + hw - 4, y, 5, 2); }
      // caja de los adornos
      R('#7a4a28', CAJA.x, CAJA.y, CAJA.w, CAJA.h); R('#a9763f', CAJA.x + 3, CAJA.y + 3, CAJA.w - 6, CAJA.h - 6); R('#c08d52', CAJA.x, CAJA.y, CAJA.w, 3);
      return cv;
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 22 + (api.ancho - api.margenDerecho < 230 ? altoCaja + 6 : 0);
      const K = Math.max(1, Math.min(3, Math.floor(Math.min(api.ancho / 322, (api.alto - arriba - 4) / 232))));
      const x0 = Math.floor((api.ancho - 320 * K) / 2), y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - 230 * K) / 2));
      return { K, x0, y0, e, altoCaja, arriba };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      ctx.fillStyle = '#1b1426'; ctx.fillRect(0, 0, api.ancho, api.alto);
      ctx.save();
      ctx.translate(d.x0, d.y0);
      ctx.scale(d.K, d.K);
      ctx.drawImage(fondo || (fondo = crearFondo()), 0, 0);
      // luces del árbol: se encienden al terminar (y parpadean)
      if (final > 0) {
        const luces = [[156, 66], [182, 74], [150, 98], [194, 106], [140, 132], [178, 128], [204, 140], [128, 170], [160, 166], [214, 174], [188, 182]];
        luces.forEach(([x, y], i) => { if ((Math.floor(t * 5) + i) % 3) r(ctx, [C.rojo, C.oroClaro, '#5cd6ff', '#7dff7a'][i % 4], x, y, 2, 2); });
      }
      // huecos libres (círculos tenues) y adornos colgados
      HUECOS.forEach(([x, y], h) => {
        if (colocados[h] !== null) { adorno(ctx, ADORNOS[colocados[h]], x, y, t); return; }
        const tenue = h === 0 ? C.oro : '#9ad0a8', o = Math.floor(t * 2) % 2;
        r(ctx, tenue, x - 5, y - 8 - o, 11, 1); r(ctx, tenue, x - 5, y + 8 + o, 11, 1); r(ctx, tenue, x - 8 - o, y - 5, 1, 11); r(ctx, tenue, x + 8 + o, y - 5, 1, 11);
      });
      // cursor del teclado
      if (usaTeclado && final === 0 && Math.floor(t * 3) % 3) {
        const [x, y] = HUECOS[cursor];
        r(ctx, C.blanco, x - 11, y - 11, 23, 1); r(ctx, C.blanco, x - 11, y + 11, 23, 1); r(ctx, C.blanco, x - 11, y - 11, 1, 23); r(ctx, C.blanco, x + 11, y - 11, 1, 23);
      }
      // adornos que quedan en la caja
      ADORNOS.forEach((a, i) => { if (!usado(i) && i !== arrastrando) { const q = enCaja(i); adorno(ctx, a, q.x, q.y, t); } });
      ctx.fillStyle = C.oroClaro;
      for (const c of chispas) ctx.fillRect(Math.round(c.x), Math.round(c.y), 1, 1);
      ctx.restore();

      // el que se arrastra, siguiendo al dedo (en la escala de la escena)
      if (arrastrando !== null) {
        ctx.save(); ctx.translate(api.entrada.puntero.x, api.entrada.puntero.y); ctx.scale(d.K, d.K);
        adorno(ctx, ADORNOS[arrastrando], 0, 0, t); ctx.restore();
      }

      const e = d.e;
      const msg = final > 0 ? avisoTxt : avisoVida > 0 ? avisoTxt : null;
      if (msg) {
        const em = Comun.medir(msg, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, msg, Math.floor(api.ancho / 2), d.arriba - Comun.altoTexto(em) - 6, final > 1.4 ? C.rojoClaro : C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const n = colocados.filter((c) => c !== null).length;
      const t1 = `ADORNOS ${n}/${HUECOS.length}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: posiciones (en el lienzo) de los huecos y de los adornos de la caja
    let ultima = { K: 1, x0: 0, y0: 0 };
    const aLienzo = (x, y) => ({ x: ultima.x0 + x * ultima.K, y: ultima.y0 + y * ultima.K });
    if (Dias.debug) window.arbolDebug = () => ({
      colocados: colocados.filter((c) => c !== null).length, final: final > 0,
      huecos: HUECOS.map(([x, y]) => aLienzo(x, y)), caja: ADORNOS.map((a, i) => ({ a, usado: usado(i), ...aLienzo(enCaja(i).x, enCaja(i).y) }))
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'DECORA EL ARBOL',
      instruccion: 'ARRASTRA LOS ADORNOS DE LA CAJA A LOS HUECOS DEL ARBOL. LA ESTRELLA, EN LA PUNTA. CON TECLADO: FLECHAS PARA ELEGIR HUECO Y ESPACIO PARA COLGAR.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'tannenbaum',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
