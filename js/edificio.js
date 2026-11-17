'use strict';
/* Edificio de ladrillo (escena de 320x240): geometría, prerender de la parte estática y puertas. */
const Edificio = (() => {
  const ANCHO = 320, ALTO = 240;
  const PLANTAS = 6, ALTO_PLANTA = 48, TEJADO = 14, SUELO = 14, CIELO = 100;
  const MUNDO_ALTO = CIELO + TEJADO + PLANTAS * ALTO_PLANTA + SUELO;   // 416
  const X0 = 36, CELDA = 56, COLUMNAS = 4, X1 = X0 + CELDA * COLUMNAS; // 36..260
  const X_ESCALERA = 290, X_MIN = 44, X_MAX = 308;
  const PUERTA_W = 20, PUERTA_H = 30;
  const CHIMENEA_X = 74;                                               // centro de la chimenea
  const TOTAL = PLANTAS * COLUMNAS;

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

  // Transiciones tramadas entre los tonos de la nieve del suelo (y = parte alta del suelo).
  function tramaSuelo(ctx, x0, x1, y, alto) {
    if (x1 <= x0 || alto <= 0) return;
    Sprites.tramar(ctx, x0, y + 1, x1 - x0, Math.min(4, alto - 1), '#f4f8ff', (xx, yy) => 1 - (yy - y - 1) / 4);
    if (alto > 6) Sprites.tramar(ctx, x0, y + 6, x1 - x0, Math.min(24, alto - 6), '#8e9ecb', (xx, yy) => ((yy - y - 6) / 24) * 0.9);
  }

  // Halo tramado alrededor de una puerta (20x30 con 12px de margen). Se cachea por color e intensidad.
  const halos = {};
  function halo(color, k) {
    const clave = color + k;
    if (halos[clave]) return halos[clave];
    const [cv, g] = Sprites.lienzoAux(44, 54);
    Sprites.tramar(g, 0, 0, 44, 54, color, (x, y) => {
      const dx = Math.max(12 - x, 0, x - 31), dy = Math.max(12 - y, 0, y - 41);
      return (0.28 + 0.1 * k) * (1 - Math.hypot(dx, dy) / 8);
    });
    return (halos[clave] = cv);
  }

  /* ---------- Parte estática (se dibuja una vez) ---------- */
  let fondo = null;

  function dibujarVentana(g, R, wx, wy, k, p) {
    const v = azar(k, p + 7), v2 = azar(p + 3, k + 21), v3 = azar(k + 5, p + 40);
    const [alto, bajo] = v < 0.16 ? ['#9fd0ff', '#5a8fe0']     // tele encendida
      : v < 0.30 ? ['#d9a04a', '#a86a2a']                        // luz tenue
      : ['#ffe9a0', '#f0a93a'];
    // resplandor tramado sobre el ladrillo
    Sprites.tramar(g, wx - 9, wy - 9, 30, 32, bajo, (x, y) => {
      const dx = Math.max(wx - 1 - x, 0, x - (wx + 12)), dy = Math.max(wy - 1 - y, 0, y - (wy + 14));
      return 0.4 * (1 - Math.hypot(dx, dy) / 8);
    });
    if (v3 > 0.45) {                                           // contraventanas
      for (const sx of [wx - 6, wx + 14]) {
        R('#2f5d47', sx, wy - 1, 4, 15); R('#1f4332', sx + 3, wy - 1, 1, 15);
        for (let y = wy + 1; y < wy + 13; y += 3) R('#1f4332', sx, y, 4, 1);
      }
    }
    R('#cfc8bd', wx - 2, wy - 3, 16, 2);                       // dintel
    R('#3b2622', wx - 1, wy - 1, 14, 15);
    R(alto, wx, wy, 12, 6); R(bajo, wx, wy + 6, 12, 7);
    for (let x = wx; x < wx + 12; x++) if (x % 2 === 0) R(bajo, x, wy + 5, 1, 1);   // trama entre tonos
    if (v2 > 0.3) {                                            // cortinas
      const cort = ['#c8383f', '#f3ecd8', '#3c8a5a', '#7a5aa8'][Math.floor(v2 * 97) % 4];
      R(cort, wx, wy, 12, 1); R(cort, wx, wy, 2, 13); R(cort, wx + 10, wy, 2, 13);
    }
    const tipo = Math.floor(azar(p + 11, k + 2) * 5);
    if (tipo === 0) { R('#8a4a2a', wx + 3, wy + 10, 4, 3); R('#2f7a50', wx + 4, wy + 6, 2, 4); R('#2f7a50', wx + 3, wy + 8, 4, 1); }
    else if (tipo === 1) { R('#2b1a14', wx + 2, wy + 9, 6, 4); R('#2b1a14', wx + 6, wy + 6, 3, 3); R('#2b1a14', wx + 6, wy + 5, 1, 1); R('#2b1a14', wx + 8, wy + 5, 1, 1); }
    else if (tipo === 2) { R('#f4ecd0', wx + 8, wy + 9, 2, 4); R('#ff9a2c', wx + 8, wy + 7, 2, 2); }
    R('#3b2622', wx + 5, wy, 2, 13); R('#3b2622', wx, wy + 6, 12, 1);     // travesaños
    R('#cfc8bd', wx - 2, wy + 14, 16, 2); R('#8c857b', wx - 2, wy + 15, 16, 1);
    R('#f4f8ff', wx - 2, wy + 13, 16, 1);                                 // nieve en el alféizar
  }

  function crearFondo() {
    const [cv, g] = Sprites.lienzoAux(ANCHO, MUNDO_ALTO);
    const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const yTop = sueloY(PLANTAS - 1) - ALTO_PLANTA;   // parte alta de la pared
    const yBase = sueloY(0);
    const anchoPared = X1 - X0;

    // Ladrillos
    R('#5e2620', X0, yTop, anchoPared, yBase - yTop);
    const tonos = [['#a2432f', '#b9573f'], ['#9a3d2b', '#b04f39'], ['#ad4b35', '#c46048'], ['#8f382a', '#a64a37']];
    for (let fila = 0, y = yTop; y < yBase; fila++, y += 4) {
      const desfase = (fila % 2) * 4;
      for (let x = X0 - desfase; x < X1; x += 8) {
        const bx = Math.max(x, X0), bw = Math.min(x + 7, X1) - bx;
        if (bw <= 0) continue;
        const [base, luz] = tonos[Math.floor(azar(x, y) * tonos.length)];
        R(base, bx, y, bw, 3); R(luz, bx, y, bw, 1);
      }
    }
    // Sombreado tramado: el muro se oscurece hacia la derecha y se aclara a la izquierda
    Sprites.tramar(g, X1 - 70, yTop, 70, yBase - yTop, '#4a1830', (x) => ((x - (X1 - 70)) / 70) * 0.75);
    Sprites.tramar(g, X0, yTop, 30, yBase - yTop, '#d0684a', (x) => (1 - (x - X0) / 30) * 0.35);
    // Pilastras y bajante
    for (const px of [X0 - 2, X1 - 1]) { R('#b9b2a6', px, yTop, 3, yBase - yTop); R('#8c857b', px + 2, yTop, 1, yBase - yTop); }
    R('#4a5068', X0 + 5, yTop, 2, yBase - yTop);

    // Ventanas iluminadas entre puertas
    for (let p = 0; p < PLANTAS; p++)
      for (let k = 1; k < COLUMNAS; k++) dibujarVentana(g, R, X0 + k * CELDA - 6, sueloY(p) - 30, k, p);

    // Forjados (suelo de cada planta) con sombra tramada debajo
    for (let p = 0; p < PLANTAS; p++) {
      const y = sueloY(p);
      if (p > 0) Sprites.tramar(g, X0, y + 3, anchoPared, 8, '#2a0c1c', (xx, yy) => (1 - (yy - y - 3) / 8) * 0.85);
      R('#cfc8bd', X0 - 4, y, anchoPared + 8, 3);
      R('#f4efe6', X0 - 4, y, anchoPared + 8, 1);
      R('#8c857b', X0 - 4, y + 2, anchoPared + 8, 1);
    }

    // Pasarelas metálicas, barandilla y escalera de mano
    const xp = X1 + 4, xf = 314;
    const lx0 = X_ESCALERA - 6, lx1 = X_ESCALERA + 5;
    const yAltoEsc = sueloY(PLANTAS - 1) - 14;
    R('#3a4058', 312, yAltoEsc, 2, yBase - yAltoEsc);
    for (let p = 0; p < PLANTAS; p++) {
      const y = sueloY(p);
      R('#59607a', xp, y - 11, xf - xp, 1);
      for (let x = xp + 2; x < xf; x += 10) if (x < lx0 - 1 || x > lx1 + 1) R('#59607a', x, y - 11, 1, 11);
      R('#4a5068', xp, y, xf - xp, 3); R('#8890ac', xp, y, xf - xp, 1);
      for (let x = xp + 1; x < xf - 1; x += 3) R('#2e3348', x, y + 1, 1, 1);
      if (p > 0) for (let i = 0; i < 6; i++) R('#3a4058', xp + i, y + 3 + i, 2, 1);
    }
    R('#8a92b0', lx0, yAltoEsc, 1, yBase - yAltoEsc);
    R('#8a92b0', lx1, yAltoEsc, 1, yBase - yAltoEsc);
    for (let y = yAltoEsc + 3; y < yBase; y += 4) R('#6a7190', lx0 + 1, y, lx1 - lx0 - 1, 1);

    // Tejado de pizarra
    const rx = X0 - 6, rw = anchoPared + 12;
    R('#4a3238', rx, CIELO + 4, rw, 10);
    for (let fila = 0; fila < 3; fila++) {
      const y = CIELO + 5 + fila * 3;
      R('#33222a', rx, y + 2, rw, 1);
      for (let x = rx + (fila % 2) * 3; x < rx + rw; x += 6) R('#33222a', x, y, 1, 2);
    }
    // Chimenea de ladrillo
    const chx = CHIMENEA_X - 5;
    R('#7a3a2c', chx, CIELO - 14, 10, 18);
    for (let y = CIELO - 12, f = 0; y < CIELO + 3; y += 3, f++) {
      R('#5e2a22', chx, y + 2, 10, 1);
      for (let x = chx + (f % 2 ? 2 : 5); x < chx + 10; x += 5) R('#5e2a22', x, y, 1, 2);
    }
    R('#5e2a22', chx + 8, CIELO - 14, 2, 18);
    R('#cfc8bd', chx - 1, CIELO - 16, 12, 3); R('#8c857b', chx - 1, CIELO - 14, 12, 1);
    R('#f4f8ff', chx - 1, CIELO - 18, 12, 2); R('#1d1216', chx + 3, CIELO - 18, 4, 1);
    // Nieve del tejado
    R('#f4f8ff', rx - 1, CIELO + 1, rw + 2, 4);
    R('#c5d3ea', rx - 1, CIELO + 4, rw + 2, 2);
    Sprites.tramar(g, rx - 1, CIELO + 2, rw + 2, 2, '#c5d3ea', (xx, yy) => (yy - CIELO - 1) / 3);
    for (let x = rx; x < rx + rw - 6; x += 9) {
      const h = 1 + Math.floor(azar(x, 3) * 3);
      R('#f4f8ff', x + 1, CIELO + 1 - h, 7, h);
    }
    for (let x = rx; x < rx + rw; x += 5) {
      const a = azar(x, 9);
      if (a > 0.45) R('#f4f8ff', x, CIELO + 6, 3, 1);
      if (a > 0.62) R('#cfe4ff', x + 1, CIELO + 7, 1, 2 + Math.floor(azar(x, 5) * 4));    // carámbanos
    }
    // Cornisa y guirnalda de luces
    R('#cfc8bd', X0 - 4, yTop - 1, anchoPared + 8, 3); R('#8c857b', X0 - 4, yTop + 1, anchoPared + 8, 1);
    const luces = ['#ff5c5c', '#ffd24a', '#5cd6ff', '#7dff7a', '#ff8ad8'];
    for (let x = X0, i = 0; x < X1 - 2; x += 6, i++) {
      const yy = yTop + 3 + (i % 4 === 1 || i % 4 === 2 ? 1 : 0);
      R('#1d1418', x, yy, 6, 1);
      R(luces[i % 5], x + 2, yy + 1, 2, 2);
    }

    // Suelo nevado, abeto y muñeco de nieve
    R('#f4f8ff', 0, yBase, ANCHO, 1);
    R('#dbe5f5', 0, yBase + 1, ANCHO, SUELO - 1);
    tramaSuelo(g, 0, ANCHO, yBase, SUELO);
    for (let x = 0; x < ANCHO; x += 4) if (azar(x, 1) > 0.5) R('#f4f8ff', x, yBase - 1, 4, 1);
    Sprites.abeto(g, 12, yBase + 7, 54);
    Sprites.muneco(g, 27, yBase + 8);
    return cv;
  }

  // Dibuja la escena centrada (desplazada ox) y extiende suelo nevado y abetos por los lados.
  function dibujarEdificio(ctx, camY, W, H, ox) {
    if (!fondo) fondo = crearFondo();
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const yG = sueloY(0) - camY;                    // y en pantalla del suelo
    if (yG < H + 50) {
      R('#f4f8ff', 0, yG, W, 1);
      R('#dbe5f5', 0, yG + 1, W, 29);
      if (H - yG > 30) R('#8e9ecb', 0, yG + 30, W, H - yG - 30);
      tramaSuelo(ctx, 0, ox, yG, H - yG);
      tramaSuelo(ctx, ox + ANCHO, W, yG, H - yG);
      if (H - yG > SUELO) Sprites.tramar(ctx, ox, yG + SUELO, ANCHO, Math.min(16, H - yG - SUELO), '#8e9ecb', (xx, yy) => ((yy - yG - 6) / 24) * 0.9);
      for (let i = 0, x = ox - 14; x > -20; i++) {                    // abetos a la izquierda
        Sprites.abeto(ctx, x, yG + 7, 34 + Math.floor(azar(i, 1) * 30));
        x -= 26 + Math.floor(azar(i, 2) * 18);
      }
      for (let i = 0, x = ox + ANCHO + 14; x < W + 20; i++) {         // y a la derecha
        Sprites.abeto(ctx, x, yG + 7, 34 + Math.floor(azar(i, 3) * 30));
        x += 26 + Math.floor(azar(i, 4) * 18);
      }
    }
    const sy = Math.max(0, camY), dy = sy - camY;
    const alto = Math.min(MUNDO_ALTO - sy, H - dy);
    if (alto > 0) ctx.drawImage(fondo, 0, sy, ANCHO, alto, ox, dy, ANCHO, alto);
  }

  /* ---------- Puertas (dinámicas) ---------- */
  const PANELES = [[2, 3], [11, 3], [2, 17], [11, 17]];

  // Última puerta: envuelta en papel de regalo con cinta y lazo.
  function papelRegalo(R, x, y, apagado) {
    const papel = apagado ? '#b02a48' : '#e8384f', lunar = apagado ? '#f0a8b8' : '#ffe0e6';
    const cinta = apagado ? '#e8bc3c' : '#ffdc5a', cintaOsc = apagado ? '#b88a1e' : '#d49a1c';
    R(papel, x, y, PUERTA_W, PUERTA_H);
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 5; i++) R(lunar, x + 1 + i * 4 + (j % 2) * 2, y + 1 + j * 4, 1, 1);
    R(cinta, x + 8, y, 4, PUERTA_H); R(cintaOsc, x + 11, y, 1, PUERTA_H);
    R(cinta, x, y + 13, PUERTA_W, 4); R(cintaOsc, x, y + 16, PUERTA_W, 1);
    // lazo sobre la puerta
    R(cinta, x + 3, y - 6, 6, 5); R(cinta, x + 11, y - 6, 6, 5);
    R(cintaOsc, x + 4, y - 4, 3, 2); R(cintaOsc, x + 13, y - 4, 3, 2);
    R(cintaOsc, x + 8, y - 5, 4, 5);
    R(cinta, x + 6, y - 1, 2, 4); R(cinta, x + 12, y - 1, 2, 4);
  }

  // Resplandor de la puerta. Se dibuja en una pasada previa para no tapar las placas de otras puertas.
  function dibujarHalo(ctx, n, estado, camY, t) {
    if (estado === 'bloqueada' && n !== TOTAL) return;
    const d = puerta(n);
    const x = d.cx - PUERTA_W / 2 - 12, y = d.y - camY - PUERTA_H - 12;
    const pulso = 0.5 + 0.5 * Math.sin(t * 3 + n);
    if (estado === 'bloqueada') ctx.drawImage(halo('#ff8ad8', Math.round(pulso)), x, y);   // el regalo brilla siempre un poco
    else if (estado === 'disponible') ctx.drawImage(halo(n === TOTAL ? '#ff8ad8' : '#ffd24a', Math.round(pulso * 3)), x, y);
    else ctx.drawImage(halo('#ff8a3c', Math.round(pulso)), x, y);
  }

  // estado: 'bloqueada' | 'disponible' | 'abierta'
  function dibujarPuerta(ctx, n, estado, camY, t, sacudida) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const d = puerta(n);
    const sx = sacudida ? Math.round(Math.sin(t * 60) * 1.5) : 0;
    const x = d.cx - PUERTA_W / 2 + sx;
    const suelo = d.y - camY;
    const y = suelo - PUERTA_H;
    if (suelo < -10 || y > ctx.canvas.height + 20) return;
    const regalo = n === TOTAL;

    // marco de piedra
    R('#b9b2a6', x - 3, y - 3, 26, 33); R('#b9b2a6', x - 2, y - 4, 24, 1);
    R('#d9d2c6', x - 3, y - 3, 1, 33); R('#8c857b', x + 22, y - 3, 1, 33);
    R('#2b1a14', x - 1, y - 1, 22, 31);

    let colorNum, placa;
    if (estado === 'abierta') {
      R('#fff0c0', x, y, PUERTA_W, 6); R('#ffd98a', x, y + 6, PUERTA_W, 10);          // interior con luz
      R('#f2b25c', x, y + 16, PUERTA_W, 10); R('#b8742e', x, y + 26, PUERTA_W, 4);
      for (let i = x; i < x + PUERTA_W; i++) {                                         // trama entre tonos
        if (i % 2 === 0) { R('#ffd98a', i, y + 5, 1, 1); R('#f2b25c', i, y + 15, 1, 1); }
      }
      R('#c98a3a', x + 8, y + 12, 10, 1);                                              // estante
      R('#f4ecd0', x + 10, y + 9, 1, 3); R('#ff9a2c', x + 10, y + 8, 1, 1);            // vela
      Sprites.regalo(ctx, x + 9, y + 21, 5, 5, '#c8383f', '#f2c94c');
      Sprites.regalo(ctx, x + 15, y + 22, 4, 4, '#3c8a5a', '#f3ecd8');
      for (let i = 0; i < 6; i++) R(i === 5 ? '#5c3414' : '#8f5524', x + i, y + i, 1, PUERTA_H - 2 * i);   // hoja entreabierta
      if (regalo) {                                                                    // restos del envoltorio
        R('#d8324a', x + 14, y, 6, 3); R('#d8324a', x + 17, y + 3, 3, 2); R('#ffd24a', x + 15, y, 2, 3);
        R('#ffd24a', x + 6, y - 5, 4, 4); R('#ffd24a', x + 11, y - 5, 4, 4); R('#d49a1c', x + 9, y - 4, 3, 3);
      }
      ctx.globalAlpha = 0.3; R('#ffd27a', x - 2, suelo, PUERTA_W + 4, 2); ctx.globalAlpha = 1;
      colorNum = '#f2d36b'; placa = '#4a2f14';
    } else if (regalo) {
      papelRegalo(R, x, y, estado === 'bloqueada');
      if (estado === 'bloqueada') Sprites.candado(ctx, x + 7, y + 11);
      colorNum = estado === 'bloqueada' ? '#ffc0d4' : '#fff6c8';
      placa = estado === 'bloqueada' ? '#8a2040' : '#e8384f';
    } else if (estado === 'bloqueada') {
      R('#3a2f45', x, y, PUERTA_W, PUERTA_H);
      for (const [px, py] of PANELES) { R('#2e2538', x + px, y + py, 7, 10); R('#4a3d58', x + px, y + py, 7, 1); }
      R('#3a2f45', x + 6, y + 9, 8, 11);
      R('#5d6278', x, y + 14, PUERTA_W, 1);                                            // cadena
      for (let i = x; i < x + PUERTA_W; i += 2) R('#8b90a4', i, y + 14, 1, 1);
      Sprites.candado(ctx, x + 7, y + 11);
      colorNum = '#9a8cb4'; placa = '#2b2233';
    } else {
      R('#c2802a', x, y, PUERTA_W, PUERTA_H);
      for (let i = 5; i < PUERTA_W; i += 5) R('#a0641c', x + i, y, 1, PUERTA_H);
      for (const [px, py] of [[2, 19], [11, 19]]) { R('#dba040', x + px, y + py, 7, 8); R('#f6cf63', x + px, y + py, 7, 1); R('#8c5516', x + px, y + py + 7, 7, 1); }
      R('#3b2622', x + 4, y + 2, 12, 8); R('#fff7c8', x + 5, y + 3, 10, 3); R('#ffd76a', x + 5, y + 6, 10, 3);
      R('#3b2622', x + 9, y + 3, 2, 6);
      Sprites.corona(ctx, x + 10, y + 14, '#c2802a');
      R('#fff3b0', x + 16, y + 17, 2, 2);
      R('#f6cf63', x, y, PUERTA_W, 1);
      colorNum = '#ffe27a'; placa = '#c2802a';
    }

    if (estado === 'disponible') {                       // destellos
      for (const [dx, dy, f] of [[3, 5, 0], [17, 24, 2], [-4, 11, 4], [23, 19, 1]]) {
        const s = Math.sin(t * 4 + n + f * 1.7);
        if (s < 0.3) continue;
        R('#fff', x + dx, y + dy, 1, 1);
        if (s > 0.75) { R('#fff', x + dx - 1, y + dy, 3, 1); R('#fff', x + dx, y + dy - 1, 1, 3); }
      }
    }

    // placa con el número
    const w = Sprites.anchoNumero(n);
    const px0 = Math.floor(d.cx - w / 2) - 2 + sx, py = y - 15;
    R(placa, px0 - 2, py - 2, w + 8, 11);
    R('#1d1216', px0 - 1, py - 1, w + 6, 9);
    Sprites.numero(ctx, n, d.cx + sx, py + 1, colorNum);
  }

  function dibujarFlecha(ctx, cx, y, t) {
    const o = Math.round(Math.sin(t * 6));
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 2, y + o, 5, 1);
    ctx.fillRect(cx - 1, y + 1 + o, 3, 1);
    ctx.fillRect(cx, y + 2 + o, 1, 1);
  }

  return {
    ANCHO, ALTO, MUNDO_ALTO, PLANTAS, CIELO, X0, X1, X_ESCALERA, X_MIN, X_MAX, PUERTA_W, CHIMENEA_X,
    sueloY, puerta, dibujarEdificio, dibujarHalo, dibujarPuerta, dibujarFlecha
  };
})();
