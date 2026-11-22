'use strict';
/* Día 1 — Cajas en equilibrio.
   Primer día en el edificio: la chica sube por la escalera hasta su piso (4.ª planta) con una torre de cajas de la
   mudanza en brazos. Anda sola; la torre se inclina (cada escalón la sacude) y con ← → (o tocando a un lado)
   se mueven los brazos para enderezarla. En cada rellano un vecino le añade otra caja, así que cada piso cuesta
   un poco más. Si la torre se inclina demasiado, las cajas se caen y se vuelve a empezar. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia01-cajas'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const PISOS = 4, ESCALONES = 10, PASO_X = 8, PASO_Y = 6, RELLANO = 44;
    const TRAMO = RELLANO + ESCALONES * PASO_X;                           // ancho de un piso (rellano + escalera)
    const ALTO_PISO = ESCALONES * PASO_Y;
    const CAIDA = 0.7, PELIGRO = 0.36;                                    // ángulos (rad) de caída y de aviso
    const ETIQUETAS = [['#c9a26a', 'LIBROS'], ['#b98d55', 'COCINA'], ['#d2b07a', 'ROPA'], ['#c49a5e', 'FOTOS'], ['#b58a50', 'ADORNOS'], ['#cfa86c', 'TAZAS']];

    let x, ang, vel, mando, cajas, piso, pausa, final, avisoVecino, proxPaso, reloj, caidas;

    function reiniciar() {
      x = 10; ang = 0.02; vel = 0; mando = 0; cajas = 2; piso = 0; pausa = 0; final = 0; avisoVecino = null; reloj = 0; caidas = null;
      proxPaso = RELLANO;
    }

    // Altura del suelo bajo la chica: rellano llano y luego escalones hacia arriba
    function sueloEn(px) {
      const p = Math.floor(px / TRAMO), dentro = px - p * TRAMO;
      const base = -p * ALTO_PISO;
      if (dentro <= RELLANO) return base;
      return base - Math.min(ESCALONES, Math.floor((dentro - RELLANO) / PASO_X) + 1) * PASO_Y;
    }

    function actualizar(dt, api) {
      reloj += dt;
      if (avisoVecino) { avisoVecino.vida -= dt; if (avisoVecino.vida <= 0) avisoVecino = null; }
      if (caidas) {                                                        // las cajas por el suelo; luego se pierde
        for (const c of caidas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; c.giro += c.vg * dt; }
        if (reloj - caidas.t > 1.2) api.perder('¡SE TE HAN CAÍDO LAS CAJAS! OTRA VEZ, CON CUIDADO');
        return;
      }
      if (final > 0) { final += dt; if (final > 1.8) api.ganar(); return; }

      // mando: flechas o tocar a un lado de la pantalla (con un poco de suavidad)
      const e = api.entrada;
      let u = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!u && e.puntero.abajo) u = e.puntero.x < api.ancho / 2 ? -1 : 1;
      mando += (u - mando) * Math.min(1, dt * 10);

      // péndulo invertido: la torre tiende a caerse hacia donde está inclinada; los brazos la corrigen
      const A = 1.7 + 0.18 * (cajas - 2), B = 2.3;                         // más cajas, más inestable
      vel += (A * Math.sin(ang) - B * mando) * dt;
      if (pausa <= 0) vel += Math.sin(reloj * 5.3) * (0.1 + piso * 0.15) * dt;   // vaivén al andar
      vel *= Math.exp(-0.5 * dt);
      ang += vel * dt;

      // anda sola (más deprisa en cada piso); en los rellanos se para un momento a recibir otra caja
      if (pausa > 0) { pausa -= dt; }
      else {
        x += (34 + piso * 6) * dt;
        if (x >= proxPaso) {                                              // cada escalón da un meneo
          proxPaso += PASO_X;
          const dentro = x - Math.floor(x / TRAMO) * TRAMO;
          if (dentro > RELLANO - 1) { vel += (Math.random() * 2 - 1) * (0.06 + piso * 0.08) + Math.sign(ang || 1) * 0.02; Sonido.efecto('paso'); }
        }
        const nuevo = Math.floor(x / TRAMO);
        if (nuevo > piso) {
          piso = nuevo;
          proxPaso = piso * TRAMO + RELLANO;
          if (piso >= PISOS) { final = 0.001; Sonido.efecto('completar'); return; }
          cajas++; pausa = 0.9; vel += (Math.random() < 0.5 ? -1 : 1) * 0.22;
          avisoVecino = { txt: ['¡TOMA, QUE TE DEJABAS ESTA!', '¡OTRA MÁS, VECINA!', '¡ÁNIMO, QUE YA QUEDA POCO!'][(piso - 1) % 3], vida: 1.6 };
          Sonido.efecto('coger');
        }
      }
      if (Math.abs(ang) > CAIDA) {                                         // se caen
        Sonido.efecto('derrumbe'); api.sacudir(0.4);
        caidas = Array.from({ length: cajas }, (_, i) => ({ x: x + Math.sin(ang) * (12 + i * 11), y: sueloEn(x) - 24 - i * 11, vx: Math.sign(ang) * (40 + i * 25) + (Math.random() * 30 - 15), vy: -40 - Math.random() * 40, giro: ang, vg: Math.sign(ang) * (3 + Math.random() * 4), i }));
        caidas.t = reloj;
      }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };

    function caja(ctx, i, w, h) {                                          // caja de cartón con cinta y etiqueta (centrada abajo)
      const [col, etiqueta] = ETIQUETAS[i % ETIQUETAS.length];
      r(ctx, '#5c3e2a', -w / 2 - 1, -h - 1, w + 2, h + 2); r(ctx, col, -w / 2, -h, w, h);
      r(ctx, '#e8dcc0', -1, -h, 2, h); r(ctx, 'rgba(0,0,0,0.12)', w / 2 - 3, -h, 3, h);
      r(ctx, C.crema, -w / 2 + 2, -h + 2, 5, 3); r(ctx, '#2b1a14', -w / 2 + 3, -h + 3, 3, 1);
      void etiqueta;
    }

    function dibujar(ctx, api) {
      const t = api.t, e = api.textoEscala;
      const K = Math.max(1, Math.floor(Math.min(api.ancho / 240, api.alto / 150)));
      const W = api.ancho / K, H = api.alto / K;
      const sy = sueloEn(x), camX = x - W * 0.45, camY = sy - H * 0.68;
      ctx.fillStyle = '#2a2238'; ctx.fillRect(0, 0, api.ancho, api.alto);
      ctx.save(); ctx.scale(K, K); ctx.translate(-Math.round(camX), -Math.round(camY));
      // pared con papel pintado de rayas y zócalo, por pisos
      const p0 = Math.max(0, Math.floor(camX / TRAMO) - 1), p1 = Math.floor((camX + W) / TRAMO) + 1;
      for (let p = p0; p <= p1; p++) {
        const bx = p * TRAMO, by = -p * ALTO_PISO;
        const col = ['#e8d4b0', '#c9d8c0', '#e0c4c4', '#cfd2e6', '#e6dcb8'][p % 5], col2 = ['#dcc39a', '#b7c9ad', '#d1aeae', '#bcc0da', '#d6c99c'][p % 5];
        r(ctx, col, bx, by - 600, TRAMO, 660);
        for (let k = 4; k < TRAMO; k += 10) r(ctx, col2, bx + k, by - 600, 3, 660);
        // número de la planta en el rellano y una puerta de vecino
        if (p > 0 && p <= PISOS) {
          const px = bx + 6;
          r(ctx, C.tinta, px - 1, by - 33, 22, 34); r(ctx, p === PISOS ? C.rojo : C.madera, px, by - 32, 20, 32);
          r(ctx, C.maderaOsc, px + 3, by - 28, 14, 10); r(ctx, C.oro, px + 15, by - 15, 2, 2);
          if (p === PISOS) { r(ctx, C.verdeOsc, px + 6, by - 30, 8, 7); r(ctx, C.verde, px + 7, by - 29, 6, 5); r(ctx, C.rojoClaro, px + 9, by - 25, 2, 2); }
          r(ctx, C.tinta, bx + 30, by - 44, 12, 10); r(ctx, C.crema, bx + 31, by - 43, 10, 8);
          texto(ctx, String(p), bx + 36, by - 42, C.rojoOsc, { centro: true });
        }
        // lámpara
        r(ctx, '#3a3a44', bx + 70, by - 130, 1, 10); r(ctx, C.oroClaro, bx + 67, by - 120, 7, 3);
        // escalones (macizos hasta abajo) y rellano
        r(ctx, '#7a5a40', bx, by, RELLANO, 200); r(ctx, '#a9763f', bx, by, RELLANO, 2);
        for (let k = 0; k < ESCALONES; k++) {
          const ex = bx + RELLANO + k * PASO_X, ey = by - (k + 1) * PASO_Y;
          r(ctx, '#6b4a33', ex, ey, PASO_X + 1, 200); r(ctx, '#b07a44', ex, ey, PASO_X + 1, 2);
        }
        // barandilla
        for (let k = 0; k <= ESCALONES; k += 2) r(ctx, '#3a2a20', bx + RELLANO + k * PASO_X, by - k * PASO_Y - 20, 1, 20);
        ctx.strokeStyle = '#6b3f23'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + RELLANO, by - 20.5); ctx.lineTo(bx + TRAMO, by - ALTO_PISO - 20.5); ctx.stroke();
      }
      // la chica y su torre de cajas
      const modo = pausa > 0 || final > 0 || caidas ? 'idle' : 'andar';
      Sprites.personaje(ctx, Math.round(x), Math.round(sy), 1, modo, t);
      if (!caidas) {
        ctx.save(); ctx.translate(Math.round(x + 1 + mando * 2), Math.round(sy - 24)); ctx.rotate(ang);   // en alto, sobre la cabeza
        let y = 0;
        for (let i = 0; i < cajas; i++) { ctx.save(); ctx.translate((i % 2 ? 1 : -1) * 1, y); caja(ctx, i, 16 - (i % 3) * 2, 10); ctx.restore(); y -= 11; }
        ctx.restore();
        // manos sujetando la de abajo
        r(ctx, C.abrigoOsc || '#9c2630', x - 6 + mando * 2, sy - 22, 2, 8); r(ctx, '#9c2630', x + 7 + mando * 2, sy - 22, 2, 8);   // brazos en alto
        r(ctx, C.verde, x - 6 + mando * 2, sy - 25, 2, 3); r(ctx, C.verde, x + 7 + mando * 2, sy - 25, 2, 3);
      } else for (const c of caidas) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.giro); caja(ctx, c.i, 14, 10); ctx.restore(); }
      // vecino que asoma por la puerta del rellano para dar la caja
      if (avisoVecino) {
        const bx = piso * TRAMO + 16, by = -piso * ALTO_PISO;
        r(ctx, '#4a7ad8', bx - 3, by - 14, 7, 8); r(ctx, C.piel, bx - 2, by - 19, 5, 5); r(ctx, '#6b3f23', bx - 2, by - 20, 5, 2);
      }
      ctx.restore();

      // bocadillo del vecino (en varias líneas si no cabe)
      if (avisoVecino) {
        const lineas = Comun.envolver(avisoVecino.txt, api.ancho - 36, e), lh = Comun.altoTexto(e) + 3 * e;
        const w = Math.max(...lineas.map((l) => Comun.medir(l, e))) + 12, h = lineas.length * lh + 7;
        const bx = Math.max(6, Math.min(api.ancho - w - 6, Math.round((piso * TRAMO + 16 - camX) * K - w / 2)));
        const by = Math.max(40, Math.round((-piso * ALTO_PISO - 24 - 11 * cajas - 18 - camY) * K - h));
        r(ctx, C.tinta, bx - 1, by - 1, w + 2, h + 2); r(ctx, C.blanco, bx, by, w, h);
        lineas.forEach((l, k) => texto(ctx, l, bx + 6, by + 5 + k * lh, '#2b1a14', { escala: e }));
      }
      // nivel de burbuja: cuánto se inclina la torre
      const nw = Math.min(api.ancho - 24, 160 * e), nh = 6 * e, nx = Math.floor((api.ancho - nw) / 2), ny = 6;
      Comun.caja(ctx, nx, ny, nw, nh);
      r(ctx, '#2c6e48', nx + nw / 2 - (PELIGRO / CAIDA) * nw / 2, ny, (PELIGRO / CAIDA) * nw, nh);
      const bxp = nx + nw / 2 + Math.max(-1, Math.min(1, ang / CAIDA)) * (nw / 2 - 3 * e);
      r(ctx, Math.abs(ang) > PELIGRO ? C.rojoClaro : C.oroClaro, bxp - 3 * e, ny, 6 * e, nh);
      if (Math.abs(ang) > PELIGRO && !caidas && Math.floor(t * 6) % 2) texto(ctx, '¡CUIDADO!', Math.floor(api.ancho / 2), ny + nh + 8, C.rojoClaro, { escala: e, centro: true, sombra: C.tinta });
      const t1 = final > 0 ? '¡EN CASA!' : `PLANTA ${Math.min(piso, PISOS)}/${PISOS} · CAJAS ${cajas}`;
      Comun.caja(ctx, 6, ny + nh + 8 + Comun.altoTexto(e) + 6, Comun.medir(t1, e) + 8, Comun.altoTexto(e) + 8);
      texto(ctx, t1, 10, ny + nh + 8 + Comun.altoTexto(e) + 10, C.oroClaro, { escala: e });
      if (final > 0) {
        const m = '¡BIENVENIDA A CASA!', em = Comun.medir(m, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(m, em) + 12, h = Comun.altoTexto(em) + 12;
        const bx = Math.floor((api.ancho - w) / 2), by = Math.floor(api.alto * 0.35);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, m, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
    }

    // Solo en modo debug: estado para las pruebas automáticas
    if (Dias.debug) window.cajasDebug = () => ({ ang, vel, piso, cajas, final: final > 0, caidas: !!caidas, pausa });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'CAJAS EN EQUILIBRIO',
      instruccion: 'PRIMER DÍA EN EL EDIFICIO: SUBE HASTA TU PISO (4.ª PLANTA) CON LAS CAJAS DE LA MUDANZA. LA TORRE SE TAMBALEA: ENDERÉZALA CON ← → (O TOCANDO A UN LADO). ¡QUE NO SE CAIGAN!',
      pantallaCompleta: true,
      musica: 'mudanza',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
