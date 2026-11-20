'use strict';
/* Día 15 — Pinta la fachada.
   La chica va en un andamio colgante con un rodillo: se mueve por la fachada (flechas, o siguiendo el dedo)
   y pinta la zona que toca con el rodillo. La lluvia despinta algunas zonas. Hay que dejar toda la fachada
   pintada antes de que se acabe el tiempo. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia15-fachada'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const COLS = 10, FILAS = 6, CW = 22, CH = 18, TIEMPO = 45;
    const VX = 90, VY = 70;
    // escena de 260x224: la fachada empieza en (20, 40); el rodillo está 22 px por encima de los pies
    const FX = 20, FY = 40, ESC_W = 260, ESC_H = 224, BRAZO = 22;
    const VENTANAS = new Set(['1,2', '4,2', '8,2', '1,4', '5,4', '8,4']);  // casillas que no se pintan (ventanas)

    let celdas, jug, gotas, salpicaduras, quedan, final, ultimoPintado;

    function reiniciar() {
      celdas = [];
      for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) celdas.push({ c, f, ventana: VENTANAS.has(c + ',' + f), pintada: false });
      jug = { x: FX + 10, y: FY + FILAS * CH + BRAZO - 6, dir: 1, andando: false };
      gotas = []; salpicaduras = []; quedan = TIEMPO; final = 0; ultimoPintado = 0; proxGota = 2;
    }
    let proxGota = 2;

    const pintables = () => celdas.filter((c) => !c.ventana);
    const porcentaje = () => Math.round(pintables().filter((c) => c.pintada).length / pintables().length * 100);
    const celdaEn = (x, y) => {
      const c = Math.floor((x - FX) / CW), f = Math.floor((y - FY) / CH);
      return c >= 0 && f >= 0 && c < COLS && f < FILAS ? celdas[f * COLS + c] : null;
    };

    function actualizar(dt, api, d) {
      for (let i = salpicaduras.length - 1; i >= 0; i--) { const s = salpicaduras[i]; s.vida -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; if (s.vida <= 0) salpicaduras.splice(i, 1); }
      if (final > 0) { final += dt; if (final > 1.6) api.ganar(); return; }
      const e = api.entrada;
      // mover: flechas, o hacia el dedo (el rodillo va hacia donde se toca)
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0), dy = (e.abajo ? 1 : 0) - (e.arriba ? 1 : 0);
      if (!dx && !dy && e.puntero.abajo) {
        const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K + BRAZO;
        if (Math.abs(px - jug.x) > 2) dx = Math.sign(px - jug.x);
        if (Math.abs(py - jug.y) > 2) dy = Math.sign(py - jug.y);
      }
      e.pulsado('toque'); e.pulsado('accion');
      jug.andando = !!dx;
      if (dx) jug.dir = dx;
      jug.x = Math.max(FX + 3, Math.min(FX + COLS * CW - 3, jug.x + dx * VX * dt));
      jug.y = Math.max(FY + BRAZO + 3, Math.min(FY + FILAS * CH + BRAZO - 3, jug.y + dy * VY * dt));
      // el rodillo pinta la casilla que toca
      const cel = celdaEn(jug.x + jug.dir * 4, jug.y - BRAZO);
      if (cel && !cel.ventana && !cel.pintada) {
        cel.pintada = true;
        if (api.t - ultimoPintado > 0.08) { Sonido.efecto('carta'); ultimoPintado = api.t; }
        if (porcentaje() >= 100) { final = 0.001; Sonido.efecto('completar'); return; }
      }

      // lluvia: cada gota cae hasta una fila al azar y, si ahí hay pintura, la despinta
      const avance = 1 - quedan / TIEMPO;
      proxGota -= dt;
      if (proxGota <= 0) {
        proxGota = 1.3 - avance * 0.5 + Math.random() * 0.4;
        const c = Math.floor(Math.random() * COLS), f = Math.floor(Math.random() * FILAS);
        gotas.push({ x: FX + c * CW + 4 + Math.random() * (CW - 8), y: 0, objetivo: FY + f * CH + CH / 2, vy: 150 });
      }
      for (let i = gotas.length - 1; i >= 0; i--) {
        const g = gotas[i];
        g.y += g.vy * dt;
        if (g.y >= g.objetivo) {
          gotas.splice(i, 1);
          const c = celdaEn(g.x, g.y);
          if (c && c.pintada) { c.pintada = false; Sonido.efecto('agua'); }
          for (let k = 0; k < 4; k++) salpicaduras.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, vida: 0.35 });
        }
      }

      quedan -= dt;
      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO CON EL ${porcentaje()} % PINTADO`); }
    }

    /* ---------- Dibujo (escena de 260x224) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function casilla(ctx, cel) {
      const x = FX + cel.c * CW, y = FY + cel.f * CH;
      if (cel.ventana) {
        r(ctx, '#b9b2a6', x, y, CW, CH); r(ctx, '#2b1a14', x + 3, y + 2, CW - 6, CH - 4);
        r(ctx, '#ffe9a0', x + 4, y + 3, CW - 8, 6); r(ctx, '#f0a93a', x + 4, y + 9, CW - 8, CH - 12); r(ctx, '#2b1a14', x + CW / 2 - 1, y + 3, 2, CH - 6);
        return;
      }
      if (cel.pintada) {
        r(ctx, '#f0d8a8', x, y, CW, CH); r(ctx, '#f8e8c4', x, y, CW, 2); r(ctx, '#d8bc88', x, y + CH - 1, CW, 1);
      } else {
        r(ctx, '#7a7a86', x, y, CW, CH);
        Sprites.tramar(ctx, x, y, CW, CH, '#5e5e6a', (xx, yy) => ((xx * 7 + yy * 13) % 11) / 22 + 0.15);
        r(ctx, '#4a4a56', x + 5 + (cel.c * 3) % 9, y + 3, 1, 5); r(ctx, '#4a4a56', x + 6 + (cel.c * 3) % 9, y + 8, 1, 4);   // grieta
      }
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 6 + (api.ancho - api.margenDerecho < 260 ? altoCaja + 6 : 0);
      const K = Math.max(1, Math.min(3, Math.floor(Math.min(api.ancho / (ESC_W + 8), (api.alto - arriba - 4) / ESC_H))));
      return { K, x0: Math.floor((api.ancho - ESC_W * K) / 2), y0: arriba + Math.max(0, Math.floor((api.alto - arriba - ESC_H * K) / 2)), e, altoCaja };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(d.x0, d.y0); ctx.scale(d.K, d.K);
      // nubes de lluvia, edificio, tejado y calle
      r(ctx, '#3a3f58', 0, 0, ESC_W, 10); for (let x = 0; x < ESC_W; x += 14) r(ctx, '#4a5068', x, 6 + (x % 28 ? 2 : 0), 16, 8);
      r(ctx, '#4a3238', FX - 8, FY - 14, COLS * CW + 16, 10); r(ctx, C.nieve, FX - 9, FY - 17, COLS * CW + 18, 4);
      r(ctx, '#5e2620', FX - 4, FY - 4, COLS * CW + 8, FILAS * CH + 70);
      celdas.forEach((c) => casilla(ctx, c));
      r(ctx, '#3a3f58', 0, ESC_H - 16, ESC_W, 16); r(ctx, '#5a6278', 0, ESC_H - 16, ESC_W, 2);
      r(ctx, '#2b1a14', FX + COLS * CW / 2 - 10, FY + FILAS * CH + 20, 20, ESC_H - 16 - (FY + FILAS * CH + 20));   // portal
      // andamio colgante: cuerdas desde el tejado y tablón bajo los pies
      const gx = Math.round(jug.x), gy = Math.round(jug.y);
      r(ctx, '#8c857b', gx - 16, FY - 10, 1, gy - FY + 10); r(ctx, '#8c857b', gx + 15, FY - 10, 1, gy - FY + 10);
      r(ctx, '#8a5c2c', gx - 18, gy, 36, 3); r(ctx, '#5c3a18', gx - 18, gy + 3, 36, 1);
      // la chica con el rodillo levantado
      Sprites.personaje(ctx, gx, gy, jug.dir, jug.andando ? 'andar' : 'idle', t);
      const rx = gx + jug.dir * 4, ry = gy - BRAZO;
      r(ctx, '#8c857b', rx, ry + 2, 1, 10);
      r(ctx, C.tinta, rx - 5, ry - 2, 11, 4); r(ctx, '#f0d8a8', rx - 4, ry - 1, 9, 2);
      // lluvia y salpicaduras
      ctx.fillStyle = '#9fd0ff';
      for (const g of gotas) ctx.fillRect(Math.round(g.x), Math.round(g.y), 1, 4);
      for (const s of salpicaduras) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      ctx.restore();

      const e = d.e;
      if (final > 0) {
        const em = Comun.medir('¡COMO NUEVA!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡COMO NUEVA!', Math.floor(api.ancho / 2), Math.floor(api.alto * 0.4), C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const t1 = `PINTADO ${porcentaje()} %`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const anchoBarra = 50, anchoNum = Comun.medir('45', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + d.altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, d.altoCaja);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, d.altoCaja - 8);
      ctx.fillStyle = quedan < 10 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * quedan / TIEMPO), d.altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    // Solo en modo debug: casillas sin pintar (punto de pintura en el lienzo), para las pruebas
    let ultima = { K: 1, x0: 0, y0: 0 };
    if (Dias.debug) window.fachadaDebug = () => ({
      porcentaje: porcentaje(), final: final > 0, quedan,
      sinPintar: celdas.filter((c) => !c.ventana && !c.pintada).map((c) => ({ x: ultima.x0 + (FX + c.c * CW + CW / 2) * ultima.K, y: ultima.y0 + (FY + c.f * CH + CH / 2) * ultima.K }))
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'PINTA LA FACHADA',
      instruccion: 'MUEVE EL ANDAMIO CON LAS FLECHAS (O TOCA DONDE QUIERAS PINTAR) Y PASA EL RODILLO POR TODA LA PARED GRIS. ¡LA LLUVIA DESPINTA! TIENES 45 SEGUNDOS.',
      pantallaCompleta: true,
      musica: 'pintura',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
