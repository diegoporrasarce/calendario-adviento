'use strict';
/* Día 19 — Quiz.
   5 preguntas de 3 opciones sacadas de dias.json (campo "preguntas": [{ pregunta, opciones: [3], correcta: 0-2 }]).
   Cada acierto vuelve a encender una ventana del edificio del fondo. Hacen falta 4 aciertos para ganar;
   si no, se reintenta. Se responde tocando la opción, con las teclas 1, 2 y 3, o con flechas + Espacio. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia19-quiz'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const MINIMO = 4;
    const PREGUNTAS = (Array.isArray(datos && datos.preguntas) ? datos.preguntas : [])
      .filter((p) => p && p.pregunta && Array.isArray(p.opciones) && p.opciones.length === 3).slice(0, 5);
    if (PREGUNTAS.length < 5) console.warn('dias.json: el día 19 necesita 5 preguntas con 3 opciones');

    let actual, aciertos, elegida, cursor, espera, final, cola;

    function reiniciar() { actual = 0; aciertos = 0; elegida = -1; cursor = 0; espera = 0; final = 0; cola = []; }

    function responder(i, api) {
      if (elegida >= 0 || final) return;
      elegida = i;
      const bien = i === PREGUNTAS[actual].correcta;
      if (bien) { aciertos++; Sonido.efecto('pareja'); } else Sonido.efecto('bloqueada');
      espera = 1.4;
      void api;
    }

    // Teclas 1, 2 y 3 (se procesan en el bucle del juego)
    function alTeclear(ev) { if (['1', '2', '3'].includes(ev.key)) cola.push(Number(ev.key) - 1); }
    addEventListener('keydown', alTeclear);

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 10 + (api.ancho - api.margenDerecho < 220 ? altoCaja + 6 : 0);
      const ancho = Math.min(api.ancho - 16, 420);
      const x0 = Math.floor((api.ancho - ancho) / 2);
      const edifAlto = Math.min(110, Math.floor((api.alto - arriba) * 0.32));
      const p = PREGUNTAS[actual] || { pregunta: '', opciones: [] };
      const lineasP = Comun.envolver(p.pregunta, ancho - 20, e);
      const linea = Comun.altoTexto(e) + 3 * e;
      const yp = arriba + edifAlto + 12;
      const altoP = lineasP.length * linea + 14;
      const opciones = p.opciones.map((o, i) => {
        const l = Comun.envolver(`${i + 1}. ${o}`, ancho - 28, e);
        return { lineas: l, h: l.length * linea + 12 };
      });
      let y = yp + altoP + 10;
      for (const o of opciones) { o.x = x0; o.y = y; o.w = ancho; y += o.h + 6; }
      return { e, altoCaja, arriba, ancho, x0, edifAlto, lineasP, linea, yp, altoP, opciones };
    }

    function actualizar(dt, api, d) {
      if (final > 0) { final += dt; if (final > 1.6) api.ganar(); return; }
      if (elegida >= 0) {
        espera -= dt;
        if (espera <= 0) {
          elegida = -1; actual++; cursor = 0;
          if (actual >= PREGUNTAS.length) {
            if (aciertos >= MINIMO) { final = 0.001; Sonido.efecto('completar'); }
            else api.perder(`${aciertos} DE ${PREGUNTAS.length} ACIERTOS. HACEN FALTA ${MINIMO}. ¡OTRA VEZ!`);
          }
        }
        cola = [];
        return;
      }
      const e = api.entrada;
      if (e.pulsado('arriba')) cursor = Math.max(0, cursor - 1);
      if (e.pulsado('abajo')) cursor = Math.min(2, cursor + 1);
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        const { x, y } = e.puntero;
        const i = d.opciones.findIndex((o) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
        if (i >= 0) { cursor = i; responder(i, api); }
      } else if (e.pulsado('accion')) responder(cursor, api);
      while (cola.length) responder(cola.shift(), api);
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function dibujar(ctx, api) {
      const d = disposicion(api), e = d.e, t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      // edificio con 5 ventanas: se enciende una por acierto
      const ew = Math.min(200, d.ancho), ex = Math.floor((api.ancho - ew) / 2), ey = d.arriba;
      r(ctx, '#4a3238', ex - 6, ey, ew + 12, 6); r(ctx, C.nieve, ex - 7, ey - 3, ew + 14, 3);
      r(ctx, '#5e2620', ex, ey + 6, ew, d.edifAlto - 6);
      for (let y = ey + 6, f = 0; y < ey + d.edifAlto; y += 4, f++) for (let x = ex - (f % 2) * 4; x < ex + ew; x += 8) r(ctx, (x + f) % 5 ? '#8a3a2a' : '#7a3326', Math.max(ex, x), y, 7, 3);
      const vw = Math.floor((ew - 24) / 5) - 6, vh = Math.max(14, d.edifAlto - 34);
      for (let i = 0; i < 5; i++) {
        const vx = ex + 12 + i * (vw + 6) + 3, vy = ey + 18;
        const encendida = i < aciertos;
        r(ctx, '#b9b2a6', vx - 2, vy - 2, vw + 4, vh + 4); r(ctx, '#2b1a14', vx, vy, vw, vh);
        r(ctx, encendida ? '#ffe9a0' : '#141a3c', vx + 1, vy + 1, vw - 2, Math.floor((vh - 2) / 2));
        r(ctx, encendida ? '#f0a93a' : '#1b2350', vx + 1, vy + 1 + Math.floor((vh - 2) / 2), vw - 2, Math.ceil((vh - 2) / 2));
        r(ctx, '#2b1a14', vx + Math.floor(vw / 2) - 1, vy, 2, vh);
      }
      if (!PREGUNTAS.length) { texto(ctx, 'FALTAN LAS PREGUNTAS EN DIAS.JSON', api.ancho / 2, d.yp, C.rojoClaro, { centro: true, escala: e }); return; }
      if (final > 0 || actual >= PREGUNTAS.length) {
        const em = Comun.medir('¡CASI TODAS!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, aciertos === 5 ? '¡TODAS BIEN!' : '¡CASI TODAS!', Math.floor(api.ancho / 2), d.yp + 10, C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
        return;
      }
      // pregunta
      Comun.caja(ctx, d.x0, d.yp, d.ancho, d.altoP);
      d.lineasP.forEach((l, i) => texto(ctx, l, d.x0 + 10, d.yp + 7 + i * d.linea, C.nieve, { escala: e }));
      // opciones
      const p = PREGUNTAS[actual];
      d.opciones.forEach((o, i) => {
        let fondo = i === cursor ? '#2c3a7a' : '#1b2350';
        if (elegida >= 0) fondo = i === p.correcta ? '#2c7a4a' : i === elegida ? '#8a2c33' : '#1b2350';
        r(ctx, C.tinta, o.x - 1, o.y - 1, o.w + 2, o.h + 2); r(ctx, fondo, o.x, o.y, o.w, o.h); r(ctx, '#4a5a9a', o.x, o.y, o.w, 1);
        o.lineas.forEach((l, k) => texto(ctx, l, o.x + 10, o.y + 6 + k * d.linea, C.nieve, { escala: e }));
      });
      if (elegida >= 0) {
        const bien = elegida === p.correcta, msg = bien ? '¡CORRECTO!' : '¡OH! ERA LA VERDE';
        texto(ctx, msg, Math.floor(api.ancho / 2), Math.min(api.alto - 14, d.opciones[2].y + d.opciones[2].h + 8), bien ? '#8fe0a0' : C.rojoClaro, { centro: true, sombra: C.tinta, escala: e });
      }
      const t1 = `PREGUNTA ${actual + 1}/${PREGUNTAS.length}  ACIERTOS ${aciertos}`;
      const t1c = Comun.medir(t1, e) + 14 > api.ancho - api.margenDerecho ? `${actual + 1}/${PREGUNTAS.length} · ACIERTOS ${aciertos}` : t1;
      Comun.caja(ctx, 6, 6, Comun.medir(t1c, e) + 8, d.altoCaja);
      texto(ctx, t1c, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: la respuesta correcta de la pregunta actual, para las pruebas automáticas
    if (Dias.debug) window.quizDebug = () => ({ actual, aciertos, final: final > 0, correcta: PREGUNTAS[actual] ? PREGUNTAS[actual].correcta : null, esperando: elegida >= 0 });

    let ultima = null;
    const destruirBase = Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'QUIZ',
      instruccion: '5 PREGUNTAS SOBRE VOSOTROS. CADA ACIERTO ENCIENDE UNA VENTANA. HACEN FALTA 4. TOCA LA RESPUESTA O PULSA 1, 2 O 3.',
      pantallaCompleta: true,
      musica: 'preguntas',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
    return () => { removeEventListener('keydown', alTeclear); destruirBase(); };
  }
};
