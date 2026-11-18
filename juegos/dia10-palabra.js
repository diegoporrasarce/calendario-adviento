'use strict';
/* Día 10 — Adivina la palabra (tipo Wordle).
   Palabra de 5 letras sacada de dias.json (campo "palabra"), 6 intentos. Verde = letra en su sitio,
   amarillo = está en otro sitio, gris = no está. Se escribe con el teclado del ordenador o con el de
   la pantalla (con Ñ). Vale cualquier combinación de 5 letras (no hay diccionario) y sin tildes. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia10-palabra'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const LETRAS = 5, INTENTOS = 6;
    const FILAS_TECLADO = ['QWERTYUIOP', 'ASDFGHJKLÑ', '<ZXCVBNM>'];     // < = borrar, > = enviar
    const VERDE = '#3f9a5c', AMARILLO = '#c9a227', GRIS = '#3a3f58';

    // Mayúsculas, sin tildes (la Ñ se conserva)
    const limpiar = (t) => [...String(t || '').toUpperCase()].map((c) => (c === 'Ñ' ? c : c.normalize('NFD')[0])).filter((c) => /[A-ZÑ]/.test(c)).join('');
    let SOLUCION = limpiar(datos && datos.palabra);
    if (SOLUCION.length !== LETRAS) { console.warn('dias.json: "palabra" del día 10 debe tener 5 letras; se usa NIEVE'); SOLUCION = 'NIEVE'; }

    let filas, actual, estadoTeclas, revelando, sacudida, mensaje, ganada, cola;

    function reiniciar() {
      filas = [];                       // intentos ya enviados: { letras, colores }
      actual = '';
      estadoTeclas = {};                // letra → 'verde' | 'amarillo' | 'gris'
      revelando = null;                 // { fila, t } mientras se giran las casillas
      sacudida = 0; mensaje = null; ganada = 0;
      cola = [];
    }

    // Colores de un intento, contando las letras repetidas como en el Wordle original
    function evaluar(intento) {
      const res = new Array(LETRAS).fill('gris'), quedan = {};
      for (let i = 0; i < LETRAS; i++) {
        if (intento[i] === SOLUCION[i]) res[i] = 'verde';
        else quedan[SOLUCION[i]] = (quedan[SOLUCION[i]] || 0) + 1;
      }
      for (let i = 0; i < LETRAS; i++)
        if (res[i] !== 'verde' && quedan[intento[i]]) { res[i] = 'amarillo'; quedan[intento[i]]--; }
      return res;
    }

    function decir(t, color) { mensaje = { texto: t, color: color || C.nieve, vida: 1.6 }; }

    function pulsarTecla(k, api) {
      if (revelando || ganada) return;
      if (k === '<') { actual = actual.slice(0, -1); Sonido.efecto('carta'); return; }
      if (k === '>') {
        if (actual.length < LETRAS) { sacudida = 0.35; decir('FALTAN LETRAS', C.lila); Sonido.efecto('bloqueada'); return; }
        filas.push({ letras: actual, colores: evaluar(actual) });
        revelando = { fila: filas.length - 1, t: 0 };
        actual = '';
        return;
      }
      if (actual.length < LETRAS) { actual += k; Sonido.efecto('carta'); }
    }

    // Teclado del ordenador (letras, Ñ, borrar e Intro): se guarda en una cola y se procesa al jugar
    function alTeclear(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      let k = null;
      if (ev.key === 'Backspace') k = '<';
      else if (ev.key === 'Enter') k = '>';
      else if (ev.key.length === 1) { const l = limpiar(ev.key); if (l.length === 1) k = l; }
      if (k) { ev.preventDefault(); cola.push(k); }
    }
    addEventListener('keydown', alTeclear);

    /* ---------- Disposición: rejilla de casillas y, debajo, el teclado ---------- */
    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 8 + (api.ancho - api.margenDerecho < 200 ? altoCaja + 6 : 0);
      const tw = Math.min(30, Math.floor((api.ancho - 12 - 9 * 3) / 10));         // ancho de tecla
      const th = Math.max(16, Math.min(Math.floor(tw * 1.35), Math.floor(api.alto * 0.09)));   // teclas más altas si sobra sitio (móvil)
      const altoTeclado = 3 * th + 2 * 4;
      const libre = api.alto - arriba - altoTeclado - 14 - 14;                        // espacio para la rejilla (y el mensaje)
      const t = Math.max(14, Math.min(40, Math.floor((libre - (INTENTOS - 1) * 3) / INTENTOS), Math.floor((api.ancho - 20 - 4 * 3) / LETRAS)));
      const anchoRejilla = LETRAS * t + (LETRAS - 1) * 3;
      const gx = Math.floor((api.ancho - anchoRejilla) / 2), gy = arriba + 12;
      const ky = api.alto - altoTeclado - 8;
      const teclas = [];
      FILAS_TECLADO.forEach((fila, f) => {
        const anchos = [...fila].map((c) => (c === '<' || c === '>' ? Math.floor(tw * 1.5) : tw));
        const total = anchos.reduce((a, b) => a + b, 0) + (fila.length - 1) * 3;
        let x = Math.floor((api.ancho - total) / 2);
        [...fila].forEach((c, i) => { teclas.push({ k: c, x, y: ky + f * (th + 4), w: anchos[i], h: th }); x += anchos[i] + 3; });
      });
      return { t, gx, gy, teclas, tw, th, e, altoCaja };
    }

    function actualizar(dt, api, d) {
      if (mensaje) { mensaje.vida -= dt; if (mensaje.vida <= 0) mensaje = null; }
      sacudida = Math.max(0, sacudida - dt);
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); return; }

      // giro de las casillas del último intento, una detrás de otra
      if (revelando) {
        const antes = Math.floor(revelando.t / 0.25);
        revelando.t += dt;
        if (Math.floor(revelando.t / 0.25) > antes && antes < LETRAS) Sonido.efecto('carta');
        if (revelando.t >= LETRAS * 0.25 + 0.2) {
          const f = filas[revelando.fila];
          [...f.letras].forEach((c, i) => {                                  // colores del teclado: gana el mejor
            const nuevo = f.colores[i], viejo = estadoTeclas[c];
            if (viejo !== 'verde' && !(viejo === 'amarillo' && nuevo === 'gris')) estadoTeclas[c] = nuevo;
          });
          revelando = null;
          if (f.letras === SOLUCION) { ganada = 1.4; Sonido.efecto('pareja'); decir(['¡A LA PRIMERA!', '¡INCREIBLE!', '¡GENIAL!', '¡MUY BIEN!', '¡BIEN!', '¡POR LOS PELOS!'][filas.length - 1], C.oroClaro); }
          else if (filas.length >= INTENTOS) { api.perder('SE ACABARON LOS INTENTOS. ¡PRUEBA OTRA VEZ!'); }
        }
      }

      while (cola.length) pulsarTecla(cola.shift(), api);
      const e = api.entrada;
      e.pulsado('accion');                                                   // Espacio/Intro ya llegan por la cola
      if (e.pulsado('toque')) {
        const { x, y } = e.puntero;
        const tecla = d.teclas.find((q) => x >= q.x - 1 && x < q.x + q.w + 2 && y >= q.y - 2 && y < q.y + q.h + 2);
        if (tecla) pulsarTecla(tecla.k, api);
      }
    }

    /* ---------- Dibujo ---------- */
    const colorDe = { verde: VERDE, amarillo: AMARILLO, gris: GRIS };

    function casilla(ctx, x, y, t, letra, color, escalaY) {
      const h = Math.max(1, Math.round(t * escalaY)), yy = y + Math.floor((t - h) / 2);
      if (color) { ctx.fillStyle = color; ctx.fillRect(x, yy, t, h); }
      else {
        ctx.fillStyle = letra ? '#6a7190' : '#2a3050'; ctx.fillRect(x, yy, t, h);
        ctx.fillStyle = '#0b1030'; ctx.fillRect(x + 2, yy + 2, t - 4, Math.max(0, h - 4));
      }
      if (letra && escalaY > 0.5) {
        const es = t >= 34 ? 3 : t >= 22 ? 2 : 1;
        texto(ctx, letra, x + Math.floor(t / 2) + 1, y + Math.floor((t - Comun.altoTexto(es)) / 2), C.nieve, { escala: es, centro: true, sombra: color ? C.tinta : null });
      }
    }

    function dibujar(ctx, api) {
      const d = disposicion(api);
      Comun.fondoNoche(ctx, api.t, api.alto, api.ancho);

      for (let f = 0; f < INTENTOS; f++) {
        const desp = f === filas.length && sacudida > 0 ? Math.round(Math.sin(api.t * 60) * 3) : 0;
        for (let i = 0; i < LETRAS; i++) {
          const x = d.gx + i * (d.t + 3) + desp, y = d.gy + f * (d.t + 3);
          let letra = '', color = null, escalaY = 1;
          if (f < filas.length) {
            letra = filas[f].letras[i];
            const enGiro = revelando && revelando.fila === f;
            const ti = enGiro ? revelando.t - i * 0.25 : 1;                    // giro de cada casilla
            if (ti >= 0.25 || !enGiro) color = colorDe[filas[f].colores[i]];
            if (enGiro && ti > 0 && ti < 0.25) escalaY = Math.abs(Math.cos((ti / 0.25) * Math.PI));
            if (enGiro && ti >= 0 && ti < 0.125) color = null;
          } else if (f === filas.length) letra = actual[i] || '';
          casilla(ctx, x, y, d.t, letra, color, escalaY);
        }
      }

      // teclado en pantalla, con los colores ya descubiertos
      for (const q of d.teclas) {
        const est = estadoTeclas[q.k];
        ctx.fillStyle = C.tinta; ctx.fillRect(q.x + 1, q.y + 1, q.w, q.h);
        ctx.fillStyle = est ? colorDe[est] : '#5a6488'; ctx.fillRect(q.x, q.y, q.w, q.h);
        if (!est) { ctx.fillStyle = '#7a84a8'; ctx.fillRect(q.x, q.y, q.w, 1); }                  // brillo arriba
        const es = d.th >= 22 ? 2 : 1;
        let lbl = q.k;
        if (q.k === '<' || q.k === '>') {
          lbl = q.k === '<' ? 'BORRA' : 'ENVIA';
          if (Comun.medir(lbl, es) > q.w - 2) lbl = q.k === '<' ? '←' : 'OK';
        }
        texto(ctx, lbl, q.x + Math.floor(q.w / 2) + 1, q.y + Math.floor((q.h - Comun.altoTexto(es)) / 2), C.nieve, { escala: es, centro: true });
      }

      const e = d.e;
      if (mensaje) texto(ctx, mensaje.texto, Math.floor(api.ancho / 2), d.gy + INTENTOS * (d.t + 3) + 2, mensaje.color, { escala: e, centro: true, sombra: C.tinta });

      // marcador: intentos
      const t1 = `INTENTO ${Math.min(INTENTOS, filas.length + 1)}/${INTENTOS}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: la solución y el estado, para las pruebas automáticas
    let ultima = null;
    if (Dias.debug) window.palabraDebug = () => ({
      solucion: SOLUCION, filas: filas.map((f) => f.letras + ':' + f.colores.map((c) => c[0]).join('')), actual, revelando: !!revelando,
      teclas: ultima ? Object.fromEntries(ultima.teclas.map((q) => [q.k, { x: q.x + q.w / 2, y: q.y + q.h / 2 }])) : null
    });

    const destruirBase = Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ADIVINA LA PALABRA',
      instruccion: 'ESCRIBE UNA PALABRA DE 5 LETRAS Y PULSA ENVIA. VERDE: LETRA EN SU SITIO. AMARILLO: ESTA, PERO EN OTRO SITIO. GRIS: NO ESTA. TIENES 6 INTENTOS.',
      pantallaCompleta: true,
      musica: 'reyes',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
    return () => { removeEventListener('keydown', alTeclear); destruirBase(); };
  }
};
