'use strict';
/* Día 19 — Bolos de nieve.
   Pista de nieve vista desde arriba, con 10 muñequitos de nieve en triángulo al fondo. En cada tirada:
   primero la flecha oscila (← → mueven la bola por la línea de salida) y se fija la dirección con Espacio o
   tocando; después oscila la barra de fuerza y se fija igual. La bola rueda (y engorda con la nieve), los
   muñecos que golpea caen y empujan a otros. 5 rondas de 2 tiros: 1 punto por muñeco, +5 por pleno y +2 por
   semipleno. Por la pista cruzan niños en trineo (uno siempre, otro desde la ronda 3): si la bola les da,
   rebota. Hay que llegar a META puntos; si se acaban las rondas sin llegar, se repite. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia19-bolos'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const W = 160, H = 230, CALLE = [34, 126], CENTRO = 80;              // 160 de ancho: en móvil cabe al doble
    const SALIDA_Y = 196, RONDAS = 5, META = 45, R_BOLO = 4.5, R_BOLA = 5;
    const OBST_W = 18, OBST_H = 8;                                        // trineo que cruza (caja de choque)
    const ANG_MAX = 0.3, V_MIN = 110, V_MAX = 270;

    let bolos, bola, fase, ronda, tiro, puntos, angulo, potencia, bolaX, reloj, cartel, finTirada, final, rastro, obstaculos, antes;

    function colocarBolos() {
      bolos = [];
      for (let fila = 0; fila < 4; fila++) for (let k = 0; k <= fila; k++)
        bolos.push({ x: CENTRO + (k - fila / 2) * 15, y: 70 - fila * 12, vx: 0, vy: 0, caido: false, giro: 0, fuera: false });
    }

    function ponerObstaculos() {
      obstaculos = [{ y: 122, x: CALLE[0] + 10, vx: 34 }];
      if (ronda >= 3) obstaculos.push({ y: 96, x: CALLE[1] - 10, vx: -52 });
    }

    function reiniciar() {
      ronda = 1; tiro = 1; puntos = 0; final = 0; cartel = null; rastro = [];
      colocarBolos(); ponerObstaculos(); nuevaTirada();
    }

    function nuevaTirada() {
      bola = null; fase = 'apuntar'; reloj = 0; angulo = 0; potencia = 0; bolaX = CENTRO; finTirada = 0; rastro = [];
    }

    const enPie = () => bolos.filter((b) => !b.caido).length;

    function lanzar() {
      const v = V_MIN + (V_MAX - V_MIN) * potencia;
      bola = { x: bolaX, y: SALIDA_Y, vx: Math.sin(angulo) * v, vy: -Math.cos(angulo) * v, r: R_BOLA, canal: false };
      fase = 'rodando'; finTirada = 0; antes = enPie(); Sonido.efecto('saltar');
    }

    // Choque entre dos cuerpos redondos (masa ma y mb); devuelve la velocidad del golpe
    function chocar(a, b, ra, rb, ma, mb) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = ra + rb;
      if (d >= min || d === 0) return 0;
      const nx = dx / d, ny = dy / d, solape = min - d;
      a.x -= nx * solape * mb / (ma + mb); a.y -= ny * solape * mb / (ma + mb);
      b.x += nx * solape * ma / (ma + mb); b.y += ny * solape * ma / (ma + mb);
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) return 0;
      const j = (1 + 0.3) * rel / (1 / ma + 1 / mb);
      a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny;
      return rel;
    }

    function fisica(dt) {
      if (bola) {
        bola.x += bola.vx * dt; bola.y += bola.vy * dt;
        const roce = Math.exp(-0.28 * dt); bola.vx *= roce; bola.vy *= roce;
        if (!bola.canal && (bola.x - bola.r < CALLE[0] || bola.x + bola.r > CALLE[1])) {   // al canal de nieve: sigue recta y ya no toca bolos
          bola.canal = true; bola.vx = 0; bola.x = bola.x < CENTRO ? CALLE[0] - 7 : CALLE[1] + 7; Sonido.efecto('bloqueada');
        }
        if (bola.r < 7.5) bola.r += dt * 0.9;                             // la bola engorda al rodar
        if (!bola.canal && !bola.rebote) for (const o of obstaculos) {
          if (Math.abs(bola.x - o.x) < OBST_W / 2 + bola.r && Math.abs(bola.y - o.y) < OBST_H / 2 + bola.r) {
            bola.rebote = true; bola.vy = Math.abs(bola.vy) * 0.35; bola.vx = (bola.x - o.x) * 4 + o.vx * 0.5;
            Sonido.efecto('golpe'); cartel = { t: '¡CUIDADO CON EL TRINEO!', vida: 1.2 };
          }
        }
        if (!bola.canal) for (const b of bolos) {
          if (b.fuera) continue;
          const v = chocar(bola, b, bola.r, R_BOLO, 3, 1);
          if (v > 10 && !b.caido) { b.caido = true; Sonido.efecto('golpe'); }
        }
      }
      for (const b of bolos) {
        if (!b.caido || b.fuera) continue;
        b.x += b.vx * dt; b.y += b.vy * dt; b.giro += Math.hypot(b.vx, b.vy) * dt * 0.15;
        const roce = Math.exp(-3.5 * dt); b.vx *= roce; b.vy *= roce;
        if (b.x < CALLE[0] - 4 || b.x > CALLE[1] + 4 || b.y < 14) b.fuera = true;
      }
      // los que caen empujan a los demás
      for (let i = 0; i < bolos.length; i++) for (let k = i + 1; k < bolos.length; k++) {
        const a = bolos[i], b = bolos[k];
        if (a.fuera || b.fuera || (!a.caido && !b.caido)) continue;
        const v = chocar(a, b, R_BOLO, R_BOLO, 1, 1);
        if (v > 24) { if (!a.caido) { a.caido = true; Sonido.efecto('golpe'); } if (!b.caido) { b.caido = true; Sonido.efecto('golpe'); } }
      }
    }

    function actualizar(dt, api) {
      reloj += dt;
      for (const o of obstaculos) {                                        // los trineos van y vienen siempre
        o.x += o.vx * dt;
        if (o.x < CALLE[0] + OBST_W / 2 || o.x > CALLE[1] - OBST_W / 2) { o.vx = -o.vx; o.x = Math.max(CALLE[0] + OBST_W / 2, Math.min(CALLE[1] - OBST_W / 2, o.x)); }
      }
      if (cartel) { cartel.vida -= dt; }
      if (final > 0) { final += dt; if (final > 2) api.ganar(); return; }
      const e = api.entrada, pulsa = e.pulsado('accion') | e.pulsado('toque');

      if (fase === 'apuntar') {
        angulo = Math.sin(reloj * 2.1) * ANG_MAX;
        const dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
        bolaX = Math.max(CALLE[0] + 8, Math.min(CALLE[1] - 8, bolaX + dx * 45 * dt));
        if (pulsa && !(cartel && cartel.vida > 0)) { fase = 'fuerza'; reloj = 0; Sonido.efecto('coger'); }
      } else if (fase === 'fuerza') {
        const f = (reloj * 0.85) % 2; potencia = f < 1 ? f : 2 - f;          // sube y baja
        if (pulsa) lanzar();
      } else if (fase === 'rodando') {
        for (let k = 0; k < 4; k++) fisica(dt / 4);
        if (bola && Math.floor(reloj * 30) !== Math.floor((reloj - dt) * 30)) { rastro.push({ x: bola.x, y: bola.y, r: bola.r }); if (rastro.length > 40) rastro.shift(); }
        const quieta = !bola || bola.y < -10 || bola.y > H + 10 || Math.hypot(bola.vx, bola.vy) < 6;
        const parados = bolos.every((b) => b.fuera || !b.caido || Math.hypot(b.vx, b.vy) < 4);
        finTirada += dt;
        if ((quieta && parados && finTirada > 0.6) || finTirada > 6) terminarTirada(api);
      }
    }

    function terminarTirada(api) {
      const quedan = enPie(), tirados = antes - quedan;
      bolos = bolos.filter((b) => !b.caido);                               // los caídos se retiran
      let extra = 0, msg = `+${tirados}`;
      if (quedan === 0) { extra = tiro === 1 ? 5 : 2; msg = tiro === 1 ? '¡PLENO! +15' : `¡SEMIPLENO! +${tirados + 2}`; }
      puntos += tirados + extra;
      if (tirados > 0) Sonido.efecto(quedan === 0 ? 'completar' : 'pareja');
      if (puntos >= META) { cartel = { t: `¡${puntos} PUNTOS!`, vida: 2 }; final = 0.001; Sonido.efecto('completar'); return; }
      if (quedan === 0 || tiro === 2) {
        if (ronda >= RONDAS) { api.perder(`${puntos} PUNTOS DE ${META}. ¡OTRA PARTIDA!`); return; }
        ronda++; tiro = 1; colocarBolos(); ponerObstaculos();
        cartel = { t: `${msg} · RONDA ${ronda}`, vida: 1.5 };
      } else { tiro = 2; cartel = { t: msg, vida: 1.1 }; }
      nuevaTirada();
    }

    /* ---------- Dibujo (escena de 160 x 230) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function muneco(ctx, b, t) {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.caido) {                                                       // tumbado, girando un poco
        ctx.save(); ctx.translate(x, y); ctx.rotate(1.3 + b.giro);
        ctx.fillStyle = C.nieve3; Sprites.disco(ctx, 0, 0, 4); ctx.fillStyle = C.nieve; Sprites.disco(ctx, 0, -6, 3);
        r(ctx, C.tinta, -2, -11, 5, 2); r(ctx, C.rojo, 0, -7, 1, 1);
        ctx.restore(); return;
      }
      r(ctx, 'rgba(22,22,28,0.25)', x - 4, y + 2, 9, 2);                     // sombra
      ctx.fillStyle = C.nieve3; Sprites.disco(ctx, x, y - 2, 4); ctx.fillStyle = C.nieve; Sprites.disco(ctx, x - 1, y - 3, 3);
      ctx.fillStyle = C.nieve3; Sprites.disco(ctx, x, y - 9, 3); ctx.fillStyle = C.blanco; Sprites.disco(ctx, x - 1, y - 10, 2);
      r(ctx, C.tinta, x - 3, y - 13, 7, 1); r(ctx, C.tinta, x - 2, y - 16, 5, 3); r(ctx, C.rojo, x - 2, y - 14, 5, 1);
      r(ctx, C.tinta, x - 1, y - 10, 1, 1); r(ctx, C.tinta, x + 1, y - 10, 1, 1); r(ctx, C.naranja, x, y - 9, 2, 1);
      r(ctx, C.rojo, x - 3, y - 7, 6, 1);
    }

    function dibujar(ctx, api) {
      const t = api.t, e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8, arriba = 6 + altoCaja + 4;
      const K = Math.max(1, Math.floor(Math.min(api.ancho / W, (api.alto - arriba) / H)));
      const x0 = Math.floor((api.ancho - W * K) / 2), y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - H * K) / 2));
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.translate(x0, y0); ctx.scale(K, K);
      // montones de nieve a los lados (los canales) y la pista
      r(ctx, '#c5d3ea', CALLE[0] - 22, 0, 22, H); r(ctx, '#c5d3ea', CALLE[1], 0, 22, H);
      r(ctx, C.nieve2, CALLE[0] - 14, 0, 12, H); r(ctx, C.nieve2, CALLE[1] + 2, 0, 12, H);
      for (let y = (Math.floor(t * 0) % 8); y < H; y += 8) { r(ctx, C.nieve, CALLE[0] - 20, y, 4, 2); r(ctx, C.nieve, CALLE[1] + 16, y + 4, 4, 2); }
      r(ctx, '#e3ebf7', CALLE[0], 0, CALLE[1] - CALLE[0], H);
      for (let x = CALLE[0] + 8; x < CALLE[1]; x += 12) r(ctx, '#d6e0ef', x, 0, 1, H);
      r(ctx, '#9aa8c4', CALLE[0], 0, 1, H); r(ctx, '#9aa8c4', CALLE[1] - 1, 0, 1, H);
      r(ctx, C.rojo, CALLE[0], SALIDA_Y + 8, CALLE[1] - CALLE[0], 2);       // línea de salida
      for (let k = 0; k < 7; k++) { const fx = CALLE[0] + 13 + k * 12, fy = 128; r(ctx, C.verde, fx, fy, 2, 2); r(ctx, C.verde, fx - 1, fy + 2, 4, 1); }   // marcas de puntería
      // cartel de madera al fondo
      r(ctx, C.maderaOsc, CENTRO - 26, 2, 52, 14); r(ctx, C.madera, CENTRO - 25, 3, 50, 12);
      texto(ctx, 'BOLOS', CENTRO, 6, C.crema, { centro: true });
      // huella de la bola
      for (const p of rastro) r(ctx, '#cdd8ea', p.x - 1, p.y, 3, 2);
      // muñecos (de arriba abajo para que se tapen bien)
      [...bolos].sort((a, b) => a.y - b.y).forEach((b) => { if (!b.fuera) muneco(ctx, b, t); });
      // niños en trineo cruzando la pista
      for (const o of obstaculos) {
        const x = Math.round(o.x), y = Math.round(o.y), dir = Math.sign(o.vx) || 1;
        r(ctx, 'rgba(22,22,28,0.25)', x - 9, y + 3, 18, 2);
        r(ctx, C.rojoOsc, x - 9, y + 2, 18, 1); r(ctx, C.rojoOsc, x + 8 * dir, y, 1, 2);
        r(ctx, '#a9763f', x - 8, y - 1, 16, 3); r(ctx, '#c08d52', x - 8, y - 1, 16, 1);
        r(ctx, '#4a7ad8', x - 3, y - 8, 7, 7); r(ctx, C.piel, x - 2, y - 13, 5, 5); r(ctx, C.verde, x - 3, y - 14, 7, 2); r(ctx, C.nieve, x, y - 16, 2, 2);
        r(ctx, C.tinta, x + (dir > 0 ? 1 : -1), y - 11, 1, 1); r(ctx, C.rojo, x - 4 * dir, y - 7, 2, 2);
      }
      // bola
      const bx = bola ? bola.x : bolaX, by = bola ? bola.y : SALIDA_Y, br = bola ? bola.r : R_BOLA;
      if (fase !== 'rodando' || (bola && bola.y > -10)) {
        ctx.fillStyle = C.nieve3; Sprites.disco(ctx, Math.round(bx), Math.round(by), Math.round(br));
        ctx.fillStyle = C.blanco; Sprites.disco(ctx, Math.round(bx) - 1, Math.round(by) - 1, Math.max(1, Math.round(br) - 2));
        r(ctx, C.nieve4, Math.round(bx) + 1, Math.round(by) + 1, 2, 1);
      }
      // la chica detrás de la línea
      Sprites.personaje(ctx, Math.round(fase === 'rodando' ? bolaX : bolaX) + 10, SALIDA_Y + 30, -1, 'idle', t);
      // flecha de dirección y barra de fuerza
      if (fase === 'apuntar' || fase === 'fuerza') {
        const largo = fase === 'fuerza' ? 18 + potencia * 30 : 34;
        for (let k = 8; k < largo; k += 3) r(ctx, fase === 'fuerza' ? C.oroClaro : C.rojo, bolaX + Math.sin(angulo) * k - 1, SALIDA_Y - Math.cos(angulo) * k - 1, 2, 2);
        const px = bolaX + Math.sin(angulo) * largo, py = SALIDA_Y - Math.cos(angulo) * largo;
        r(ctx, fase === 'fuerza' ? C.oroClaro : C.rojo, px - 2, py - 2, 4, 4);
      }
      ctx.restore();

      if (fase === 'fuerza' || fase === 'apuntar') {                       // barra de fuerza a la derecha de la pista
        const bh = 60 * K, bw = 8 * K, bxp = x0 + (CALLE[1] + 26) * K, byp = y0 + (SALIDA_Y - 64) * K;
        Comun.caja(ctx, bxp, byp, bw, bh);
        const lleno = Math.round(bh * (fase === 'fuerza' ? potencia : 0));
        ctx.fillStyle = potencia > 0.75 ? C.rojoClaro : potencia > 0.4 ? C.oro : C.verde; ctx.fillRect(bxp, byp + bh - lleno, bw, lleno);
        const ayuda = fase === 'apuntar' ? 'DIRECCIÓN' : 'FUERZA';
        texto(ctx, ayuda, Math.min(api.ancho - Comun.medir(ayuda, e) - 4, bxp - Comun.medir(ayuda, e) / 2 + bw / 2), byp + bh + 6, C.nieve, { escala: e });
      }
      if (cartel && cartel.vida > 0) {
        const em = Comun.medir(cartel.t, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(cartel.t, em) + 12, h = Comun.altoTexto(em) + 12;
        const bxc = Math.floor((api.ancho - w) / 2), byc = Math.floor(y0 + H * K * 0.42);
        Comun.caja(ctx, bxc, byc, w, h); texto(ctx, cartel.t, bxc + 6, byc + 6, C.oroClaro, { escala: em });
      }
      const largo = `PUNTOS ${puntos}/${META} · RONDA ${ronda}/${RONDAS} · TIRO ${tiro}/2`;
      const t1 = Comun.medir(largo, e) + 16 <= api.ancho - api.margenDerecho ? largo : `${puntos}/${META} · R${ronda} · T${tiro}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: estado para las pruebas automáticas
    if (Dias.debug) window.bolosDebug = () => ({ final: final > 0, fase, tirada: tiro, ronda, puntos, obstaculos, potenciaV: [V_MIN, V_MAX], angulo, potencia, bolaX, enPie: enPie(),
      bolos: bolos.filter((b) => !b.caido).map((b) => ({ x: b.x, y: b.y })), salidaY: SALIDA_Y });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'BOLOS DE NIEVE',
      instruccion: `CONSIGUE ${META} PUNTOS EN 5 RONDAS DE 2 TIROS: 1 POR MUÑECO, +5 POR PLENO, +2 POR SEMIPLENO. ¡OJO CON LOS NIÑOS EN TRINEO! LA FLECHA SE MUEVE: ESPACIO (O TOCA) FIJA LA DIRECCIÓN Y LUEGO LA FUERZA. ← → MUEVEN LA BOLA.`,
      pantallaCompleta: true,
      musica: 'bolos',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
