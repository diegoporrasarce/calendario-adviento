'use strict';
/* Juego extra — Los canelones (mesa de la calle, a la derecha del edificio; se puede jugar cualquier día,
   también antes del 1 de diciembre). Henar tiene que comerse 30 canelones antes de que se acabe el tiempo:
   cada canelón son 3 bocados (Espacio o tocar). Con cada 5 canelones se le hincha la tripa, hasta acabar
   como una bola que rueda por la mesa. Algunos canelones salen ardiendo (humo rojo): si los muerde antes
   de que se enfríen, se quema y pierde 2 segundos. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['extra-canelones'] = {
  iniciarJuego(contenedor, alTerminar, datos = {}) {
    const { PALETA: C, texto } = Comun;
    const TOTAL = 30, BOCADOS = 3, TIEMPO = 40;          // 30 canelones de 3 bocados en 40 segundos
    const T_LLEGAR = 0.18, T_BOCADO = 0.16;              // el siguiente canelón llega a la bandeja; animación del tenedor
    const CALIENTES = 4, T_CALOR = 1.1, PENALIZACION = 2;  // canelones ardiendo por partida, cuánto queman y qué cuestan
    const CLAVE = Dias.debug ? 'adviento.canelones.debug' : 'adviento.canelones';   // récord (también marca "ya probado")
    // Tamaño de la tripa (semiejes de la elipse) en cada fase: una fase cada 5 canelones
    const TRIPA_X = [15, 19, 24, 30, 38, 48, 60], TRIPA_Y = [22, 24, 27, 31, 37, 45, 54];
    const FRASES = ['', '¡QUE RICOS!', '¡OTRO MAS!', '¡POP!', 'UF...', '¡NO PUEDO MAS!'];
    const MESA_Y = 168;                                  // borde de la mesa en la escena de 320x240
    const PLATO = { x: 160, y: 198 }, BANDEJA = { x: 226, y: 182 };

    const P = Sprites.P;
    const PIEL = '#f6cfae', PIEL_OSC = '#e2a888', RUBOR = '#f09a8c';
    const ABRIGO = '#c8383f', ABRIGO_OSC = '#9c2630', ABRIGO_LUZ = '#e05454';

    let comidos, bocados, quedan, llegada, calor, calientes, quemadura, animBocado, masticar, fase, boing, final, particulas;
    let record = leerRecord();

    function leerRecord() { try { return parseInt(localStorage.getItem(CLAVE), 10) || 0; } catch (e) { return 0; } }
    function guardarRecord() {
      record = Math.max(record, comidos);
      try { localStorage.setItem(CLAVE, String(record)); } catch (e) { /* sin almacenamiento */ }
    }

    function reiniciar() {
      comidos = 0; bocados = 0; quedan = TIEMPO; llegada = 0; calor = 0;
      quemadura = 0; animBocado = 0; masticar = 0; fase = 0; boing = 0; final = null; particulas = [];
      calientes = new Set();
      while (calientes.size < CALIENTES) calientes.add(2 + Math.floor(Math.random() * (TOTAL - 4)));   // nunca los primeros
    }

    /* ---------- Disposición: la escena de 320x240 escalada (K entero) y centrada ---------- */
    function disposicion(api) {
      const K = Math.max(1, Math.floor(Math.min(api.ancho / 320, api.alto / 240)));
      return { K, ox: Math.floor((api.ancho - 320 * K) / 2), oy: Math.floor((api.alto - 240 * K) / 2) };
    }
    const aLienzo = (L, x, y) => [L.ox + x * L.K, L.oy + y * L.K];

    /* ---------- Lógica ---------- */
    function particula(x, y, vx, vy, color, vida, g = 0) { particulas.push({ x, y, vx, vy, color, vida, g }); }

    function cabezaY() { return MESA_Y + 4 - 2 * altoTripa() + 8; }     // barbilla de Henar (sube con la tripa)
    function altoTripa() { return TRIPA_Y[fase] * (1 - 0.12 * Math.sin(Math.min(1, 1 - boing / 0.45) * Math.PI * 3) * (boing > 0 ? 1 : 0)); }
    function anchoTripa() { return TRIPA_X[fase] * (1 + 0.15 * Math.sin(Math.min(1, 1 - boing / 0.45) * Math.PI * 3) * (boing > 0 ? 1 : 0)); }

    function actualizar(dt, api) {
      const L = disposicion(api);
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vida -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vida <= 0) particulas.splice(i, 1);
      }
      quemadura = Math.max(0, quemadura - dt);
      animBocado = Math.max(0, animBocado - dt);
      masticar = Math.max(0, masticar - dt);
      boing = Math.max(0, boing - dt);
      if (final) {                                    // se ha comido los 30: la bola rueda y, al poco, se gana
        if (api.t - final.t0 > 1.5 && !final.ganado) { final.ganado = true; api.ganar(); }
        api.entrada.pulsado('accion'); api.entrada.pulsado('toque');
        return;
      }

      quedan -= dt;
      if (quedan <= 0) {
        quedan = 0;
        guardarRecord();
        api.perder((datos.derrota || 'SOLO {n} CANELONES...').replace('{n}', comidos));
        return;
      }
      llegada = Math.max(0, llegada - dt);
      if (!llegada) calor = Math.max(0, calor - dt);

      const pulsado = api.entrada.pulsado('accion');
      api.entrada.pulsado('toque');
      if (!pulsado || llegada > 0 || quemadura > 0) return;   // mientras se le pasa la quemadura, no come

      const hb = cabezaY();
      const [bx, by] = aLienzo(L, 160, hb - 8);
      if (calor > 0) {                                  // ¡quema!: fuego por la boca y 2 segundos menos
        quemadura = 0.9; calor = 0;                     // (una sola quemadura por canelón: luego ya está templado)
        quedan = Math.max(0, quedan - PENALIZACION);
        Sonido.efecto('quema');
        api.sacudir(0.25);
        api.aviso('¡QUEMA! -' + PENALIZACION + ' S', bx, by - 34 * L.K, C.rojoClaro);
        return;
      }
      bocados++;
      animBocado = T_BOCADO; masticar = 0.35;
      Sonido.efecto('nam');
      for (let i = 0; i < 2; i++)                       // migas que caen de la boca
        particula(160 + (Math.random() - 0.5) * 8, hb + 2, (Math.random() - 0.5) * 30, 10 + Math.random() * 20,
                  Math.random() < 0.5 ? '#f3e2b0' : '#c8383f', 0.5, 200);
      if (bocados < BOCADOS) return;

      bocados = 0; comidos++;
      const nueva = Math.min(6, Math.floor(comidos / 5));
      if (nueva > fase) {
        fase = nueva; boing = 0.45;
        Sonido.efecto('boing');
        if (fase === 3)                                  // salta un botón del abrigo
          particula(160 + 2, MESA_Y - TRIPA_Y[3] * 1.2, 90, -150, C.oro, 1.6, 260);
        if (FRASES[fase]) api.aviso(FRASES[fase], bx, by - 40 * L.K, C.oroClaro);
      }
      if (comidos >= TOTAL) {
        final = { t0: api.t, ganado: false };
        guardarRecord();
        api.aviso('¡BURP!', bx, by - 40 * L.K, C.oroClaro);
        return;
      }
      llegada = T_LLEGAR;
      calor = calientes.has(comidos) ? T_CALOR : 0;
    }

    /* ---------- Dibujo: fondo (papel pintado), cacheado por tamaño ---------- */
    let fondo = null, claveFondo = '';
    function pintarFondo(ctx, api, L) {
      const clave = api.ancho + 'x' + api.alto + 'x' + L.K;
      if (clave !== claveFondo) {
        claveFondo = clave;
        const [cv, g] = Sprites.lienzoAux(api.ancho, api.alto);
        const K = L.K;
        g.fillStyle = '#2f5d47'; g.fillRect(0, 0, api.ancho, api.alto);
        for (let x = L.ox % (12 * K) - 12 * K; x < api.ancho; x += 12 * K) {        // rayas del papel pintado
          g.fillStyle = '#3c6e55'; g.fillRect(x, 0, 4 * K, api.alto);
          g.fillStyle = '#4a7d62'; g.fillRect(x + K, 0, K, api.alto);
        }
        // sombra tramada arriba (en píxeles de la escena, para que la trama tenga el mismo tamaño)
        const [cv2, g2] = Sprites.lienzoAux(Math.ceil(api.ancho / K), 40);
        Sprites.tramar(g2, 0, 0, cv2.width, 40, '#1f4332', (x, y) => 0.9 * (1 - y / 40));
        g.drawImage(cv2, 0, 0, cv2.width * K, 40 * K);
        fondo = cv;
      }
      ctx.drawImage(fondo, 0, 0);
    }

    /* ---------- Dibujo: piezas en coordenadas de la escena ---------- */
    const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    function elipse(ctx, cx, cy, rx, ry, color) {
      ctx.fillStyle = color;
      for (let dy = -ry; dy <= ry; dy++) {
        const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
        ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), 2 * w + 1, 1);
      }
    }

    let cieloVentana = null;
    function ventana(ctx, t) {
      const x0 = 22, y0 = 30, w = 64, h = 68;
      R(ctx, '#5c3414', x0 - 4, y0 - 4, w + 8, h + 8);
      if (!cieloVentana) {                               // cielo tramado, pintado una sola vez
        const [cv, g] = Sprites.lienzoAux(w, h);
        const tonos = ['#05060f', '#0b1030', '#1b2350', '#2c2a5e'];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            g.fillStyle = tonos[Math.min(3, Math.floor((y / h) * 3 + Sprites.umbral(x, y)))];
            g.fillRect(x, y, 1, 1);
          }
        cieloVentana = cv;
      }
      ctx.drawImage(cieloVentana, x0, y0);
      ctx.fillStyle = '#ffe9a0'; Sprites.disco(ctx, x0 + 46, y0 + 14, 6);
      ctx.fillStyle = '#05060f'; Sprites.disco(ctx, x0 + 49, y0 + 12, 5);           // luna creciente
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 22; i++) {                                                // nieve
        const x = x0 + ((i * 37 + Math.floor(Math.sin(t + i) * 2)) % w + w) % w;
        const y = y0 + Math.floor((i * 23 + t * (10 + (i % 4) * 4)) % h);
        ctx.fillRect(x, y, 1, 1);
      }
      R(ctx, '#f4f8ff', x0, y0 + h - 4, w, 4);                                       // nieve en el alféizar de fuera
      R(ctx, '#5c3414', x0 + w / 2 - 1, y0, 3, h); R(ctx, '#5c3414', x0, y0 + h / 2 - 1, w, 3);   // cruz
      R(ctx, '#cfc8bd', x0 - 7, y0 + h + 4, w + 14, 4); R(ctx, '#8c857b', x0 - 7, y0 + h + 7, w + 14, 1);
      for (const cx of [x0 - 10, x0 + w + 2]) {                                     // cortinas
        R(ctx, C.rojo, cx, y0 - 8, 10, h + 12);
        for (let k = 2; k < 10; k += 3) R(ctx, C.rojoOsc, cx + k, y0 - 8, 1, h + 12);
        R(ctx, C.oro, cx, y0 + 30, 10, 2);
      }
      R(ctx, '#5c3414', x0 - 14, y0 - 10, w + 28, 3);                              // barra de la cortina
    }

    function reloj(ctx) {
      const cx = 262, cy = 56;
      ctx.fillStyle = '#5c3414'; Sprites.disco(ctx, cx, cy, 17);
      ctx.fillStyle = C.crema; Sprites.disco(ctx, cx, cy, 14);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        R(ctx, '#5c3414', cx + Math.round(Math.sin(a) * 11), cy - Math.round(Math.cos(a) * 11), 1, 1);
      }
      // la aguja marca el tiempo que queda (una vuelta = toda la partida)
      const a = (1 - quedan / TIEMPO) * Math.PI * 2;
      for (let r = 0; r < 10; r++) R(ctx, quedan < 10 ? C.rojo : C.tinta, cx + Math.round(Math.sin(a) * r), cy - Math.round(Math.cos(a) * r), 1, 1);
      R(ctx, C.tinta, cx, cy - 6, 1, 6);                                             // aguja corta, fija en las 12
      R(ctx, C.oro, cx - 1, cy - 1, 3, 3);
    }

    function guirnalda(ctx, t) {
      const luces = ['#ff5c5c', '#ffd24a', '#5cd6ff', '#7dff7a', '#ff8ad8'];
      for (let x = -40; x < 360; x++) {
        const y = 10 + Math.round(Math.abs(Math.sin(x / 26)) * 8);
        R(ctx, '#1f4d33', x, y, 1, 2);
        if (x % 13 === 0) {
          const i = ((x / 13) % 5 + 5) % 5, on = (Math.floor(t * 2) + i) % 3;
          R(ctx, on ? luces[i] : '#5a4a50', x - 1, y + 2, 3, 3);
        }
      }
    }

    function silla(ctx) {
      R(ctx, '#5c3414', 128, 92, 64, 6); R(ctx, '#8f5524', 128, 92, 64, 2);
      R(ctx, '#5c3414', 130, 98, 6, 72); R(ctx, '#5c3414', 184, 98, 6, 72);
      for (const x of [146, 157, 168]) R(ctx, '#7a4520', x, 98, 5, 70);
    }

    // Tripa / cuerpo (elipse con abrigo rojo y sombreado tramado), cacheada por tamaño y fase
    const cuerpos = new Map();
    function cuerpo(rx, ry, f, bola) {
      rx = Math.round(rx); ry = Math.round(ry);
      const clave = rx + '|' + ry + '|' + f + '|' + (bola ? 1 : 0);
      if (cuerpos.has(clave)) return cuerpos.get(clave);
      if (cuerpos.size > 80) cuerpos.clear();
      const [cv, g] = Sprites.lienzoAux(2 * rx + 1, 2 * ry + 1);
      // desde la fase 4 el abrigo ya no llega y asoma la tripa
      const piel = bola ? -9 : [9, 9, 9, 9, 0.38, 0.18, 0.02][f];
      for (let dy = -ry; dy <= ry; dy++)
        for (let dx = -rx; dx <= rx; dx++) {
          const nx = dx / rx, ny = dy / ry, d = nx * nx + ny * ny;
          if (d > 1) continue;
          const u = Sprites.umbral(dx + rx, dy + ry);
          const luz = 0.62 - 0.4 * nx - 0.35 * ny + (u - 0.5) * 0.35;
          const esPiel = ny > piel && Math.abs(nx) < 0.82 - (ny - piel) * 0.2;
          let c;
          if (esPiel) c = luz > 0.75 ? '#ffe0c4' : luz < 0.28 ? PIEL_OSC : PIEL;
          else c = d > 0.9 ? ABRIGO_OSC : luz > 0.82 ? ABRIGO_LUZ : luz < 0.25 ? ABRIGO_OSC : ABRIGO;
          g.fillStyle = c; g.fillRect(dx + rx, dy + ry, 1, 1);
        }
      if (!bola) {
        if (piel < 1) {                                  // borde del abrigo y ombligo
          const yb = Math.round(piel * ry) + ry;
          g.fillStyle = ABRIGO_OSC;
          for (let dx = -rx; dx <= rx; dx++) {
            const nx = dx / rx, ny = piel;
            if (nx * nx + ny * ny <= 1 && Math.abs(nx) < 0.84) g.fillRect(dx + rx, yb - 1, 1, 2);
          }
          g.fillStyle = PIEL_OSC; g.fillRect(rx - 1, Math.round(ry * (1 + Math.max(piel, 0) * 0.5 + 0.35)), 3, 2);
          g.fillStyle = '#b07858'; g.fillRect(rx, Math.round(ry * (1 + Math.max(piel, 0) * 0.5 + 0.35)), 1, 1);
        }
        // botones dorados (el de abajo salta en la fase 3)
        const botones = [-0.55, -0.2, 0.15].filter((b, i) => (f < 3 || i < 2) && b < piel - 0.08);
        for (const b of botones) {
          const y = Math.round(ry + b * ry);
          g.fillStyle = C.oro; g.fillRect(rx - 1, y, 2, 2);
          g.fillStyle = '#b88a1e'; g.fillRect(rx, y + 1, 1, 1);
        }
      }
      cuerpos.set(clave, cv);
      return cv;
    }

    // Cabeza de frente. (x, hb) = centro de la barbilla. gesto: 'normal' | 'comer' | 'masticar' | 'quemada' | 'llena'
    function cabeza(ctx, x, hb, gesto, t) {
      const mof = Math.min(4, fase * 0.7) + (gesto === 'masticar' ? 1 : 0);
      // pelo de detrás (media melena)
      elipse(ctx, x, hb - 19, 16, 13, P.pelo);
      R(ctx, P.pelo, x - 16, hb - 20, 6, 18); R(ctx, P.pelo, x + 10, hb - 20, 6, 18);
      R(ctx, P.peloOsc, x - 16, hb - 3, 6, 1); R(ctx, P.peloOsc, x + 10, hb - 3, 6, 1);
      R(ctx, P.peloOsc, x + 13, hb - 20, 3, 17);
      // cara (los mofletes se hinchan con la tripa)
      elipse(ctx, x, hb - 12, 11, 11, PIEL);
      elipse(ctx, x - 6, hb - 7, 3 + mof / 2, 3 + mof / 3, PIEL);
      elipse(ctx, x + 6, hb - 7, 3 + mof / 2, 3 + mof / 3, PIEL);
      R(ctx, PIEL_OSC, x - 5, hb, 11, 1);
      // flequillo
      elipse(ctx, x, hb - 25, 13, 5, P.pelo);
      R(ctx, P.pelo, x - 12, hb - 25, 25, 6);
      R(ctx, P.peloOsc, x - 12, hb - 20, 25, 1);
      for (const k of [-7, -2, 4, 9]) R(ctx, P.peloOsc, x + k, hb - 22, 1, 2);
      R(ctx, P.peloClaro, x - 8, hb - 28, 6, 1); R(ctx, P.peloClaro, x - 9, hb - 27, 2, 1);
      // ojos
      const parpadeo = (t % 3.2) > 3.08;
      if (gesto === 'quemada') {                         // > <
        for (const [ox, s] of [[-6, 1], [4, -1]]) {
          R(ctx, P.ojo, x + ox + (s > 0 ? 0 : 2), hb - 17, 1, 1); R(ctx, P.ojo, x + ox + 1, hb - 16, 1, 1);
          R(ctx, P.ojo, x + ox + (s > 0 ? 0 : 2), hb - 15, 1, 1);
        }
      } else if (gesto === 'llena' || parpadeo) {
        R(ctx, P.ojo, x - 7, hb - 15, 3, 1); R(ctx, P.ojo, x + 4, hb - 15, 3, 1);
      } else if (gesto === 'masticar') {                 // ojos felices ^ ^
        for (const ox of [-7, 4]) { R(ctx, P.ojo, x + ox, hb - 15, 1, 1); R(ctx, P.ojo, x + ox + 1, hb - 16, 1, 1); R(ctx, P.ojo, x + ox + 2, hb - 15, 1, 1); }
      } else {
        R(ctx, P.ojo, x - 6, hb - 17, 2, 3); R(ctx, P.ojo, x + 4, hb - 17, 2, 3);
        R(ctx, '#ffffff', x - 6, hb - 17, 1, 1); R(ctx, '#ffffff', x + 4, hb - 17, 1, 1);
      }
      // mejillas
      const rubor = gesto === 'quemada' ? C.rojo : RUBOR;
      const anchoRubor = gesto === 'quemada' ? 4 : 3;
      R(ctx, rubor, x - 9 - Math.floor(mof / 2), hb - 11, anchoRubor, gesto === 'quemada' ? 2 : 1);
      R(ctx, rubor, x + 6 + Math.floor(mof / 2), hb - 11, anchoRubor, gesto === 'quemada' ? 2 : 1);
      // boca
      if (gesto === 'comer' || gesto === 'quemada') {
        R(ctx, '#6a1f1f', x - 2, hb - 8, 5, 4); R(ctx, '#e07070', x - 1, hb - 6, 3, 2);
      } else if (gesto === 'masticar') {
        const m = Math.floor(t * 14) % 2;
        R(ctx, P.boca, x - 2 + m, hb - 6, 3, 1);
      } else if (gesto === 'llena') {
        R(ctx, P.boca, x - 3, hb - 6, 7, 1); R(ctx, P.boca, x - 4, hb - 7, 1, 1); R(ctx, P.boca, x + 4, hb - 7, 1, 1);
      } else {
        R(ctx, P.boca, x - 2, hb - 6, 5, 1); R(ctx, P.boca, x - 3, hb - 7, 1, 1); R(ctx, P.boca, x + 3, hb - 7, 1, 1);
      }
      // bufanda (crema con rayas verdes, como en el juego)
      R(ctx, P.crema, x - 11, hb - 1, 22, 5);
      for (const k of [-7, -1, 5]) R(ctx, P.verde, x + k, hb - 1, 2, 5);
      R(ctx, '#d8d0b8', x - 11, hb + 3, 22, 1);
    }

    // Brazo grueso de (x0, y0) a (x1, y1) con la mano al final
    function brazo(ctx, x0, y0, x1, y1) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      const punto = (i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n];
      for (let i = 0; i <= n; i++) { const [x, y] = punto(i); R(ctx, ABRIGO_OSC, x - 3, y - 3, 7, 7); }
      for (let i = 0; i <= n; i++) { const [x, y] = punto(i); R(ctx, ABRIGO, x - 2, y - 3, 5, 5); }
      for (let i = 0; i <= n; i += 3) { const [x, y] = punto(i); R(ctx, ABRIGO_LUZ, x - 2, y - 3, 2, 1); }
      const [px, py] = punto(n - 2);
      R(ctx, P.crema, px - 3, py - 3, 7, 3);                     // puño
      R(ctx, PIEL_OSC, x1 - 3, y1 - 2, 6, 6); R(ctx, PIEL, x1 - 3, y1 - 2, 5, 5);
    }

    // Canelón horizontal centrado en (x, y). f: lo que queda (1, 2/3, 1/3). escala 1 = 30x10
    function canelon(ctx, x, y, f, mini) {
      if (mini) {
        R(ctx, '#d8bf84', x, y + 2, 10, 2); R(ctx, '#f3e2b0', x, y, 10, 3); R(ctx, '#fff7e0', x + 1, y, 8, 1);
        R(ctx, '#c08a3a', x + 3, y, 1, 1); R(ctx, '#c08a3a', x + 7, y + 1, 1, 1);
        R(ctx, C.rojo, x, y + 1, 1, 2); R(ctx, C.rojo, x + 9, y + 1, 1, 2);
        return;
      }
      const L = 30, w = Math.max(3, Math.round(L * f)), x0 = Math.round(x - L / 2), y0 = Math.round(y - 5);
      R(ctx, '#d8bf84', x0, y0 + 7, w, 3);                       // pasta (parte baja, en sombra)
      R(ctx, '#f3e2b0', x0, y0 + 2, w, 5);                       // pasta
      R(ctx, '#fff7e0', x0 + 1, y0, w - 1, 3);                   // bechamel
      for (const [gx, gy] of [[4, 1], [9, 0], [13, 2], [18, 1], [23, 0], [26, 2], [7, 3], [21, 3]])
        if (gx < w - 1) R(ctx, gy % 2 ? '#c08a3a' : '#8c5a24', x0 + gx, y0 + gy, 2, 1);   // gratinado
      R(ctx, '#d8bf84', x0, y0 + 1, 1, 9);                       // extremo izquierdo
      R(ctx, C.rojo, x0 - 1, y0 + 4, 2, 4);                      // tomate
      if (f < 1) {                                               // mordido: se ve el relleno
        R(ctx, '#f3e2b0', x0 + w - 1, y0 + 1, 2, 9);
        R(ctx, '#7a4a2a', x0 + w - 1, y0 + 3, 2, 5); R(ctx, '#a0663a', x0 + w - 1, y0 + 4, 1, 2);
      } else {
        R(ctx, '#d8bf84', x0 + w - 1, y0 + 1, 1, 9); R(ctx, C.rojo, x0 + w - 1, y0 + 4, 2, 4);
      }
    }

    function plato(ctx) {
      elipse(ctx, PLATO.x, PLATO.y + 1, 30, 9, '#8e9ecb');
      elipse(ctx, PLATO.x, PLATO.y, 30, 9, C.nieve);
      elipse(ctx, PLATO.x, PLATO.y, 22, 6, C.nieve2);
      elipse(ctx, PLATO.x, PLATO.y + 1, 17, 4, '#a82a2a');           // salsa de tomate
      R(ctx, C.nieve3, PLATO.x - 30, PLATO.y, 1, 1); R(ctx, C.nieve3, PLATO.x + 30, PLATO.y, 1, 1);
    }

    function bandeja(ctx, quedanEnBandeja) {
      const { x, y } = BANDEJA;
      R(ctx, '#5e5850', x - 1, y - 1, 78, 32); R(ctx, '#b9b2a6', x, y, 76, 30); R(ctx, '#8c857b', x + 2, y + 2, 72, 26);
      R(ctx, '#a83a2a', x + 3, y + 3, 70, 24);
      R(ctx, '#d9d2c6', x, y, 76, 1);
      for (let i = 0; i < quedanEnBandeja; i++) {
        const fila = Math.floor(i / 6), col = i % 6;
        canelon(ctx, x + 4 + col * 12, y + 4 + fila * 5, 1, true);
      }
    }

    function vaso(ctx) {
      const x = 76, y = 178;
      R(ctx, '#9fd0ff', x, y, 12, 18); R(ctx, '#cfe4ff', x + 1, y, 10, 17);
      R(ctx, '#5a8fe0', x + 1, y + 7, 10, 10); R(ctx, '#9fd0ff', x + 2, y + 7, 2, 9);
      R(ctx, '#ffffff', x + 2, y + 1, 1, 5);
      R(ctx, '#f3ecd8', x - 22, y + 12, 16, 10); R(ctx, '#d8d0b8', x - 22, y + 21, 16, 1);   // servilleta
    }

    // Vapor sobre el canelón del plato: rojo si está ardiendo, blanco y suave si no
    function vapor(ctx, t) {
      const rojo = calor > 0;
      for (let k = 0; k < (rojo ? 5 : 3); k++) {
        const f = (t * (rojo ? 1.6 : 0.8) + k / (rojo ? 5 : 3)) % 1;
        ctx.globalAlpha = (rojo ? 0.95 : 0.5) * (1 - f);
        const hx = PLATO.x - 10 + k * (rojo ? 5 : 9) + Math.round(Math.sin(t * 4 + k * 2) * 2);
        R(ctx, rojo ? (k % 2 ? '#ff5c5c' : '#ff9a8a') : '#ffffff', hx, PLATO.y - 12 - f * 16, rojo ? 2 : 1, 3);
      }
      ctx.globalAlpha = 1;
      if (rojo) {                                        // aviso de "¡quema!"
        const by = PLATO.y - 36 + (Math.floor(t * 4) % 2);
        R(ctx, C.tinta, PLATO.x - 5, by - 1, 10, 12); R(ctx, C.rojoClaro, PLATO.x - 4, by, 8, 10);
        R(ctx, '#ffffff', PLATO.x - 1, by + 2, 2, 4); R(ctx, '#ffffff', PLATO.x - 1, by + 7, 2, 2);
      }
    }

    // Henar sentada (cuerpo, cabeza y brazo izquierdo). Devuelve dónde está la barbilla.
    function henarSentada(ctx, t) {
      const rx = anchoTripa(), ry = altoTripa();
      const cy = MESA_Y + 4 - ry, hb = Math.round(cy - ry + 8);
      // hombros (con la tripa pequeña se ven por encima de la elipse)
      R(ctx, ABRIGO_OSC, 160 - 16, hb + 1, 32, 10); R(ctx, ABRIGO, 160 - 15, hb + 1, 30, 9);
      const img = cuerpo(rx, ry, fase, false);
      ctx.drawImage(img, Math.round(160 - img.width / 2), Math.round(cy - img.height / 2));
      const gesto = quemadura > 0 ? 'quemada' : animBocado > T_BOCADO * 0.4 ? 'comer' : masticar > 0 ? 'masticar' : fase >= 5 ? 'llena' : 'normal';
      cabeza(ctx, 160, hb, gesto, t);
      return { rx, ry, cy, hb };
    }

    // Brazo derecho con el tenedor: va del plato a la boca en cada bocado
    function brazoTenedor(ctx, cuerpoH) {
      const { rx, ry, cy, hb } = cuerpoH;
      const p = animBocado > 0 ? 1 - animBocado / T_BOCADO : 0, sube = Math.sin(p * Math.PI);
      const hombro = Math.max(14, rx * 0.8), hy = cy - ry * 0.4 < hb + 6 ? hb + 6 : cy - ry * 0.4;
      // brazo izquierdo, apoyado en la mesa
      brazo(ctx, 160 - hombro, hy, 160 - Math.max(30, rx + 6), MESA_Y + 12 - (MESA_Y + 12 - cy) * fase / 7);   // con la tripa grande, la mano ya no llega a la mesa
      const hx0 = PLATO.x + 30, hy0 = PLATO.y - 8, hx1 = 170, hy1 = hb - 5;
      const hx = hx0 + (hx1 - hx0) * sube, hy2 = hy0 + (hy1 - hy0) * sube;
      brazo(ctx, 160 + hombro, hy, hx, hy2);
      // tenedor (hacia la izquierda), con un trocito de canelón cuando sube
      R(ctx, '#b9b2a6', hx - 10, hy2, 8, 1); R(ctx, '#8c857b', hx - 10, hy2 + 1, 8, 1);
      for (let k = 0; k < 3; k++) R(ctx, '#b9b2a6', hx - 14, hy2 - 1 + k, 4, 1);
      if (sube > 0.2) { R(ctx, '#f3e2b0', hx - 15, hy2 - 3, 4, 3); R(ctx, '#7a4a2a', hx - 14, hy2 - 2, 2, 1); }
    }

    // La bola rodando por la mesa (final). tf = segundos desde que se comió el último.
    function bola(ctx, tf, t) {
      const r = TRIPA_Y[6], ySentada = MESA_Y + 4 - r, ySuelo = 240 - r;
      let x = 160, y = ySentada, ang = 0, sx = 1;
      if (tf < 0.5) sx = 1 + 0.06 * Math.sin(tf * 40);                 // tiembla
      else if (tf < 0.95) {                                              // salta por encima de la mesa
        const p = (tf - 0.5) / 0.45;
        y = ySentada + (ySuelo - ySentada) * p - Math.sin(p * Math.PI) * 34;
      } else {                                                           // rueda de lado a lado
        y = ySuelo;
        x = 160 + Math.sin((tf - 0.95) * 1.7) * 96;
        ang = (x - 160) / r;
      }
      const img = cuerpo(TRIPA_X[6] * sx, r / sx, 6, true);
      const punto = (a, d) => [x + Math.sin(a) * d, y - Math.cos(a) * d];
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
      // tripa al aire con el ombligo, y los dos botones que quedan: giran con la bola
      const [nx, ny] = punto(ang + Math.PI * 0.85, r * 0.5);
      elipse(ctx, nx, ny, 17, 14, PIEL_OSC); elipse(ctx, nx, ny, 16, 13, PIEL);
      R(ctx, '#ffe0c4', nx - 8, ny - 9, 6, 2);
      R(ctx, PIEL_OSC, nx - 1, ny, 3, 2); R(ctx, '#b07858', nx, ny, 1, 1);
      for (const k of [0.35, 0.65]) { const [bx, by] = punto(ang + k, r * 0.62); R(ctx, C.oro, bx - 1, by - 1, 3, 3); }
      // piernas y brazos cortitos, asomando
      for (const a of [ang + Math.PI - 0.5, ang + Math.PI + 0.5]) {
        const [px, py] = punto(a, r + 1);
        R(ctx, P.mallaCerca, px - 3, py - 3, 7, 7); R(ctx, P.bota, px - 4, py + 1, 8, 4); R(ctx, P.crema, px - 4, py + 1, 8, 1);
      }
      for (const a of [ang - 1.45, ang + 1.45]) {
        const [px, py] = punto(a, TRIPA_X[6] * sx + 1);
        R(ctx, ABRIGO_OSC, px - 4, py - 4, 8, 8); R(ctx, ABRIGO, px - 3, py - 4, 6, 6); R(ctx, PIEL, px - 2, py - 1, 5, 5);
      }
      const [hx, hy] = punto(ang, r - 2);
      cabeza(ctx, Math.round(hx), Math.round(hy) + 6, 'llena', t);
    }

    function dibujar(ctx, api) {
      const L = disposicion(api), t = api.t;
      pintarFondo(ctx, api, L);
      ctx.save();
      ctx.translate(L.ox, L.oy); ctx.scale(L.K, L.K);
      guirnalda(ctx, t);
      ventana(ctx, t);
      reloj(ctx);
      silla(ctx);
      const tf = final ? t - final.t0 : -1;
      const enSilla = !final || tf < 0.5;
      const cuerpoH = enSilla && !final ? henarSentada(ctx, t) : null;
      ctx.restore();

      // mesa con mantel de cuadros, a todo lo ancho
      const yMesa = L.oy + MESA_Y * L.K, lado = 6 * L.K;
      ctx.fillStyle = '#f3ecd8'; ctx.fillRect(0, yMesa, api.ancho, api.alto - yMesa);
      for (let fila = 0; yMesa + fila * lado < api.alto; fila++)
        for (let col = 0, x = L.ox % (2 * lado) - 2 * lado; x < api.ancho; col++, x += lado) {
          const a = fila % 2, b = col % 2;
          if (!a && !b) continue;
          ctx.fillStyle = a && b ? C.rojoOsc : '#e07a7c';
          ctx.fillRect(x, yMesa + fila * lado, lado, lado);
        }
      ctx.fillStyle = '#9c2630'; ctx.fillRect(0, yMesa, api.ancho, L.K);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, yMesa + L.K, api.ancho, 2 * L.K);

      ctx.save();
      ctx.translate(L.ox, L.oy); ctx.scale(L.K, L.K);
      vaso(ctx);
      plato(ctx);
      const enBandeja = Math.max(0, TOTAL - comidos - (final ? 0 : 1));
      bandeja(ctx, Math.min(30, enBandeja));
      if (!final) {
        // el canelón del plato (llega deslizándose desde la bandeja)
        const p = llegada > 0 ? 1 - llegada / T_LLEGAR : 1;
        const cx = BANDEJA.x + 30 + (PLATO.x - BANDEJA.x - 30) * p, cy = BANDEJA.y + 6 + (PLATO.y - 2 - BANDEJA.y - 6) * p - Math.sin(p * Math.PI) * 10;
        canelon(ctx, cx, cy, 1 - bocados / BOCADOS, false);
        if (llegada <= 0) vapor(ctx, t);
        if (cuerpoH) brazoTenedor(ctx, cuerpoH);
        if (quemadura > 0 && cuerpoH) {                     // fuego por la boca
          for (let i = 0; i < 3; i++)
            particula(160 + (Math.random() - 0.5) * 4, cuerpoH.hb - 6, (Math.random() - 0.5) * 60, -60 - Math.random() * 60,
                      ['#ffd24a', '#f08a2c', '#e8384f'][i], 0.35, -40);
        }
      } else bola(ctx, tf, t);
      for (const q of particulas) {
        ctx.globalAlpha = Math.min(1, q.vida * 3);
        R(ctx, q.color, q.x, q.y, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      marcadores(ctx, api);
    }

    function marcadores(ctx, api) {
      const e = api.textoEscala, alto = Comun.altoTexto(e) + 8;
      const t1 = `CANELONES ${comidos}/${TOTAL}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, alto);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      if (record) {
        const t3 = `RECORD ${record}`;
        Comun.caja(ctx, 6, 6 + alto + 6, Comun.medir(t3, e) + 8, alto);
        texto(ctx, t3, 10, 10 + alto + 6, C.lila, { escala: e });
      }
      const anchoBarra = 60, anchoNum = Comun.medir('40', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = Comun.medir(t1, e) + 22; }
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + (alto + 6) * (record ? 2 : 1); }
      Comun.caja(ctx, x2, y2, w2, alto);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, alto - 8);
      ctx.fillStyle = quedan < 10 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * quedan / TIEMPO), alto - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    // Solo en modo debug: estado del juego, para las pruebas
    if (Dias.debug) window.canelonesIr = (n) => { comidos = n; fase = Math.min(6, Math.floor(n / 5)); };   // salta a n canelones comidos
    if (Dias.debug) window.canelonesDebug = () => ({ comidos, bocados, quedan, calor, fase, llegada, final: !!final, calientes: [...calientes] });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: (datos.titulo || 'Los canelones').toUpperCase(),
      instruccion: datos.instruccion || 'COMETE 30 CANELONES ANTES DE QUE SE ACABE EL TIEMPO.',
      pantallaCompleta: true,
      musica: 'canelones',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
