'use strict';
/* Bucle principal: cielo, cámara, personaje, Papá Noel, entrada de teclado/táctil y puertas. */
(() => {
  const { ANCHO, ALTO, MUNDO_ALTO, PLANTAS, CIELO, X0, X1, X_ESCALERA, X_MIN, X_MAX, sueloY } = Edificio;
  const lienzo = document.getElementById('lienzo');
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const elInfo = document.getElementById('info');
  const elPista = document.getElementById('pista');

  /* ---------- Escalado ---------- */
  const escena = document.getElementById('escena');
  // El lienzo lógico crece (en píxeles del mismo tamaño) hasta cubrir toda la ventana;
  // la escena de 320x240 queda centrada y el cielo/suelo se extiende a los lados.
  let W = ANCHO, H = ALTO, ox = 0;
  let cieloCv = null;                       // cielo prerenderizado; se regenera al cambiar de tamaño
  function ajustar() {
    const r = escena.getBoundingClientRect();
    if (!r.width || !r.height) return;
    let s = Math.min(r.width / ANCHO, r.height / ALTO);
    if (s >= 2) s = Math.floor(s);          // píxeles enteros cuando cabe
    W = Math.max(ANCHO, Math.ceil(r.width / s));
    H = Math.max(ALTO, Math.ceil(r.height / s));
    ox = Math.floor((W - ANCHO) / 2);
    cieloCv = null;
    lienzo.width = W; lienzo.height = H;
    ctx.imageSmoothingEnabled = false;
    lienzo.style.width = W * s + 'px';
    lienzo.style.height = H * s + 'px';
  }
  addEventListener('resize', ajustar);
  new ResizeObserver(ajustar).observe(escena);
  ajustar();

  /* ---------- Pantalla completa (Esc la cierra de forma nativa) ---------- */
  const botonPantalla = document.getElementById('pantalla-completa');
  if (!document.fullscreenEnabled) botonPantalla.hidden = true;
  botonPantalla.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen()
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))   // en móvil, apaisado
      .catch(() => {});
    botonPantalla.blur();                  // para que Espacio/Enter no vuelvan a pulsarlo
  });

  /* ---------- Aviso de girar el móvil: se puede descartar (dura hasta cerrar la pestaña) ---------- */
  const avisoGirar = document.getElementById('girar');
  try { if (sessionStorage.getItem('adviento.vertical') === '1') avisoGirar.classList.add('descartado'); } catch (e) { /* sin almacenamiento */ }
  document.getElementById('girar-seguir').addEventListener('click', () => {
    avisoGirar.classList.add('descartado');
    try { sessionStorage.setItem('adviento.vertical', '1'); } catch (e) { /* sin almacenamiento */ }
  });

  /* ---------- Sonido: arranca con el primer gesto; botón para silenciar ---------- */
  for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, () => Sonido.iniciar(), { capture: true });
  const botonSilencio = document.getElementById('silencio');
  botonSilencio.classList.toggle('apagado', Sonido.enSilencio());
  botonSilencio.addEventListener('click', () => {
    botonSilencio.classList.toggle('apagado', Sonido.alternarSilencio());
    botonSilencio.blur();
  });

  /* ---------- Entrada ---------- */
  const teclas = { izquierda: false, derecha: false, arriba: false, abajo: false };
  const MAPA = { ArrowLeft: 'izquierda', ArrowRight: 'derecha', ArrowUp: 'arriba', ArrowDown: 'abajo' };
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
      if (k !== 'accion') teclas[k] = true;
      else if (Dias.hayDialogo()) Dias.avanzarDialogo();   // el botón ABRIR también pasa el texto
      else accion();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, soltar);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  /* ---------- Escenario: cielo ---------- */
  let semilla = 7;
  const azar = () => { semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  const TINTES = ['#ffffff', '#ffffff', '#cfe0ff', '#e6c8ff', '#ffc8f0'];
  const estrellas = Array.from({ length: 150 }, () => ({
    x: azar(), y: Math.floor(azar() * 560),     // x es una fracción del ancho visible
    f: azar() * 6.28, v: 0.8 + azar() * 2.2, grande: azar() < 0.1, color: TINTES[Math.floor(azar() * TINTES.length)]
  }));
  const nubes = [
    { x: 40, y: 26, v: 4 }, { x: 200, y: 62, v: 2.5 }, { x: 120, y: 96, v: 3.5 }, { x: 260, y: 155, v: 5 }, { x: 15, y: 215, v: 3 }
  ];
  const copos = Array.from({ length: 110 }, () => {
    const cerca = azar() < 0.3;
    return { x: azar(), y: azar(), f: azar() * 6.28, cerca, vy: cerca ? 28 + azar() * 16 : 10 + azar() * 12 };
  });

  // Cielo casi negro con nebulosas magenta y azul tramadas (paleta limitada).
  const EXTRA_CIELO = 60;                        // margen vertical para el paralaje
  const h2 = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ruido = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const fbm = (x, y) => ruido(x, y) * 0.55 + ruido(x * 2.1, y * 2.1) * 0.3 + ruido(x * 4.3, y * 4.3) * 0.15;

  function crearCielo() {
    const [cv, g] = Sprites.lienzoAux(W, H + EXTRA_CIELO);
    const img = g.createImageData(cv.width, cv.height), px = img.data;
    const FONDO = [[5, 4, 18], [9, 7, 30], [14, 12, 46], [22, 20, 68]];
    const MAGENTA = [[60, 16, 88], [110, 28, 132], [160, 46, 158]];
    const AZUL = [[14, 34, 96], [26, 66, 156], [52, 104, 200]];
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        const u = Sprites.umbral(x, y), v = y / cv.height;
        let col = FONDO[Math.min(3, Math.floor(v * 3 + u))];
        const kb = (fbm(x / 85 + 40, y / 85 + 11) - 0.58) / 0.18;
        if (kb > u) col = AZUL[Math.min(2, Math.floor(kb * 1.6 + u * 0.8))];
        const km = (fbm(x / 105, y / 105 + 3.7) + 0.12 * v - 0.5) / 0.2;
        if (km > u) col = MAGENTA[Math.min(2, Math.floor(km * 1.6 + u * 0.8))];
        const o = (y * cv.width + x) * 4;
        px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  const CICLO_TRINEO = 20, VUELO_TRINEO = 16;    // segundos: pasa cada 20 s y tarda 16 en cruzar

  function dibujarCielo(cam, t) {
    if (!cieloCv) cieloCv = crearCielo();
    ctx.drawImage(cieloCv, 0, -Math.max(0, Math.min(EXTRA_CIELO, Math.floor(cam * 0.25))));

    for (const e of estrellas) {
      const sy = Math.floor(e.y - cam * 0.5), sx = Math.floor(e.x * W);
      if (sy < -2 || sy > H) continue;
      const brillo = 0.5 + 0.5 * Math.sin(t * e.v + e.f);
      ctx.globalAlpha = 0.3 + 0.7 * brillo;
      ctx.fillStyle = e.color;
      ctx.fillRect(sx, sy, 1, 1);
      if (e.grande && brillo > 0.4) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); }
    }
    ctx.globalAlpha = 1;

    // Luna siempre visible, arriba a la derecha de la escena
    const margen = W - ox - ANCHO;           // hueco libre a la derecha de la escena
    const lunaX = margen >= 52 ? ox + ANCHO + Math.floor(margen / 2) : ox + 288;
    Sprites.luna(ctx, lunaX, 34 - Math.floor(cam * 0.05));

    // Trineo con renos: cruza el cielo cada medio minuto, alternando el sentido
    const fase = t % CICLO_TRINEO;
    if (fase < VUELO_TRINEO) {
      const p = fase / VUELO_TRINEO, dir = Math.floor(t / CICLO_TRINEO) % 2 ? -1 : 1;
      const tx = dir > 0 ? -90 + p * (W + 180) : W + 90 - p * (W + 180);
      const ty = (dir > 0 ? 34 : 58) + Math.sin(p * Math.PI * 2) * 12 - cam * 0.1;
      Sprites.trineo(ctx, Math.floor(tx), Math.floor(ty), dir, t);
    }

    for (const n of nubes) {
      const x = Math.floor(((n.x + t * n.v) % (W + 80)) - 42);
      Sprites.nube(ctx, x, Math.floor(n.y - cam * 0.8));
    }
  }

  function dibujarNieve(t) {
    ctx.fillStyle = '#fff';
    for (const c of copos) {
      const x = Math.floor(c.x * W + Math.sin(t * 1.5 + c.f) * 3);
      const y = Math.floor((c.y * H + t * c.vy) % H);
      ctx.globalAlpha = c.cerca ? 0.95 : 0.6;
      ctx.fillRect(x, y, 1, 1);
      if (c.cerca) ctx.fillRect(x, y + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Personaje y cámara ---------- */
  const jug = { x: 80, planta: 0, y: sueloY(0), dir: 1, modo: 'idle', t: 0, enEscalera: false, tEscalera: 0 };
  // La cámara sigue al personaje; el pie queda al ~70% de la altura visible.
  const objetivoCamara = () => Math.max(Math.min(0, MUNDO_ALTO - H), Math.min(MUNDO_ALTO - H, jug.y - H * 0.7));
  let camY = objetivoCamara();
  const sacudidas = {};
  let puertaCercana = 0;
  let aviso = '', avisoHasta = 0;
  const VEL = 58, VEL_ESCALERA = 64;       // px/s andando y por la escalera

  /* ---------- Papá Noel: pasea por el tejado y se para a saludar ---------- */
  const noel = { x: 170, dir: 1, pausa: 0, siguiente: 5 };
  function actualizarNoel(dt) {
    if (noel.pausa > 0) { noel.pausa -= dt; return; }
    noel.x += noel.dir * 14 * dt;
    noel.siguiente -= dt;
    if (noel.x > X1 - 10) { noel.x = X1 - 10; noel.dir = -1; noel.pausa = 1.5; }
    else if (noel.x < X0 + 10) { noel.x = X0 + 10; noel.dir = 1; noel.pausa = 1.5; }
    else if (noel.siguiente <= 0) { noel.pausa = 2; noel.siguiente = 4 + Math.random() * 5; }
  }

  function avisar(texto) { aviso = texto; avisoHasta = performance.now() + 2200; }

  function accion() {
    if (Dias.hayModal() || jug.enEscalera || !puertaCercana) return;
    const n = puertaCercana;
    if (Dias.abrirPuerta(n)) Sonido.efecto('abrir');
    else {
      Sonido.efecto('bloqueada');
      sacudidas[n] = 0.45;
      avisar(Dias.diaActual === 0 ? `La puerta ${n} sigue cerrada: aún no es diciembre` : `La puerta ${n} se abre el ${n} de diciembre`);
    }
  }

  // En modo debug se puede abrir una puerta haciendo clic en ella, sin llevar a la chica hasta allí.
  if (Dias.debug) lienzo.addEventListener('pointerdown', (ev) => {
    if (Dias.hayModal()) return;
    const r = lienzo.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * lienzo.width - ox, y = (ev.clientY - r.top) / r.height * lienzo.height + Math.round(camY);
    for (let n = 1; n <= Dias.TOTAL; n++) {
      const d = Edificio.puerta(n);
      if (Math.abs(x - d.cx) <= 12 && y >= d.y - 36 && y <= d.y + 2) {
        if (Dias.abrirPuerta(n)) Sonido.efecto('abrir');
        else { Sonido.efecto('bloqueada'); sacudidas[n] = 0.45; avisar(`La puerta ${n} se abre el ${n} de diciembre`); }
        return;
      }
    }
  });

  function actualizar(dt) {
    jug.t += dt;
    actualizarNoel(dt);
    for (const k in sacudidas) { sacudidas[k] -= dt; if (sacudidas[k] <= 0) delete sacudidas[k]; }
    const bloqueado = Dias.hayModal();

    const dx = bloqueado ? 0 : (teclas.derecha ? 1 : 0) - (teclas.izquierda ? 1 : 0);
    const dy = bloqueado ? 0 : (teclas.abajo ? 1 : 0) - (teclas.arriba ? 1 : 0);
    const yArriba = sueloY(PLANTAS - 1), yAbajo = sueloY(0);

    // Escalera: se sube y baja mientras se mantiene la tecla; al soltar se queda donde esté.
    if (dy && (jug.enEscalera || Math.abs(jug.x - X_ESCALERA) <= 8)) {
      const ny = Math.max(yArriba, Math.min(yAbajo, jug.y + dy * VEL_ESCALERA * dt));
      if (ny !== jug.y) {
        jug.y = ny;
        jug.x = X_ESCALERA;
        if (Math.floor((jug.tEscalera + dt) * 6) !== Math.floor(jug.tEscalera * 6)) Sonido.efecto('escalera');
        jug.tEscalera += dt;
        jug.enEscalera = true;
      }
    }
    // planta más cercana y distancia a su suelo
    const cercana = Math.max(0, Math.min(PLANTAS - 1, Math.round((yAbajo - jug.y) / (yAbajo - sueloY(1)))));
    const resto = Math.abs(jug.y - sueloY(cercana));
    // se pisa la planta al llegar justo a ella, o al querer andar estando casi a su altura
    if (jug.enEscalera && (resto < 0.01 || (!dy && resto <= 3) || (dx && resto <= 5))) {
      jug.y = sueloY(cercana);
      jug.enEscalera = false;
    }
    if (!jug.enEscalera) jug.planta = cercana;

    if (jug.enEscalera) {
      jug.modo = 'subir';
    } else {
      if (dx) jug.dir = dx;
      jug.x = Math.max(X_MIN, Math.min(X_MAX, jug.x + dx * VEL * dt));
      jug.modo = dx ? 'andar' : 'idle';
      if (dx && Math.floor(jug.t * 4) !== Math.floor((jug.t - dt) * 4)) Sonido.efecto('paso');   // pisadas en la nieve
    }

    // puerta que hay delante
    puertaCercana = 0;
    if (!jug.enEscalera) {
      for (let n = 1; n <= Dias.TOTAL; n++) {
        const d = Edificio.puerta(n);
        if (d.planta === jug.planta && Math.abs(jug.x - d.cx) <= 12) { puertaCercana = n; break; }
      }
    }

    camY += (objetivoCamara() - camY) * Math.min(1, dt * 6);
  }

  function textoPista() {
    if (performance.now() < avisoHasta) return aviso;
    // Los controles están en la leyenda fija; aquí solo se avisa de las puertas aún cerradas.
    if (puertaCercana && Dias.estado(puertaCercana) === 'bloqueada') return `Día ${puertaCercana}: se abre el ${puertaCercana} de diciembre`;
    return '';
  }

  /* ---------- Dibujo ---------- */
  const textoHud = { info: null, pista: null };
  function dibujar() {
    const cam = Math.round(camY);
    const t = jug.t;
    dibujarCielo(cam, t);
    Edificio.dibujarEdificio(ctx, cam, W, H, ox);
    ctx.save();
    ctx.translate(ox, 0);                       // a partir de aquí, coordenadas de la escena 320x240
    const techo = CIELO - cam;
    if (techo > -40 && techo < H + 30) {
      Sprites.humo(ctx, Edificio.CHIMENEA_X, techo - 18, t);
      Sprites.papaNoel(ctx, Math.round(noel.x), techo + 3, noel.dir, noel.pausa <= 0, t);
    }
    for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarHalo(ctx, n, Dias.estado(n), cam, t);
    for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarPuerta(ctx, n, Dias.estado(n), cam, t, sacudidas[n]);
    Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y) - cam, jug.dir, jug.modo,
      jug.enEscalera ? jug.tEscalera : t);    // en la escalera la animación solo avanza al moverse
    if (puertaCercana) {
      const d = Edificio.puerta(puertaCercana);
      Edificio.dibujarFlecha(ctx, d.cx, d.y - cam - 51, t);
    }
    ctx.restore();
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

  Dias.cargar().then(() => {
    // En modo debug, ?abrir=N abre esa puerta al cargar (para probar contenido).
    const abrir = parseInt(new URLSearchParams(location.search).get('abrir'), 10);
    if (Dias.debug && abrir) Dias.abrirPuerta(abrir);
  }).catch((err) => {
    console.error(err);
    avisar('No se pudo cargar dias.json. Abre el juego desde un servidor local o GitHub Pages.');
    avisoHasta = Infinity;
  });
})();
