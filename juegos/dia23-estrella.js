'use strict';
/* Día 23 — La estrella del tejado.
   El edificio por dentro, en corte: la chica lleva la estrella y sube planta a planta por las escaleras
   (en zigzag) hasta el tejado, donde la coloca. En cada rellano hay un vecino que la saluda al pasar
   (los saludos salen de dias.json, campo "saludos"). ← → para andar (también por la escalera),
   ↑ siempre avanza y ↓ retrocede; con el dedo, mantener pulsado por encima de ella para subir. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia23-estrella'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const W = 320, PISOS = 6, AP = 56, TECHO = 64;                         // ancho, plantas, alto de planta, nivel del tejado
    const FY = (p) => TECHO + (PISOS - p) * AP;                           // suelo de la planta p (la 6 = tejado)
    const MUNDO_ALTO = FY(0) + 18;
    const VEL = 72;                                                       // px por segundo a lo largo del camino
    const ESTRELLA_X = 168;
    const SALUDOS_BASE = ['¡BUENAS NOCHES, VECINA!', '¡QUÉ ESTRELLA TAN BONITA!', '¡GRACIAS POR ARREGLAR EL EDIFICIO!',
      '¡YA QUEDA POCO PARA NAVIDAD!', '¡FELICES FIESTAS! ¡MIAU!', '¡SUBE, QUE EL TEJADO TE ESPERA!'];
    const SALUDOS = SALUDOS_BASE.map((s, i) => (Array.isArray(datos && datos.saludos) && datos.saludos[i] ? String(datos.saludos[i]) : s));

    // Camino: pasillo y escalera alternando de lado; la escalera de la última planta sale al tejado
    const PUNTOS = [[24, FY(0)]];
    for (let p = 0; p < PISOS; p++) {
      if (p % 2 === 0) PUNTOS.push([214, FY(p)], [284, FY(p + 1)]);
      else PUNTOS.push([106, FY(p)], [36, FY(p + 1)]);
    }
    PUNTOS.push([ESTRELLA_X, TECHO]);
    const TRAMOS = [];
    let total = 0;
    for (let i = 0; i < PUNTOS.length - 1; i++) {
      const [x0, y0] = PUNTOS[i], [x1, y1] = PUNTOS[i + 1], l = Math.hypot(x1 - x0, y1 - y0);
      TRAMOS.push({ x0, y0, x1, y1, l, ini: total, fin: total + l, dx: Math.sign(x1 - x0), escalera: y0 !== y1 });
      total += l;
    }
    const ESCALERAS = TRAMOS.filter((t) => t.escalera);

    // Vecinos: uno por planta, en el pasillo, delante de su puerta
    const ASPECTO = [
      { ropa: '#4a7ad8', pelo: '#6b3f23' }, { ropa: '#9a5ad0', pelo: '#c9c9c9', abuela: true }, { ropa: '#3f8a5c', pelo: '#2b1a14', barba: true },
      { ropa: '#f08a2c', pelo: '#c9a227', nino: true }, { ropa: '#c8383f', pelo: '#a8402a', gato: true }, { ropa: '#2c8a8a', pelo: '#2b1a14', gorro: true }
    ];
    const VECINOS = ASPECTO.map((a, p) => ({ ...a, p, x: p % 2 === 0 ? 132 : 188, puerta: p % 2 === 0 ? 142 : 178 }));

    let s, jug, camara, final, saludados;

    function reiniciar() {
      s = 0; camara = null; final = 0; saludados = 0;
      jug = { x: 24, y: FY(0), dir: 1, andando: false };
      for (const v of VECINOS) { v.saludado = false; v.t = 0; }
    }

    const tramoEn = (pos) => TRAMOS.find((t) => pos >= t.ini && pos < t.fin) || TRAMOS[TRAMOS.length - 1];
    function punto(pos) {
      const t = tramoEn(pos), k = (pos - t.ini) / t.l;
      return { x: t.x0 + (t.x1 - t.x0) * k, y: t.y0 + (t.y1 - t.y0) * k, t };
    }

    function disposicion(api) {
      const K = Math.max(1, Math.floor(Math.min(api.ancho / W, api.alto / 200)));
      const H = Math.floor(api.alto / K);
      return { K, H, ox: Math.floor((api.ancho - W * K) / 2) };
    }

    function actualizar(dt, api, d) {
      for (const v of VECINOS) if (v.t > 0) v.t -= dt;
      if (final > 0) { final += dt; if (final > 2.6) api.ganar(); return; }
      const e = api.entrada;
      let avance = (e.arriba ? 1 : 0) - (e.abajo ? 1 : 0), lado = 0;
      if (!avance) lado = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!avance && !lado && e.puntero.abajo) {                           // dedo: por encima avanza, por debajo retrocede, a la altura anda hacia él
        const wx = (e.puntero.x - d.ox) / d.K, wy = e.puntero.y / d.K + (camara || 0);
        if (wy < jug.y - 26) avance = 1; else if (wy > jug.y + 8) avance = -1; else if (Math.abs(wx - jug.x) > 8) lado = Math.sign(wx - jug.x);
      }
      // ← →: avanza si el tramo siguiente va hacia ese lado; si no, retrocede si el anterior venía de él
      if (lado) {
        const delante = TRAMOS.find((t) => s >= t.ini && s < t.fin), detras = TRAMOS.find((t) => s > t.ini && s <= t.fin);
        if (delante && delante.dx === lado) avance = 1;
        else if (detras && detras.dx === -lado) avance = -1;
      }
      if (avance) {
        // no se salta una esquina en un solo paso: se para en ella y en el siguiente decide
        const t = avance > 0 ? TRAMOS.find((q) => s >= q.ini && s < q.fin) : TRAMOS.find((q) => s > q.ini && s <= q.fin);
        if (t) s = Math.max(t.ini, Math.min(t.fin, s + avance * VEL * dt));
      }
      const pt = punto(Math.min(s, total - 0.001));
      if (s >= total) { pt.x = PUNTOS[PUNTOS.length - 1][0]; pt.y = TECHO; }
      if (Math.abs(pt.x - jug.x) > 0.01) jug.dir = Math.sign(pt.x - jug.x);
      jug.andando = !!avance && (Math.abs(pt.x - jug.x) > 0.01 || Math.abs(pt.y - jug.y) > 0.01);
      jug.x = pt.x; jug.y = pt.y;
      if (jug.andando && Math.floor(api.t * 4) !== Math.floor((api.t - dt) * 4)) Sonido.efecto(pt.t.escalera ? 'escalera' : 'paso');
      // los vecinos saludan cuando pasa por su planta
      for (const v of VECINOS) {
        if (!v.saludado && Math.abs(jug.y - FY(v.p)) < 1 && Math.abs(jug.x - v.x) < 40) {
          v.saludado = true; v.t = 4; saludados++;
          Sonido.efecto(v.gato ? 'miau' : 'pareja');
        }
      }
      if (s >= total) { final = 0.001; Sonido.efecto('completar'); }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const PAPELES = [['#e8d4b0', '#dcc39a'], ['#c9d8c0', '#b7c9ad'], ['#e0c4c4', '#d1aeae'], ['#cfd2e6', '#bcc0da'], ['#e6dcb8', '#d6c99c'], ['#d8c8e0', '#c6b2d2']];

    function estrella(ctx, x, y, k, t) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
      r(ctx, C.oro, -1, -7, 3, 15); r(ctx, C.oro, -7, -1, 15, 3); r(ctx, C.oro, -3, -3, 7, 7); r(ctx, C.oro, -5, 3, 3, 3); r(ctx, C.oro, 3, 3, 3, 3);
      r(ctx, C.oroClaro, -1, -6, 1, 6); r(ctx, C.oroClaro, -6, -1, 6, 1);
      if (Math.floor(t * 4) % 2) { r(ctx, C.blanco, 0, -10, 1, 2); r(ctx, C.blanco, 9, 0, 2, 1); r(ctx, C.blanco, -10, 0, 2, 1); }
      ctx.restore();
    }

    function puerta(ctx, x, y, abierta) {                                  // (x, y) = centro abajo
      r(ctx, C.tinta, x - 10, y - 32, 20, 32);
      if (abierta) { r(ctx, '#ffe9a8', x - 9, y - 31, 18, 31); r(ctx, '#ffd36b', x - 9, y - 10, 18, 10); r(ctx, C.madera, x + 5, y - 31, 4, 31); }
      else {
        r(ctx, C.madera, x - 9, y - 31, 18, 31); r(ctx, C.maderaOsc, x - 6, y - 27, 12, 10); r(ctx, C.maderaOsc, x - 6, y - 14, 12, 10);
        r(ctx, C.oro, x + 5, y - 15, 2, 2);
        r(ctx, C.verdeOsc, x - 4, y - 29, 8, 6); r(ctx, C.verde, x - 3, y - 28, 6, 4); r(ctx, C.rojo, x - 1, y - 24, 2, 2);
      }
    }

    function vecino(ctx, v, t) {
      const x = Math.round(v.x), y = FY(v.p), k = v.nino ? 0.8 : 1;
      const mira = Math.sign(jug.x - x) || 1, saluda = v.t > 0 && Math.floor(t * 5) % 2 === 0;
      ctx.save(); ctx.translate(x, y); ctx.scale(k * mira, k);
      r(ctx, '#2b1a14', -4, -6, 3, 6); r(ctx, '#2b1a14', 1, -6, 3, 6);                      // piernas
      r(ctx, v.ropa, -5, -16, 10, 11); r(ctx, C.tinta, -5, -6, 10, 1);                          // cuerpo
      if (v.abuela) r(ctx, v.ropa, -6, -8, 12, 3);                                              // falda
      r(ctx, v.ropa, -7, -15, 2, 7);                                                             // brazo de atrás
      if (v.t > 0) r(ctx, v.ropa, 5, saluda ? -26 : -23, 2, 9); else r(ctx, v.ropa, 5, -15, 2, 7); // brazo de saludar
      if (v.t > 0) r(ctx, C.piel, 5, saluda ? -28 : -25, 2, 2);
      r(ctx, C.piel, -4, -24, 8, 8);                                                             // cabeza
      r(ctx, v.pelo, -4, -25, 8, 3); r(ctx, v.pelo, -4, -22, 2, 3);
      if (v.abuela) { r(ctx, v.pelo, -2, -28, 5, 3); r(ctx, C.tinta, 0, -21, 4, 1); }           // moño y gafas
      if (v.barba) r(ctx, C.blanco, -1, -19, 5, 4);
      if (v.gorro) { r(ctx, C.rojo, -4, -29, 8, 4); r(ctx, C.rojo, 2, -31, 3, 3); r(ctx, C.blanco, -5, -26, 10, 2); r(ctx, C.blanco, 4, -32, 2, 2); }
      r(ctx, C.tinta, 1, -21, 1, 1); r(ctx, C.tinta, 3, -21, 1, 1);
      if (v.t > 0) r(ctx, '#e88a8a', 1, -18, 3, 1);                                               // sonrisa
      ctx.restore();
      if (v.gato) {                                                                               // el gato del día 8, a sus pies
        const gx = x - mira * 14;
        r(ctx, '#3a3a44', gx - 5, y - 6, 9, 5); r(ctx, '#3a3a44', gx + 2 * mira - 1, y - 10, 5, 5);
        r(ctx, '#3a3a44', gx + 2 * mira - 1, y - 11, 1, 1); r(ctx, '#3a3a44', gx + 2 * mira + 3, y - 11, 1, 1);
        r(ctx, C.oroClaro, gx + 2 * mira, y - 9, 1, 1); r(ctx, C.oroClaro, gx + 2 * mira + 2, y - 9, 1, 1);
        r(ctx, '#3a3a44', gx - 5 * mira - (mira < 0 ? 1 : 0), y - 10 + (Math.floor(t * 2) % 2), 1, 5);
      }
      if (v.saludado && v.t <= 0) {                                                               // corazón: ya la ha saludado
        const hy = y - 32 - Math.floor(t * 2) % 2;
        r(ctx, C.rojoClaro, x - 3, hy, 2, 2); r(ctx, C.rojoClaro, x + 1, hy, 2, 2); r(ctx, C.rojoClaro, x - 3, hy + 1, 6, 2); r(ctx, C.rojoClaro, x - 2, hy + 3, 4, 1); r(ctx, C.rojoClaro, x - 1, hy + 4, 2, 1);
      }
    }

    function escalera(ctx, q) {                                            // tramo de escalera (en segundo plano)
      const n = 8, paso = (q.x1 - q.x0) / n, sube = (q.y0 - q.y1) / n;
      for (let i = 0; i < n; i++) {
        const x = paso > 0 ? q.x0 + i * paso : q.x0 + (i + 1) * paso, y = q.y0 - (i + 1) * sube;
        r(ctx, '#5c3e2a', x, y, Math.abs(paso) + 1, q.y0 - y);
        r(ctx, '#a9763f', x, y, Math.abs(paso) + 1, 2);
        r(ctx, '#7a5236', x, y + 2, Math.abs(paso) + 1, 1);
      }
      // barandilla
      ctx.strokeStyle = '#2b1a14'; ctx.lineWidth = 1;
      for (let i = 0; i <= n; i += 2) r(ctx, '#3a2a20', q.x0 + i * paso, q.y0 - i * sube - 14, 1, 14);
      ctx.beginPath(); ctx.moveTo(q.x0, q.y0 - 14.5); ctx.lineTo(q.x1, q.y1 - 14.5); ctx.strokeStyle = '#6b3f23'; ctx.stroke();
    }

    function edificio(ctx, t) {
      // plantas: papel pintado con rayas, rodapié, guirnalda y lámpara
      for (let p = 0; p < PISOS; p++) {
        const y0 = FY(p + 1), y1 = FY(p), [c1, c2] = PAPELES[p];
        r(ctx, c1, 10, y0, W - 20, y1 - y0);
        for (let x = 14; x < W - 10; x += 8) r(ctx, c2, x, y0, 3, y1 - y0);
        r(ctx, '#7a5a40', 10, y1 - 4, W - 20, 4);
        for (let x = 16; x < W - 12; x += 10) {                           // guirnalda con luces
          r(ctx, C.verdeOsc, x, y0 + 6 + ((x / 10) % 2), 10, 2);
          if ((Math.floor(t * 2) + x / 10) % 3 === 0) r(ctx, [C.rojoClaro, C.oroClaro, C.hielo2][(x / 10) % 3], x + 4, y0 + 8, 2, 2);
        }
        const lx = p % 2 === 0 ? 70 : 250;                                // lámpara de techo
        r(ctx, '#3a3a44', lx, y0 + 5, 1, 6); r(ctx, C.oroClaro, lx - 3, y0 + 11, 7, 3);
        Sprites.tramar(ctx, lx - 14, y0 + 14, 29, 18, '#fff4c8', (x, y) => 0.24 - (y - y0 - 14) * 0.013 - Math.abs(x - lx) * 0.008);
        // ventana con nieve en el lado de las puertas
        const vx = p % 2 === 0 ? 30 : 266;
        r(ctx, C.tinta, vx - 1, y0 + 17, 22, 18); r(ctx, C.noche, vx, y0 + 18, 20, 16);
        for (let k = 0; k < 4; k++) r(ctx, C.nieve, vx + (k * 7 + Math.floor(t * 9)) % 20, y0 + 18 + (k * 5 + Math.floor(t * 14)) % 16, 1, 1);
        r(ctx, '#b9b2a6', vx + 9, y0 + 18, 2, 16); r(ctx, '#b9b2a6', vx, y0 + 25, 20, 2);
      }
      for (const q of ESCALERAS) escalera(ctx, q);
      // puertas (la del vecino, abierta) y el número de la planta
      for (const v of VECINOS) {
        const y = FY(v.p), otra = v.p % 2 === 0 ? 90 : 230;
        puerta(ctx, otra, y - 4, false); puerta(ctx, v.puerta, y - 4, true);
        const px = v.p % 2 === 0 ? 300 : 20;
        r(ctx, C.tinta, px - 6, FY(v.p + 1) + 14, 12, 11); r(ctx, C.crema, px - 5, FY(v.p + 1) + 15, 10, 9);
        texto(ctx, String(v.p), px, FY(v.p + 1) + 16, C.rojoOsc, { centro: true });
      }
      // forjados entre plantas y sótano
      for (let p = 1; p < PISOS; p++) { r(ctx, '#8c857b', 10, FY(p), W - 20, 4); r(ctx, '#b9b2a6', 10, FY(p), W - 20, 1); }
      r(ctx, '#8c857b', 10, FY(0), W - 20, 5); r(ctx, '#b9b2a6', 10, FY(0), W - 20, 1);
      r(ctx, '#3a2622', 10, FY(0) + 5, W - 20, MUNDO_ALTO - FY(0) - 5);
      // muros de ladrillo a los lados
      for (const mx of [0, W - 10]) {
        r(ctx, '#7a2e24', mx, TECHO, 10, MUNDO_ALTO - TECHO);
        for (let y = TECHO; y < MUNDO_ALTO; y += 4) for (let x = mx + ((y / 4) % 2 ? 0 : 2); x < mx + 10; x += 5) r(ctx, '#5e2620', x, y + 3, 4, 1);
      }
      // tejado nevado, chimenea y luces
      r(ctx, '#5e2620', 0, TECHO, W, 6); r(ctx, C.nieve, -2, TECHO - 2, W + 4, 3); r(ctx, C.nieve2, -2, TECHO + 1, W + 4, 1);
      for (let x = 2; x < W; x += 9) r(ctx, C.nieve, x, TECHO + 2, 2, 2 + (x % 3));
      r(ctx, '#7a2e24', 262, TECHO - 22, 14, 20); r(ctx, C.nieve, 260, TECHO - 24, 18, 3);
      Sprites.humo(ctx, 269, TECHO - 26, t);
      for (let x = 6; x < W; x += 12) if ((Math.floor(t * 3) + x / 12) % 2) r(ctx, [C.rojoClaro, C.oroClaro, C.hielo2, C.verde][(x / 12) % 4], x, TECHO + 7, 2, 2);
      // trampilla por la que sale la escalera al tejado
      r(ctx, '#3a2a20', 32, TECHO - 1, 26, 2);
    }

    function bocadillo(ctx, cadena, cx, pie, e, ancho, alto) {             // en coordenadas de pantalla; pie = punta abajo
      const lineas = Comun.envolver(cadena, Math.min(ancho - 24, 70 * e * 2.4), e);
      const lh = Comun.altoTexto(e) + 3 * e, w = Math.max(...lineas.map((l) => Comun.medir(l, e))) + 10 * e / 1.5, h = lineas.length * lh + 6;
      const x = Math.max(6, Math.min(ancho - 6 - w, Math.round(cx - w / 2))), y = Math.max(4, Math.min(alto - h - 4, Math.round(pie - h - 4)));
      r(ctx, C.tinta, x - 1, y - 1, w + 2, h + 2); r(ctx, C.blanco, x, y, w, h);
      r(ctx, C.blanco, Math.round(cx) - 2, y + h, 5, 3); r(ctx, C.tinta, Math.round(cx) - 3, y + h, 1, 3); r(ctx, C.tinta, Math.round(cx) + 3, y + h, 1, 3);
      lineas.forEach((l, i) => texto(ctx, l, x + Math.round(w / 2), y + 4 + i * lh, '#2b1a14', { escala: e, centro: true }));
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      const objetivo = Math.max(Math.min(0, MUNDO_ALTO - d.H), Math.min(MUNDO_ALTO - d.H, Math.round(jug.y - d.H * 0.58)));
      camara = camara === null ? objetivo : camara + (objetivo - camara) * 0.1;
      const cam = Math.round(camara);
      ctx.save(); ctx.scale(d.K, d.K);
      const Wv = Math.floor(api.ancho / d.K), ox = Math.floor((Wv - W) / 2);
      r(ctx, C.nieve, 0, FY(0) - cam, Wv, 1); r(ctx, C.nieve2, 0, FY(0) + 1 - cam, Wv, d.H);   // calle nevada
      ctx.translate(ox, -cam);
      edificio(ctx, t);
      for (const v of VECINOS) vecino(ctx, v, t);
      if (final > 0) {
        estrella(ctx, ESTRELLA_X, TECHO - 30, 2, t);
        for (let k = 0; k < 14; k++) if ((Math.floor(t * 6) + k) % 3 === 0) r(ctx, C.oroClaro, ESTRELLA_X - 70 + (k * 37) % 140, TECHO - 64 + (k * 23) % 44, 2, 2);
      } else if (Math.floor(t * 2) % 2) r(ctx, C.oroClaro, ESTRELLA_X - 1, TECHO - 5, 3, 3);
      Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y), jug.dir, jug.andando ? 'andar' : 'idle', t);
      if (final === 0) estrella(ctx, jug.x + jug.dir * 3, jug.y - 30, 1, t);
      ctx.restore();

      // bocadillos de los vecinos, en pantalla para que se lean bien
      const e = api.textoEscala, aPantalla = (x, y) => [(x + ox) * d.K, (y - cam) * d.K];
      for (const v of VECINOS) if (v.t > 0) {
        const [sx, sy] = aPantalla(v.x, FY(v.p) - (v.gorro ? 34 : 30));
        bocadillo(ctx, SALUDOS[v.p], sx, sy, e, api.ancho, api.alto);
      }
      if (final > 0) {
        const em = Comun.medir('¡ESTRELLA COLOCADA!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡ESTRELLA COLOCADA!', Math.floor(api.ancho / 2), Math.floor(api.alto * 0.42), C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const planta = Math.min(PISOS, Math.max(0, Math.floor((FY(0) - jug.y + 2) / AP)));
      const t1 = planta >= PISOS ? 'TEJADO' : `PLANTA ${planta}`, t2 = `VECINOS ${saludados}/${PISOS}`;
      const w1 = Comun.medir(t1, e) + 8, w2 = Comun.medir(t2, e) + 8, hc = Comun.altoTexto(e) + 8;
      const enFila = 6 + w1 + 10 + w2 <= api.ancho - api.margenDerecho;
      Comun.caja(ctx, 6, 6, w1, hc); texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const x2 = enFila ? 6 + w1 + 10 : 6, y2 = enFila ? 6 : 6 + hc + 8;
      Comun.caja(ctx, x2, y2, w2, hc); texto(ctx, t2, x2 + 4, y2 + 4, C.nieve, { escala: e });
    }

    // Solo en modo debug: estado del camino para las pruebas automáticas
    if (Dias.debug) window.estrellaDebug = () => {
      const delante = TRAMOS.find((q) => s >= q.ini && s < q.fin);
      return { final: final > 0, s, total, x: jug.x, y: jug.y, saludados, haciaDelante: delante ? delante.dx : 0, saludando: VECINOS.filter((v) => v.t > 0).length };
    };

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'LA ESTRELLA DEL TEJADO',
      instruccion: 'SUBE POR LAS ESCALERAS DEL EDIFICIO HASTA EL TEJADO Y COLOCA LA ESTRELLA. LOS VECINOS TE SALUDARÁN AL PASAR. ← → PARA ANDAR, ↑ PARA SEGUIR SUBIENDO.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'estrella',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, disposicion(api)),
      dibujar
    });
  }
};
