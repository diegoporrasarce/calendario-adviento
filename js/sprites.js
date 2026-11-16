'use strict';
/* Sprites dibujados en código: personaje, luna, nubes, candado, abetos y fuente de dígitos. */
const Sprites = (() => {
  const C = {
    pelo: '#6b3f23', peloClaro: '#8e5a34', piel: '#f3c9a5', ojo: '#2a1a14', boca: '#c5726a',
    jersey: '#c8383f', jerseyOsc: '#9e2830', bufanda: '#f1ece0',
    falda: '#2f4a8a', faldaBorde: '#5f7bc4',
    mallaCerca: '#6b5a7e', mallaLejos: '#4c3f5c', bota: '#5a3524', botaOsc: '#3e2417'
  };

  const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

  /* ---------- Fuente de dígitos 3x5 ---------- */
  const DIGITOS = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '001', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111']
  };

  function anchoNumero(n) { return String(n).length * 4 - 1; }

  // Dibuja un número centrado en cx, con la parte superior en y.
  function numero(ctx, n, cx, y, color) {
    const s = String(n);
    let x = Math.floor(cx - anchoNumero(n) / 2);
    ctx.fillStyle = color;
    for (const ch of s) {
      const g = DIGITOS[ch];
      for (let fila = 0; fila < 5; fila++)
        for (let col = 0; col < 3; col++)
          if (g[fila][col] === '1') ctx.fillRect(x + col, y + fila, 1, 1);
      x += 4;
    }
  }

  /* ---------- Personaje 16x24 ---------- */
  // (x, y) = centro de los pies. dir: 1 derecha, -1 izquierda.
  // modo: 'idle' | 'andar' | 'subir'. t: tiempo en segundos.
  function personaje(ctx, x, y, dir, modo, t) {
    let frame = 0, bob;
    if (modo === 'andar') {
      frame = [0, 1, 2, 1][Math.floor(t * 8) % 4];   // 3 frames distintos
      bob = frame === 1 ? -1 : 0;
    } else if (modo === 'subir') {
      frame = Math.floor(t * 6) % 2 ? 0 : 2;
      bob = 0;
    } else {
      bob = Math.floor(t * 2) % 2 ? -1 : 0;           // idle: respiración (2 frames)
    }
    const parpadeo = (t % 3.5) > 3.38;

    ctx.save();
    ctx.translate(x, y - 24);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.translate(-8, 0);
    const r = (c, a, b, w, h) => rect(ctx, c, a, b, w, h);
    const b = bob;

    // sombra
    ctx.globalAlpha = 0.25; r('#000', 4, 23, 9, 1); ctx.globalAlpha = 1;

    // media melena (detrás)
    r(C.pelo, 3, 2 + b, 4, 10);
    r(C.peloClaro, 3, 4 + b, 1, 6);

    // piernas
    const lejos = frame === 0 ? 5 : frame === 2 ? 10 : frame === 1 ? 7 : 6;
    const cerca = frame === 0 ? 10 : frame === 2 ? 5 : frame === 1 ? 8 : 9;
    const alzaL = modo === 'subir' && frame === 0 ? -2 : 0;
    const alzaC = modo === 'subir' && frame === 2 ? -2 : 0;
    r(C.mallaLejos, lejos, 18 + alzaL, 4, 2); r(C.mallaLejos, lejos, 18, 4 + alzaL, 2);
    r(C.botaOsc, lejos, 22 + alzaL, 3, 2);
    r(C.mallaCerca, cerca, 18, 4 + alzaC, 2);
    r(C.bota, cerca, 22 + alzaC, 3, 2);

    // jersey
    r(C.jersey, 5, 10 + b, 7, 6);
    r(C.jerseyOsc, 5, 15 + b, 7, 1);
    // falda
    r(C.falda, 4, 16 + b, 9, 3);
    r(C.faldaBorde, 4, 18 + b, 9, 1);

    // brazo cercano
    if (modo === 'subir') {
      r(C.jerseyOsc, 9, 6 + b, 2, 6); r(C.piel, 9, 5 + b, 2, 1);
    } else {
      const a = frame === 0 ? -1 : frame === 2 ? 1 : 0;
      r(C.jerseyOsc, 8 + a, 11 + b, 2, 5); r(C.piel, 8 + a, 16 + b, 2, 1);
    }

    // bufanda
    r(C.bufanda, 6, 9 + b, 6, 2);
    r(C.bufanda, 4, 10 + b, 2, 4);

    // cabeza
    r(C.piel, 6, 2 + b, 6, 7);
    // pelo superior, lateral y flequillo
    r(C.pelo, 5, 0 + b, 7, 3);
    r(C.pelo, 6, 3 + b, 1, 5);
    r(C.pelo, 7, 3 + b, 5, 2);
    r(C.peloClaro, 9, 1 + b, 2, 1);
    // cara
    if (!parpadeo) r(C.ojo, 10, 5 + b, 1, 2); else r(C.ojo, 10, 6 + b, 1, 1);
    r(C.boca, 10, 8 + b, 1, 1);
    r('#e9948a', 8, 7 + b, 1, 1);

    ctx.restore();
  }

  /* ---------- Decorado ---------- */
  function disco(ctx, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5));
      ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
  }

  function luna(ctx, cx, cy) {
    ctx.fillStyle = 'rgba(244,241,208,0.07)'; disco(ctx, cx, cy, 19);
    ctx.fillStyle = 'rgba(244,241,208,0.10)'; disco(ctx, cx, cy, 15);
    ctx.fillStyle = '#f4f1d0'; disco(ctx, cx, cy, 12);
    ctx.fillStyle = '#d9d5a8';
    disco(ctx, cx - 4, cy - 3, 3); disco(ctx, cx + 4, cy + 2, 2); disco(ctx, cx - 2, cy + 6, 2);
    ctx.fillStyle = '#e6e2ba'; ctx.fillRect(cx + 6, cy - 6, 3, 2);
  }

  const FORMA_NUBE = [[6, 0, 12], [2, 2, 20], [0, 4, 28], [4, 6, 22]];
  function nube(ctx, x, y, color, brillo) {
    for (const [dx, dy, w] of FORMA_NUBE) {
      rect(ctx, color, x + dx, y + dy, w, 2);
    }
    rect(ctx, brillo, x + 6, y, 12, 1);
  }

  function candado(ctx, x, y) {
    const filas = [
      '..sss..',
      '.s...s.',
      '.s...s.',
      'ggggggg',
      'gggkggg',
      'gggkggg',
      'ggggggg'
    ];
    const col = { s: '#9aa0b0', g: '#c9a227', k: '#2b1a14' };
    filas.forEach((f, j) => [...f].forEach((ch, i) => {
      if (ch !== '.') rect(ctx, col[ch], x + i, y + j, 1, 1);
    }));
  }

  // Abeto nevado. (x, yBase) = centro de la base.
  function abeto(ctx, x, yBase, alto) {
    const tronco = 3;
    rect(ctx, '#4a2f1c', x - 1, yBase - tronco, 3, tronco);
    const cuerpo = alto - tronco;
    const tramo = Math.floor(cuerpo / 3);
    for (let i = 0; i < cuerpo; i++) {
      const k = Math.min(2, Math.floor(i / tramo));
      const j = i - k * tramo;
      const medio = 1 + j + k * 2;
      const y = yBase - tronco - cuerpo + i;
      rect(ctx, '#1f5a3a', x - medio, y, 2 * medio + 1, 1);
      rect(ctx, '#2a6e46', x - medio, y, medio, 1);
      if (j === 0) rect(ctx, '#f2f6ff', x - medio, y, 2 * medio + 1, 1);
      if (j === 1) rect(ctx, '#dbe5f5', x - medio + 1, y, 2 * medio - 1, 1);
    }
  }

  return { C, rect, numero, anchoNumero, personaje, luna, nube, candado, abeto, disco };
})();
