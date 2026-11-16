'use strict';
/* Edificio de ladrillo: geometría, prerender de la parte estática y dibujo de las puertas. */
const Edificio = (() => {
  const ANCHO = 320, ALTO = 240;
  const PLANTAS = 6, ALTO_PLANTA = 48, TEJADO = 14, SUELO = 14, CIELO = 100;
  const MUNDO_ALTO = CIELO + TEJADO + PLANTAS * ALTO_PLANTA + SUELO;   // 416
  const X0 = 36, CELDA = 56, COLUMNAS = 4, X1 = X0 + CELDA * COLUMNAS; // 36..260
  const X_ESCALERA = 290, X_MIN = 44, X_MAX = 308;
  const PUERTA_W = 20, PUERTA_H = 30;

  const sueloY = (planta) => MUNDO_ALTO - SUELO - planta * ALTO_PLANTA;

  // Día 1 abajo a la izquierda, día 24 arriba a la derecha.
  function puerta(n) {
    const i = n - 1;
    const planta = Math.floor(i / COLUMNAS);
    return { n, planta, cx: X0 + (i % COLUMNAS) * CELDA + CELDA / 2, y: sueloY(planta) };
  }

  const azar = (a, b) => {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  /* ---------- Parte estática (se dibuja una vez) ---------- */
  let fondo = null;

  function crearFondo() {
    const cv = document.createElement('canvas');
    cv.width = ANCHO; cv.height = MUNDO_ALTO;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

    const yTop = sueloY(PLANTAS - 1) - ALTO_PLANTA;   // parte alta de la pared
    const yBase = sueloY(0);

    // Ladrillos
    R('#6e2c24', X0, yTop, X1 - X0, yBase - yTop);
    const tonos = ['#a2432f', '#9a3d2b', '#ad4b35', '#8f382a'];
    for (let fila = 0, y = yTop; y < yBase; fila++, y += 4) {
      const desfase = (fila % 2) * 4;
      for (let x = X0 - desfase; x < X1; x += 8) {
        const bx = Math.max(x, X0), bw = Math.min(x + 7, X1) - bx;
        if (bw > 0) R(tonos[Math.floor(azar(x, y) * tonos.length)], bx, y, bw, 3);
      }
    }
    // Pilastras y cornisa
    R('#b9b2a6', X0 - 2, yTop, 3, yBase - yTop);
    R('#b9b2a6', X1 - 1, yTop, 3, yBase - yTop);
    R('#8c857b', X0, yTop, 1, yBase - yTop);
    R('#cfc8bd', X0 - 4, yTop - 1, X1 - X0 + 8, 3);

    // Ventanas iluminadas entre puertas
    for (let p = 0; p < PLANTAS; p++) {
      for (let k = 1; k < COLUMNAS; k++) {
        const wx = X0 + k * CELDA - 6, wy = sueloY(p) - 30;
        const v = azar(k, p + 7);
        const [alto, bajo] = v < 0.18 ? ['#9fd0ff', '#5a8fe0']      // tele encendida
          : v < 0.30 ? ['#c98a3a', '#a86a2a']                         // luz tenue
          : ['#ffe08a', '#f0a93a'];
        R('#3b2622', wx - 1, wy - 1, 14, 15);
        R(alto, wx, wy, 12, 6);
        R(bajo, wx, wy + 6, 12, 7);
        if (azar(p, k + 21) > 0.6) R('#3b2622', wx + 2, wy + 8, 3, 5);   // maceta / silueta
        R('#3b2622', wx + 5, wy, 2, 13);
        R('#3b2622', wx, wy + 6, 12, 1);
        R('#cfc8bd', wx - 2, wy + 14, 16, 2);
        R('#ffffff', wx - 2, wy + 13, 16, 1);
      }
    }

    // Forjados (suelo de cada planta)
    for (let p = 0; p < PLANTAS; p++) {
      const y = sueloY(p);
      R('#cfc8bd', X0 - 4, y, X1 - X0 + 8, 3);
      R('#f4efe6', X0 - 4, y, X1 - X0 + 8, 1);
      R('#8c857b', X0 - 4, y + 2, X1 - X0 + 8, 1);
    }

    // Pasarelas metálicas, barandilla y escalera
    const xp = X1 + 4, xf = 314;
    const lx0 = X_ESCALERA - 6, lx1 = X_ESCALERA + 5;
    const yAltoEsc = sueloY(PLANTAS - 1) - 14;
    for (let p = 0; p < PLANTAS; p++) {
      const y = sueloY(p);
      R('#59607a', xp, y, xf - xp, 3);
      R('#8890ac', xp, y, xf - xp, 1);
      R('#f4f8ff', xp, y - 1, xf - xp, 1);
      R('#59607a', xp, y - 11, xf - xp, 1);
      for (let x = xp + 2; x < xf; x += 10)
        if (x < lx0 - 1 || x > lx1 + 1) R('#59607a', x, y - 11, 1, 11);
    }
    R('#59607a', 312, yAltoEsc, 2, yBase - yAltoEsc);
    R('#8a92b0', lx0, yAltoEsc, 1, yBase - yAltoEsc);
    R('#8a92b0', lx1, yAltoEsc, 1, yBase - yAltoEsc);
    for (let y = yAltoEsc + 3; y < yBase; y += 4) R('#6a7190', lx0, y, lx1 - lx0 + 1, 1);

    // Tejado nevado
    const rx = X0 - 6, rw = X1 - X0 + 12;
    R('#4a3238', rx, CIELO + 4, rw, 10);
    for (let y = CIELO + 6; y < CIELO + 14; y += 3) R('#3a2630', rx, y, rw, 1);
    for (let x = rx; x < rx + rw; x += 6) R('#5a4048', x, CIELO + 8, 3, 1);
    for (const cx of [70, 214]) {      // chimeneas
      R('#7a3a2c', cx, CIELO - 12, 8, 16);
      for (let y = CIELO - 10; y < CIELO + 4; y += 4) R('#5e2a22', cx, y, 8, 1);
      R('#cfc8bd', cx - 1, CIELO - 14, 10, 3);
      R('#ffffff', cx - 1, CIELO - 15, 10, 2);
    }
    R('#f4f8ff', rx, CIELO + 1, rw, 4);
    R('#cfdcf0', rx - 2, CIELO + 4, rw + 4, 2);
    for (let x = rx; x < rx + rw - 6; x += 9) {
      const h = 1 + Math.floor(azar(x, 3) * 3);
      R('#f4f8ff', x + 1, CIELO + 1 - h, 7, h);
    }
    // Carámbanos y luces de la cornisa
    const luces = ['#ff5c5c', '#ffd24a', '#5cd6ff', '#7dff7a'];
    for (let x = X0 - 3, i = 0; x < X1 + 3; x += 6, i++) {
      R(luces[i % 4], x, yTop + 3, 2, 2);
      if (azar(x, 9) > 0.45) R('#cfe4ff', x + 3, yTop + 2, 1, 2 + Math.floor(azar(x, 5) * 4));
    }

    // Suelo nevado y abetos
    R('#f4f8ff', 0, yBase, ANCHO, 1);
    R('#dbe5f5', 0, yBase + 1, ANCHO, 7);
    R('#b4c3e0', 0, yBase + 8, ANCHO, SUELO - 8);
    for (let x = 0; x < ANCHO; x += 4) if (azar(x, 1) > 0.5) R('#f4f8ff', x, yBase - 1, 4, 1);
    Sprites.abeto(g, 12, yBase + 8, 44);
    Sprites.abeto(g, 27, yBase + 6, 30);
    return cv;
  }

  function dibujarEdificio(ctx, camY) {
    if (!fondo) fondo = crearFondo();
    ctx.drawImage(fondo, 0, camY, ANCHO, ALTO, 0, 0, ANCHO, ALTO);
  }

  /* ---------- Puertas (dinámicas) ---------- */
  // estado: 'bloqueada' | 'disponible' | 'abierta'
  function dibujarPuerta(ctx, n, estado, camY, t, sacudida) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const d = puerta(n);
    const sx = sacudida ? Math.round(Math.sin(t * 60) * 1.5) : 0;
    const x = d.cx - PUERTA_W / 2 + sx;
    const suelo = d.y - camY;
    const y = suelo - PUERTA_H;
    if (suelo < -8 || y > ALTO + 8) return;

    if (estado === 'disponible') {                       // resplandor
      ctx.globalAlpha = 0.14 + 0.10 * Math.sin(t * 3 + n);
      R('#ffe08a', x - 7, y - 7, PUERTA_W + 14, PUERTA_H + 9);
      ctx.globalAlpha = 0.18 + 0.10 * Math.sin(t * 3 + n);
      R('#ffe08a', x - 4, y - 4, PUERTA_W + 8, PUERTA_H + 6);
      ctx.globalAlpha = 1;
    }

    // marco con arco recortado
    R('#2b1a14', x - 2, y - 2, PUERTA_W + 4, PUERTA_H + 2);
    R('#2b1a14', x - 1, y - 3, PUERTA_W + 2, 1);

    let colorNum;
    if (estado === 'bloqueada') {
      R('#3a2f45', x, y, PUERTA_W, PUERTA_H);
      for (const [px, py] of [[2, 3], [11, 3], [2, 17], [11, 17]]) R('#2e2538', x + px, y + py, 7, 10);
      R('#3a2f45', x + 6, y + 9, 8, 11);
      Sprites.candado(ctx, x + 7, y + 11);
      colorNum = '#7a6a8f';
    } else if (estado === 'disponible') {
      R('#d89a2f', x, y, PUERTA_W, PUERTA_H);
      for (const [px, py] of [[2, 3], [11, 3], [2, 17], [11, 17]]) R('#f2c455', x + px, y + py, 7, 10);
      R('#fff3b0', x + 16, y + 16, 2, 2);
      R('#fff3b0', x, y, PUERTA_W, 1);
      if (Math.sin(t * 5 + n * 2) > 0.5) { R('#fff', x + 3, y + 5, 1, 1); R('#fff', x + 15, y + 22, 1, 1); }
      else if (Math.sin(t * 5 + n * 2) < -0.5) { R('#fff', x + 16, y + 6, 1, 1); R('#fff', x + 4, y + 20, 1, 1); }
      colorNum = '#fff6c8';
    } else {
      R('#ffe9b0', x, y, PUERTA_W, 8);                   // interior con luz
      R('#ffd27a', x, y + 8, PUERTA_W, 12);
      R('#f0a24a', x, y + 20, PUERTA_W, 10);
      Sprites.abeto(ctx, x + 14, suelo, 14);             // arbolito dentro
      R('#fff27a', x + 14, suelo - 15, 1, 1);
      for (let i = 0; i < 6; i++) {                      // hoja entreabierta
        R(i === 5 ? '#5c3414' : '#8a5222', x + i, y + i, 1, PUERTA_H - 2 * i);
      }
      ctx.globalAlpha = 0.22; R('#ffd27a', x - 2, suelo, PUERTA_W + 4, 2);
      ctx.globalAlpha = 0.10 + 0.04 * Math.sin(t * 2 + n); R('#ffd27a', x - 5, y - 5, PUERTA_W + 10, PUERTA_H + 5);
      ctx.globalAlpha = 1;
      colorNum = '#d9b25a';
    }

    // placa con el número
    const w = Sprites.anchoNumero(n);
    const py = y - 11;
    R('#2b1a14', Math.floor(d.cx - w / 2) - 2 + sx, py - 2, w + 4, 9);
    Sprites.numero(ctx, n, d.cx + sx, py, colorNum);
  }

  function dibujarFlecha(ctx, cx, y, t) {
    const o = Math.round(Math.sin(t * 6));
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 2, y + o, 5, 1);
    ctx.fillRect(cx - 1, y + 1 + o, 3, 1);
    ctx.fillRect(cx, y + 2 + o, 1, 1);
  }

  return {
    ANCHO, ALTO, MUNDO_ALTO, PLANTAS, X0, X1, X_ESCALERA, X_MIN, X_MAX, PUERTA_W,
    sueloY, puerta, dibujarEdificio, dibujarPuerta, dibujarFlecha
  };
})();
