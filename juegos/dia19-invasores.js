'use strict';
/* Día 19 — Invasión navideña.
   Matamarcianos con trineo: la chica, en su trineo volador, se mueve abajo (← →) y lanza bolas de nieve hacia
   arriba (Espacio / ABRIR; con el dedo, mantener pulsado: va hacia el dedo y dispara sola). Arriba, una formación
   de duendes traviesos, hombrecillos de jengibre y bolas de Navidad con cara va de lado a lado, baja al llegar
   al borde y tira carbón. Tres fuertes de nieve protegen (y se van rompiendo). A veces cruza un regalo con alas:
   si se le da, devuelve una vida. Dos oleadas (la segunda, más rápida). 3 vidas; se pierde si te dan 3 veces
   o si la formación llega a los fuertes. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia19-invasores'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const W = 240, H = 200, VIDAS = 3, OLEADAS = 2;
    const COLS = 8, FILAS = 4, SEP_X = 22, SEP_Y = 16;
    const JUG_Y = H - 14, VEL_JUG = 95, VEL_BOLA = 235, VEL_CARBON = 72;
    const FUERTE_Y = H - 46, CELDA = 2, FUERTE_W = 13, FUERTE_H = 6;      // fuertes de 26 x 12 px, en celdas de 2 px
    const TIPOS = ['duende', 'jengibre', 'bola', 'bola'];                 // por filas, de arriba abajo

    let jug, bolas, carbones, enemigos, dir, paso, proxPaso, frame, proxCarbon, fuertes, vidas, oleada, golpe, final, cartel, chispas, alado, proxAlado;

    function nuevaOleada() {
      enemigos = [];
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) enemigos.push({ x: 24 + c * SEP_X, y: 22 + f * SEP_Y, tipo: TIPOS[f], col: c });
      dir = 1; paso = 0; proxPaso = 0.6; frame = 0; proxCarbon = 1.6; bolas = []; carbones = [];
      cartel = { t: `OLEADA ${oleada}/${OLEADAS}`, vida: 1.6 };
    }

    function nuevosFuertes() {
      fuertes = [0, 1, 2].map((i) => {
        const x0 = Math.round(W * (i + 1) / 4 - FUERTE_W * CELDA / 2), celdas = [];
        for (let fy = 0; fy < FUERTE_H; fy++) for (let fx = 0; fx < FUERTE_W; fx++) {
          const hueco = fy >= FUERTE_H - 2 && fx >= 4 && fx <= 8;                       // arco de la puerta
          const esquina = fy === 0 && (fx === 0 || fx === FUERTE_W - 1);
          if (!hueco && !esquina) celdas.push({ x: x0 + fx * CELDA, y: FUERTE_Y + fy * CELDA });
        }
        return celdas;
      });
    }

    function reiniciar() {
      jug = { x: W / 2, enfriar: 0, inv: 0 }; vidas = VIDAS; oleada = 1; golpe = 0; final = 0; chispas = []; alado = null; proxAlado = 9;
      nuevosFuertes(); nuevaOleada();
    }

    function explotar(x, y, colores, n = 10) {
      for (let k = 0; k < n; k++) chispas.push({ x, y, vx: Math.random() * 90 - 45, vy: Math.random() * 90 - 55, vida: 0.5 + Math.random() * 0.3, c: colores[k % colores.length] });
    }

    // ¿Choca un proyectil (x, y) con los fuertes? Si sí, rompe un trocito alrededor
    function contraFuerte(x, y) {
      for (const f of fuertes) {
        const i = f.findIndex((c) => x >= c.x - 1 && x <= c.x + CELDA && y >= c.y - 1 && y <= c.y + CELDA);
        if (i >= 0) {
          const c = f[i];
          for (let k = f.length - 1; k >= 0; k--) if (Math.abs(f[k].x - c.x) <= CELDA && Math.abs(f[k].y - c.y) <= CELDA && Math.random() < 0.75) f.splice(k, 1);
          explotar(x, y, [C.nieve, C.nieve2], 4);
          return true;
        }
      }
      return false;
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8, arriba = 6 + altoCaja + 6;
      const K = Math.max(1, Math.floor(Math.min(api.ancho / (W + 4), (api.alto - arriba - 4) / H)));
      return { K, e, altoCaja, x0: Math.floor((api.ancho - W * K) / 2), y0: arriba + Math.max(0, Math.floor((api.alto - arriba - H * K) / 2)) };
    }

    function actualizar(dt, api, d) {
      for (const c of chispas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 120 * dt; c.vida -= dt; }
      chispas = chispas.filter((c) => c.vida > 0);
      if (golpe > 0) golpe -= dt;
      if (cartel) { cartel.vida -= dt; if (cartel.vida <= 0) cartel = null; }
      if (final > 0) { final += dt; if (final > 1.8) api.ganar(); return; }

      // la chica: flechas o el dedo (va hacia él y dispara sola mientras se mantiene)
      const e = api.entrada;
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0), dispara = e.pulsado('accion') || e.accion;
      if (!dx && e.puntero.abajo) {
        const px = (e.puntero.x - d.x0) / d.K;
        if (Math.abs(px - jug.x) > 3) dx = Math.sign(px - jug.x);
        dispara = true;
      }
      e.pulsado('toque');
      jug.x = Math.max(10, Math.min(W - 10, jug.x + dx * VEL_JUG * dt));
      jug.enfriar -= dt; if (jug.inv > 0) jug.inv -= dt;
      if (dispara && jug.enfriar <= 0 && bolas.length < 2 && !cartel) {
        bolas.push({ x: jug.x + 3, y: JUG_Y - 26 }); jug.enfriar = 0.3; Sonido.efecto('saltar');
      }

      // bolas de nieve hacia arriba
      for (const b of bolas) b.y -= VEL_BOLA * dt;
      bolas = bolas.filter((b) => {
        if (b.y < -6) return false;
        if (contraFuerte(b.x, b.y)) return false;
        const i = enemigos.findIndex((n) => Math.abs(n.x - b.x) <= 6 && Math.abs(n.y - b.y) <= 5);
        if (i >= 0) {
          const n = enemigos[i];
          explotar(n.x, n.y, n.tipo === 'duende' ? [C.verde, C.rojo, C.oroClaro] : n.tipo === 'jengibre' ? ['#b0703a', C.blanco, C.rojo] : [C.rojoClaro, C.oro, C.blanco]);
          enemigos.splice(i, 1); Sonido.efecto('pareja');
          if (!enemigos.length) {
            if (oleada >= OLEADAS) { final = 0.001; Sonido.efecto('completar'); }
            else { oleada++; nuevaOleada(); }
          }
          return false;
        }
        if (alado && Math.abs(alado.x - b.x) <= 8 && Math.abs(alado.y - b.y) <= 6) {
          explotar(alado.x, alado.y, [C.oroClaro, C.rojo, C.blanco], 14);
          if (vidas < VIDAS) { vidas++; api.aviso('+1 VIDA', (alado.x * d.K) + d.x0, (alado.y + 10) * d.K + d.y0, C.oroClaro); }
          else api.aviso('¡BIEN!', (alado.x * d.K) + d.x0, (alado.y + 10) * d.K + d.y0, C.oroClaro);
          alado = null; Sonido.efecto('completar');
          return false;
        }
        return true;
      });
      if (final > 0 || cartel) return;

      // la formación: pasos a saltos, más rápidos cuantos menos quedan (y en la 2.ª oleada)
      proxPaso -= dt;
      if (proxPaso <= 0 && enemigos.length) {
        const prisa = oleada === 1 ? 1 : 0.7;
        proxPaso = (0.13 + 0.5 * enemigos.length / (COLS * FILAS)) * prisa;     // los últimos no van tan rápido que no se les pueda dar
        frame ^= 1;
        const minX = Math.min(...enemigos.map((n) => n.x)), maxX = Math.max(...enemigos.map((n) => n.x));
        if ((dir > 0 && maxX + 4 > W - 8) || (dir < 0 && minX - 4 < 8)) { dir = -dir; for (const n of enemigos) n.y += 7; }
        else for (const n of enemigos) n.x += dir * 4;
        if (Math.max(...enemigos.map((n) => n.y)) + 6 >= FUERTE_Y) { api.perder('¡LA INVASIÓN HA LLEGADO A LOS FUERTES! OTRA VEZ'); return; }
      }

      // carbón: lo tira uno de los de más abajo de una columna
      proxCarbon -= dt;
      if (proxCarbon <= 0 && enemigos.length) {
        proxCarbon = (oleada === 1 ? 1.1 : 0.75) + Math.random() * 0.8;
        const abajo = {};
        for (const n of enemigos) if (!abajo[n.col] || n.y > abajo[n.col].y) abajo[n.col] = n;
        const lista = Object.values(abajo), cerca = lista.filter((n) => Math.abs(n.x - jug.x) < 30);
        const quien = (cerca.length && Math.random() < 0.6 ? cerca : lista)[Math.floor(Math.random() * (cerca.length && Math.random() < 0.6 ? cerca.length : lista.length))] || lista[0];
        carbones.push({ x: quien.x, y: quien.y + 6 });
      }
      for (const c of carbones) c.y += VEL_CARBON * dt;
      carbones = carbones.filter((c) => {
        if (c.y > H + 4) return false;
        if (contraFuerte(c.x, c.y)) return false;
        if (jug.inv <= 0 && Math.abs(c.x - jug.x) <= 8 && c.y >= JUG_Y - 22 && c.y <= JUG_Y + 3) {
          vidas--; jug.inv = 1.4; golpe = 0.3; api.sacudir(0.3); Sonido.efecto('golpe');
          explotar(jug.x, JUG_Y - 4, ['#2b2b36', '#5c5866', C.rojo]);
          if (vidas <= 0) api.perder('¡TE HAN DADO 3 VECES CON CARBÓN! A POR OTRA');
          return false;
        }
        return true;
      });

      // el regalo con alas que cruza por arriba de vez en cuando
      proxAlado -= dt;
      if (!alado && proxAlado <= 0) { const izq = Math.random() < 0.5; alado = { x: izq ? -10 : W + 10, y: 11, vx: izq ? 38 : -38 }; proxAlado = 14 + Math.random() * 8; }
      if (alado) { alado.x += alado.vx * dt; if (alado.x < -20 || alado.x > W + 20) alado = null; }
    }

    /* ---------- Dibujo (escena de 240 x 200) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function enemigo(ctx, n) {
      const x = Math.round(n.x), y = Math.round(n.y), f = frame;
      if (n.tipo === 'duende') {                                           // duende travieso: gorro verde, orejas, ceño
        r(ctx, C.verde, x - 3, y - 7, 6, 3); r(ctx, C.verde, x - 1, y - 9, 3, 2); r(ctx, C.oroClaro, x + (f ? 2 : 1), y - 10, 2, 2);
        r(ctx, C.blanco, x - 4, y - 4, 8, 1);
        r(ctx, C.piel, x - 3, y - 3, 6, 4); r(ctx, C.piel, x - 5, y - 3 + f, 2, 2); r(ctx, C.piel, x + 3, y - 3 + f, 2, 2);
        r(ctx, C.tinta, x - 2, y - 2, 1, 1); r(ctx, C.tinta, x + 1, y - 2, 1, 1); r(ctx, C.tinta, x - 2, y - 3, 2, 1); r(ctx, C.tinta, x + 1, y - 3, 2, 1);
        r(ctx, C.rojo, x - 3, y + 1, 6, 3); r(ctx, C.tinta, x - (f ? 3 : 2), y + 4, 2, 1); r(ctx, C.tinta, x + (f ? 1 : 0), y + 4, 2, 1);
      } else if (n.tipo === 'jengibre') {                                  // hombrecillo de jengibre enfadado
        r(ctx, '#b0703a', x - 2, y - 6, 5, 4); r(ctx, '#b0703a', x - 3, y - 2, 7, 4);
        r(ctx, '#b0703a', x - 5, y - 2 + (f ? -1 : 1), 2, 2); r(ctx, '#b0703a', x + 4, y - 2 + (f ? 1 : -1), 2, 2);
        r(ctx, '#b0703a', x - 3, y + 2, 2, 3 - f); r(ctx, '#b0703a', x + 2, y + 2, 2, 2 + f);
        r(ctx, C.tinta, x - 1, y - 5, 1, 1); r(ctx, C.tinta, x + 1, y - 5, 1, 1); r(ctx, C.tinta, x - 1, y - 3, 3, 1);
        r(ctx, C.blanco, x - 3, y - 1, 7, 1); r(ctx, C.rojo, x, y, 1, 1); r(ctx, C.verde, x, y + 1, 1, 1);
      } else {                                                             // bola de Navidad con cara pícara
        const c = (n.col + Math.floor(n.y / SEP_Y)) % 2 ? C.rojo : '#4a7ad8';
        r(ctx, C.oro, x - 1, y - 7, 3, 2); r(ctx, C.oroClaro, x, y - 8, 1, 1);
        r(ctx, c, x - 3, y - 5, 7, 9); r(ctx, c, x - 4, y - 4, 9, 7);
        r(ctx, C.blanco, x - 3, y - 4, 1, 2);
        r(ctx, C.oroClaro, x - 4, y - 1 + f, 9, 1);
        r(ctx, C.tinta, x - 2, y - 2, 1, 1); r(ctx, C.tinta, x + 2, y - 2, 1, 1); r(ctx, C.tinta, x - 1, y + 1, 3, 1);
      }
    }

    function trineo(ctx, t) {
      const x = Math.round(jug.x), y = JUG_Y;
      Sprites.personaje(ctx, x + 1, y - 2, 1, 'idle', t);
      r(ctx, C.rojoOsc, x - 9, y - 2, 18, 2); r(ctx, C.rojo, x - 8, y - 6, 15, 5); r(ctx, C.oro, x - 8, y - 6, 15, 1);
      r(ctx, C.oro, x - 9, y + 1, 18, 1); r(ctx, C.oro, x + 8, y - 1, 2, 2); r(ctx, C.oro, x - 10, y - 4, 1, 5);
      if (Math.floor(t * 8) % 2) r(ctx, C.oroClaro, x - 12, y - 1, 2, 1);                       // estela
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(d.x0, d.y0); ctx.scale(d.K, d.K);
      // marco del campo y tejados nevados al fondo
      r(ctx, 'rgba(11,16,48,0.55)', 0, 0, W, H);
      for (let i = 0; i < 8; i++) { const bx = i * 32 - 4, bh = 10 + ((i * 7) % 4) * 4; r(ctx, '#1b2245', bx, H - bh, 28, bh); r(ctx, C.nieve2, bx - 1, H - bh - 1, 30, 2); if (i % 2) r(ctx, C.oroClaro, bx + 10, H - bh + 4, 3, 2); }
      r(ctx, C.nieve, 0, H - 2, W, 2);
      // fuertes de nieve
      for (const f of fuertes) for (const c of f) { r(ctx, C.nieve, c.x, c.y, CELDA, CELDA); }
      for (const f of fuertes) for (const c of f) if ((c.x + c.y) % 6 === 0) r(ctx, C.nieve3, c.x, c.y + 1, CELDA, 1);
      for (const n of enemigos) enemigo(ctx, n);
      if (alado) {                                                         // regalo con alas
        const a = Math.floor(t * 8) % 2;
        r(ctx, C.blanco, alado.x - 9, alado.y - 3 - a, 5, 2); r(ctx, C.blanco, alado.x + 4, alado.y - 3 - a, 5, 2);
        Sprites.regalo(ctx, Math.round(alado.x) - 4, Math.round(alado.y) - 3, 8, 7, C.oro, C.rojo);
      }
      for (const b of bolas) { r(ctx, C.tinta, b.x - 2, b.y - 2, 4, 5); r(ctx, C.nieve, b.x - 1, b.y - 2, 3, 4); r(ctx, C.blanco, b.x - 1, b.y - 2, 1, 1); }
      for (const c of carbones) { r(ctx, '#16161c', c.x - 2, c.y - 2, 4, 4); r(ctx, '#5c5866', c.x - 1, c.y - 2, 2, 1); if (Math.floor(t * 10) % 2) r(ctx, C.naranja, c.x, c.y - 4, 1, 2); }
      if (!(jug.inv > 0 && Math.floor(t * 10) % 2)) trineo(ctx, t);
      for (const c of chispas) r(ctx, c.c, c.x, c.y, 2, 2);
      ctx.restore();
      if (golpe > 0) { ctx.globalAlpha = golpe; ctx.fillStyle = C.rojo; ctx.fillRect(0, 0, api.ancho, api.alto); ctx.globalAlpha = 1; }

      const e = d.e;
      if (cartel || final > 0) {
        const m = final > 0 ? '¡INVASIÓN DETENIDA!' : cartel.t, em = Comun.medir(m, e + 1) + 20 <= api.ancho ? e + 1 : e;
        const w = Comun.medir(m, em) + 12, h = Comun.altoTexto(em) + 12, bx = Math.floor((api.ancho - w) / 2), by = Math.floor(d.y0 + H * d.K * 0.45);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, m, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
      // HUD: vidas y oleada
      const wv = 10 + VIDAS * 12;
      Comun.caja(ctx, 6, 6, wv, d.altoCaja);
      for (let i = 0; i < VIDAS; i++) {
        const x = 12 + i * 12, y = 6 + Math.floor(d.altoCaja / 2) - 4, col = i < vidas ? C.rojoClaro : C.nocheClara;
        r(ctx, col, x, y, 3, 3); r(ctx, col, x + 4, y, 3, 3); r(ctx, col, x - 1, y + 1, 9, 3); r(ctx, col, x, y + 4, 7, 2); r(ctx, col, x + 2, y + 6, 3, 1);
      }
      const t2 = `OLEADA ${oleada}/${OLEADAS} · QUEDAN ${enemigos.length}`, t2c = 6 + wv + 10 + Comun.medir(t2, e) + 8 <= api.ancho - api.margenDerecho ? t2 : `${oleada}/${OLEADAS} · ${enemigos.length}`;
      Comun.caja(ctx, 6 + wv + 10, 6, Comun.medir(t2c, e) + 8, d.altoCaja);
      texto(ctx, t2c, 6 + wv + 14, 10, C.nieve, { escala: e });
    }

    // Solo en modo debug: estado para las pruebas automáticas
    if (Dias.debug) window.invasoresDebug = () => ({ final: final > 0, vidas, oleada, x: jug.x, cartel: !!cartel, vivos: enemigos.length,
      dir, vel: 4 / Math.max(0.05, (0.13 + 0.5 * enemigos.length / (COLS * FILAS)) * (oleada === 1 ? 1 : 0.7)), enemigos: enemigos.map((n) => ({ x: n.x, y: n.y })), carbones: carbones.map((c) => ({ x: c.x, y: c.y })), bolas: bolas.length, jugY: JUG_Y });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'INVASIÓN NAVIDEÑA',
      instruccion: 'UNOS DUENDES TRAVIESOS QUIEREN LLENAR EL EDIFICIO DE CARBÓN. MUEVE EL TRINEO CON ← → Y LANZA BOLAS DE NIEVE CON ESPACIO (O MANTÉN EL DEDO: VA HACIA ÉL Y DISPARA). ESQUIVA EL CARBÓN Y DETÉN 2 OLEADAS.',
      pantallaCompleta: true,
      musica: 'invasores',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, disposicion(api)),
      dibujar
    });
  }
};
