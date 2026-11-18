'use strict';
/* Día 9 — Chocolate caliente (cocina al estilo Overcooked, vista desde arriba).
   La chica se mueve por la cocina (flechas, o tocando donde ir) y usa cada puesto con Espacio o tocándolo.
   Solo puede llevar una cosa. Receta: leche de la nevera al cazo → se calienta → cacao al cazo → remover
   (pulsar varias veces) → servir en una taza → nata (y nubes si el pedido las lleva) → entregar.
   Si la leche caliente espera mucho sin cacao, se quema. El cazo da para 2 tazas.
   Hay que servir los 3 pedidos antes de que se acabe el tiempo. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia09-chocolate'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const TIEMPO = 150, VEL = 85;
    const T_CALENTAR = 4, T_QUEMAR = 9, VUELTAS = 6, RACIONES = 2;
    const PEDIDOS = [{ nubes: false }, { nubes: true }, { nubes: false }];
    // suelo transitable de la cocina (escena de 320x210) y puestos: rect sobre la encimera y punto de uso delante
    const SUELO = { x0: 42, x1: 278, y0: 64, y1: 192 };
    const PUESTOS = [
      { id: 'nevera', nombre: 'NEVERA (LECHE)', x: 32, y: 6, w: 32, h: 46, fx: 48, fy: 66 },
      { id: 'tazas', nombre: 'TAZAS', x: 78, y: 20, w: 30, h: 30, fx: 93, fy: 66 },
      { id: 'fogon', nombre: 'FOGON', x: 132, y: 18, w: 48, h: 32, fx: 156, fy: 66 },
      { id: 'cacao', nombre: 'CACAO', x: 198, y: 20, w: 24, h: 30, fx: 210, fy: 66 },
      { id: 'nata', nombre: 'NATA', x: 236, y: 20, w: 24, h: 30, fx: 248, fy: 66 },
      { id: 'nubes', nombre: 'NUBES', x: 290, y: 68, w: 28, h: 30, fx: 276, fy: 84 },
      { id: 'entrega', nombre: 'ENTREGA', x: 290, y: 128, w: 30, h: 46, fx: 276, fy: 150 },
      { id: 'papelera', nombre: 'PAPELERA', x: 4, y: 140, w: 26, h: 28, fx: 44, fy: 154 }
    ];

    let jug, mano, cazo, servidos, quedan, objetivo, aviso, ganada, cercano;

    function reiniciar() {
      jug = { x: 160, y: 130, dir: 1, andando: false };
      mano = null;                     // null | 'leche' | 'cacao' | { tipo: 'taza', choco, nata, nubes }
      cazo = { estado: 'vacio', t: 0, vueltas: 0, raciones: 0 };
      servidos = 0; quedan = TIEMPO; objetivo = null; aviso = null; ganada = 0; cercano = null;
    }

    const pedido = () => PEDIDOS[Math.min(servidos, PEDIDOS.length - 1)];
    function decir(t, color, p) { aviso = { texto: t, color: color || C.nieve, vida: 1.4, x: p ? p.fx : jug.x, y: p ? p.y - 4 : jug.y - 30 }; }

    function usar(p) {
      const taza = mano && mano.tipo === 'taza' ? mano : null;
      switch (p.id) {
        case 'nevera': case 'cacao': case 'tazas':
          if (mano) { decir('YA LLEVAS ALGO', C.lila, p); return; }
          mano = p.id === 'nevera' ? 'leche' : p.id === 'cacao' ? 'cacao' : { tipo: 'taza', choco: false, nata: false, nubes: false };
          Sonido.efecto('carta');
          return;
        case 'fogon':
          if (mano === 'leche') {
            if (cazo.estado !== 'vacio') { decir('EL CAZO ESTA OCUPADO', C.lila, p); return; }
            cazo = { estado: 'calentando', t: 0, vueltas: 0, raciones: 0 }; mano = null; Sonido.efecto('agua');
          } else if (mano === 'cacao') {
            if (cazo.estado === 'caliente') { cazo.estado = 'mezclar'; cazo.vueltas = 0; mano = null; Sonido.efecto('carta'); decir('¡AHORA, REMUEVE!', C.oroClaro, p); }
            else decir(cazo.estado === 'calentando' ? 'ESPERA A QUE SE CALIENTE' : 'PRIMERO, LECHE CALIENTE', C.lila, p);
          } else if (cazo.estado === 'mezclar') {
            cazo.vueltas++; Sonido.efecto('escalera');
            if (cazo.vueltas >= VUELTAS) { cazo.estado = 'listo'; cazo.raciones = RACIONES; Sonido.efecto('pareja'); decir('¡CHOCOLATE LISTO!', C.oroClaro, p); }
          } else if (taza) {
            if (taza.choco) { decir('ESTA TAZA YA ESTA LLENA', C.lila, p); return; }
            if (cazo.estado !== 'listo') { decir('EL CHOCOLATE NO ESTA LISTO', C.lila, p); return; }
            taza.choco = true; cazo.raciones--; Sonido.efecto('agua');
            if (cazo.raciones <= 0) cazo = { estado: 'vacio', t: 0, vueltas: 0, raciones: 0 };
          } else if (!mano) {
            decir({ vacio: 'TRAE LECHE DE LA NEVERA', calentando: 'CALENTANDO...', caliente: '¡ECHA EL CACAO!', listo: 'COGE UNA TAZA' }[cazo.estado] || '', C.lila, p);
          }
          return;
        case 'nata': case 'nubes':
          if (!taza) { decir('NECESITAS UNA TAZA', C.lila, p); return; }
          if (!taza.choco) { decir('PRIMERO EL CHOCOLATE', C.lila, p); return; }
          if (taza[p.id]) { decir('YA TIENE ' + p.nombre, C.lila, p); return; }
          taza[p.id] = true; Sonido.efecto('coger');
          return;
        case 'entrega': {
          if (!taza) { decir('TRAE UN CHOCOLATE', C.lila, p); return; }
          const pd = pedido();
          const falta = !taza.choco ? 'LE FALTA EL CHOCOLATE' : !taza.nata ? 'LE FALTA LA NATA' : pd.nubes && !taza.nubes ? 'ESTE LLEVA NUBES' : !pd.nubes && taza.nubes ? 'ESTE VA SIN NUBES' : '';
          if (falta) { decir(falta, C.rojoClaro, p); Sonido.efecto('bloqueada'); return; }
          mano = null; servidos++;
          Sonido.efecto('pareja');
          decir(servidos >= PEDIDOS.length ? '¡TODOS SERVIDOS!' : '¡PEDIDO SERVIDO!', C.oroClaro, p);
          if (servidos >= PEDIDOS.length) ganada = 1.2;
          return;
        }
        case 'papelera':
          if (!mano) { decir('NO LLEVAS NADA', C.lila, p); return; }
          mano = null; Sonido.efecto('cerrar'); decir('¡A LA BASURA!', C.lila, p);
      }
    }

    function puestoCercano() {
      let mejor = null, dist = 20;
      for (const p of PUESTOS) { const d = Math.hypot(jug.x - p.fx, jug.y - p.fy); if (d < dist) { dist = d; mejor = p; } }
      return mejor;
    }

    function actualizar(dt, api, d) {
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); return; }

      // cazo: se calienta, y la leche caliente sin cacao acaba quemándose
      cazo.t += dt;
      if (cazo.estado === 'calentando' && cazo.t >= T_CALENTAR) { cazo.estado = 'caliente'; cazo.t = 0; Sonido.efecto('coger'); }
      else if (cazo.estado === 'caliente' && cazo.t >= T_QUEMAR) {
        cazo = { estado: 'quemado', t: 0, vueltas: 0, raciones: 0 };
        Sonido.efecto('golpe'); api.sacudir(0.2); decir('¡SE HA QUEMADO LA LECHE!', C.rojoClaro, PUESTOS[2]);
      } else if (cazo.estado === 'quemado' && cazo.t >= 1.5) cazo = { estado: 'vacio', t: 0, vueltas: 0, raciones: 0 };

      // movimiento: flechas, o ir andando hasta donde se ha tocado
      const e = api.entrada;
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0), dy = (e.abajo ? 1 : 0) - (e.arriba ? 1 : 0);
      if (dx || dy) objetivo = null;
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K;
        const p = PUESTOS.find((q) => px >= q.x - 6 && px < q.x + q.w + 6 && py >= q.y - 6 && py < q.y + q.h + 10);
        if (p) {
          if (Math.hypot(jug.x - p.fx, jug.y - p.fy) < 4) usar(p);      // ya está delante: usarlo
          else objetivo = { x: p.fx, y: p.fy, puesto: p };
        } else objetivo = { x: px, y: py, puesto: null };
      } else if (e.pulsado('accion')) {
        const p = puestoCercano();
        if (p) usar(p); else decir('ACERCATE A UN PUESTO', C.lila);
      }
      if (objetivo) {
        const vx = objetivo.x - jug.x, vy = objetivo.y - jug.y, dist = Math.hypot(vx, vy);
        if (dist < 2) {
          jug.x = Math.max(SUELO.x0, Math.min(SUELO.x1, objetivo.x)); jug.y = Math.max(SUELO.y0, Math.min(SUELO.y1, objetivo.y));
          if (objetivo.puesto) usar(objetivo.puesto);
          objetivo = null;
        } else { dx = vx / dist; dy = vy / dist; }
      }
      const n = Math.hypot(dx, dy) || 1;
      jug.andando = !!(dx || dy);
      if (dx) jug.dir = dx > 0 ? 1 : -1;
      jug.x = Math.max(SUELO.x0, Math.min(SUELO.x1, jug.x + (dx / n) * VEL * dt));
      jug.y = Math.max(SUELO.y0, Math.min(SUELO.y1, jug.y + (dy / n) * VEL * dt));
      cercano = puestoCercano();

      quedan -= dt;
      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO: ${servidos} DE ${PEDIDOS.length} CHOCOLATES`); }
    }

    /* ---------- Dibujo (en unidades de la escena de 320x210) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // Taza (vacía, con chocolate, con nata y con nubes). (x, y) = centro de la base.
    function taza(ctx, x, y, t) {
      r(ctx, C.blanco, x - 5, y - 7, 10, 7); r(ctx, C.nieve3, x + 3, y - 7, 2, 7); r(ctx, C.blanco, x + 5, y - 6, 2, 1);
      r(ctx, C.blanco, x + 6, y - 5, 1, 3); r(ctx, C.blanco, x + 5, y - 3, 2, 1);                      // asa
      if (t.choco) r(ctx, '#6b3a1e', x - 4, y - 7, 8, 2);
      if (t.nata) { r(ctx, C.blanco, x - 5, y - 9, 10, 2); r(ctx, C.blanco, x - 3, y - 11, 6, 2); r(ctx, C.nieve2, x - 1, y - 12, 2, 1); }
      if (t.nubes) { r(ctx, '#f6b0c8', x - 4, y - 11, 2, 2); r(ctx, C.nieve2, x + 2, y - 12, 2, 2); r(ctx, '#f6b0c8', x, y - 13, 2, 2); }
    }
    function objeto(ctx, o, x, y) {                                       // lo que lleva en las manos
      if (o === 'leche') { r(ctx, C.blanco, x - 3, y - 10, 7, 10); r(ctx, C.hielo3, x - 3, y - 6, 7, 3); r(ctx, C.nieve3, x - 2, y - 12, 4, 2); }
      else if (o === 'cacao') { r(ctx, '#6b3a1e', x - 4, y - 9, 8, 9); r(ctx, C.oro, x - 4, y - 9, 8, 2); r(ctx, '#a0602e', x - 2, y - 6, 4, 3); }
      else if (o) taza(ctx, x, y, o);
    }

    function barra(ctx, x, y, w, frac, color) {
      r(ctx, C.tinta, x - 1, y - 1, w + 2, 5); r(ctx, C.nocheClara, x, y, w, 3); r(ctx, color, x, y, Math.round(w * Math.max(0, Math.min(1, frac))), 3);
    }

    function puesto(ctx, p, t) {
      const { x, y, w, h } = p;
      if (p.id === 'nevera') {
        r(ctx, '#c8d0dc', x, y, w, h); r(ctx, C.nieve, x + 1, y + 1, w - 6, h - 2); r(ctx, '#9aa4b8', x, y + 18, w, 1);
        r(ctx, '#8890a4', x + w - 6, y + 6, 2, 8); r(ctx, '#8890a4', x + w - 6, y + 24, 2, 10);
        r(ctx, C.rojo, x + 6, y + 8, 4, 4); r(ctx, C.oro, x + 12, y + 28, 4, 4);                          // imanes
      } else if (p.id === 'tazas') {
        r(ctx, '#7a4a28', x, y + h - 4, w, 4);
        for (let k = 0; k < 3; k++) taza(ctx, x + 6 + k * 9, y + h - 4, {});
        for (let k = 0; k < 3; k++) taza(ctx, x + 6 + k * 9, y + h - 16, {});
        r(ctx, '#7a4a28', x, y + h - 16, w, 2);
      } else if (p.id === 'fogon') {
        r(ctx, '#2c2f3e', x, y, w, h); r(ctx, '#3e4256', x + 2, y + 2, w - 4, h - 4);
        for (const [bx, by] of [[x + 12, y + 10], [x + 36, y + 10], [x + 12, y + 24], [x + 36, y + 24]]) { r(ctx, '#1a1c28', bx - 5, by - 3, 10, 6); }
        // cazo en el fuego de arriba a la izquierda (con llama si está encendido)
        const cx = x + 22, cy = y + 14, enc = cazo.estado === 'calentando' || cazo.estado === 'caliente' || cazo.estado === 'mezclar';
        if (enc) { r(ctx, Math.floor(t * 12) % 2 ? '#f08a2c' : '#ffd24a', cx - 6, cy + 5, 12, 2); r(ctx, '#5cd6ff', cx - 4, cy + 6, 8, 1); }
        r(ctx, '#9aa0b0', cx - 9, cy - 6, 18, 11); r(ctx, '#6a7088', cx + 9, cy - 2, 9, 2);              // cazo y mango
        const dentro = { vacio: '#4a4e60', calentando: C.nieve2, caliente: C.blanco, mezclar: '#8a5a32', listo: '#6b3a1e', quemado: C.tinta }[cazo.estado];
        r(ctx, dentro, cx - 7, cy - 4, 14, 7);
        if (cazo.estado === 'mezclar') r(ctx, '#c08d52', cx - 4 + (cazo.vueltas % 3) * 3, cy - 2, 2, 2);          // remolino
        if (cazo.estado === 'caliente' || cazo.estado === 'listo')                                             // vapor
          for (let k = 0; k < 3; k++) r(ctx, C.nieve3, cx - 5 + k * 5, cy - 9 - ((Math.floor(t * 4) + k) % 3) * 2, 1, 2);
        if (cazo.estado === 'quemado') for (let k = 0; k < 4; k++) r(ctx, '#5a5a6a', cx - 6 + k * 4, cy - 12 - ((Math.floor(t * 6) + k) % 4) * 2, 3, 3);
        // barras de estado sobre el fogón
        if (cazo.estado === 'calentando') barra(ctx, x + 4, y - 6, w - 8, cazo.t / T_CALENTAR, C.naranja);
        if (cazo.estado === 'caliente') {
          barra(ctx, x + 4, y - 6, w - 8, 1 - cazo.t / T_QUEMAR, cazo.t > T_QUEMAR * 0.6 ? C.rojoClaro : C.oro);
          if (cazo.t > T_QUEMAR * 0.6 && Math.floor(t * 6) % 2) { r(ctx, C.rojoClaro, x + w / 2 - 1, y - 16, 3, 6); r(ctx, C.rojoClaro, x + w / 2 - 1, y - 9, 3, 2); }   // ¡!
        }
        if (cazo.estado === 'mezclar') barra(ctx, x + 4, y - 6, w - 8, cazo.vueltas / VUELTAS, '#c08d52');
        if (cazo.estado === 'listo') for (let k = 0; k < cazo.raciones; k++) taza(ctx, x + w - 8 - k * 9, y + h - 2, { choco: true });
      } else if (p.id === 'cacao') {
        r(ctx, '#6b3a1e', x + 4, y + 6, 16, 22); r(ctx, C.oro, x + 4, y + 6, 16, 3); r(ctx, '#a0602e', x + 8, y + 13, 8, 8); r(ctx, '#4a2410', x + 4, y + 26, 16, 2);
      } else if (p.id === 'nata') {
        r(ctx, C.nieve, x + 7, y + 8, 10, 20); r(ctx, C.rojo, x + 7, y + 14, 10, 4); r(ctx, C.nieve3, x + 14, y + 8, 3, 20);
        r(ctx, '#9aa0b0', x + 10, y + 3, 4, 5); r(ctx, C.blanco, x + 11, y, 3, 3);
      } else if (p.id === 'nubes') {
        r(ctx, '#3a6aa0', x + 3, y + 12, 22, 12); r(ctx, '#5a8ac0', x + 3, y + 12, 22, 2);
        for (let k = 0; k < 6; k++) r(ctx, k % 2 ? '#f6b0c8' : C.nieve, x + 5 + (k % 3) * 6, y + 8 + Math.floor(k / 3) * 3, 4, 4);
      } else if (p.id === 'entrega') {
        r(ctx, '#2b1a14', x, y, w, h); r(ctx, '#1b2350', x + 3, y + 3, w - 6, h - 12); Sprites.tramar(ctx, x + 3, y + 3, w - 6, h - 12, '#2c3a7a', (xx, yy) => (yy - y) / h);
        r(ctx, C.nieve, x + 3, y + h - 14, w - 6, 3);                                                     // nieve en la ventanilla
        r(ctx, C.oro, x + w / 2 - 4, y + h - 8, 8, 4); r(ctx, C.oroClaro, x + w / 2 - 1, y + h - 10, 2, 2); // timbre
      } else if (p.id === 'papelera') {
        r(ctx, '#5a6278', x + 3, y + 4, w - 6, h - 4); r(ctx, '#7a849c', x + 1, y + 2, w - 2, 3); r(ctx, '#454c60', x + 8, y + 9, 2, 14); r(ctx, '#454c60', x + 14, y + 9, 2, 14);
      }
    }

    let fondo = null;
    function crearFondo() {
      const [cv, g] = Sprites.lienzoAux(320, 210);
      const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      // pared de azulejos con una ventana nevada
      R('#3a5a7a', 0, 0, 320, 52);
      for (let y = 0; y < 52; y += 8) for (let x = (y / 8) % 2 * 4; x < 320; x += 8) R('#45698c', x, y, 7, 7);
      R(C.crema, 112, 4, 22, 18); R(C.noche, 114, 6, 18, 14); R(C.nieve, 114, 16, 18, 4);
      for (let k = 0; k < 6; k++) R(C.nieve, 115 + (k * 7) % 17, 7 + (k * 5) % 8, 1, 1);
      // suelo a cuadros
      for (let y = 52; y < 210; y += 10) for (let x = 0; x < 320; x += 10) {
        R(((x + y) / 10) % 2 ? '#e8dcc0' : '#d4c19c', x, y, 10, 10);
        R('#c2ad86', x, y + 9, 10, 1); R('#c2ad86', x + 9, y, 1, 10);                                  // juntas
      }
      // encimeras: arriba, y a los lados donde están los puestos
      R('#7a4a28', 26, 44, 268, 10); R('#c98a3a', 26, 44, 268, 3);
      R('#7a4a28', 286, 60, 34, 120); R('#c98a3a', 286, 60, 3, 120);
      R('#7a4a28', 0, 132, 34, 44); R('#c98a3a', 31, 132, 3, 44);
      return cv;
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + (altoCaja + 6) * (api.ancho - api.margenDerecho < 300 ? 3 : 2) + 2;
      const K = Math.max(1, Math.min(3, Math.floor(Math.min(api.ancho / 322, (api.alto - arriba - 4) / 212))));
      const x0 = Math.floor((api.ancho - 320 * K) / 2), y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - 210 * K) / 2));
      return { K, x0, y0, altoCaja, e };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api);
      ctx.fillStyle = '#1b1426'; ctx.fillRect(0, 0, api.ancho, api.alto);
      ctx.save();
      ctx.translate(d.x0, d.y0);
      ctx.scale(d.K, d.K);
      ctx.drawImage(fondo || (fondo = crearFondo()), 0, 0);
      for (const p of PUESTOS) puesto(ctx, p, api.t);
      // resalte del puesto que tiene delante
      if (cercano) {
        const p = cercano, o = Math.floor(api.t * 3) % 2;
        r(ctx, C.oroClaro, p.x - 2, p.y - 2 - o, p.w + 4, 1); r(ctx, C.oroClaro, p.x - 2, p.y + p.h + 1 + o, p.w + 4, 1);
      }
      // la chica (y lo que lleva)
      Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y), jug.dir, jug.andando ? 'andar' : 'idle', api.t);
      if (mano) objeto(ctx, mano, Math.round(jug.x + jug.dir * 7), Math.round(jug.y - 12));
      ctx.restore();

      const e = d.e;
      // nombre del puesto cercano y mensajes
      if (cercano && !aviso) texto(ctx, cercano.nombre, d.x0 + Math.round(cercano.fx * d.K), d.y0 + Math.round((cercano.y + cercano.h + 6) * d.K), C.nieve, { centro: true, sombra: C.tinta, escala: e });
      if (aviso) {
        const em = e, ax = Math.max(Comun.medir(aviso.texto, em) / 2 + 4, Math.min(api.ancho - Comun.medir(aviso.texto, em) / 2 - 4, d.x0 + aviso.x * d.K));
        texto(ctx, aviso.texto, Math.round(ax), Math.max(d.y0 - 10, d.y0 + Math.round(aviso.y * d.K) - 12), aviso.color, { centro: true, sombra: C.tinta, escala: em });
      }

      // marcadores: pedidos servidos, tiempo, y la comanda actual (con o sin nubes)
      const t1 = `PEDIDOS ${servidos}/${PEDIDOS.length}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const anchoBarra = 50, anchoNum = Comun.medir('150', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + d.altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, d.altoCaja);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, d.altoCaja - 8);
      ctx.fillStyle = quedan < 20 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * quedan / TIEMPO), d.altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 20 ? C.rojoClaro : C.nieve, { escala: e });
      if (servidos < PEDIDOS.length) {
        const t3 = pedido().nubes ? 'CON NATA Y NUBES' : 'CON NATA';
        const largo = 'COMANDA: ' + t3, tx = Comun.medir(largo, e) + 30 <= api.ancho - 12 ? largo : t3;   // si no cabe, más corto
        const y3 = Math.max(y2, 6) + d.altoCaja + 6, w3 = Comun.medir(tx, e) + 24;
        Comun.caja(ctx, 6, y3, w3, d.altoCaja);
        texto(ctx, tx, 10, y3 + 4, C.nieve, { escala: e });
        ctx.save(); ctx.translate(6 + w3 - 10, y3 + d.altoCaja - 3); taza(ctx, 0, 0, { choco: true, nata: true, nubes: pedido().nubes }); ctx.restore();
      }
    }

    // Solo en modo debug: estado y puntos de uso de cada puesto en coordenadas del lienzo, para las pruebas
    let ultima = { K: 1, x0: 0, y0: 0 };
    if (Dias.debug) window.cocinaDebug = () => ({
      mano, cazo: cazo.estado, raciones: cazo.raciones, servidos, quedan, andando: !!objetivo,
      puestos: Object.fromEntries(PUESTOS.map((p) => [p.id, { x: ultima.x0 + (p.x + p.w / 2) * ultima.K, y: ultima.y0 + (p.y + p.h / 2) * ultima.K }]))
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'CHOCOLATE CALIENTE',
      instruccion: 'LECHE AL CAZO, ESPERA A QUE SE CALIENTE Y ECHA EL CACAO. REMUEVE, SIRVE EN UNA TAZA, PON NATA (Y NUBES SI LAS PIDEN) Y ENTREGA. ¡QUE NO SE QUEME LA LECHE! MUEVETE CON LAS FLECHAS Y USA CON ESPACIO, O TOCA DONDE IR.',
      pantallaCompleta: true,
      musica: 'caballeros',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
