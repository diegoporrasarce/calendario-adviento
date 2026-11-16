'use strict';
/* Bucle principal: cielo, cámara, personaje, entrada de teclado/táctil e interacción con puertas. */
(() => {
  const { ANCHO, ALTO, MUNDO_ALTO, PLANTAS, X_ESCALERA, X_MIN, X_MAX, sueloY } = Edificio;
  const lienzo = document.getElementById('lienzo');
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const elInfo = document.getElementById('info');
  const elPista = document.getElementById('pista');
  const esTactil = matchMedia('(pointer: coarse)').matches;

  /* ---------- Escalado ---------- */
  const escena = document.getElementById('escena');
  const marco = document.getElementById('marco');
  function ajustar() {
    const r = escena.getBoundingClientRect();
    let s = Math.min(r.width / ANCHO, r.height / ALTO);
    if (s >= 2) s = Math.floor(s);          // píxeles enteros cuando cabe
    marco.style.width = Math.floor(ANCHO * s) + 'px';
    marco.style.height = Math.floor(ALTO * s) + 'px';
  }
  addEventListener('resize', ajustar);
  new ResizeObserver(ajustar).observe(escena);
  ajustar();

  /* ---------- Entrada ---------- */
  const teclas = { izquierda: false, derecha: false, arriba: false, abajo: false };
  const MAPA = {
    ArrowLeft: 'izquierda', KeyA: 'izquierda', ArrowRight: 'derecha', KeyD: 'derecha',
    ArrowUp: 'arriba', KeyW: 'arriba', ArrowDown: 'abajo', KeyS: 'abajo'
  };
  addEventListener('keydown', (e) => {
    if (Dias.hayModal()) return;
    const k = MAPA[e.code];
    if (k) { teclas[k] = true; e.preventDefault(); }
    else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) accion();
    }
  });
  addEventListener('keyup', (e) => { const k = MAPA[e.code]; if (k) teclas[k] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });

  document.querySelectorAll('#tactil .tecla').forEach((b) => {
    const k = b.dataset.tecla;
    const soltar = () => { b.classList.remove('activa'); if (k !== 'accion') teclas[k] = false; };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('activa');
      if (k === 'accion') accion(); else teclas[k] = true;
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, soltar);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  /* ---------- Escenario: cielo ---------- */
  let semilla = 7;
  const azar = () => { semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const estrellas = Array.from({ length: 90 }, () => ({
    x: Math.floor(azar() * ANCHO), y: Math.floor(azar() * 330),
    f: azar() * 6.28, v: 0.8 + azar() * 2.2, grande: azar() < 0.12
  }));
  const nubes = [
    { x: 40, y: 26, v: 4, p: 0.8 }, { x: 200, y: 62, v: 2.5, p: 0.8 },
    { x: 120, y: 92, v: 3.5, p: 0.8 }, { x: 260, y: 150, v: 5, p: 0.8 }
  ];
  const copos = Array.from({ length: 80 }, () => {
    const cerca = azar() < 0.3;
    return { x: azar() * ANCHO, y: azar() * ALTO, f: azar() * 6.28, cerca,
             vy: cerca ? 28 + azar() * 16 : 10 + azar() * 12 };
  });

  const BANDAS = ['#070b24', '#0a1030', '#0d1538', '#111b44', '#16224f', '#1b2a5c', '#21336a', '#283c78'];
  function dibujarCielo(cam, t) {
    const alto = Math.ceil(ALTO / BANDAS.length);
    BANDAS.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * alto, ANCHO, alto); });

    for (const e of estrellas) {
      const sy = Math.floor(e.y - cam * 0.5);
      if (sy < -2 || sy > ALTO) continue;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * e.v + e.f));
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x, sy, 1, 1);
      if (e.grande) { ctx.fillRect(e.x - 1, sy, 3, 1); ctx.fillRect(e.x, sy - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;

    Sprites.luna(ctx, 210, Math.floor(46 - cam * 0.6));

    for (const n of nubes) {
      const x = Math.floor(((n.x + t * n.v) % (ANCHO + 80)) - 40);
      Sprites.nube(ctx, x, Math.floor(n.y - cam * n.p), '#2b3a6e', '#3c4d8c');
    }
  }

  function dibujarNieve(t) {
    for (const c of copos) {
      const x = Math.floor(c.x + Math.sin(t * 1.5 + c.f) * 3);
      const y = Math.floor((c.y + t * c.vy) % ALTO);
      ctx.globalAlpha = c.cerca ? 0.95 : 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, c.cerca ? 2 : 1, c.cerca ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Personaje y cámara ---------- */
  const jug = { x: 80, planta: 0, y: sueloY(0), dir: 1, modo: 'idle', t: 0, escalando: null };
  let camY = Math.max(0, Math.min(MUNDO_ALTO - ALTO, jug.y - 170));
  const sacudidas = {};
  let puertaCercana = 0;
  let aviso = '', avisoHasta = 0;
  const VEL = 58, VEL_ESCALA = 0.6;

  function avisar(texto) { aviso = texto; avisoHasta = performance.now() + 2200; }

  function accion() {
    if (Dias.hayModal() || jug.escalando || !puertaCercana) return;
    const n = puertaCercana;
    if (!Dias.abrirPuerta(n)) {
      sacudidas[n] = 0.45;
      avisar(Dias.diaActual === 0 ? `La puerta ${n} sigue cerrada: aún no es diciembre` : `La puerta ${n} se abre el ${n} de diciembre`);
    }
  }

  function actualizar(dt) {
    jug.t += dt;
    for (const k in sacudidas) { sacudidas[k] -= dt; if (sacudidas[k] <= 0) delete sacudidas[k]; }
    const bloqueado = Dias.hayModal();

    if (jug.escalando) {
      const e = jug.escalando;
      e.p = Math.min(1, e.p + dt / VEL_ESCALA);
      jug.y = e.y0 + (e.y1 - e.y0) * e.p;
      jug.x += (X_ESCALERA - jug.x) * Math.min(1, dt * 12);
      jug.modo = 'subir';
      if (e.p >= 1) { jug.planta = e.hasta; jug.y = e.y1; jug.x = X_ESCALERA; jug.escalando = null; jug.modo = 'idle'; }
    } else {
      const dx = bloqueado ? 0 : (teclas.derecha ? 1 : 0) - (teclas.izquierda ? 1 : 0);
      if (dx) jug.dir = dx;
      jug.x = Math.max(X_MIN, Math.min(X_MAX, jug.x + dx * VEL * dt));
      jug.modo = dx ? 'andar' : 'idle';

      if (!bloqueado && Math.abs(jug.x - X_ESCALERA) <= 8) {
        const delta = teclas.arriba ? 1 : teclas.abajo ? -1 : 0;
        const destino = jug.planta + delta;
        if (delta && destino >= 0 && destino < PLANTAS) {
          jug.escalando = { desde: jug.planta, hasta: destino, y0: jug.y, y1: sueloY(destino), p: 0 };
        }
      }
    }

    // puerta que hay delante
    puertaCercana = 0;
    if (!jug.escalando) {
      for (let n = 1; n <= Dias.TOTAL; n++) {
        const d = Edificio.puerta(n);
        if (d.planta === jug.planta && Math.abs(jug.x - d.cx) <= 12) { puertaCercana = n; break; }
      }
    }

    const objetivo = Math.max(0, Math.min(MUNDO_ALTO - ALTO, jug.y - 170));
    camY += (objetivo - camY) * Math.min(1, dt * 6);
  }

  function textoPista() {
    if (performance.now() < avisoHasta) return aviso;
    if (puertaCercana) {
      const e = Dias.estado(puertaCercana), n = puertaCercana;
      const boton = esTactil ? 'ABRIR' : 'Espacio / Enter';
      if (e === 'disponible') return `Día ${n}: ${boton} para abrir`;
      if (e === 'abierta') return `Día ${n} abierta · ${boton} para verla otra vez`;
      return `Día ${n}: se abre el ${n} de diciembre`;
    }
    if (!jug.escalando && Math.abs(jug.x - X_ESCALERA) <= 8) return esTactil ? '▲ / ▼ para cambiar de planta' : '↑ / ↓ para cambiar de planta';
    return '';
  }

  /* ---------- Dibujo ---------- */
  let textoHud = { info: null, pista: null };
  function dibujar() {
    const cam = Math.round(camY);
    const t = jug.t;
    dibujarCielo(cam, t);
    Edificio.dibujarEdificio(ctx, cam);
    for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarPuerta(ctx, n, Dias.estado(n), cam, t, sacudidas[n]);
    Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y) - cam, jug.dir, jug.modo, t);
    if (puertaCercana) {
      const d = Edificio.puerta(puertaCercana);
      Edificio.dibujarFlecha(ctx, d.cx, d.y - cam - 56, t);
    }
    dibujarNieve(t);

    const info = Dias.info(), pista = textoPista();
    if (info !== textoHud.info) { elInfo.textContent = info; textoHud.info = info; }
    if (pista !== textoHud.pista) { elPista.textContent = pista; textoHud.pista = pista; }
  }

  let ultimo = performance.now();
  function bucle(ahora) {
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    actualizar(dt);
    dibujar();
    requestAnimationFrame(bucle);
  }
  requestAnimationFrame(bucle);

  Dias.cargar().catch((err) => {
    console.error(err);
    avisar('No se pudo cargar dias.json. Abre el juego desde un servidor local o GitHub Pages.');
    avisoHasta = Infinity;
  });
})();
