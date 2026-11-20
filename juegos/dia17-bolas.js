'use strict';
/* Día 17 — Esquiva bolas de nieve.
   Los vecinos montan una guerra de bolas: desde las ventanas lanzan bolas en parábola (se ve su sombra donde
   van a caer: hay que apartarse con ← →) y unos niños las tiran rasantes desde los lados (un aviso "!"
   las anuncia: hay que agacharse con ↓). Aguantar 30 segundos con 3 vidas. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia17-bolas'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const TIEMPO = 30, VIDAS = 3, VEL = 105, G = 300;
    const ESC_H = 220, SUELO = 200;

    let jug, bolas, avisos, vidas, quedan, golpe, final, proxBola, proxRasante, vecinos, nieve;

    function reiniciar(api) {
      const W = ancho(api);
      jug = { x: W / 2, dir: 1, andando: false, agachada: false };
      bolas = []; avisos = []; vidas = VIDAS; quedan = TIEMPO; golpe = 0; final = 0; proxBola = 1; proxRasante = 4; nieve = [];
      // ventanas del edificio de enfrente (de donde salen los vecinos)
      vecinos = [];
      const n = Math.max(4, Math.floor(W / 52));
      for (let i = 0; i < n; i++) vecinos.push({ x: Math.floor((i + 0.5) * W / n), y: 40 + (i % 2) * 34, asoma: 0 });
    }
    const escala = (api) => (api.alto >= 2 * ESC_H + 40 ? 2 : 1);           // al doble si sobra altura (móvil vertical)
    const ancho = (api) => Math.floor(api.ancho / escala(api));

    function lanzar(W, avance) {
      const v = vecinos[Math.floor(Math.random() * vecinos.length)];
      v.asoma = 0.8;
      const destino = Math.max(10, Math.min(W - 10, jug.x + (Math.random() - 0.5) * 70));
      const vuelo = 1.25 - avance * 0.35;
      bolas.push({ tipo: 'parabola', x0: v.x, y0: v.y + 10, x1: destino, t: 0, vuelo, x: v.x, y: v.y + 10 });
    }

    function actualizar(dt, api) {
      const W = ancho(api);
      for (let i = nieve.length - 1; i >= 0; i--) { const s = nieve[i]; s.vida -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; if (s.vida <= 0) nieve.splice(i, 1); }
      for (const v of vecinos) v.asoma = Math.max(0, v.asoma - dt);
      if (final > 0) { final += dt; if (final > 1.4) api.ganar(); return; }
      golpe = Math.max(0, golpe - dt);

      const e = api.entrada;
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      const K = escala(api);
      if (!dx && e.puntero.abajo && e.puntero.y / K < SUELO + 20) { const px = e.puntero.x / K; if (Math.abs(px - jug.x) > 4) dx = Math.sign(px - jug.x); }
      jug.agachada = e.abajo || (e.puntero.abajo && e.puntero.y / K >= SUELO + 20);   // ↓, o tocar el suelo
      e.pulsado('toque'); e.pulsado('accion');
      if (jug.agachada) dx = 0;
      jug.andando = !!dx;
      if (dx) jug.dir = dx;
      jug.x = Math.max(10, Math.min(W - 10, jug.x + dx * VEL * dt));

      const avance = 1 - quedan / TIEMPO;
      proxBola -= dt;
      if (proxBola <= 0) { proxBola = 1.1 - avance * 0.5 + Math.random() * 0.4; lanzar(W, avance); }
      proxRasante -= dt;
      if (proxRasante <= 0) {
        proxRasante = 3.4 - avance * 1.4 + Math.random() * 1.2;
        const izq = Math.random() < 0.5;
        avisos.push({ izq, t: 0.8 });
      }
      for (let i = avisos.length - 1; i >= 0; i--) {
        const a = avisos[i];
        a.t -= dt;
        if (a.t <= 0) { avisos.splice(i, 1); bolas.push({ tipo: 'rasante', x: a.izq ? -6 : W + 6, y: SUELO - 21, vx: a.izq ? 170 : -170 }); Sonido.efecto('carta'); }
      }

      const alto = jug.agachada ? 12 : 24;
      for (let i = bolas.length - 1; i >= 0; i--) {
        const b = bolas[i];
        if (b.tipo === 'parabola') {
          b.t += dt;
          const k = Math.min(1, b.t / b.vuelo);
          b.x = b.x0 + (b.x1 - b.x0) * k;
          b.y = b.y0 + (SUELO - b.y0) * k - Math.sin(k * Math.PI) * 50;
          if (k >= 1) {
            bolas.splice(i, 1);
            for (let s = 0; s < 6; s++) nieve.push({ x: b.x, y: SUELO - 2, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, vida: 0.4 });
            if (Math.abs(b.x - jug.x) < 9) impacto(api);
            continue;
          }
        } else {
          b.x += b.vx * dt;
          if (Math.abs(b.x - jug.x) < 7 && b.y > SUELO - alto - 2 && golpe <= 0) { bolas.splice(i, 1); impacto(api); continue; }
          if (b.x < -20 || b.x > W + 20) bolas.splice(i, 1);
        }
      }

      quedan -= dt;
      if (quedan <= 0 && final === 0) { quedan = 0; final = 0.001; bolas = []; avisos = []; Sonido.efecto('completar'); }
    }

    function impacto(api) {
      if (golpe > 0 || final > 0) return;
      vidas--; golpe = 1;
      Sonido.efecto('golpe'); api.sacudir(0.25);
      for (let s = 0; s < 10; s++) nieve.push({ x: jug.x, y: SUELO - 14, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 50, vida: 0.5 });
      if (vidas <= 0) api.perder('¡TE HAN DADO 3 VECES! A POR OTRA RONDA');
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    // La chica agachada: se dibuja entera en un lienzo pequeño y se omiten las piernas
    const [cuerpo, gc] = Sprites.lienzoAux(16, 25);
    function chica(ctx, t) {
      if (!jug.agachada) { Sprites.personaje(ctx, Math.round(jug.x), SUELO, jug.dir, jug.andando ? 'andar' : 'idle', t); return; }
      gc.clearRect(0, 0, 16, 25);
      Sprites.personaje(gc, 8, 24, jug.dir, 'idle', t);
      ctx.drawImage(cuerpo, 0, 0, 16, 15, Math.round(jug.x) - 8, SUELO - 17, 16, 15);   // cabeza y abrigo, más abajo (la bola rasante pasa por encima)
      ctx.drawImage(cuerpo, 0, 21, 16, 3, Math.round(jug.x) - 8, SUELO - 3, 16, 3);     // botas
    }

    function dibujar(ctx, api) {
      const K = escala(api), W = ancho(api), H = Math.floor(api.alto / K), t = api.t;
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.scale(K, K);
      const oy = Math.max(0, H - ESC_H);
      ctx.translate(0, oy);
      // edificio de enfrente con las ventanas de los vecinos
      r(ctx, '#5e2620', 0, 20, W, SUELO - 60);
      for (let y = 20, f = 0; y < SUELO - 40; y += 4, f++) for (let x = -(f % 2) * 4; x < W; x += 8) r(ctx, (x + f) % 5 ? '#8a3a2a' : '#7a3326', x, y, 7, 3);
      r(ctx, C.nieve, 0, 16, W, 4);
      for (const v of vecinos) {
        r(ctx, '#b9b2a6', v.x - 12, v.y - 2, 24, 22); r(ctx, '#2b1a14', v.x - 10, v.y, 20, 18);
        r(ctx, v.asoma > 0 ? '#ffe9a0' : '#f0a93a', v.x - 9, v.y + 1, 18, 16);
        if (v.asoma > 0) {                                                  // vecino asomado lanzando
          r(ctx, '#f6cfae', v.x - 3, v.y + 4, 7, 6); r(ctx, ['#4a7ad8', '#3f8a5c', '#9a5ad0'][Math.floor(v.x) % 3], v.x - 5, v.y + 10, 11, 7);
          r(ctx, C.tinta, v.x - 1, v.y + 6, 1, 1); r(ctx, C.tinta, v.x + 2, v.y + 6, 1, 1); r(ctx, '#6b3f23', v.x - 3, v.y + 3, 7, 2);
          r(ctx, C.nieve, v.x + 5, v.y + 5, 3, 3);
        }
      }
      // muro de piedra oscura detrás de la calle (con nieve encima) para que las bolas blancas resalten
      r(ctx, '#2f3a5e', 0, SUELO - 40, W, 40);
      for (let y = SUELO - 36, f = 0; y < SUELO; y += 8, f++)
        for (let x = (f % 2) * -10; x < W; x += 20) { r(ctx, '#3d4a74', x + 1, y + 1, 18, 6); r(ctx, '#4a5886', x + 1, y + 1, 18, 1); }
      r(ctx, C.nieve, 0, SUELO - 42, W, 4); r(ctx, C.nieve2, 0, SUELO - 38, W, 1);
      for (let x = 3; x < W; x += 11) r(ctx, C.nieve, x, SUELO - 38, 3, 1 + (x % 3));
      r(ctx, '#dbe5f5', 0, SUELO, W, ESC_H - SUELO + 60); r(ctx, C.nieve, 0, SUELO, W, 2);
      // sombras de las bolas que caen (dónde van a dar)
      for (const b of bolas) if (b.tipo === 'parabola') {
        const k = Math.min(1, b.t / b.vuelo), w = 4 + Math.round(k * 6);
        Sprites.tramar(ctx, Math.round(b.x1 - w), SUELO - 1, w * 2, 2, C.tinta, () => 0.4 + k * 0.5);
      }
      // avisos de bola rasante
      for (const a of avisos) if (Math.floor(a.t * 10) % 2) {
        const x = a.izq ? 4 : W - 10;
        r(ctx, C.rojoClaro, x, SUELO - 24, 6, 14); r(ctx, C.blanco, x + 2, SUELO - 22, 2, 6); r(ctx, C.blanco, x + 2, SUELO - 14, 2, 2);
      }
      if (!(golpe > 0 && Math.floor(t * 12) % 2)) chica(ctx, t);
      for (const b of bolas) { r(ctx, C.tinta, b.x - 4, b.y - 3, 8, 7); r(ctx, C.nieve3, b.x - 3, b.y - 2, 6, 5); r(ctx, C.nieve, b.x - 2, b.y - 3, 5, 5); r(ctx, C.blanco, b.x - 1, b.y - 2, 1, 1); }
      ctx.fillStyle = C.nieve;
      for (const s of nieve) ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
      ctx.restore();

      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      if (final > 0) {
        const em = Comun.medir('¡AGUANTASTE!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡AGUANTASTE!', Math.floor(api.ancho / 2), Math.floor(api.alto * 0.3), C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      // vidas (corazones) y tiempo
      const wv = 10 + VIDAS * 12;
      Comun.caja(ctx, 6, 6, wv, altoCaja);
      for (let i = 0; i < VIDAS; i++) {
        const x = 12 + i * 12, y = 6 + Math.floor(altoCaja / 2) - 4, col = i < vidas ? C.rojoClaro : C.nocheClara;
        r(ctx, col, x, y, 3, 3); r(ctx, col, x + 4, y, 3, 3); r(ctx, col, x - 1, y + 1, 9, 3); r(ctx, col, x, y + 4, 7, 2); r(ctx, col, x + 2, y + 6, 3, 1);
      }
      const anchoBarra = 50, anchoNum = Comun.medir('30', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(wv + 18, Math.floor((api.ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, altoCaja);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, altoCaja - 8);
      ctx.fillStyle = C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * (1 - quedan / TIEMPO)), altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, C.nieve, { escala: e });
    }

    // Solo en modo debug: estado y bolas, para las pruebas automáticas
    if (Dias.debug) window.bolasDebug = () => ({ vidas, quedan, final: final > 0, jug: { x: jug.x, agachada: jug.agachada },
      bolas: bolas.map((b) => ({ tipo: b.tipo, x: b.x, x1: b.x1, k: b.tipo === 'parabola' ? b.t / b.vuelo : null, vx: b.vx })), avisos: avisos.map((a) => a.izq) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ESQUIVA BOLAS DE NIEVE',
      instruccion: 'GUERRA DE BOLAS: APARTATE DE LAS SOMBRAS CON ← → Y AGACHATE CON ↓ CUANDO VEAS UN "!" A LOS LADOS. AGUANTA 30 SEGUNDOS CON 3 VIDAS.',
      pantallaCompleta: true,
      musica: 'bolas',
      reiniciar, actualizar, dibujar
    });
  }
};
