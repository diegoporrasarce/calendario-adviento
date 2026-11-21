'use strict';
/* Sprites dibujados en código (escena de 320x240, píxel gordo y sombreado con trama):
   personaje, Papá Noel, luna, nubes, candado, abetos, muñeco de nieve, adornos y dígitos. */
const Sprites = (() => {
  const P = {
    pelo: '#6b3f23', peloOsc: '#4f2c18', peloClaro: '#935f38',
    piel: '#f6cfae', ojo: '#2a1a14', boca: '#b85a55', rubor: '#f09a8c',
    abrigo: '#c8383f', abrigoOsc: '#9c2630', crema: '#f3ecd8', verde: '#3c8a5a',
    falda: '#2f4a8a', faldaLuz: '#4f6fba',
    mallaCerca: '#5a4a70', mallaLejos: '#43365a', bota: '#6b4028', botaOsc: '#472a18'
  };

  const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

  function disco(ctx, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy + 0.5));
      ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
  }

  /* ---------- Tramado (dithering) píxel a píxel ---------- */
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const umbral = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;

  // Pinta `color` solo donde nivel(x, y) (0..1) supera el umbral de la trama.
  function tramar(ctx, x0, y0, w, h, color, nivel) {
    ctx.fillStyle = color;
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++)
        if (nivel(x, y) > umbral(x, y)) ctx.fillRect(x, y, 1, 1);
  }

  function lienzoAux(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [cv, g];
  }

  /* ---------- Fuente de dígitos 3x5 ---------- */
  const DIGITOS = {
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '010', '010'],
    '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111']
  };
  function anchoNumero(n) { return String(n).length * 4 - 1; }

  // Dibuja un número centrado en cx, con la parte superior en y.
  function numero(ctx, n, cx, y, color) {
    let x = Math.floor(cx - anchoNumero(n) / 2);
    ctx.fillStyle = color;
    for (const ch of String(n)) {
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
    let frame = 3, b = 0;                              // 3 = quieta
    if (modo === 'andar') {
      frame = [0, 1, 2, 1][Math.floor(t * 8) % 4];     // 3 frames distintos
      b = frame === 1 ? -1 : 0;
    } else if (modo === 'subir') {
      frame = Math.floor(t * 6) % 2 ? 0 : 2;
    } else {
      b = Math.floor(t * 2) % 2 ? -1 : 0;              // idle: respiración
    }
    const parpadeo = (t % 3.5) > 3.38;

    ctx.save();
    ctx.translate(x, y - 24);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.translate(-8, 0);
    const r = (c, a, d, w, h) => rect(ctx, c, a, d, w, h);

    ctx.globalAlpha = 0.25; r('#000', 3, 23, 10, 1); ctx.globalAlpha = 1;   // sombra

    // media melena (detrás)
    r(P.pelo, 3, 3 + b, 4, 10); r(P.peloOsc, 3, 12 + b, 4, 1); r(P.peloClaro, 4, 5 + b, 1, 5);

    // piernas y botas
    const lejos = [5, 7, 10, 6][frame], cerca = [10, 8, 5, 9][frame];
    const alzaL = modo === 'subir' && frame === 0 ? -2 : 0;
    const alzaC = modo === 'subir' && frame === 2 ? -2 : 0;
    r(P.mallaLejos, lejos, 17, 2, 5 + alzaL); r(P.botaOsc, lejos, 21 + alzaL, 3, 3);
    r(P.mallaCerca, cerca, 17, 2, 5 + alzaC); r(P.bota, cerca, 21 + alzaC, 3, 3);
    r(P.crema, cerca, 21 + alzaC, 3, 1);

    // abrigo y falda
    r(P.abrigo, 5, 11 + b, 7, 6); r(P.abrigoOsc, 5, 11 + b, 1, 6);
    r('#f2c94c', 10, 13 + b, 1, 1); r('#f2c94c', 10, 15 + b, 1, 1);
    r(P.falda, 4, 16 + b, 9, 3); r(P.faldaLuz, 4, 18 + b, 9, 1);

    // brazo cercano con manopla
    if (modo === 'subir') {
      const m = frame === 0 ? 0 : 2;
      r(P.abrigoOsc, 9, 6 + m + b, 2, 7 - m); r(P.verde, 9, 4 + m + b, 2, 2);
    } else {
      const a = frame === 0 ? -1 : frame === 2 ? 1 : 0;
      r(P.abrigoOsc, 8 + a, 12 + b, 2, 4); r(P.verde, 8 + a, 16 + b, 2, 2);
    }

    // bufanda
    r(P.crema, 4, 11 + b, 2, 5); r(P.verde, 4, 14 + b, 2, 1);
    r(P.crema, 6, 10 + b, 6, 2); r(P.verde, 8, 10 + b, 1, 2);

    // cabeza
    r(P.piel, 6, 3 + b, 6, 7); r(P.piel, 12, 6 + b, 1, 1);
    // pelo: coronilla, lateral y flequillo
    r(P.peloOsc, 6, 0 + b, 5, 1);
    r(P.pelo, 5, 1 + b, 7, 2); r(P.pelo, 5, 3 + b, 2, 6);
    r(P.pelo, 7, 3 + b, 5, 2); r(P.pelo, 7, 5 + b, 1, 1); r(P.pelo, 11, 5 + b, 1, 1);
    r(P.peloClaro, 7, 1 + b, 3, 1);
    // cara
    if (!parpadeo) r(P.ojo, 10, 6 + b, 1, 2); else r(P.ojo, 10, 7 + b, 1, 1);
    r(P.rubor, 8, 8 + b, 2, 1);
    r(P.boca, 11, 9 + b, 1, 1);

    ctx.restore();
  }

  /* ---------- Papá Noel (14x22). (x, y) = centro de los pies ---------- */
  function papaNoel(ctx, x, y, dir, andando, t) {
    const paso = andando ? Math.floor(t * 6) % 2 : 0;
    const b = paso ? -1 : 0;
    const saluda = !andando && Math.floor(t * 3) % 2;
    ctx.save();
    ctx.translate(x, y - 22);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.translate(-7, 0);
    const r = (c, a, d, w, h) => rect(ctx, c, a, d, w, h);
    // saco a la espalda
    r('#6b4a2a', -5, 9 + b, 7, 11); r('#8a6238', -5, 9 + b, 7, 2); r('#4f351d', -5, 18 + b, 7, 2);
    r('#f2c94c', -3, 8 + b, 3, 1);
    // botas
    r('#16161c', paso ? 2 : 4, 19, 4, 3); r('#16161c', paso ? 9 : 7, 19, 4, 3);
    // abrigo
    r('#c8383f', 2, 9 + b, 11, 10); r('#9c2630', 2, 9 + b, 2, 10);
    r('#f4f4f4', 2, 18 + b, 11, 1); r('#f4f4f4', 8, 9 + b, 1, 9);
    r('#16161c', 2, 14 + b, 11, 2); r('#f2c94c', 7, 14 + b, 3, 2);
    // brazos
    r('#9c2630', 1, 10 + b, 2, 5); r('#f4f4f4', 1, 15 + b, 2, 1);
    if (saluda) { r('#c8383f', 13, 6 + b, 2, 5); r('#f4f4f4', 13, 5 + b, 2, 1); r('#2a6843', 13, 3 + b, 2, 2); }
    else { r('#c8383f', 12, 10 + b - paso, 2, 5); r('#f4f4f4', 12, 15 + b - paso, 2, 1); r('#2a6843', 12, 16 + b - paso, 2, 1); }
    // cara y barba
    r('#f6cfae', 5, 4 + b, 7, 4);
    r('#f4f4f4', 4, 7 + b, 9, 4); r('#f4f4f4', 6, 11 + b, 5, 1); r('#cfd6e4', 4, 10 + b, 2, 1);
    r('#2a1a14', 8, 5 + b, 1, 1); r('#2a1a14', 11, 5 + b, 1, 1);
    r('#e8907e', 9, 6 + b, 2, 1);
    // gorro
    r('#c8383f', 4, 0 + b, 8, 4); r('#c8383f', 1, 1 + b, 4, 3);
    r('#f4f4f4', 4, 3 + b, 9, 2); r('#f4f4f4', 0, 3 + b, 3, 3);
    ctx.restore();
  }

  // Humo de chimenea. (x, y) = boca de la chimenea.
  function humo(ctx, x, y, t) {
    ctx.fillStyle = '#b4bedc';
    for (let i = 0; i < 5; i++) {
      const p = (t * 0.3 + i / 5) % 1;
      ctx.globalAlpha = 0.6 * (1 - p);
      disco(ctx, Math.floor(x + Math.sin(t * 0.8 + i * 2) * 2 + p * 8), Math.floor(y - p * 36), 1 + Math.floor(p * 3));
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Luna y nubes: esferas sombreadas con trama, generadas una vez ---------- */
  let lunaCv = null;
  const LUNA_R = 15, LUNA_M = 9;
  function crearLuna() {
    const c = LUNA_R + LUNA_M, [cv, g] = lienzoAux(2 * c + 1, 2 * c + 1);
    const tonos = ['#fffbe0', '#f8eca8', '#dcc878', '#a8965f', '#6e6452', '#3e3a44'];
    const crateres = [[-6, -5, 4], [6, 3, 3], [-2, 8, 2], [7, -6, 2], [-10, 3, 1], [1, -1, 1]];
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), u = umbral(x, y);
        if (d <= LUNA_R) {
          const nz = Math.sqrt(Math.max(0, 1 - (d / LUNA_R) ** 2));
          let v = 0.56 - ((-dx * 0.55 - dy * 0.6) / LUNA_R + nz * 0.55) * 0.5;
          for (const [kx, ky, kr] of crateres) if (Math.hypot(dx - kx, dy - ky) <= kr) v += 0.2;
          g.fillStyle = tonos[Math.max(0, Math.min(tonos.length - 1, Math.floor(v * (tonos.length - 1) + u)))];
          g.fillRect(x, y, 1, 1);
        } else if (d < c && (1 - (d - LUNA_R) / LUNA_M) * 0.6 > u) {
          g.fillStyle = d < LUNA_R + 4 ? '#5a54a8' : '#37327a'; g.fillRect(x, y, 1, 1);
        }
      }
    }
    return cv;
  }
  function luna(ctx, cx, cy) {
    if (!lunaCv) lunaCv = crearLuna();
    ctx.drawImage(lunaCv, cx - LUNA_R - LUNA_M, cy - LUNA_R - LUNA_M);
  }

  let nubeCv = null;
  function crearNube() {
    const [cv, g] = lienzoAux(42, 17);
    const bolas = [[5, 12, 4], [11, 9, 6], [20, 7, 7], [29, 9, 6], [36, 12, 4]];
    const tonos = ['#b4a8f0', '#7a70c8', '#4a4696', '#2c2c66'];
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 42; x++) {
        if (!bolas.some(([bx, by, br]) => Math.hypot(x - bx, y - by) <= br)) continue;
        g.fillStyle = tonos[Math.max(0, Math.min(3, Math.floor((y / 15) * 3.4 - 0.5 + umbral(x, y))))];
        g.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }
  function nube(ctx, x, y) {
    if (!nubeCv) nubeCv = crearNube();
    ctx.drawImage(nubeCv, x, y);
  }

  /* ---------- Decorado ---------- */
  function candado(ctx, x, y) {
    const filas = ['..sss..', '.s...s.', '.s...s.', 'lgggggg', 'lggkggo', 'lggkggo', 'ooooooo'];
    const col = { s: '#9aa0b0', g: '#c9a227', l: '#ecc94a', o: '#8f6f14', k: '#2b1a14' };
    filas.forEach((f, j) => [...f].forEach((ch, i) => { if (ch !== '.') rect(ctx, col[ch], x + i, y + j, 1, 1); }));
  }

  // Abeto nevado. (x, yBase) = centro de la base.
  // Se genera píxel a píxel una vez por altura: pisos de ramas que caen, borde irregular,
  // volumen tramado (luz a la izquierda) y nieve acumulada en las puntas de las ramas.
  const abetos = {};
  const ruidoAbeto = (a, b) => {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  function crearAbeto(alto) {
    const maxMedio = Math.max(4, Math.round(alto * 0.3));
    const cx = maxMedio + 1, [cv, g] = lienzoAux(2 * maxMedio + 3, alto);
    const tronco = Math.max(3, Math.round(alto * 0.1));
    const cuerpo = alto - tronco;
    const pisos = Math.max(3, Math.round(alto / 8));
    const th = cuerpo / pisos;
    const verdes = ['#3f8a5c', '#2c6e48', '#1b4d33', '#0f3324'];
    rect(g, '#5a3a22', cx - 1, cuerpo - 2, 3, tronco + 2);
    rect(g, '#33200f', cx + 1, cuerpo - 2, 1, tronco + 2);
    for (let i = 0; i < cuerpo; i++) {
      const u = (i + 1) / cuerpo;
      const k = Math.min(pisos - 1, Math.floor(i / th));
      const f = (i - k * th) / th;                                   // 0 = arriba del piso, 1 = punta de las ramas
      let medio = Math.round(u * maxMedio * 0.45 + f * maxMedio * 0.55 * (0.35 + 0.65 * u));
      if (ruidoAbeto(i, alto) > 0.7) medio++;
      medio = Math.min(medio, maxMedio);
      for (let x = -medio; x <= medio; x++) {
        const borde = Math.abs(x) === medio;
        if (borde && medio > 1 && ruidoAbeto(x + 50, i + alto) > 0.55) continue;   // silueta irregular
        const v = (x / (medio + 1)) * 0.5 + 0.5;                       // 0 izquierda (luz) .. 1 derecha (sombra)
        const sombra = k > 0 && f < 0.25 ? 0.3 : 0;                    // sombra del piso de encima
        let color = verdes[Math.max(0, Math.min(3, Math.floor((v * 0.75 + sombra) * 3 + umbral(x + cx, i))))];
        const nevado = i < 2 || (f > 0.6 && Math.abs(x) > medio * 0.3 && ruidoAbeto(((x + cx) >> 1) + k * 31, alto + k) > 0.38);
        if (nevado) color = v > 0.62 ? '#c5d3ea' : '#f4f8ff';
        rect(g, color, cx + x, i, 1, 1);
      }
    }
    return cv;
  }
  function abeto(ctx, x, yBase, alto) {
    const cv = abetos[alto] || (abetos[alto] = crearAbeto(alto));
    ctx.drawImage(cv, x - (cv.width >> 1), yBase - alto);
  }

  /* ---------- Trineo con tres renos volando. (x, y) = esquina del trineo; dir 1 = hacia la derecha ---------- */
  function trineo(ctx, x, y, dir, t) {
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) ctx.scale(-1, 1);
    const r = (c, a, d, w, h) => rect(ctx, c, a, d, w, h);
    // estela de chispas
    for (let i = 0; i < 7; i++) {
      if (Math.sin(t * 9 + i * 2.3) < 0) continue;
      r(i % 2 ? '#ffe27a' : '#ffffff', -4 - i * 5, 6 + Math.round(Math.sin(t * 4 + i) * 3), 1, 1);
    }
    // riendas
    r('#c9a227', 14, 3, 56, 1);
    // trineo
    r('#c8383f', 2, 3, 14, 5); r('#9c2630', 2, 7, 14, 1);
    r('#c8383f', 0, 0, 3, 7); r('#c8383f', 15, 1, 3, 3); r('#c8383f', 17, 0, 2, 1);
    r('#f2c94c', 2, 3, 14, 1); r('#f2c94c', 0, 0, 3, 1);
    r('#c6cbd8', 1, 10, 17, 1); r('#c6cbd8', 18, 9, 1, 1); r('#c6cbd8', 19, 7, 1, 2);
    r('#8a92b0', 4, 8, 1, 2); r('#8a92b0', 13, 8, 1, 2);
    // saco de regalos
    r('#6b4a2a', 3, -3, 6, 6); r('#8a6238', 3, -3, 6, 1); r('#e03a44', 5, -5, 2, 2); r('#3c8a5a', 7, -4, 2, 1);
    // elfo conductor
    r('#3c8a5a', 10, 0, 3, 3); r('#f6cfae', 10, -3, 3, 3); r('#2a1a14', 12, -2, 1, 1);
    r('#2a6843', 10, -5, 3, 2); r('#e03a44', 9, -6, 1, 2); r('#3c8a5a', 13, 1, 2, 1);
    // renos
    for (let i = 0; i < 3; i++) {
      const rx = 26 + i * 17, ry = Math.round(Math.sin(t * 5 + i * 1.4) * 1.5) - 2;
      const galope = Math.floor(t * 7 + i) % 2;
      const q = (c, a, d, w, h) => r(c, rx + a, ry + d, w, h);
      q('#8a5a34', 2, 4, 9, 4); q('#b07a48', 3, 7, 7, 1); q('#6e4526', 2, 4, 9, 1);
      q('#f3ecd8', 1, 3, 1, 2);                                        // cola
      q('#8a5a34', 9, 2, 2, 4); q('#8a5a34', 10, 0, 4, 3);              // cuello y cabeza
      q('#2a1a14', 12, 1, 1, 1);
      q(i === 2 ? '#ff4040' : '#2a1a14', 14, 1, 1, 1);                  // el primero, nariz roja
      q('#d9c9a0', 10, -3, 1, 3); q('#d9c9a0', 11, -3, 2, 1); q('#d9c9a0', 9, -2, 1, 1); q('#d9c9a0', 12, -4, 1, 1);
      q('#c8383f', 9, 4, 2, 1);                                         // collar
      if (galope) {                                                      // patas estiradas
        q('#6e4526', 10, 8, 2, 1); q('#6e4526', 12, 9, 2, 1); q('#2a1a14', 14, 9, 1, 1);
        q('#6e4526', 1, 8, 2, 1); q('#6e4526', -1, 9, 2, 1); q('#2a1a14', -2, 9, 1, 1);
      } else {                                                           // patas recogidas
        q('#6e4526', 9, 8, 1, 2); q('#6e4526', 7, 9, 2, 1); q('#2a1a14', 6, 9, 1, 1);
        q('#6e4526', 3, 8, 1, 2); q('#6e4526', 4, 9, 2, 1); q('#2a1a14', 6, 10, 1, 1);
      }
    }
    ctx.restore();
  }

  // Muñeco de nieve. (x, y) = centro de la base.
  function muneco(ctx, x, y) {
    const bola = (cy, r) => {
      ctx.fillStyle = '#c3d1e8'; disco(ctx, x, cy, r);
      ctx.fillStyle = '#f4f8ff'; disco(ctx, x - 1, cy - 1, r - 1);
    };
    bola(y - 5, 5); bola(y - 13, 4); bola(y - 19, 3);
    rect(ctx, '#16161c', x - 3, y - 23, 7, 1); rect(ctx, '#16161c', x - 2, y - 27, 5, 4); rect(ctx, '#c8383f', x - 2, y - 24, 5, 1);
    rect(ctx, '#16161c', x - 1, y - 20, 1, 1); rect(ctx, '#16161c', x + 1, y - 20, 1, 1);
    rect(ctx, '#f08a2c', x, y - 19, 3, 1);
    rect(ctx, '#c8383f', x - 3, y - 17, 7, 1); rect(ctx, '#c8383f', x + 2, y - 16, 1, 3);
    rect(ctx, '#16161c', x, y - 13, 1, 1); rect(ctx, '#16161c', x, y - 10, 1, 1);
    rect(ctx, '#4a2f1c', x - 8, y - 15, 4, 1); rect(ctx, '#4a2f1c', x + 5, y - 15, 4, 1);
  }

  // Corona de Navidad para las puertas. fondo = color de la puerta (para el hueco).
  function corona(ctx, cx, cy, fondo) {
    ctx.fillStyle = '#1b4d33'; disco(ctx, cx, cy, 3);
    rect(ctx, '#2f7a50', cx - 2, cy - 3, 3, 1); rect(ctx, '#2f7a50', cx - 3, cy - 2, 1, 3);
    rect(ctx, fondo, cx - 1, cy - 1, 3, 3);
    rect(ctx, '#e03a44', cx - 3, cy - 1, 1, 1); rect(ctx, '#e03a44', cx + 2, cy - 3, 1, 1); rect(ctx, '#e03a44', cx + 3, cy + 1, 1, 1);
    rect(ctx, '#e03a44', cx - 1, cy + 3, 3, 2); rect(ctx, '#a82830', cx, cy + 3, 1, 3);
  }

  // Regalo con lazo. (x, y) = esquina superior izquierda de la caja.
  function regalo(ctx, x, y, w, h, color, lazo) {
    rect(ctx, color, x, y, w, h);
    rect(ctx, lazo, x + Math.floor(w / 2), y, 1, h);
    rect(ctx, lazo, x, y, w, 1);
    rect(ctx, lazo, x + Math.floor(w / 2) - 1, y - 1, 1, 1); rect(ctx, lazo, x + Math.floor(w / 2) + 1, y - 1, 1, 1);
  }

  /* ---------- Retratos para los diálogos (32x40), como arrays de píxeles ---------- */
  const RETRATOS = {
    henar: {
      paleta: {
        a: '#f2f2f2', b: '#c8c8d2', c: '#c83c3c', d: '#8e2a2a', e: '#e05454', f: '#e8dcc0', g: '#c4b690',
        h: '#6b4a2e', i: '#4a3220', j: '#8c6540', k: '#f0c8a8', l: '#4a2e1a', m: '#ffffff', n: '#e8a096',
        o: '#b86a6a', p: '#d9a888', q: '#3f8f5a', r: '#2c6640', s: '#ececf2', t: '#c8c8d6'
      },
      filas: [
        '..............aaaa..............', '.............aaaaab.............', '.............aaaabb.............',
        '..............bbbb..............', '............cccccccc............', '..........cccccccccccd..........',
        '.........ccccccccccccdd.........', '........cccccccccccccddd........', '.......eccccccccccccccddd.......',
        '.......eccccccccccccccddd.......', '......eeccccccccccccccdddd......', '......ecccccccccccccccdddd......',
        '......ffffffffffffffffffgg......', '......fffffffffffffffffggg......', '......hhhhhhhhhhhhhhhhhhii......',
        '.....hhhhhhhhhhhhhhhhhhhiii.....', '.....hhhhhhhhhhhhhhhhhhhiii.....', '.....hhhhhjhhhhhhhhjhhhhiii.....',
        '.....hhhhhhhhhhhhhhhhhhhiii.....', '.....hhhkhhkkhhhkkhhkhhhiii.....', '.....hhkkkkkkkkkkkkkkkkkiii.....',
        '.....hhkkkkkkkkkkkkkkkkkiii.....', '.....hhkkklmkkkkkkklmkkkiii.....', '.....hhkkkllkkkkkkkllkkkiii.....',
        '.....hhknkkkkkkkkkkkkknkiii.....', '.....hhkkkkkkkkookkkkkkkiii.....', '.....hhpkkkkkkkkkkkkkkkpiii.....',
        '.....hhiippkkkkkkkkkppiiiii.....', '.....hiqqqqqqqqqqqqqqqqqqii.....', '.....hiqffqqqqqqqqqqqqffqii.....',
        '.....hiqqqqqqqqqqqqqqqqqrii.....', '.....hirrqqqqqqqqqqqqrrrrii.....', '.....iqqqssssssssssssssstti.....',
        '.....iqfqssssssssssssssstti.....', '....ssqqqsssssssssssssssttss....', '...sssqqrsssssssssssssstttsst...',
        '..ssssrrrsssssssssssssttttsstt..', '..ssssssssssssssssssssttttsstt..', '..ssssssssssssssssssssttttsstt..',
        '..ssssssssssssssssssssttttsstt..'
      ]
    },
    // El autor del calendario: con el disfraz verde sin máscara, y con la máscara puesta (día 24)
    autor: {
      paleta: {
        b: '#88683e', c: '#aa8856', d: '#60482a', e: '#f2ccb4', f: '#60462a', g: '#c49278', h: '#d6a890',
        i: '#3c2418', j: '#ffffff', k: '#ecb2a2', l: '#b27066', m: '#c48074', u: '#4f9a3c', v: '#6fb84c',
        w: '#2f6b2a', x: '#c8383f', y: '#9c2630', z: '#f4f8ff'
      },
      filas: [
        '................................', '................................', '................................',
        '................................', '................................', '................................',
        '................................', '................................', '................................',
        '...........bbcccbbbbd...........', '.........bbcccccbbbbbdd.........', '........bbbcccccbbbbbbdd........',
        '.......bbbbbccccbbbbbbbdd.......', '......bbbbbbbcccbbbbbbbbdd......', '......bbcbbbbcbbbbbbcbbbdd......',
        '......bbbbeeeebbbbbbbbbbdd......', '......bbeeeeeeeeebbbbbbbdd......', '......bbeeeeeeeeeeeebbbbdd......',
        '......bbeffffeeeeeffffebdd......', '......beeeggeeeeeeeggeeedd......', '......heeeijeeeeeeeijeeeeh......',
        '......heeeiieeeeeeeiieeeeh......', '......heeeeeeeeeheeeeeeeeh......', '......hekeeeeeeeeeeeeeekeh......',
        '.......eeeeeeeheheeeeeee........', '.......eeeeeeeeeeeeeeeee........', '.......eeeeeelmmmleeeeee........',
        '.......eeeeeeeeeeeeeeeee........', '........heeeeeeeeeeeeeh.........', '.........hheeeeeeeeehh..........',
        '...........heeeeeeeeh...........', '......uuuvuxxheeeehxxuuvww......', '....uvuuuuuxxxxzzxxxxuuuuuww....',
        '...uuuuuvuuxxxxzzxxxxuvuuuwuw...', '..uuvuuuuuuxxxxzzxxxyuuuuwwu....', '..uuuuuvuuuxxxxzzxxxyvuuuwwu....',
        '..uvuuuuuuvxxxxzzxxxyuuuvwwu....', '..uuuuvuuuuxxxxzzxxxyuuuuwwv....', '..vuuuuuuvuxxxxzzxxxyuuvuwwu....',
        '..uuuvuuuuuxxxxzzxxxyuuuuwwu....'
      ]
    },
    autorMascara: {
      paleta: {
        G: '#7cb342', H: '#5a8f2e', I: '#1f3d14', J: '#f2e24c', K: '#c8383f', L: '#e8505a', u: '#4f9a3c',
        v: '#6fb84c', w: '#2f6b2a', x: '#c8383f', y: '#9c2630', z: '#f4f8ff'
      },
      filas: [
        '................................', '................................', '................................',
        '................................', '................................', '................................',
        '................................', '................................', '................................',
        '...........xxLLLxxxxy...x.......', '.........xxLLLLLxxxxxyy..x......', '........xxxLLLLLxxxxxxyy..x.....',
        '.......xxxxxLLLLxxxxxxxyy.x.....', '......xxxxxxxLLLxxxxxxxxyyzz....', '......zzzzzzzzzzzzzzzzzzzzzz....',
        '......zzzzGGGGzzzzzzzzzzzz......', '......HHGGGGGGGGGHHHHHHHHH......', '......HHGGGGGGGGGGGGHHHHHH......',
        '......HHGIIIIGGGGGIIIIGHHH......', '......HGGGJJGGGGGGGJJGGGHH......', '......HGGGJJGGGGGGGJJGGGGH......',
        '......HGGGKKGGGGGGGKKGGGGH......', '......HGGGGGGGGGHGGGGGGGGH......', '......HGHGGGGGGGGGGGGGGHGH......',
        '.......GIGGGGGHGHGGGGGGI........', '.......GGIGGGGGGGGGGGGIG........', '.......GGGIIIIIIIIIIIIGG........',
        '.......GGGGGzGzGzGzGGGGG........', '........HGGGGGGGGGGGGGH.........', '.........HHGGGGGGGGGHH..........',
        '...........HGGGGGGGGH...........', '......uuuvuxxHGGGGHxxuuvww......', '....uvuuuuuxxxxzzxxxxuuuuuww....',
        '...uuuuuvuuxxxxzzxxxxuvuuuwuw...', '..uuvuuuuuuxxxxzzxxxyuuuuwwu....', '..uuuuuvuuuxxxxzzxxxyvuuuwwu....',
        '..uvuuuuuuvxxxxzzxxxyuuuvwwu....', '..uuuuvuuuuxxxxzzxxxyuuuuwwv....', '..vuuuuuuvuxxxxzzxxxyuuvuwwu....',
        '..uuuvuuuuuxxxxzzxxxyuuuuwwu....'
      ]
    }
  };

  // Pinta el retrato `nombre` en un <canvas> (ajusta su tamaño). Devuelve false si no existe.
  function pintarRetrato(lienzo, nombre) {
    const r = RETRATOS[nombre];
    if (!r) return false;
    lienzo.width = r.filas[0].length; lienzo.height = r.filas.length;
    const g = lienzo.getContext('2d');
    r.filas.forEach((f, y) => [...f].forEach((ch, x) => { if (ch !== '.') rect(g, r.paleta[ch], x, y, 1, 1); }));
    return true;
  }

  return { pintarRetrato, umbral, tramar, lienzoAux, P, rect, disco, numero, anchoNumero, personaje, papaNoel, humo,
           luna, nube, candado, abeto, trineo, muneco, corona, regalo };
})();
