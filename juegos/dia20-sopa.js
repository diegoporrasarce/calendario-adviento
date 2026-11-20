'use strict';
/* Día 20 — Sopa de letras.
   Cuadrícula de 10x10 con 6 palabras de dias.json (campo "palabras", sin tildes, hasta 10 letras),
   escondidas en horizontal, vertical o diagonal, y también al revés. Se marca una palabra arrastrando
   de su primera a su última letra (o con flechas + Espacio en el inicio y en el final). No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia20-sopa'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const N = 10;
    const DIRECCIONES = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1], [-1, -1], [-1, 1]];
    const COLORES = ['#c8383f', '#3f8a5c', '#4a7ad8', '#c9a227', '#9a5ad0', '#f08a2c'];
    const limpiar = (t) => [...String(t || '').toUpperCase()].map((c) => (c === 'Ñ' ? c : c.normalize('NFD')[0])).filter((c) => /[A-ZÑ]/.test(c)).join('');
    let PALABRAS = (Array.isArray(datos && datos.palabras) ? datos.palabras : []).map(limpiar).filter((p) => p.length >= 3 && p.length <= N).slice(0, 6);
    if (PALABRAS.length < 3) PALABRAS = ['NAVIDAD', 'NIEVE', 'REGALO', 'ESTRELLA', 'ABRAZO', 'TURRON'];

    let letras, colocadas, encontradas, sel, cursor, usaTeclado, inicioTeclado, final;

    // Coloca las palabras al azar (reintenta hasta que caben todas) y rellena el resto con letras
    function generar() {
      for (let intento = 0; intento < 200; intento++) {
        const g = Array.from({ length: N }, () => new Array(N).fill(null)), lista = [];
        let ok = true;
        for (const p of [...PALABRAS].sort((a, b) => b.length - a.length)) {
          let puesta = false;
          for (let k = 0; k < 300 && !puesta; k++) {
            const [dx, dy] = DIRECCIONES[Math.floor(Math.random() * DIRECCIONES.length)];
            const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
            const fx = x + dx * (p.length - 1), fy = y + dy * (p.length - 1);
            if (fx < 0 || fy < 0 || fx >= N || fy >= N) continue;
            let cabe = true;
            for (let i = 0; i < p.length; i++) { const c = g[y + dy * i][x + dx * i]; if (c !== null && c !== p[i]) { cabe = false; break; } }
            if (!cabe) continue;
            for (let i = 0; i < p.length; i++) g[y + dy * i][x + dx * i] = p[i];
            lista.push({ palabra: p, x, y, dx, dy });
            puesta = true;
          }
          if (!puesta) { ok = false; break; }
        }
        if (!ok) continue;
        const abc = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
        for (const fila of g) for (let i = 0; i < N; i++) if (fila[i] === null) fila[i] = abc[Math.floor(Math.random() * abc.length)];
        letras = g; colocadas = lista;
        return;
      }
    }

    function reiniciar() {
      generar();
      encontradas = []; sel = null; cursor = [0, 0]; usaTeclado = false; inicioTeclado = null; final = 0;
    }

    // Casillas en línea recta de a a b (vacío si no es recta ni diagonal)
    function linea(a, b) {
      const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      if (!(a[0] + dx * n === b[0] && a[1] + dy * n === b[1])) return [];
      return Array.from({ length: n + 1 }, (_, i) => [a[0] + dx * i, a[1] + dy * i]);
    }

    function comprobar(casillas) {
      if (casillas.length < 2) return;
      const p = casillas.map(([x, y]) => letras[y][x]).join('');
      const r = [...p].reverse().join('');
      const c = colocadas.find((w) => (w.palabra === p || w.palabra === r) && !encontradas.some((e) => e.palabra === w.palabra) &&
        casillas.some(([x, y]) => x === w.x && y === w.y));
      if (c) {
        encontradas.push({ palabra: c.palabra, casillas, color: COLORES[encontradas.length % COLORES.length] });
        Sonido.efecto('pareja');
        if (encontradas.length === colocadas.length) { final = 0.001; Sonido.efecto('completar'); }
      } else Sonido.efecto('bloqueada');
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 10 + (api.ancho - api.margenDerecho < 220 ? altoCaja + 6 : 0);
      const vertical = api.alto - arriba > api.ancho * 1.1;
      const anchoLista = vertical ? 0 : Math.max(...PALABRAS.map((p) => Comun.medir(p, e))) + 24;
      const altoLista = vertical ? Math.ceil(PALABRAS.length / 2) * (Comun.altoTexto(e) + 6) + 12 : 0;
      const lado = Math.floor(Math.min((api.ancho - 16 - anchoLista - (vertical ? 0 : 12)) / N, (api.alto - arriba - 10 - altoLista) / N));
      const tam = lado * N;
      const x0 = Math.floor((api.ancho - tam - anchoLista - (vertical ? 0 : 12)) / 2), y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - tam - altoLista) / 2));
      return { lado, x0, y0, e, altoCaja, vertical, listaX: vertical ? 8 : x0 + tam + 12, listaY: vertical ? y0 + tam + 10 : y0 };
    }

    function actualizar(dt, api, d) {
      if (final > 0) { final += dt; if (final > 1.6) api.ganar(); return; }
      const e = api.entrada;
      const casilla = (px, py) => { const x = Math.floor((px - d.x0) / d.lado), y = Math.floor((py - d.y0) / d.lado); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
      if (e.pulsado('toque')) {
        e.pulsado('accion'); usaTeclado = false;
        const c = casilla(e.puntero.xInicio, e.puntero.yInicio);
        sel = c ? { a: c, b: c } : null;
      }
      if (sel && !usaTeclado) {
        if (e.puntero.abajo) { const c = casilla(e.puntero.x, e.puntero.y); if (c) sel.b = c; }
        else { comprobar(linea(sel.a, sel.b)); sel = null; }
      }
      // teclado: Espacio marca el inicio y, después, el final
      const mov = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in mov) if (e.pulsado(k)) {
        usaTeclado = true;
        cursor = [Math.max(0, Math.min(N - 1, cursor[0] + mov[k][0])), Math.max(0, Math.min(N - 1, cursor[1] + mov[k][1]))];
        if (inicioTeclado) sel = { a: inicioTeclado, b: cursor };
      }
      if (e.pulsado('accion')) {
        usaTeclado = true;
        if (!inicioTeclado) { inicioTeclado = [...cursor]; sel = { a: inicioTeclado, b: cursor }; }
        else { comprobar(linea(inicioTeclado, cursor)); inicioTeclado = null; sel = null; }
      }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function dibujar(ctx, api) {
      const d = disposicion(api), L = d.lado, t = api.t, e = d.e;
      ctx.fillStyle = '#2a1c1c'; ctx.fillRect(0, 0, api.ancho, api.alto);
      // escombros alrededor de la cuadrícula
      for (let k = 0; k < 40; k++) r(ctx, k % 3 ? '#3a2622' : '#5e2620', (k * 97) % api.ancho, (k * 53) % api.alto, 10 + (k % 4) * 4, 6);
      r(ctx, C.tinta, d.x0 - 4, d.y0 - 4, L * N + 8, L * N + 8); r(ctx, '#e8dcc0', d.x0, d.y0, L * N, L * N);
      // palabras encontradas: franja de color bajo sus letras
      for (const f of encontradas) for (const [x, y] of f.casillas) r(ctx, f.color, d.x0 + x * L + 1, d.y0 + y * L + 1, L - 2, L - 2);
      // selección en curso
      if (sel) for (const [x, y] of linea(sel.a, sel.b)) r(ctx, '#9fd0ff', d.x0 + x * L + 1, d.y0 + y * L + 1, L - 2, L - 2);
      const es = L >= 26 ? 2 : 1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const marcada = encontradas.some((f) => f.casillas.some(([a, b]) => a === x && b === y));
        texto(ctx, letras[y][x], d.x0 + x * L + L / 2 + 1, d.y0 + y * L + Math.floor((L - Comun.altoTexto(es)) / 2), marcada ? C.blanco : '#2b1a14', { escala: es, centro: true });
      }
      if (usaTeclado && final === 0 && Math.floor(t * 3) % 3) {
        const x = d.x0 + cursor[0] * L, y = d.y0 + cursor[1] * L;
        r(ctx, C.rojo, x, y, L, 2); r(ctx, C.rojo, x, y + L - 2, L, 2); r(ctx, C.rojo, x, y, 2, L); r(ctx, C.rojo, x + L - 2, y, 2, L);
      }
      // lista de palabras (tachadas al encontrarlas)
      PALABRAS.forEach((p, i) => {
        const f = encontradas.find((x) => x.palabra === p);
        const col = d.vertical ? i % 2 : 0, fila = d.vertical ? Math.floor(i / 2) : i;
        const x = d.listaX + (d.vertical ? col * Math.floor((api.ancho - 16) / 2) : 0), y = d.listaY + fila * (Comun.altoTexto(e) + 6);
        texto(ctx, p, x, y, f ? f.color : C.nieve, { escala: e });
        if (f) r(ctx, C.nieve, x - 2, y + Math.floor(Comun.altoTexto(e) / 2), Comun.medir(p, e) + 4, e);
      });
      if (final > 0) {
        const em = Comun.medir('¡TODAS!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡TODAS!', Math.floor(api.ancho / 2), d.y0 - Comun.altoTexto(em) - 4, C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const t1 = `PALABRAS ${encontradas.length}/${PALABRAS.length}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: dónde está cada palabra (para las pruebas automáticas)
    let ultima = null;
    if (Dias.debug) window.sopaDebug = () => ({ final: final > 0, encontradas: encontradas.length, colocadas, x0: ultima && ultima.x0, y0: ultima && ultima.y0, lado: ultima && ultima.lado });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'SOPA DE LETRAS',
      instruccion: 'ENTRE LOS ESCOMBROS HAY 6 PALABRAS DE NUESTRA HISTORIA. ARRASTRA DE LA PRIMERA A LA ULTIMA LETRA (EN CUALQUIER DIRECCION) O USA FLECHAS Y ESPACIO.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'sopa',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
