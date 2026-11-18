'use strict';
/* Día 12 — ¡Salva la Navidad! (el terremoto).
   1. El edificio tiembla, se agrieta y se viene abajo planta a planta entre polvo y cascotes.
   2. La chica queda en la calle entre los escombros: hay que recoger 10 regalos en 60 segundos,
      corriendo (← →) y saltando (↑, Espacio o tocar) sobre los montones. Caen piedras: antes se ve su
      sombra en el suelo; cada golpe quita 5 segundos.
   3. Al recoger el último regalo el edificio se reconstruye y vuelve a verse bien. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia12-terremoto'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 10, TIEMPO = 60, CASTIGO = 5;
    const VEL = 95, SALTO = 250, GRAVEDAD = 640;
    const T_DERRUMBE = 5.2, T_RECONSTRUIR = 2.4;
    const PLANTAS = 6, ALTO_PLANTA = 22, ANCHO_EDIF = 150;

    let fase, t, mundo, jug, montones, regalos, piedras, polvo, cascotes, recogidos, quedan, aviso, golpeado, proxPiedra;

    // Mundo en unidades de escena (se amplía K veces): ancho W, suelo en y = 0, hacia arriba negativo
    function medir(api) {
      const K = api.alto >= 420 ? 2 : 1;
      return { K, W: Math.floor(api.ancho / K), H: Math.floor(api.alto / K) };
    }

    function reiniciar(api) {
      mundo = medir(api);
      const W = mundo.W;
      fase = 'derrumbe'; t = 0;
      jug = { x: 34, y: 0, vy: 0, dir: 1, enSuelo: true, andando: false };
      // montones de escombros (plataformas a las que se puede subir), repartidos por la calle
      montones = [];
      const n = Math.max(3, Math.floor(W / 110));
      for (let i = 0; i < n; i++) {
        const w = 44 + ((i * 37) % 30), x = Math.floor((i + 0.5) * W / n - w / 2) + ((i % 2) ? 12 : -12);
        montones.push({ x, w, h: 16 + ((i * 23) % 22) });
      }
      regalos = []; piedras = []; polvo = []; cascotes = [];
      recogidos = 0; quedan = TIEMPO; aviso = null; golpeado = 0; proxPiedra = 1.2;
    }

    const alturaSuelo = (x) => {                                           // altura del suelo (o del montón) en x
      let h = 0;
      for (const m of montones) if (x >= m.x && x <= m.x + m.w) h = Math.max(h, m.h);
      return -h;
    };

    function ponerRegalo() {
      const W = mundo.W;
      for (let intento = 0; intento < 20; intento++) {
        const x = 16 + Math.random() * (W - 32);
        if (Math.abs(x - jug.x) < 40) continue;
        if (regalos.some((r) => Math.abs(r.x - x) < 30)) continue;
        regalos.push({ x, y: alturaSuelo(x), color: [C.rojo, C.verde, '#4a7ad8', C.lila][Math.floor(Math.random() * 4)], t: Math.random() * 6 });
        return;
      }
    }

    function decir(txt, color, vida = 1.4) { aviso = { texto: txt, color: color || C.oroClaro, vida }; }

    function actualizar(dt, api) {
      t += dt;
      mundo = medir(api);
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      for (let i = polvo.length - 1; i >= 0; i--) { const p = polvo[i]; p.vida -= dt; p.r += 10 * dt; p.y -= 6 * dt; if (p.vida <= 0) polvo.splice(i, 1); }
      for (let i = cascotes.length - 1; i >= 0; i--) {
        const c = cascotes[i];
        c.vy += GRAVEDAD * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.y > 0) { c.y = 0; c.vy *= -0.25; c.vx *= 0.5; }
        c.vida -= dt; if (c.vida <= 0) cascotes.splice(i, 1);
      }

      if (fase === 'derrumbe') {
        if (t < 1.6) { api.sacudir(0.12 + t * 0.06); if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) Sonido.efecto('golpe'); }
        // cada planta cae (de arriba abajo) y se rompe en cascotes con polvo
        const cx = Math.floor(mundo.W / 2);
        for (let p = PLANTAS - 1; p >= 0; p--) {
          const tp = 1.6 + (PLANTAS - 1 - p) * 0.5;
          if (t >= tp && t - dt < tp) {
            Sonido.efecto('derrumbe'); api.sacudir(0.35);
            const y = -(p + 0.5) * ALTO_PLANTA;
            for (let k = 0; k < 14; k++)
              cascotes.push({ x: cx - ANCHO_EDIF / 2 + Math.random() * ANCHO_EDIF, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 80, vida: 2 + Math.random(), w: 3 + Math.floor(Math.random() * 5), c: Math.random() < 0.6 ? '#a2432f' : '#8c857b' });
            for (let k = 0; k < 6; k++) polvo.push({ x: cx - ANCHO_EDIF / 2 + Math.random() * ANCHO_EDIF, y: -4, r: 6 + Math.random() * 8, vida: 1.6 });
          }
        }
        if (t >= T_DERRUMBE) {
          fase = 'jugar'; t = 0;
          decir('¡LOS REGALOS ESTAN ENTRE LAS RUINAS!', C.oroClaro, 2.4);
          for (let i = 0; i < 3; i++) ponerRegalo();
        }
        api.entrada.pulsado('accion'); api.entrada.pulsado('toque'); api.entrada.pulsado('arriba');
        return;
      }

      if (fase === 'reconstruir') {
        // los montones desaparecen: la chica cae a la calle
        jug.vy += GRAVEDAD * dt; jug.y = Math.min(0, jug.y + jug.vy * dt); if (jug.y === 0) jug.vy = 0;
        jug.andando = false; jug.enSuelo = jug.y === 0;
        if (t >= T_RECONSTRUIR) api.ganar();
        return;
      }

      // ---------- jugando ----------
      const e = api.entrada;
      golpeado = Math.max(0, golpeado - dt);
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!dx && e.puntero.abajo && Math.abs(e.puntero.x / mundo.K - jug.x) > 6) dx = Math.sign(e.puntero.x / mundo.K - jug.x);   // seguir el dedo
      if (golpeado > 0.3) dx = 0;                                           // aturdida tras un golpe
      jug.andando = dx !== 0 && jug.enSuelo;
      if (dx) jug.dir = dx;
      const salta = e.pulsado('arriba') | e.pulsado('accion') | e.pulsado('toque');
      if (salta && jug.enSuelo && golpeado <= 0.3) { jug.vy = -SALTO; jug.enSuelo = false; Sonido.efecto('saltar'); }

      // movimiento horizontal: los montones se suben saltando (no se atraviesan si están más altos que los pies)
      const nx = Math.max(8, Math.min(mundo.W - 8, jug.x + dx * VEL * dt));
      if (alturaSuelo(nx) >= jug.y - 3) jug.x = nx;                        // altura del nuevo sitio no más alta que los pies
      // vertical
      jug.vy += GRAVEDAD * dt;
      jug.y += jug.vy * dt;
      const suelo = alturaSuelo(jug.x);
      if (jug.y >= suelo && jug.vy >= 0) { jug.y = suelo; jug.vy = 0; jug.enSuelo = true; }
      else if (jug.y < suelo - 0.5) jug.enSuelo = false;
      if (jug.enSuelo && jug.y < suelo) jug.y = suelo;

      // regalos
      for (let i = regalos.length - 1; i >= 0; i--) {
        const r = regalos[i];
        r.t += dt;
        if (Math.abs(r.x - jug.x) < 10 && Math.abs(r.y - jug.y) < 16) {
          regalos.splice(i, 1);
          recogidos++;
          Sonido.efecto('coger');
          api.aviso(`${recogidos}/${META}`, Math.round(r.x * mundo.K), Math.round((mundo.H - 18 + r.y - 16) * mundo.K), C.oroClaro);
          if (recogidos >= META) {
            fase = 'reconstruir'; t = 0; piedras = [];
            Sonido.efecto('completar');
            decir('¡LA NAVIDAD SIGUE EN PIE!', C.oroClaro, 3);
            return;
          }
          if (recogidos + regalos.length < META) ponerRegalo();
        }
      }

      // piedras: primero la sombra, luego caen deprisa
      proxPiedra -= dt;
      const avance = 1 - quedan / TIEMPO;
      if (proxPiedra <= 0) {
        proxPiedra = (1.1 - avance * 0.5 + Math.random() * 0.5) * Math.sqrt(320 / mundo.W);
        // la mitad de las veces apunta cerca de la chica
        const x = Math.random() < 0.5 ? jug.x + (Math.random() - 0.5) * 50 : 10 + Math.random() * (mundo.W - 20);
        piedras.push({ x: Math.max(8, Math.min(mundo.W - 8, x)), aviso: 0.9, y: -mundo.H, vy: 0, r: 4 + Math.floor(Math.random() * 3) });
      }
      for (let i = piedras.length - 1; i >= 0; i--) {
        const p = piedras[i];
        if (p.aviso > 0) { p.aviso -= dt; continue; }
        p.vy += GRAVEDAD * 1.3 * dt; p.y += p.vy * dt;
        const suelo = alturaSuelo(p.x);
        if (golpeado <= 0 && Math.abs(p.x - jug.x) < p.r + 5 && p.y > jug.y - 26 && p.y < jug.y + 2) {
          piedras.splice(i, 1);
          quedan = Math.max(0, quedan - CASTIGO); golpeado = 0.9;
          Sonido.efecto('golpe'); api.sacudir(0.3);
          api.aviso(`-${CASTIGO} S`, Math.round(jug.x * mundo.K), Math.round((mundo.H - 18 + jug.y - 34) * mundo.K), C.rojoClaro);
          continue;
        }
        if (p.y >= suelo) {
          piedras.splice(i, 1);
          for (let k = 0; k < 5; k++) cascotes.push({ x: p.x, y: suelo - 1, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 60, vida: 0.6, w: 2, c: '#8c857b' });
        }
      }

      quedan -= dt;
      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO: ${recogidos} DE ${META} REGALOS`); }
    }

    /* ---------- Dibujo (en unidades de la escena; el suelo de la calle está a 18 del borde de abajo) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    // El edificio entero (de pie) con sus ventanas encendidas; `plantas` = cuántas quedan de abajo arriba
    function edificio(ctx, cx, plantas, grietas, encendidas) {
      const x0 = Math.round(cx - ANCHO_EDIF / 2);
      for (let p = 0; p < plantas; p++) {
        const y = -(p + 1) * ALTO_PLANTA;
        r(ctx, '#5e2620', x0, y, ANCHO_EDIF, ALTO_PLANTA);
        for (let fy = 0; fy < ALTO_PLANTA; fy += 4) for (let fx = (fy / 4) % 2 * 4; fx < ANCHO_EDIF; fx += 8) r(ctx, '#a2432f', x0 + fx, y + fy, 7, 3);
        r(ctx, '#cfc8bd', x0 - 2, y + ALTO_PLANTA - 2, ANCHO_EDIF + 4, 2);
        for (let k = 0; k < 4; k++) {
          const wx = x0 + 14 + k * 34, wy = y + 5;
          r(ctx, '#2b1a14', wx - 1, wy - 1, 14, 12);
          r(ctx, encendidas ? ((k + p) % 3 ? '#ffe9a0' : '#f0a93a') : '#141a3c', wx, wy, 12, 10);
          r(ctx, '#2b1a14', wx + 5, wy, 2, 10);
        }
      }
      if (plantas >= PLANTAS) {                                             // tejado nevado
        r(ctx, '#4a3238', x0 - 6, -PLANTAS * ALTO_PLANTA - 6, ANCHO_EDIF + 12, 6);
        r(ctx, C.nieve, x0 - 7, -PLANTAS * ALTO_PLANTA - 9, ANCHO_EDIF + 14, 3);
      }
      if (grietas > 0) {                                                    // grietas que crecen
        ctx.fillStyle = C.tinta;
        for (let g = 0; g < 5; g++) {
          let gx = x0 + 20 + g * 28, gy = -PLANTAS * ALTO_PLANTA + 10 + (g * 17) % 40;
          for (let k = 0; k < Math.floor(grietas * 18); k++) { ctx.fillRect(Math.round(gx), Math.round(gy), 1, 2); gx += ((g + k) % 3) - 1; gy += 2; }
        }
      }
    }

    // Ruinas: un montón de escombros con trozos de pared rota
    function ruinas(ctx, cx) {
      const x0 = Math.round(cx - ANCHO_EDIF / 2);
      r(ctx, '#5e2620', x0 + 6, -40, 18, 40); r(ctx, '#5e2620', x0 + ANCHO_EDIF - 30, -56, 22, 56); r(ctx, '#5e2620', x0 + 60, -26, 14, 26);
      for (let k = 0; k < 3; k++) r(ctx, '#a2432f', x0 + ANCHO_EDIF - 28, -52 + k * 12, 18, 3);
      r(ctx, '#3a2622', x0 - 10, -12, ANCHO_EDIF + 20, 12);
      for (let k = 0; k < 26; k++) r(ctx, k % 3 ? '#8c857b' : '#a2432f', x0 - 8 + (k * 41) % (ANCHO_EDIF + 16), -14 + (k * 7) % 8, 6 + (k % 4) * 2, 4);
    }

    function regalo(ctx, x, y, color) {
      r(ctx, color, x - 5, y - 9, 10, 9); r(ctx, C.oro, x - 1, y - 9, 2, 9); r(ctx, C.oro, x - 5, y - 6, 10, 2);
      r(ctx, C.oro, x - 4, y - 12, 3, 3); r(ctx, C.oro, x + 1, y - 12, 3, 3);
    }

    function dibujar(ctx, api) {
      const m = medir(api), W = m.W, H = m.H, suelo = H - 18;
      Comun.fondoNoche(ctx, api.t, api.alto, api.ancho);
      ctx.save();
      ctx.scale(m.K, m.K);
      // calle
      r(ctx, '#3a3f58', 0, suelo, W, 18); r(ctx, '#5a6278', 0, suelo, W, 2);
      for (let x = 10; x < W; x += 34) r(ctx, '#d9c49a', x, suelo + 9, 14, 2);
      ctx.translate(0, suelo);
      const cx = Math.floor(W / 2);

      if (fase === 'derrumbe') {
        // de pie hasta que empieza a caer; después quedan menos plantas cada vez
        const cayeron = t < 1.6 ? 0 : Math.min(PLANTAS, Math.floor((t - 1.6) / 0.5) + 1);
        if (cayeron < PLANTAS) edificio(ctx, cx, PLANTAS - cayeron, Math.min(1, t / 1.6), t < 1.6);
        if (cayeron > 0) ruinas(ctx, cx);
      } else if (fase === 'reconstruir') {
        // el edificio vuelve a levantarse planta a planta, con las luces encendidas
        const sube = Math.min(PLANTAS, Math.floor(t / (T_RECONSTRUIR * 0.7) * PLANTAS) + 1);
        if (sube < PLANTAS) ruinas(ctx, cx);
        edificio(ctx, cx, sube, 0, true);
        if (sube >= PLANTAS) for (let k = 0; k < 10; k++) if ((Math.floor(api.t * 6) + k) % 3 === 0) r(ctx, C.oroClaro, cx - 80 + (k * 37) % 160, -PLANTAS * ALTO_PLANTA - 10 - (k * 13) % 30, 2, 2);
      } else ruinas(ctx, cx);

      // montones de escombros (plataformas)
      if (fase !== 'reconstruir') for (const mo of montones) {
        r(ctx, '#3a2622', mo.x, -mo.h, mo.w, mo.h);
        for (let k = 0; k < Math.floor(mo.w / 6); k++) r(ctx, k % 3 ? '#8c857b' : '#a2432f', mo.x + k * 6 + (k % 2), -mo.h + ((k * 5) % 6), 6, 4);
        r(ctx, '#b9b2a6', mo.x, -mo.h, mo.w, 1);
      }
      // regalos
      for (const g of regalos) regalo(ctx, g.x, g.y - Math.round(Math.abs(Math.sin(g.t * 3)) * 2), g.color);
      // sombras de las piedras que van a caer y las piedras
      for (const p of piedras) {
        const sy = alturaSuelo(p.x);
        if (p.aviso > 0 || p.y < sy - 4) {
          const w = Math.round((p.r + 2) * (p.aviso > 0 ? 1 - p.aviso / 1.8 : 1)) * 2;
          Sprites.tramar(ctx, Math.round(p.x - w / 2), sy - 1, w, 2, C.tinta, () => (p.aviso > 0 ? 0.6 : 0.9));
        }
        if (p.aviso <= 0) {                                                  // piedra redondeada con luz arriba a la izquierda
          const px = Math.round(p.x), py = Math.round(p.y - p.r);
          ctx.fillStyle = '#4a4e60'; Sprites.disco(ctx, px, py, p.r);
          ctx.fillStyle = '#6a6f84'; Sprites.disco(ctx, px - 1, py - 1, p.r - 1);
          r(ctx, '#9aa0b0', px - p.r + 2, py - p.r + 2, 2, 2);
        }
      }
      // cascotes y polvo
      for (const c of cascotes) r(ctx, c.c, c.x, c.y - c.w, c.w, c.w);
      for (const p of polvo) Sprites.tramar(ctx, Math.round(p.x - p.r), Math.round(p.y - p.r), Math.round(p.r * 2), Math.round(p.r * 2), '#b4a8a0',
        (x, y) => (1 - Math.hypot(x - p.x, y - p.y) / p.r) * Math.min(1, p.vida));
      // la chica (parpadea tras un golpe)
      if (golpeado <= 0 || Math.floor(api.t * 12) % 2)
        Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y), jug.dir, !jug.enSuelo ? 'subir' : jug.andando ? 'andar' : 'idle', api.t);
      ctx.restore();

      // textos y marcadores
      const e = api.textoEscala;
      if (aviso) {
        const em = Comun.medir(aviso.texto, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, aviso.texto, Math.floor(api.ancho / 2), Math.floor(api.alto * 0.22), aviso.color, { escala: em, centro: true, sombra: C.tinta });
      }
      if (fase === 'jugar') {
        const altoCaja = Comun.altoTexto(e) + 8, t1 = `REGALOS ${recogidos}/${META}`;
        Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
        texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
        const anchoBarra = 50, anchoNum = Comun.medir('60', e), w2 = anchoBarra + anchoNum + 12;
        let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
        if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + altoCaja + 6; }
        Comun.caja(ctx, x2, y2, w2, altoCaja);
        ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, altoCaja - 8);
        ctx.fillStyle = quedan < 15 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * quedan / TIEMPO), altoCaja - 8);
        texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 15 ? C.rojoClaro : C.nieve, { escala: e });
      }
    }

    // Solo en modo debug: estado, y llevar a la chica a un sitio (para las pruebas automáticas)
    if (Dias.debug) window.rescateDebug = {
      estado: () => ({ fase, recogidos, quedan, jug: { x: jug.x, y: jug.y }, regalos: regalos.map((g) => ({ x: g.x, y: g.y })), piedras: piedras.length }),
      llevar: (x, y) => { jug.x = x; jug.y = y; jug.vy = 0; }
    };

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: '¡SALVA LA NAVIDAD!',
      instruccion: 'ALGO VA MAL EN EL EDIFICIO... RECOGE LOS 10 REGALOS ENTRE LAS RUINAS: ← → PARA CORRER, ↑ O ESPACIO PARA SALTAR. ¡CUIDADO CON LAS PIEDRAS! VERAS SU SOMBRA ANTES DE QUE CAIGAN.',
      pantallaCompleta: true,
      musica: 'heraldo',
      reiniciar, actualizar, dibujar
    });
  }
};
