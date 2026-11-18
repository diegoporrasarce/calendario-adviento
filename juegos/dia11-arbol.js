'use strict';
/* Día 11 — Decorar el árbol (copiar el modelo).
   A la derecha aparece un árbol de MODELO ya decorado; hay que decorar el del portal igual, cada adorno en
   su hueco, antes de que se acabe el tiempo. Tres rondas, cada vez con más adornos y menos tiempo por adorno.
   Poner un adorno donde no va lo devuelve a la caja y quita 3 segundos. Si se acaba el tiempo, se repite
   la ronda. Al terminar la tercera, todo brilla… y la pantalla empieza a temblar (gancho del día 12).
   Se arrastra con el ratón o el dedo; con teclado, flechas entre huecos y caja y Espacio para coger/colgar. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia11-arbol'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    // escena de 320x230: huecos del árbol (el 0 es la punta, para la estrella) y adornos de la caja
    const HUECOS = [[150, 34], [140, 78], [166, 92], [146, 112], [120, 130], [174, 128], [148, 150], [112, 168], [186, 168]];
    const ADORNOS = ['estrella', 'bolaRoja', 'bolaDorada', 'bolaAzul', 'campana', 'baston', 'lazo', 'bolaMorada', 'jengibre'];
    const RONDAS = [{ adornos: 4, tiempo: 45 }, { adornos: 6, tiempo: 40 }, { adornos: 8, tiempo: 40 }];
    const PENALIZACION = 3;
    const CAJA = { x: 6, y: 98, w: 74, h: 116 };
    const enCaja = (i) => ({ x: CAJA.x + 19 + (i % 2) * 36, y: CAJA.y + 16 + Math.floor(i / 2) * 21 });
    const MODELO = { x: 226, y: 22, w: 90, h: 120 };          // cuadro con el árbol de referencia
    const RADIO = 16;

    let rondaAlcanzada = 0;               // no se reinicia al reintentar: se repite la ronda en la que se iba
    let ronda, modelo, colocados, arrastrando, mano, cursor, usaTeclado, quedan, final, entreRondas, aviso, chispas, antesAbajo;

    // Modelo de la ronda: la estrella en la punta y n adornos distintos en huecos al azar
    function nuevoModelo(n) {
      const huecos = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, n);
      const adornos = [1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, n);
      const m = HUECOS.map(() => null);
      m[0] = 0;
      huecos.forEach((h, k) => { m[h] = adornos[k]; });
      return m;
    }

    function empezarRonda(n) {
      ronda = n;
      modelo = nuevoModelo(RONDAS[n].adornos);
      colocados = HUECOS.map(() => null);
      quedan = RONDAS[n].tiempo;
      arrastrando = null; mano = null;
    }

    function reiniciar() {
      cursor = 1; usaTeclado = false; final = 0; entreRondas = 0; aviso = null; chispas = []; antesAbajo = false;
      empezarRonda(rondaAlcanzada);
    }

    const usado = (a) => colocados.includes(a);
    const huecosDelModelo = () => modelo.filter((m) => m !== null).length;
    const aciertos = () => colocados.filter((c, h) => c !== null && c === modelo[h]).length;
    function decir(t, color) { aviso = { texto: t, color: color || C.oroClaro, vida: 1.3 }; }

    // Intenta colgar el adorno a en el hueco h: solo si coincide con el modelo
    function colgar(a, h, api) {
      if (colocados[h] !== null) return false;
      if (modelo[h] !== a) {
        quedan = Math.max(0, quedan - PENALIZACION);
        decir(modelo[h] === null ? '¡AHI NO VA NADA! -3 S' : '¡AHI NO VA! -3 S', C.rojoClaro);
        Sonido.efecto('bloqueada'); api.sacudir(0.1);
        return false;
      }
      colocados[h] = a;
      Sonido.efecto(ADORNOS[a] === 'estrella' ? 'pareja' : 'coger');
      const [x, y] = HUECOS[h];
      for (let k = 0; k < 8; k++) chispas.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, vida: 0.4 });
      if (aciertos() === huecosDelModelo()) {
        if (ronda < RONDAS.length - 1) { entreRondas = 1.6; decir(`¡IGUALITO! RONDA ${ronda + 2}`, C.oroClaro); Sonido.efecto('completar'); }
        else { final = 0.001; decir('¡QUE BONITO HA QUEDADO!', C.oroClaro); }
      }
      return true;
    }

    function actualizar(dt, api, d) {
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0 && final === 0) aviso = null; }
      for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.vida -= dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.vida <= 0) chispas.splice(i, 1); }

      // final: luces y, después, un temblor cada vez más fuerte
      if (final > 0) {
        final += dt;
        if (final > 1.4) {
          aviso = { texto: '...¿Y ESTE TEMBLOR?', color: C.rojoClaro, vida: 9 };
          api.sacudir(0.1 + (final - 1.4) * 0.2);
          if (Math.floor(final * 4) !== Math.floor((final - dt) * 4)) Sonido.efecto('golpe');
        }
        if (final > 3.6) { rondaAlcanzada = 0; api.ganar(); }
        return;
      }
      if (entreRondas > 0) {
        entreRondas -= dt;
        if (entreRondas <= 0) { rondaAlcanzada = ronda + 1; empezarRonda(ronda + 1); }
        return;
      }

      quedan -= dt;
      if (quedan <= 0) { quedan = 0; rondaAlcanzada = ronda; api.perder(`SE ACABO EL TIEMPO EN LA RONDA ${ronda + 1}. ¡A POR ELLA OTRA VEZ!`); return; }

      const e = api.entrada;
      const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K;
      // arrastrar: se coge lo que hay donde se pulsó (de la caja o ya colgado en el árbol)
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        usaTeclado = false; mano = null;
        const qx = (e.puntero.xInicio - d.x0) / d.K, qy = (e.puntero.yInicio - d.y0) / d.K;
        let a = ADORNOS.findIndex((_, i) => !usado(i) && Math.hypot(qx - enCaja(i).x, qy - enCaja(i).y) < 15);
        if (a < 0) {
          const h = HUECOS.findIndex(([x, y], i) => colocados[i] !== null && Math.hypot(qx - x, qy - y) < 12);
          if (h >= 0) { a = colocados[h]; colocados[h] = null; }
        }
        if (a >= 0) { arrastrando = a; Sonido.efecto('carta'); }
      }
      if (arrastrando !== null && antesAbajo && !e.puntero.abajo) {        // se suelta
        let mejor = -1, dist = RADIO;
        HUECOS.forEach(([x, y], h) => { const dd = Math.hypot(px - x, py - y); if (colocados[h] === null && dd < dist) { dist = dd; mejor = h; } });
        if (mejor >= 0) colgar(arrastrando, mejor, api);
        else Sonido.efecto('cerrar');                                        // vuelve a la caja
        arrastrando = null;
      }
      antesAbajo = e.puntero.abajo;

      // teclado: flechas entre huecos (0..8) y adornos de la caja (9..17); Espacio coge o cuelga
      const puntos = [...HUECOS.map(([x, y]) => ({ x, y })), ...ADORNOS.map((_, i) => enCaja(i))];
      const dirs = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in dirs) if (e.pulsado(k)) {
        usaTeclado = true;
        const [dx, dy] = dirs[k], o = puntos[cursor];
        let mejor = -1, p = Infinity;
        puntos.forEach((q, j) => {
          if (j === cursor || (j >= HUECOS.length && usado(j - HUECOS.length))) return;
          const vx = q.x - o.x, vy = q.y - o.y, avance = vx * dx + vy * dy;
          if (avance <= 2) return;
          const v = avance + Math.abs(vx * dy + vy * dx) * 2;
          if (v < p) { p = v; mejor = j; }
        });
        if (mejor >= 0) cursor = mejor;
      }
      if (e.pulsado('accion')) {
        usaTeclado = true;
        if (cursor >= HUECOS.length) {                                       // coger de la caja
          const a = cursor - HUECOS.length;
          if (!usado(a)) { mano = a; Sonido.efecto('carta'); }
        } else if (mano !== null) {                                          // colgar lo que se lleva
          if (colgar(mano, cursor, api)) mano = null;
        } else if (colocados[cursor] !== null) {                             // descolgar
          mano = colocados[cursor]; colocados[cursor] = null; Sonido.efecto('carta');
        }
      }
    }

    /* ---------- Dibujo (escena de 320x230) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // Adornos al doble de tamaño en el árbol y la caja; al tamaño normal en el modelo
    function adorno(ctx, tipo, x, y, t, k = 2) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
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

    // Abeto tramado (pisos de ramas). Se usa grande para el del portal y pequeño para el modelo.
    function pintarAbeto(g, cx, arriba, alto) {
      const pisos = 4, ap = alto / pisos;
      for (let y = 0; y < alto; y++) {
        const piso = Math.floor(y / ap), f = (y % ap) / ap;
        const hw = Math.round(alto * 0.055 + y / alto * alto * 0.315 * (0.7 + 0.3 * f) + piso * alto * 0.014);
        for (let x = -hw; x <= hw; x++) {
          const u = Sprites.umbral(cx + x, arriba + y), v = x / hw * 0.5 + 0.5 + (f < 0.2 && piso > 0 ? 0.3 : 0);
          g.fillStyle = v > 0.85 + u * 0.2 ? '#1b4d33' : v > 0.5 + u * 0.3 ? '#2c6e48' : v > 0.2 + u * 0.2 ? '#3f8a5c' : '#55a070';
          g.fillRect(cx + x, arriba + y, 1, 1);
        }
      }
    }

    let fondo = null;
    function crearFondo() {
      const [cv, g] = Sprites.lienzoAux(320, 230);
      const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R('#3a2e48', 0, 0, 320, 200);
      for (let x = 0; x < 320; x += 16) R('#42344f', x, 0, 8, 160);
      R('#6b3a28', 0, 160, 320, 40); R('#8a4f30', 0, 160, 320, 2); for (let x = 8; x < 320; x += 20) R('#5a3020', x, 166, 1, 32);
      R('#2b1a14', 18, 16, 44, 78); R('#6b3a28', 21, 19, 38, 75); R('#ffe9a0', 25, 24, 30, 22); R('#f6cf63', 52, 62, 3, 3);
      R('#0b1030', 27, 26, 26, 18); for (let k = 0; k < 6; k++) R(C.nieve, 29 + (k * 7) % 22, 28 + (k * 5) % 14, 1, 1);
      for (let y = 200; y < 230; y += 8) for (let x = 0; x < 320; x += 8) R(((x + y) / 8) % 2 ? '#c9b48e' : '#a8946e', x, y, 8, 8);
      // árbol del portal (su punta en x = 150)
      const cx = 150;
      R('#5a3418', cx - 5, 184, 10, 12); R('#8a3f22', cx - 14, 192, 28, 10); R('#c0643a', cx - 12, 194, 24, 8); R('#d9824e', cx - 12, 194, 3, 8);
      pintarAbeto(g, cx, 42, 146);
      for (let p = 0; p < 4; p++) { const y = 42 + p * 37 + 34, hw = Math.round(8 + (y - 42) / 146 * 46 + p * 2); R(C.nieve, cx - hw, y, 5, 2); R(C.nieve, cx + hw - 4, y, 5, 2); }
      // caja de los adornos
      R('#7a4a28', CAJA.x, CAJA.y, CAJA.w, CAJA.h); R('#a9763f', CAJA.x + 3, CAJA.y + 3, CAJA.w - 6, CAJA.h - 6); R('#c08d52', CAJA.x, CAJA.y, CAJA.w, 3);
      // cuadro del modelo con su arbolito
      const M = MODELO;
      R(C.oro, M.x - 3, M.y - 3, M.w + 6, M.h + 6); R('#8a5a1e', M.x - 1, M.y - 1, M.w + 2, M.h + 2); R('#1f2a4a', M.x, M.y, M.w, M.h);
      const mx = M.x + Math.floor(M.w / 2);
      R('#5a3418', mx - 3, M.y + 98, 6, 6); R('#8a3f22', mx - 7, M.y + 102, 14, 6);
      pintarAbeto(g, mx, M.y + 26, 73);
      return cv;
    }
    // posición de un hueco en el árbol del modelo (a la mitad de tamaño)
    const enModelo = ([x, y]) => [MODELO.x + Math.floor(MODELO.w / 2) + (x - 150) / 2, MODELO.y + 26 + (y - 42) / 2];

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + (altoCaja + 6) * (api.ancho - api.margenDerecho < 330 ? 2 : 1) + Comun.altoTexto(e + 1) + 12;
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
      // el modelo: su título y sus adornos (pequeños)
      texto(ctx, 'MODELO', MODELO.x + Math.floor(MODELO.w / 2), MODELO.y + 5, C.oroClaro, { centro: true });
      modelo.forEach((a, h) => { if (a !== null) { const [x, y] = enModelo(HUECOS[h]); adorno(ctx, ADORNOS[a], x, y, t, 1); } });
      // luces del árbol al terminar
      if (final > 0) {
        const luces = [[136, 66], [162, 74], [130, 98], [174, 106], [120, 132], [158, 128], [184, 140], [108, 170], [140, 166], [194, 174], [168, 182]];
        luces.forEach(([x, y], i) => { if ((Math.floor(t * 5) + i) % 3) r(ctx, [C.rojo, C.oroClaro, '#5cd6ff', '#7dff7a'][i % 4], x, y, 2, 2); });
      }
      // huecos libres y adornos colgados
      HUECOS.forEach(([x, y], h) => {
        if (colocados[h] !== null) { adorno(ctx, ADORNOS[colocados[h]], x, y, t); return; }
        const tenue = h === 0 ? C.oro : '#9ad0a8', o = Math.floor(t * 2) % 2;
        r(ctx, tenue, x - 5, y - 8 - o, 11, 1); r(ctx, tenue, x - 5, y + 8 + o, 11, 1); r(ctx, tenue, x - 8 - o, y - 5, 1, 11); r(ctx, tenue, x + 8 + o, y - 5, 1, 11);
      });
      // adornos de la caja
      ADORNOS.forEach((a, i) => { if (!usado(i) && i !== arrastrando && i !== mano) { const q = enCaja(i); adorno(ctx, a, q.x, q.y, t); } });
      // cursor del teclado (y lo que se lleva, encima)
      if (usaTeclado && final === 0) {
        const q = cursor < HUECOS.length ? { x: HUECOS[cursor][0], y: HUECOS[cursor][1] } : enCaja(cursor - HUECOS.length);
        if (Math.floor(t * 3) % 3) { r(ctx, C.blanco, q.x - 11, q.y - 11, 23, 1); r(ctx, C.blanco, q.x - 11, q.y + 11, 23, 1); r(ctx, C.blanco, q.x - 11, q.y - 11, 1, 23); r(ctx, C.blanco, q.x + 11, q.y - 11, 1, 23); }
        if (mano !== null) adorno(ctx, ADORNOS[mano], q.x + 8, q.y - 12, t);
      }
      ctx.fillStyle = C.oroClaro;
      for (const c of chispas) ctx.fillRect(Math.round(c.x), Math.round(c.y), 1, 1);
      ctx.restore();

      if (arrastrando !== null) {                                            // el que se arrastra, siguiendo al dedo
        ctx.save(); ctx.translate(api.entrada.puntero.x, api.entrada.puntero.y); ctx.scale(d.K, d.K);
        adorno(ctx, ADORNOS[arrastrando], 0, 0, t); ctx.restore();
      }

      const e = d.e;
      if (aviso) {
        const em = Comun.medir(aviso.texto, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, aviso.texto, Math.floor(api.ancho / 2), d.arriba - Comun.altoTexto(em) - 6, aviso.color, { escala: em, centro: true, sombra: C.tinta });
      }
      // marcadores: ronda, adornos colocados y tiempo
      let t1 = `RONDA ${ronda + 1}/${RONDAS.length}  ADORNOS ${aciertos()}/${huecosDelModelo()}`;
      if (Comun.medir(t1, e) + 14 > api.ancho - api.margenDerecho) t1 = `RONDA ${ronda + 1}/${RONDAS.length} · ${aciertos()}/${huecosDelModelo()}`;   // más corto si no cabe
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const anchoBarra = 50, anchoNum = Comun.medir('45', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + d.altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, d.altoCaja);
      const frac = Math.max(0, quedan / RONDAS[ronda].tiempo);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, d.altoCaja - 8);
      ctx.fillStyle = quedan < 10 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * frac), d.altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    // Solo en modo debug: el modelo y posiciones (en el lienzo) de huecos y caja, para las pruebas
    let ultima = { K: 1, x0: 0, y0: 0 };
    const aLienzo = (x, y) => ({ x: ultima.x0 + x * ultima.K, y: ultima.y0 + y * ultima.K });
    if (Dias.debug) window.arbolDebug = () => ({
      ronda, quedan, aciertos: aciertos(), objetivo: huecosDelModelo(), final: final > 0, entreRondas: entreRondas > 0,
      modelo: modelo.map((a) => (a === null ? null : a)),
      huecos: HUECOS.map(([x, y]) => aLienzo(x, y)), caja: ADORNOS.map((a, i) => ({ a, usado: usado(i), ...aLienzo(enCaja(i).x, enCaja(i).y) }))
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'DECORA EL ARBOL',
      instruccion: 'COPIA EL ARBOL DEL MODELO: ARRASTRA CADA ADORNO DE LA CAJA A SU HUECO ANTES DE QUE SE ACABE EL TIEMPO. 3 RONDAS, CADA VEZ MAS DIFICIL. SI LO PONES DONDE NO VA, PIERDES 3 SEGUNDOS.',
      pantallaCompleta: true,
      musica: 'tannenbaum',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
