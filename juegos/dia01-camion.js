'use strict';
/* Día 1 — Descarga el camión.
   Llega el camión de la mudanza. Las cajas salen de una en una con un dibujo de lo que llevan dentro, y hay que
   mandar cada una a su habitación: tocando su cartel o con las flechas en cruz (↑ dormitorio, ← cocina,
   → salón, ↓ baño). Si te equivocas no pasa nada: la caja vuelve al camión y sale más tarde. 12 cajas. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia01-camion'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const W = 320, H = 200, META = 12;
    // habitaciones: tecla, nombre, color del cartel, posición del cartel (en cruz) y los dibujos de sus cajas
    const SALAS = [
      { tecla: 'arriba', nombre: 'DORMITORIO', color: '#9a5ad0', x: 258, y: 30, cosas: ['almohada', 'osito', 'despertador'] },
      { tecla: 'izquierda', nombre: 'COCINA', color: '#f08a2c', x: 226, y: 82, cosas: ['sarten', 'taza', 'cazo'] },
      { tecla: 'derecha', nombre: 'SALÓN', color: '#3f8a5c', x: 290, y: 82, cosas: ['libros', 'lampara', 'planta'] },
      { tecla: 'abajo', nombre: 'BAÑO', color: '#4a7ad8', x: 258, y: 134, cosas: ['patito', 'toalla', 'cepillo'] }
    ];
    const CARTEL_W = 60, CARTEL_H = 40, CAJA_X = 128, CAJA_Y = 150;

    let cola, actual, entregadas, anim, aviso, final, cuentas, brillo;

    function reiniciar() {
      const lista = [];
      SALAS.forEach((s, i) => s.cosas.forEach((c) => lista.push({ sala: i, cosa: c })));
      for (let k = lista.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [lista[k], lista[j]] = [lista[j], lista[k]]; }
      cola = lista; entregadas = 0; aviso = null; final = 0; cuentas = [0, 0, 0, 0]; brillo = [0, 0, 0, 0];
      sacarCaja();
    }

    function sacarCaja() {
      actual = cola.shift() || null;
      anim = actual ? { tipo: 'sale', t: 0 } : null;
    }

    function elegir(i) {
      if (!actual || !anim || anim.tipo !== 'quieta') return;
      if (i === actual.sala) {
        anim = { tipo: 'va', t: 0, sala: i }; Sonido.efecto('coger');
      } else {
        anim = { tipo: 'vuelve', t: 0 }; Sonido.efecto('bloqueada');
        aviso = { txt: `¡ESA NO VA EN EL ${SALAS[i].nombre === 'COCINA' ? 'LA COCINA' : SALAS[i].nombre}!`.replace('EN EL LA', 'EN LA'), vida: 1.3 };
      }
    }

    function disposicion(api) {
      const e = api.textoEscala, arriba = 6 + Comun.altoTexto(e) + 12;
      const K = Math.max(1, Math.floor(Math.min(api.ancho / W, (api.alto - arriba) / H)));
      return { K, e, x0: Math.floor((api.ancho - W * K) / 2), y0: arriba + Math.max(0, Math.floor((api.alto - arriba - H * K) / 2)) };
    }

    function actualizar(dt, api) {
      for (let i = 0; i < 4; i++) if (brillo[i] > 0) brillo[i] -= dt;
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      if (final > 0) { final += dt; if (final > 1.8) api.ganar(); return; }
      const e = api.entrada, d = disposicion(api);
      SALAS.forEach((s, i) => { if (e.pulsado(s.tecla)) elegir(i); });
      if (e.pulsado('toque')) {                                            // tocar un cartel
        const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K;
        SALAS.forEach((s, i) => { if (Math.abs(px - s.x) <= CARTEL_W / 2 + 2 && Math.abs(py - s.y) <= CARTEL_H / 2 + 2) elegir(i); });
      }
      e.pulsado('accion');
      if (!anim) return;
      anim.t += dt;
      if (anim.tipo === 'sale' && anim.t > 0.45) anim = { tipo: 'quieta', t: 0 };
      else if (anim.tipo === 'va' && anim.t > 0.4) {
        entregadas++; cuentas[anim.sala]++; brillo[anim.sala] = 0.5; Sonido.efecto('pareja');
        if (entregadas >= META) { final = 0.001; actual = null; anim = null; Sonido.efecto('completar'); return; }
        sacarCaja();
      } else if (anim.tipo === 'vuelve' && anim.t > 0.5) { cola.push(actual); sacarCaja(); }
    }

    /* ---------- Dibujo (escena de 320 x 200) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    // Dibujos de lo que hay en cada caja (unos 12 x 12, centrados en x, y)
    function cosa(ctx, nombre, x, y) {
      const R = (c, a, b, w, h) => r(ctx, c, x + a, y + b, w, h);
      switch (nombre) {
        case 'almohada': R('#f4f8ff', -6, -3, 12, 7); R('#c5d3ea', -6, 3, 12, 1); R('#c5d3ea', -6, -3, 1, 7); R('#e0c4c4', -3, -1, 6, 2); break;
        case 'osito': R('#a9763f', -4, -2, 8, 7); R('#a9763f', -3, -6, 6, 5); R('#a9763f', -4, -7, 2, 2); R('#a9763f', 2, -7, 2, 2); R(C.tinta, -2, -4, 1, 1); R(C.tinta, 1, -4, 1, 1); R('#e8c49a', -1, -3, 2, 1); R(C.rojo, -3, -1, 6, 1); break;
        case 'despertador': R(C.rojo, -5, -5, 10, 10); R(C.blanco, -4, -4, 8, 8); R(C.tinta, 0, -3, 1, 4); R(C.tinta, 0, 0, 3, 1); R(C.rojo, -6, -7, 3, 2); R(C.rojo, 3, -7, 3, 2); break;
        case 'sarten': R('#3a3a44', -6, -2, 9, 6); R('#5c5866', -5, -2, 7, 1); R('#6b4a2a', 3, 0, 5, 2); break;
        case 'taza': R(C.blanco, -4, -4, 7, 8); R(C.rojo, -4, -1, 7, 2); R(C.blanco, 3, -2, 2, 1); R(C.blanco, 4, -2, 1, 4); R(C.blanco, 3, 1, 2, 1); R('#c5d3ea', -3, -6, 1, 2); R('#c5d3ea', 0, -7, 1, 2); break;
        case 'cazo': R('#8e9ecb', -5, -3, 9, 7); R('#c5d3ea', -5, -3, 9, 1); R('#3a3a44', 4, -2, 5, 2); break;
        case 'libros': R(C.rojo, -6, -5, 3, 10); R(C.verde, -3, -6, 3, 11); R('#4a7ad8', 0, -4, 3, 9); R(C.oro, 3, -5, 3, 10); R(C.crema, -6, -3, 12, 1); break;
        case 'lampara': R(C.oroClaro, -5, -7, 10, 5); R(C.oro, -5, -3, 10, 1); R('#3a3a44', 0, -2, 1, 6); R('#3a3a44', -3, 4, 7, 2); break;
        case 'planta': R('#a8402a', -3, 1, 7, 5); R(C.verde, -5, -6, 3, 6); R(C.verde, 0, -8, 3, 9); R(C.verdeOsc, 3, -5, 3, 5); break;
        case 'patito': R(C.oroClaro, -5, -1, 10, 6); R(C.oroClaro, -1, -6, 6, 6); R(C.naranja, 5, -4, 3, 2); R(C.tinta, 2, -4, 1, 1); R(C.oro, -5, 3, 10, 2); break;
        case 'toalla': R('#4a7ad8', -6, -5, 12, 10); R('#6f9ae6', -6, -5, 12, 2); R(C.blanco, -6, 2, 12, 1); R(C.blanco, -6, 4, 12, 1); break;
        case 'cepillo': R('#3f8a5c', -1, -2, 2, 9); R(C.blanco, -2, -7, 4, 5); R('#c5d3ea', -2, -7, 4, 1); R(C.blanco, 3, 2, 4, 5); R('#e8a0b0', 3, 0, 4, 2); break;
      }
    }

    function cajaCarton(ctx, x, y, s, nombre) {                           // caja de cartón con su dibujo; (x, y) = centro
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
      r(ctx, '#5c3e2a', -15, -12, 30, 24); r(ctx, '#c9a26a', -14, -11, 28, 22); r(ctx, '#b58a50', -14, 7, 28, 4);
      r(ctx, '#e8dcc0', -14, -11, 28, 2); r(ctx, '#e8dcc0', -1, -11, 2, 4);
      r(ctx, C.crema, -9, -6, 18, 15); r(ctx, '#d6c9a8', -9, 8, 18, 1);
      cosa(ctx, nombre, 0, 2);
      ctx.restore();
    }

    function cartel(ctx, s, i, t) {
      const x = s.x - CARTEL_W / 2, y = s.y - CARTEL_H / 2, luz = brillo[i] > 0 && Math.floor(t * 12) % 2;
      r(ctx, C.tinta, x - 1, y - 1, CARTEL_W + 2, CARTEL_H + 2); r(ctx, luz ? C.oroClaro : s.color, x, y, CARTEL_W, CARTEL_H);
      r(ctx, 'rgba(255,255,255,0.18)', x, y, CARTEL_W, 2);
      r(ctx, C.crema, x + 3, y + 3, CARTEL_W - 6, 22);
      cosa(ctx, s.cosas[0], s.x - 12, y + 14); cosa(ctx, s.cosas[1], s.x + 1, y + 14); cosa(ctx, s.cosas[2], s.x + 14, y + 14);
      texto(ctx, s.nombre, s.x, y + 28, C.blanco, { centro: true });
      // cajas ya dentro (puntitos)
      for (let k = 0; k < cuentas[i]; k++) r(ctx, '#c9a26a', x + 3 + k * 5, y + CARTEL_H - 5, 4, 3);
    }

    function camion(ctx, t) {
      // caja del camión abierta por detrás, cabina a la izquierda
      r(ctx, '#2b2b36', 8, 152, 112, 6);
      r(ctx, C.tinta, 37, 82, 82, 72); r(ctx, '#e6e2d6', 38, 83, 80, 70); r(ctx, '#3a3a50', 46, 90, 66, 60);
      for (let k = 0; k < 4; k++) r(ctx, '#7a5236', 50 + k * 15, 120 - (k % 2) * 10, 12, 30 - (k % 2) * 0);   // cajas que quedan dentro
      for (let k = 0; k < 4; k++) r(ctx, '#c9a26a', 51 + k * 15, 121 - (k % 2) * 10, 10, 8);
      r(ctx, C.rojo, 38, 98, 80, 8); texto(ctx, 'MUDANZAS', 78, 99, C.blanco, { centro: true });
      r(ctx, C.tinta, 6, 104, 32, 50); r(ctx, '#c8383f', 7, 105, 30, 48); r(ctx, '#9fd0ff', 11, 109, 18, 16); r(ctx, '#d6ecff', 11, 109, 18, 4);
      r(ctx, C.oroClaro, 7, 140, 4, 4);
      for (const rx of [22, 96]) { r(ctx, C.tinta, rx - 9, 148, 18, 18); r(ctx, '#3a3a44', rx - 7, 150, 14, 14); r(ctx, '#8c857b', rx - 3, 154, 6, 6); }
      // rampa hasta la acera
      ctx.fillStyle = '#8c857b'; ctx.beginPath(); ctx.moveTo(118, 150); ctx.lineTo(150, 166); ctx.lineTo(118, 166); ctx.fill();
      void t;
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t, e = d.e;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(d.x0, d.y0); ctx.scale(d.K, d.K);
      // fachada del edificio al fondo, acera y calle nevada
      r(ctx, '#5e2620', 150, 0, 170, 166);
      for (let fy = 4, f = 0; fy < 166; fy += 5, f++) for (let fx = 150 + (f % 2 ? 0 : 4); fx < 318; fx += 9) r(ctx, '#7a2e24', fx, fy, 7, 3);
      r(ctx, C.nieve, 0, 166, W, 2); r(ctx, '#dbe5f5', 0, 168, W, 32);
      camion(ctx, t);
      SALAS.forEach((s, i) => cartel(ctx, s, i, t));
      // Henar junto a la rampa
      Sprites.personaje(ctx, 160, 168, -1, 'idle', t);
      // la caja actual
      if (actual && anim) {
        let x = CAJA_X, y = CAJA_Y, s = 1;
        if (anim.tipo === 'sale') { const k = Math.min(1, anim.t / 0.45); x = 90 + (CAJA_X - 90) * k; y = 128 + (CAJA_Y - 128) * k; s = 0.6 + 0.4 * k; }
        else if (anim.tipo === 'va') { const k = Math.min(1, anim.t / 0.4), sala = SALAS[anim.sala]; x = CAJA_X + (sala.x - CAJA_X) * k; y = CAJA_Y + (sala.y - CAJA_Y) * k - Math.sin(k * Math.PI) * 30; s = 1 - 0.6 * k; }
        else if (anim.tipo === 'vuelve') { const k = Math.min(1, anim.t / 0.5); x = CAJA_X + Math.sin(anim.t * 40) * (1 - k) * 3 - k * 38; y = CAJA_Y - k * 22; s = 1 - 0.4 * k; }
        cajaCarton(ctx, x, y, s, actual.cosa);
        if (anim.tipo === 'quieta' && Math.floor(t * 2) % 2) r(ctx, C.oroClaro, CAJA_X - 2, CAJA_Y - 22, 4, 4);
      }
      ctx.restore();

      if (aviso) {
        const w = Comun.medir(aviso.txt, e) + 12, h = Comun.altoTexto(e) + 10, bx = Math.floor((api.ancho - w) / 2), by = d.y0 + 4 * d.K;
        r(ctx, C.tinta, bx - 1, by - 1, w + 2, h + 2); r(ctx, C.blanco, bx, by, w, h); texto(ctx, aviso.txt, bx + 6, by + 5, C.rojo, { escala: e });
      }
      if (final > 0) {
        const m = '¡MUDANZA TERMINADA!', em = Comun.medir(m, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(m, em) + 12, h = Comun.altoTexto(em) + 12;
        const bx = Math.floor((api.ancho - w) / 2), by = Math.floor(d.y0 + H * d.K * 0.3);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, m, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
      const t1 = `CAJAS ${entregadas}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, Comun.altoTexto(e) + 8);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: estado para las pruebas automáticas
    if (Dias.debug) window.camionDebug = () => ({ final: final > 0, entregadas, sala: actual ? actual.sala : null, lista: !!(anim && anim.tipo === 'quieta'),
      teclas: SALAS.map((s) => s.tecla) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'DESCARGA EL CAMIÓN',
      instruccion: 'HA LLEGADO LA MUDANZA. MIRA QUÉ LLEVA CADA CAJA Y MÁNDALA A SU HABITACIÓN: TOCA SU CARTEL O USA LAS FLECHAS (↑ DORMITORIO, ← COCINA, → SALÓN, ↓ BAÑO). 12 CAJAS, SIN PRISA.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'mudanza',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
