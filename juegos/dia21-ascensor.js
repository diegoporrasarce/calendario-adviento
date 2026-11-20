'use strict';
/* Día 21 — Ascensor.
   El edificio de lado con su ascensor. Los vecinos aparecen en su planta con un bocadillo que dice a qué
   planta van. Se sube y baja con ↑ ↓ (o tocando una planta) y se abren las puertas con Espacio (o tocando el
   ascensor): salen los que llegan a esa planta y entran los que esperan (caben 3). 8 vecinos en 60 s. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia21-ascensor'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const PLANTAS = 6, META = 8, TIEMPO = 60, CAPACIDAD = 3;
    const ALTO_P = 34, T_PLANTA = 0.32;                                   // alto de cada planta y tiempo en recorrerla
    const ROPAS = ['#4a7ad8', '#3f8a5c', '#9a5ad0', '#f08a2c', '#c8383f', '#2c8a8a'];
    const PELOS = ['#6b3f23', '#2b1a14', '#c9a227', '#8a8a8a', '#a8402a'];

    let cabina, destino, puertas, dentro, esperando, entregados, quedan, proxVecino, final, aviso, avisoT;

    function reiniciar() {
      cabina = 0; destino = 0; puertas = 0; dentro = []; esperando = []; entregados = 0; quedan = TIEMPO; proxVecino = 0.5; final = 0;
      aviso = null; avisoT = 0;
      for (let k = 0; k < 2; k++) nuevoVecino();
    }

    function nuevoVecino() {
      const libres = [...Array(PLANTAS).keys()].filter((p) => esperando.filter((v) => v.planta === p).length < 2);
      if (!libres.length || esperando.length >= 6) return;
      const planta = libres[Math.floor(Math.random() * libres.length)];
      let dest; do dest = Math.floor(Math.random() * PLANTAS); while (dest === planta);
      esperando.push({ planta, dest, ropa: ROPAS[Math.floor(Math.random() * ROPAS.length)], pelo: PELOS[Math.floor(Math.random() * PELOS.length)], t: Math.random() * 6 });
    }

    function decir(t) { aviso = t; avisoT = 1.2; }

    function abrir() {
      if (cabina !== destino || puertas > 0) return;
      puertas = 0.9;
      Sonido.efecto('abrir');
      const bajan = dentro.filter((v) => v.dest === cabina);
      dentro = dentro.filter((v) => v.dest !== cabina);
      if (bajan.length) { entregados += bajan.length; Sonido.efecto('pareja'); decir(bajan.length > 1 ? `¡${bajan.length} ENTREGADOS!` : '¡ENTREGADO!'); }
      const suben = esperando.filter((v) => v.planta === cabina);
      for (const v of suben) {
        if (dentro.length >= CAPACIDAD) { decir('¡EL ASCENSOR ESTA LLENO!'); break; }
        dentro.push(v); esperando.splice(esperando.indexOf(v), 1);
      }
      if (entregados >= META) { final = 0.001; Sonido.efecto('completar'); }
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 8 + (api.ancho - api.margenDerecho < 230 ? altoCaja + 6 : 0);
      const altoEdif = PLANTAS * ALTO_P + 10, anchoEdif = 230;
      const K = Math.max(1, Math.min(3, Math.floor(Math.min(api.ancho / (anchoEdif + 10), (api.alto - arriba - 6) / altoEdif))));
      return { K, x0: Math.floor((api.ancho - anchoEdif * K) / 2), y0: arriba + Math.max(0, Math.floor((api.alto - arriba - altoEdif * K) / 2)), e, altoCaja, anchoEdif, altoEdif };
    }

    // y (en la escena) del suelo de la planta p: la 0 abajo
    const sueloDe = (p) => PLANTAS * ALTO_P - p * ALTO_P;
    const HUECO_X = 100;                                                  // el hueco del ascensor

    function actualizar(dt, api, d) {
      if (avisoT > 0) avisoT -= dt;
      if (final > 0) { final += dt; if (final > 1.6) api.ganar(); return; }
      puertas = Math.max(0, puertas - dt);
      for (const v of esperando) v.t += dt;

      // la cabina va hacia la planta de destino
      if (puertas <= 0 && cabina !== destino) {
        const paso = dt / T_PLANTA;
        cabina = Math.abs(destino - cabina) <= paso ? destino : cabina + Math.sign(destino - cabina) * paso;
        if (cabina === destino) Sonido.efecto('coger');
      }
      const e = api.entrada;
      const quieta = cabina === destino && puertas <= 0;
      if (quieta && e.pulsado('arriba')) destino = Math.min(PLANTAS - 1, Math.round(cabina) + 1);
      if (quieta && e.pulsado('abajo')) destino = Math.max(0, Math.round(cabina) - 1);
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        const sx = (e.puntero.x - d.x0) / d.K, sy = (e.puntero.y - d.y0) / d.K;
        const p = Math.max(0, Math.min(PLANTAS - 1, Math.floor((PLANTAS * ALTO_P - sy) / ALTO_P)));
        if (sx >= 0 && sx <= d.anchoEdif && sy >= 0 && sy <= PLANTAS * ALTO_P) {
          if (p === destino && cabina === destino) abrir();                // tocar la planta donde ya está: abrir
          else if (puertas <= 0) destino = p;                              // tocar otra planta: ir allí
        }
      } else if (e.pulsado('accion')) abrir();

      proxVecino -= dt;
      if (proxVecino <= 0) { proxVecino = 2.6 + Math.random() * 1.8; nuevoVecino(); }
      quedan -= dt;
      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO: ${entregados} DE ${META} VECINOS`); }
    }

    /* ---------- Dibujo (escena de 230 x 214) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function vecino(ctx, v, x, y) {                                       // (x, y) = pies
      r(ctx, '#2b1a14', x - 3, y - 4, 2, 4); r(ctx, '#2b1a14', x + 1, y - 4, 2, 4);
      r(ctx, v.ropa, x - 4, y - 12, 8, 8);
      r(ctx, '#f6cfae', x - 3, y - 17, 6, 5); r(ctx, v.pelo, x - 3, y - 18, 6, 2);
      r(ctx, C.tinta, x - 1, y - 15, 1, 1); r(ctx, C.tinta, x + 1, y - 15, 1, 1);
    }

    function bocadillo(ctx, x, y, n) {
      r(ctx, C.tinta, x - 7, y - 11, 14, 11); r(ctx, C.blanco, x - 6, y - 10, 12, 9); r(ctx, C.blanco, x - 1, y - 1, 3, 2);
      texto(ctx, String(n), x, y - 9, C.rojo, { centro: true });
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(d.x0, d.y0); ctx.scale(d.K, d.K);
      // fachada de ladrillo, forjados y el hueco del ascensor
      r(ctx, '#5e2620', 0, 0, d.anchoEdif, PLANTAS * ALTO_P);
      for (let y = 0, f = 0; y < PLANTAS * ALTO_P; y += 4, f++) for (let x = -(f % 2) * 4; x < d.anchoEdif; x += 8) r(ctx, (x + f) % 5 ? '#8a3a2a' : '#7a3326', Math.max(0, x), y, 7, 3);
      r(ctx, C.nieve, -4, -4, d.anchoEdif + 8, 4);
      for (let p = 0; p < PLANTAS; p++) {
        const y = sueloDe(p);
        r(ctx, '#cfc8bd', 0, y - 2, d.anchoEdif, 2);
        r(ctx, '#2c2f3e', 4, y - 24, 14, 12); r(ctx, C.oroClaro, 6, y - 22, 10, 8); texto(ctx, String(p), 11, y - 21, C.tinta, { centro: true });   // placa con el número
        r(ctx, '#2b1a14', 170, y - 26, 16, 18); r(ctx, (p + Math.floor(t)) % 3 ? '#ffe9a0' : '#f0a93a', 171, y - 25, 14, 16);                     // ventana
      }
      r(ctx, '#1b1d2a', HUECO_X - 14, 0, 28, PLANTAS * ALTO_P);
      r(ctx, '#3a3e4e', HUECO_X - 1, 0, 2, PLANTAS * ALTO_P);                                                                                // cable
      // vecinos esperando (a la izquierda del ascensor) con su bocadillo
      const porPlanta = {};
      for (const v of esperando) {
        const k = porPlanta[v.planta] = (porPlanta[v.planta] || 0) + 1;
        const x = HUECO_X - 24 - (k - 1) * 14, y = sueloDe(v.planta) - 2;
        vecino(ctx, v, x, y);
        bocadillo(ctx, x, y - 20 - Math.round(Math.abs(Math.sin(v.t * 3)) * 2), v.dest);
      }
      // cabina
      const cy = sueloDe(cabina);
      r(ctx, C.tinta, HUECO_X - 13, cy - 30, 26, 30); r(ctx, '#c6cbd8', HUECO_X - 12, cy - 29, 24, 28);
      dentro.forEach((v, i) => vecino(ctx, v, HUECO_X - 7 + i * 7, cy - 2));
      const abierta = puertas > 0 ? Math.min(1, puertas * 4, (0.9 - puertas) * 4 + 0.2) : 0;
      const hoja = Math.round(12 * (1 - abierta));
      r(ctx, '#8a92b0', HUECO_X - 12, cy - 29, hoja, 28); r(ctx, '#8a92b0', HUECO_X + 12 - hoja, cy - 29, hoja, 28);
      r(ctx, '#6a7190', HUECO_X - 1, cy - 29, 2, 28 * (1 - abierta));
      // destinos de los que van dentro (encima de la cabina)
      dentro.forEach((v, i) => bocadillo(ctx, HUECO_X - 10 + i * 10, cy - 32, v.dest));
      // marcador de planta en el panel
      r(ctx, C.tinta, 196, 4, 28, 14); texto(ctx, String(Math.round(cabina)), 210, 8, C.rojoClaro, { centro: true });
      ctx.restore();

      const e = d.e;
      if (avisoT > 0 || final > 0) {
        const msg = final > 0 ? '¡TODOS EN CASA!' : aviso;
        const em = Comun.medir(msg, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, msg, Math.floor(api.ancho / 2), d.y0 + Math.floor(d.altoEdif * d.K / 2), C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const t1 = `VECINOS ${entregados}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const anchoBarra = 50, anchoNum = Comun.medir('60', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + d.altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, d.altoCaja);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, d.altoCaja - 8);
      ctx.fillStyle = quedan < 15 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * quedan / TIEMPO), d.altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 15 ? C.rojoClaro : C.nieve, { escala: e });
    }

    // Solo en modo debug: estado, para las pruebas automáticas
    if (Dias.debug) window.ascensorDebug = () => ({ cabina, destino, puertas, entregados, quedan, final: final > 0,
      dentro: dentro.map((v) => v.dest), esperando: esperando.map((v) => ({ planta: v.planta, dest: v.dest })) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ASCENSOR',
      instruccion: 'SUBE Y BAJA CON ↑ ↓ (O TOCA UNA PLANTA) Y ABRE LAS PUERTAS CON ESPACIO (O TOCA LA PLANTA DONDE ESTAS). LLEVA A CADA VECINO A SU PISO: 8 EN 60 SEGUNDOS.',
      pantallaCompleta: true,
      musica: 'ascensor',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, disposicion(api)),
      dibujar
    });
  }
};
