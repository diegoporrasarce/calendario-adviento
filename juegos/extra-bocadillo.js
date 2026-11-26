'use strict';
/* Juego extra — El bocadillo kilométrico (ventanilla de los bocadillos, planta baja, entre las puertas 2 y 3;
   se puede jugar cualquier día). Un bocadillo larguísimo pasa por la tabla de cortar y Henar tiene que
   partirlo en 15 raciones: Espacio (o tocar) cuando una marca verde ▼ pasa bajo el cuchillo.
   Si se le escapa una marca o corta un palillo (bandera roja), pierde un bocadillo de los 3 que tiene. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['extra-bocadillo'] = {
  iniciarJuego(contenedor, alTerminar, datos = {}) {
    const { PALETA: C, texto } = Comun;
    const RACIONES = 15, VIDAS = 3, PALILLOS = 4;
    const VEL0 = 30, VEL1 = 54;                  // velocidad del bocadillo (px de escena/s), sube con cada ración
    const VENTANA = 6, PERFECTO = 2;             // margen para acertar el corte, y para que sea perfecto
    const T_CUCHILLO = 0.22;                     // lo que tarda el cuchillo en bajar y subir
    const CUCHILLO_X = 176;
    const PAN_Y = 130, RELLENO_Y = 146, PAN_ABAJO = 154, TABLA_Y = 162, MOSTRADOR_Y = 170;
    const CLAVE = Dias.debug ? 'adviento.bocadillo.debug' : 'adviento.bocadillo';
    const INGREDIENTES = [
      { base: '#e88a96', punto: '#f6d0d6' },     // jamón
      { base: '#ffd24a', punto: '#f0b42a' },     // queso
      { base: '#f6d36a', punto: '#d89a3a' },     // tortilla
      { base: '#b8323a', punto: '#e06a6a' },     // chorizo
      { base: '#c8383f', punto: '#f08080' }      // tomate
    ];

    let xIzq, largo, marcas, palillos, porciones, cortes, vidas, cortadas, perfectas, cuchillo, particulas, fin, tiempo;

    function reiniciar() {
      // raciones de largo variable, cada una con su relleno
      marcas = []; porciones = [];
      let s = 26;
      porciones.push({ desde: 0, ing: INGREDIENTES[Math.floor(Math.random() * INGREDIENTES.length)] });
      for (let i = 0; i < RACIONES; i++) {
        s += 32 + Math.floor(Math.random() * 18);
        marcas.push({ s, estado: 'pendiente' });               // pendiente | cortada | perdida
        porciones.push({ desde: s, ing: INGREDIENTES[Math.floor(Math.random() * INGREDIENTES.length)] });
      }
      largo = s + 30;
      // palillos en mitad de algunas raciones (nunca en la primera)
      palillos = [];
      const elegidas = new Set();
      while (elegidas.size < PALILLOS) elegidas.add(1 + Math.floor(Math.random() * (RACIONES - 1)));
      for (const i of elegidas) palillos.push({ s: Math.round((marcas[i - 1].s + marcas[i].s) / 2), estado: 'puesto' });
      xIzq = CUCHILLO_X + 34 - 26;                              // la primera marca llega al cuchillo enseguida
      cortes = []; vidas = VIDAS; cortadas = 0; perfectas = 0; cuchillo = 0; particulas = []; fin = null; tiempo = 0;
    }

    /* ---------- Disposición: la escena de 320x240 escalada (K entero) y centrada ---------- */
    function disposicion(api) {
      const K = Math.max(1, Math.floor(Math.min(api.ancho / 320, api.alto / 240)));
      return { K, ox: Math.floor((api.ancho - 320 * K) / 2), oy: Math.floor((api.alto - 240 * K) / 2) };
    }
    const aLienzo = (L, x, y) => [L.ox + x * L.K, L.oy + y * L.K];

    /* ---------- Lógica ---------- */
    const tratadas = () => marcas.filter(m => m.estado !== 'pendiente').length;
    const velocidad = () => VEL0 + (VEL1 - VEL0) * tratadas() / RACIONES;
    // posición en pantalla de un punto s del bocadillo (los trozos ya cortados se separan un poco hacia la izquierda)
    function xDe(s) {
      let x = xIzq + s;
      for (const c of cortes) if (s < c.s) x -= c.hueco;
      return x;
    }

    function particula(x, y, vx, vy, color, vida, g = 300) { particulas.push({ x, y, vx, vy, color, vida, g }); }

    function perderVida(api, L, mensaje) {
      vidas--;
      Sonido.efecto('golpe');
      api.sacudir(0.25);
      const [ax, ay] = aLienzo(L, CUCHILLO_X, PAN_Y - 30);
      api.aviso(mensaje, ax, ay, C.rojoClaro);
      if (vidas <= 0) {
        guardar();
        api.perder(datos.derrota || 'TE HAS QUEDADO SIN BOCADILLOS');
      }
    }

    function guardar() { try { localStorage.setItem(CLAVE, '1'); } catch (e) { /* sin almacenamiento */ } }

    function actualizar(dt, api) {
      const L = disposicion(api);
      tiempo += dt;
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vida -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vida <= 0) particulas.splice(i, 1);
      }
      for (const c of cortes) c.hueco = Math.min(6, c.hueco + dt * 40);
      cuchillo = Math.max(0, cuchillo - dt);
      xIzq -= velocidad() * dt;

      if (fin) {
        api.entrada.pulsado('accion'); api.entrada.pulsado('toque');
        if (!fin.ganado && tiempo - fin.t > 0.9) { fin.ganado = true; api.ganar(); }
        return;
      }

      // marcas que se escapan sin cortar
      for (const m of marcas)
        if (m.estado === 'pendiente' && xDe(m.s) < CUCHILLO_X - VENTANA - 1) {
          m.estado = 'perdida';
          perderVida(api, L, '¡SE TE HA ESCAPADO!');
          if (vidas <= 0) return;
        }

      const pulsado = api.entrada.pulsado('accion');
      api.entrada.pulsado('toque');
      if (pulsado && cuchillo <= 0) {
        cuchillo = T_CUCHILLO;
        let mejor = null;
        for (const m of marcas) {
          if (m.estado !== 'pendiente') continue;
          const d = Math.abs(xDe(m.s) - CUCHILLO_X);
          if (d <= VENTANA && (!mejor || d < mejor.d)) mejor = { m, d };
        }
        const palillo = palillos.find(p => p.estado === 'puesto' && Math.abs(xDe(p.s) - CUCHILLO_X) <= VENTANA);
        const [ax, ay] = aLienzo(L, CUCHILLO_X, PAN_Y - 30);
        if (palillo && (!mejor || Math.abs(xDe(palillo.s) - CUCHILLO_X) < mejor.d)) {
          palillo.estado = 'saltado';
          particula(CUCHILLO_X, PAN_Y - 10, 60, -160, '#c08a3a', 1.2);            // el palillo sale volando
          particula(CUCHILLO_X + 1, PAN_Y - 14, 70, -170, '#5a7a2a', 1.2);
          perderVida(api, L, '¡EL PALILLO!');
          if (vidas <= 0) return;
        } else if (mejor) {
          mejor.m.estado = 'cortada';
          cortes.push({ s: mejor.m.s, hueco: 0 });
          cortadas++;
          const perfecto = mejor.d <= PERFECTO;
          if (perfecto) perfectas++;
          Sonido.efecto('corte');
          api.aviso(perfecto ? '¡PERFECTO!' : '¡BIEN!', ax, ay, perfecto ? C.oroClaro : C.nieve);
          for (let i = 0; i < 6; i++)                                              // migas
            particula(CUCHILLO_X + (Math.random() - 0.5) * 4, PAN_Y + 4 + Math.random() * 20, (Math.random() - 0.5) * 70, -30 - Math.random() * 50,
                      Math.random() < 0.6 ? '#f3e2b0' : '#d9963f', 0.7);
        } else {
          Sonido.efecto('carta');                                                  // el cuchillo rebota en la corteza
          api.aviso('¡TOC!', ax, ay, C.lila);
        }
      }

      if (tratadas() === RACIONES && !fin) {
        fin = { t: tiempo, ganado: false };
        guardar();
      }
    }

    /* ---------- Dibujo ---------- */
    const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // Pared de azulejos, cacheada por tamaño
    let fondo = null, claveFondo = '';
    function pintarFondo(ctx, api, L) {
      const clave = api.ancho + 'x' + api.alto + 'x' + L.K;
      if (clave !== claveFondo) {
        claveFondo = clave;
        const K = L.K, ws = Math.ceil(api.ancho / K) + 1, hs = Math.ceil(api.alto / K) + 1;
        const [cv, g] = Sprites.lienzoAux(ws, hs);
        const dx = ((L.ox / K) % 12 + 12) % 12, dy = ((L.oy / K) % 12 + 12) % 12;
        g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, ws, hs);
        for (let y = dy - 12; y < hs; y += 12)
          for (let x = dx - 12; x < ws; x += 12) {
            g.fillStyle = '#f6f1e6'; g.fillRect(x + 1, y + 1, 10, 2);           // brillo del azulejo
            g.fillStyle = '#c9c0ae'; g.fillRect(x, y + 11, 12, 1); g.fillRect(x + 11, y, 1, 12);   // junta
          }
        // cenefa de azulejos azules a media altura
        const yc = Math.round(L.oy / K) + 100;
        for (let x = dx - 12; x < ws; x += 12) {
          g.fillStyle = '#2f5aa8'; g.fillRect(x, yc, 11, 11);
          g.fillStyle = '#e8e2d4'; g.fillRect(x + 4, yc + 4, 3, 3);
          g.fillStyle = '#ffd24a'; g.fillRect(x + 5, yc + 5, 1, 1);
          g.fillStyle = '#5a82c8'; g.fillRect(x, yc, 11, 1);
        }
        Sprites.tramar(g, 0, 0, ws, 30, '#a89f8c', (x, y) => 0.8 * (1 - y / 30));   // sombra tramada arriba
        fondo = { cv, K };
      }
      ctx.drawImage(fondo.cv, 0, 0, fondo.cv.width * L.K, fondo.cv.height * L.K);
    }

    // Jamón colgado y ristra de chorizos
    function colgados(ctx, t) {
      const bal = Math.round(Math.sin(t * 1.2));
      R(ctx, '#5c3414', 20, 0, 70, 3);
      R(ctx, '#8c857b', 36, 3, 1, 10 + 0);
      // jamón
      const jx = 30 + bal, jy = 12;
      R(ctx, '#f3ecd8', jx + 4, jy, 4, 8);                                         // hueso / pezuña
      R(ctx, '#3d220c', jx + 3, jy - 2, 6, 3);
      for (let i = 0; i < 24; i++) {
        const w = Math.round(4 + Math.sin((i / 24) * Math.PI * 0.9) * 9);
        R(ctx, i % 5 === 0 ? '#7a2e24' : '#9c3e2c', jx + 6 - w, jy + 8 + i, 2 * w, 1);
      }
      R(ctx, '#c45a44', jx + 1, jy + 14, 3, 10); R(ctx, '#f6d0d6', jx + 2, jy + 30, 6, 2);
      // chorizos
      R(ctx, '#8c857b', 62, 3, 1, 4);
      for (let k = 0; k < 4; k++) {
        const cx = 56 + k * 7, cy = 8 + (k % 2) * 3 + bal;
        R(ctx, '#8a2a24', cx, cy, 6, 9); R(ctx, '#b8323a', cx + 1, cy + 1, 3, 6); R(ctx, '#e06a6a', cx + 1, cy + 2, 1, 2);
        R(ctx, '#f3ecd8', cx + 2, cy + 9, 2, 1);
      }
    }

    // Pizarra con el menú (dibujos de tiza)
    function pizarra(ctx) {
      R(ctx, '#5c3414', 226, 14, 76, 58); R(ctx, '#24382e', 229, 17, 70, 52);
      Sprites.tramar(ctx, 229, 17, 70, 52, '#2e463a', (x, y) => 0.5);
      for (let i = 0; i < 3; i++) {
        const y = 24 + i * 15;
        R(ctx, '#f3ecd8', 236, y, 18, 3); R(ctx, '#d9d2c0', 237, y + 3, 16, 1);   // bocadillo de tiza
        R(ctx, ['#f6a8b4', '#ffe58a', '#ff9a8a'][i], 237, y + 2, 16, 1);
        for (let k = 0; k < 6; k++) R(ctx, '#d9d2c0', 262 + k * 5, y + 1, 3, 1); // "precio"
        R(ctx, '#ffe58a', 292, y, 2, 3);
      }
      R(ctx, '#f3ecd8', 290, 70, 8, 2);                                             // tiza
    }

    function mostrador(ctx, api, L) {
      // tabla de cortar y mostrador, a todo lo ancho
      const K = L.K, yT = L.oy + TABLA_Y * K, yM = L.oy + MOSTRADOR_Y * K, yP = L.oy + (MOSTRADOR_Y + 8) * K;
      ctx.fillStyle = '#c99a5c'; ctx.fillRect(0, yT, api.ancho, (MOSTRADOR_Y - TABLA_Y) * K);
      ctx.fillStyle = '#e0b878'; ctx.fillRect(0, yT, api.ancho, K);
      ctx.fillStyle = '#a87a40'; ctx.fillRect(0, yM - K, api.ancho, K);
      ctx.fillStyle = '#8f5524'; ctx.fillRect(0, yM, api.ancho, 8 * K);
      ctx.fillStyle = '#b06a30'; ctx.fillRect(0, yM, api.ancho, K);
      ctx.fillStyle = '#5c3414'; ctx.fillRect(0, yP, api.ancho, api.alto - yP);
      for (let x = L.ox % (24 * K) - 24 * K; x < api.ancho; x += 24 * K) {        // tablones del frente
        ctx.fillStyle = '#4a2a10'; ctx.fillRect(x, yP, K, api.alto - yP);
        ctx.fillStyle = '#6e4220'; ctx.fillRect(x + K, yP, K, api.alto - yP);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, yP, api.ancho, 2 * K);
    }

    // Una columna del bocadillo (x en pantalla, s = posición a lo largo del pan)
    function columna(ctx, x, s, borde) {
      // perfil redondeado en los extremos
      const fin = Math.min(s, largo - s);
      const recorte = fin < 6 ? [6, 4, 2, 1, 1, 0][Math.max(0, fin)] : 0;
      const ing = porcionDe(s).ing;
      const yTop = PAN_Y + recorte;
      if (borde) {                                                                  // cara del corte: miga y relleno
        R(ctx, '#d9963f', x, yTop, 1, 2);
        R(ctx, '#f3e2b0', x, yTop + 2, 1, RELLENO_Y - yTop - 2);
        R(ctx, '#4caf50', x, RELLENO_Y, 1, 2);
        R(ctx, ing.base, x, RELLENO_Y + 2, 1, PAN_ABAJO - RELLENO_Y - 2);
        R(ctx, '#f3e2b0', x, PAN_ABAJO, 1, TABLA_Y - PAN_ABAJO - 2);
        R(ctx, '#a8642a', x, TABLA_Y - 2, 1, 2);
        return;
      }
      // corteza de arriba con trama y cortes en diagonal
      const u = Sprites.umbral(s, 0);
      R(ctx, '#f0c070', x, yTop, 1, 2);
      R(ctx, '#d9963f', x, yTop + 2, 1, RELLENO_Y - yTop - 2);
      if (((s + 400) % 22) < 3) R(ctx, '#a8642a', x, yTop + 3 + ((s + 400) % 22) * 2, 1, 4);   // greñas del pan
      for (let y = yTop + 9; y < RELLENO_Y; y++) if (Sprites.umbral(s, y) < 0.35 + (y - yTop) / 40) R(ctx, '#c07a30', x, y, 1, 1);
      // relleno asomando: lechuga ondulada y el ingrediente
      const ola = (s % 6) < 3 ? 0 : 1;
      R(ctx, '#4caf50', x, RELLENO_Y + ola, 1, 2);
      R(ctx, '#2f7a50', x, RELLENO_Y + ola + 2, 1, 1);
      R(ctx, ing.base, x, RELLENO_Y + ola + 3, 1, PAN_ABAJO - RELLENO_Y - ola - 3);
      if (u > 0.8) R(ctx, ing.punto, x, RELLENO_Y + 4, 1, 1);
      // pan de abajo
      R(ctx, '#e8b060', x, PAN_ABAJO, 1, TABLA_Y - PAN_ABAJO);
      R(ctx, '#a8642a', x, TABLA_Y - 2, 1, 2);
      if (recorte) R(ctx, '#a8642a', x, yTop, 1, 1);
    }
    function porcionDe(s) {
      let p = porciones[0];
      for (const q of porciones) if (q.desde <= s) p = q;
      return p;
    }

    function bocadillo(ctx, xs0, xs1) {
      // sombra en la tabla
      ctx.globalAlpha = 0.25; R(ctx, '#3d220c', Math.max(xs0, xDe(0)), TABLA_Y, Math.max(0, Math.min(xs1, xDe(largo)) - Math.max(xs0, xDe(0))), 2); ctx.globalAlpha = 1;
      const bordes = new Set();
      for (const c of cortes) { bordes.add(c.s - 1); bordes.add(c.s); }
      for (let s = 0; s <= largo; s++) {
        const x = Math.round(xDe(s));
        if (x < xs0 - 1 || x > xs1 + 1) continue;
        columna(ctx, x, s, bordes.has(s));
      }
      // marcas verdes ▼ (corta aquí) y palillos con bandera roja (¡aquí no!)
      for (const m of marcas) {
        if (m.estado !== 'pendiente') continue;
        const x = Math.round(xDe(m.s));
        if (x < xs0 - 6 || x > xs1 + 6) continue;
        R(ctx, '#1f6a3a', x - 3, PAN_Y - 11, 7, 1); R(ctx, '#3cc46a', x - 3, PAN_Y - 10, 7, 2);
        R(ctx, '#3cc46a', x - 2, PAN_Y - 8, 5, 1); R(ctx, '#3cc46a', x - 1, PAN_Y - 7, 3, 1); R(ctx, '#3cc46a', x, PAN_Y - 6, 1, 1);
        for (let y = PAN_Y + 1; y < TABLA_Y - 2; y += 3) R(ctx, '#ffffff', x, y, 1, 1);   // línea de puntos
      }
      for (const p of palillos) {
        if (p.estado !== 'puesto') continue;
        const x = Math.round(xDe(p.s));
        if (x < xs0 - 6 || x > xs1 + 6) continue;
        R(ctx, '#c08a3a', x, PAN_Y - 12, 1, 22);                                    // palillo
        R(ctx, '#3a5a1a', x - 2, PAN_Y - 6, 5, 4); R(ctx, '#6a8a2a', x - 1, PAN_Y - 6, 2, 1);   // aceituna
        R(ctx, C.rojo, x + 1, PAN_Y - 12, 6, 4); R(ctx, C.rojoOsc, x + 1, PAN_Y - 9, 6, 1);     // banderita
        R(ctx, '#ffffff', x + 3, PAN_Y - 11, 2, 1);
      }
    }

    // Henar (sprite del juego, ×3) con el cuchillo del pan
    function henar(ctx, t) {
      const baja = cuchillo > 0 ? Math.sin((1 - cuchillo / T_CUCHILLO) * Math.PI) : 0;
      const yHoja = PAN_Y - 4 + baja * (TABLA_Y - PAN_Y + 2);                      // punta de la hoja
      ctx.save();
      ctx.translate(148, PAN_Y + 12); ctx.scale(3, 3);
      Sprites.personaje(ctx, 0, 0, 1, 'idle', t);
      ctx.restore();
      // brazo (del hombro al mango del cuchillo)
      const hx = CUCHILLO_X, hy = yHoja - 26;
      const sx = 156, sy = PAN_Y + 12 - 42;
      const n = Math.ceil(Math.hypot(hx - sx, hy - sy));
      for (let i = 0; i <= n; i++) R(ctx, '#9c2630', sx + (hx - sx) * i / n - 2, sy + (hy - sy) * i / n - 2, 5, 5);
      for (let i = 0; i <= n; i++) R(ctx, '#c8383f', sx + (hx - sx) * i / n - 2, sy + (hy - sy) * i / n - 2, 4, 3);
      // cuchillo: mango arriba, hoja hacia abajo con sierra
      R(ctx, '#3d220c', CUCHILLO_X - 2, hy - 4, 5, 10); R(ctx, '#6e4220', CUCHILLO_X - 1, hy - 3, 2, 8);
      R(ctx, '#8c857b', CUCHILLO_X - 3, hy + 6, 7, 2);
      R(ctx, '#d6dbe6', CUCHILLO_X - 2, hy + 8, 5, yHoja - hy - 8);
      R(ctx, '#ffffff', CUCHILLO_X - 1, hy + 8, 1, yHoja - hy - 10);
      for (let y = hy + 9; y < yHoja; y += 3) R(ctx, '#8c94a8', CUCHILLO_X - 3, y, 1, 2);   // dientes de sierra
      R(ctx, '#f6cfae', hx - 3, hy - 2, 6, 6);                                          // mano
    }

    function dibujar(ctx, api) {
      const L = disposicion(api), t = api.t;
      pintarFondo(ctx, api, L);
      ctx.save();
      ctx.translate(L.ox, L.oy); ctx.scale(L.K, L.K);
      colgados(ctx, t);
      pizarra(ctx);
      ctx.restore();
      mostrador(ctx, api, L);
      ctx.save();
      ctx.translate(L.ox, L.oy); ctx.scale(L.K, L.K);
      const xs0 = Math.floor(-L.ox / L.K), xs1 = Math.ceil((api.ancho - L.ox) / L.K);
      // Henar va detrás del bocadillo; el mostrador le tapa las piernas
      ctx.save();
      ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 1000 + TABLA_Y); ctx.clip();
      henar(ctx, t);
      ctx.restore();
      bocadillo(ctx, xs0, xs1);
      // la hoja del cuchillo, por delante del pan cuando baja
      if (cuchillo > 0) {
        const baja = Math.sin((1 - cuchillo / T_CUCHILLO) * Math.PI);
        const yHoja = PAN_Y - 4 + baja * (TABLA_Y - PAN_Y + 2);
        R(ctx, '#d6dbe6', CUCHILLO_X - 2, PAN_Y - 4, 5, yHoja - PAN_Y + 4);
        R(ctx, '#ffffff', CUCHILLO_X - 1, PAN_Y - 4, 1, yHoja - PAN_Y + 2);
      }
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
      const t1 = `RACIONES ${cortadas}/${RACIONES}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, alto);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      // vidas: bocadillos pequeños
      const k = Math.max(1, Math.round(e)), wv = 14 * k, x2 = 6, y2 = 6 + alto + 6;
      Comun.caja(ctx, x2, y2, VIDAS * (wv + 3 * k) + 5 * k, alto);
      for (let i = 0; i < VIDAS; i++) {
        const x = x2 + 4 * k + i * (wv + 3 * k), y = y2 + Math.floor(alto / 2) - 2 * k;
        const vivo = i < vidas;
        ctx.fillStyle = vivo ? '#d9963f' : '#3a3550'; ctx.fillRect(x, y, wv, 3 * k);
        ctx.fillStyle = vivo ? '#4caf50' : '#2a2640'; ctx.fillRect(x + k, y + 3 * k, wv - 2 * k, k);
        ctx.fillStyle = vivo ? '#f0c070' : '#4a4560'; ctx.fillRect(x + k, y, wv - 2 * k, k);
      }
      if (perfectas) {
        const t3 = `PERFECTOS ${perfectas}`;
        const x3 = api.ancho - api.margenDerecho - Comun.medir(t3, e) - 14;
        if (x3 > Comun.medir(t1, e) + 30) {
          Comun.caja(ctx, x3, 6, Comun.medir(t3, e) + 8, alto);
          texto(ctx, t3, x3 + 4, 10, C.lila, { escala: e });
        }
      }
    }

    // Solo en modo debug: estado del juego, para las pruebas
    if (Dias.debug) window.bocadilloDebug = () => ({ cortadas, perfectas, vidas, tratadas: tratadas(), xIzq: Math.round(xIzq), fin: !!fin,
      siguiente: (() => { const m = marcas.find(q => q.estado === 'pendiente'); return m ? Math.round(xDe(m.s) - CUCHILLO_X) : null; })(),
      palillo: (() => { const p = palillos.find(q => q.estado === 'puesto' && xDe(q.s) > CUCHILLO_X - VENTANA); return p ? Math.round(xDe(p.s) - CUCHILLO_X) : null; })() });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: (datos.titulo || 'El bocadillo').toUpperCase(),
      instruccion: datos.instruccion || 'PULSA ESPACIO CUANDO LA MARCA VERDE PASE BAJO EL CUCHILLO.',
      pantallaCompleta: true,
      musica: 'bocadillo',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
