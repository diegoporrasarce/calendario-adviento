'use strict';
/* Día 12 — ¡Salva la Navidad! (el terremoto).
   1. Derrumbe: el mismo edificio de la pantalla principal (con sus puertas) tiembla, se agrieta y se viene
      abajo trozo a trozo, del tejado a la planta baja, entre cascotes y polvo.
   2. Saltos (tipo Doodle Jump): la chica rebota sola sobre trozos del edificio que flotan entre el polvo;
      se dirige con ← → (o tocando a un lado). Hay que subir recogiendo 10 regalos. Con la altura aparecen
      escombros que se desmoronan tras un salto y otros que se mueven. Caer por abajo = reintentar
      (sin volver a ver el derrumbe).
   3. Al coger el último regalo, el edificio se vuelve a levantar y se ve como siempre. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia12-terremoto'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 10;
    const VEL = 130, REBOTE = 345, GRAVEDAD = 620;
    const B_ANCHO = Edificio.ANCHO, B_ALTO = Edificio.MUNDO_ALTO;
    const SUELO_B = Edificio.sueloY(0);                                   // suelo de la calle en la imagen del edificio
    const ALTO_PLANTA = Edificio.sueloY(0) - Edificio.sueloY(1);
    const TECHO_B = Edificio.CIELO - 22;                                  // lo más alto (chimenea con nieve)
    const T_TEMBLOR = 1.6, T_ENTRE_TROZOS = 0.42, T_RECONSTRUIR = 2.6;

    /* ---------- Foto del edificio tal y como está en la pantalla principal (con sus puertas) ---------- */
    let foto = null;
    function fotoEdificio() {
      if (foto) return foto;
      const [cv, g] = Sprites.lienzoAux(B_ANCHO, B_ALTO);
      g.drawImage(Edificio.imagenFondo(), 0, 0);
      for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarHalo(g, n, Dias.estado(n), 0, 0);
      for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarPuerta(g, n, Dias.estado(n), 0, 0);
      return (foto = cv);
    }

    // Trozos en que se rompe: el tejado y cada planta, de arriba abajo, partidos en columnas de 40 px
    const FRANJAS = [];
    {
      const yTop = Edificio.sueloY(Edificio.PLANTAS - 1) - ALTO_PLANTA;
      FRANJAS.push({ y0: TECHO_B, y1: yTop });
      for (let p = Edificio.PLANTAS - 1; p >= 0; p--) FRANJAS.push({ y0: Edificio.sueloY(p) - ALTO_PLANTA, y1: Edificio.sueloY(p) });
    }
    const T_DERRUMBE = T_TEMBLOR + FRANJAS.length * T_ENTRE_TROZOS + 1.4;

    let derrumbeVisto = false;           // al reintentar ya no se repite la animación
    let fase, t, trozos, cascotes, polvo, montonB, jug, plataformas, regalos, recogidos, camara, aviso, alturaMax, ultimaFranja;

    function reiniciar(api) {
      t = 0; trozos = []; cascotes = []; polvo = []; aviso = null; ultimaFranja = -1;
      montonB = new Array(B_ANCHO).fill(0);                               // altura del montón de escombros (vista del derrumbe)
      fase = derrumbeVisto ? 'saltar' : 'derrumbe';
      if (fase === 'saltar') empezarSaltos(api);
    }

    /* ---------- Saltos: un mapa único (siempre el mismo) dentro de una columna de COL px ---------- */
    const COL = 240;                     // ancho de la columna por la que se sube (con paredes de escombros a los lados)
    const DY_MIN = 34, DY_MAX = 52;      // separación vertical entre plataformas (el salto llega a unos 96 px)
    const DX_MAX = 70;                   // separación horizontal máxima (se recorre de sobra durante un salto)
    // generador pseudoaleatorio con semilla fija: el mapa sale idéntico en cada partida
    function azarFijo(semilla) {
      let a = semilla >>> 0;
      return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    // El mapa se genera hacia arriba según hace falta, siempre con la misma semilla (sale idéntico cada vez)
    let azarMapa, genX, genY, genN;
    function extenderMapa(hastaY) {
      while (genY > hastaY) {
        const w = 40 + Math.floor(azarMapa() * 10);
        genY -= DY_MIN + Math.floor(azarMapa() * (DY_MAX - DY_MIN + 1));
        genX = Math.max(w / 2 + 2, Math.min(COL - w / 2 - 2, genX + (azarMapa() * 2 - 1) * DX_MAX));
        // camino principal: siempre se puede pisar; más arriba, alguna se balancea despacio y poco
        const movil = -genY > 700 && genN % 4 === 3;
        plataformas.push({ base: genX - w / 2, x: genX - w / 2, y: genY, w, tipo: movil ? 'movil' : 'normal', fase: azarMapa() * 6,
                           sx: 40 + Math.floor(azarMapa() * (B_ANCHO - 120)), sy: 130 + Math.floor(azarMapa() * 230), roto: false, vy: 0 });
        // de vez en cuando, un escombro extra que se desmorona (no hace falta pisarlo)
        if (-genY > 300 && genN % 5 === 2) {
          const xe = genX > COL / 2 ? genX - 90 : genX + 90;
          const sx = 40 + Math.floor(azarMapa() * (B_ANCHO - 120)), sy = 130 + Math.floor(azarMapa() * 230);
          if (xe > 24 && xe < COL - 24) plataformas.push({ base: xe - 18, x: xe - 18, y: genY - 16, w: 36, tipo: 'fragil', fase: 0, sx, sy, roto: false, vy: 0 });
        }
        genN++;
      }
    }

    // Si un regalo se queda por debajo de la pantalla sin cogerlo, se "escapa" a una plataforma fija más arriba
    function recolocarRegalos(arriba, abajo) {
      for (const g of regalos) {
        if (g.p.y <= abajo) continue;
        const libre = plataformas.find((p) => p.tipo === 'normal' && p.y < arriba - 20 && !regalos.some((o) => o.p === p));
        if (libre) { g.p = libre; g.dx = libre.w / 2; }
      }
    }

    function empezarSaltos(api) {
      jug = { x: COL / 2, y: -1, vy: -REBOTE, dir: 1 };
      plataformas = []; azarMapa = azarFijo(1212); genX = COL / 2; genY = 0; genN = 0;
      extenderMapa(-(160 + (META - 1) * 170 + 200));
      regalos = []; recogidos = 0; camara = null; alturaMax = 0; reloj = 0; pisada = -1;
      // un regalo cada ~170 px de subida, sobre una plataforma fija del camino principal
      const fijas = plataformas.filter((p) => p.tipo === 'normal');
      for (let k = 0; k < META; k++) {
        const ya = -(160 + k * 170);
        let mejor = fijas[0], d = Infinity;
        for (const p of fijas) if (Math.abs(p.y - ya) < d && !regalos.some((g) => g.p === p)) { d = Math.abs(p.y - ya); mejor = p; }
        regalos.push({ p: mejor, dx: mejor.w / 2, color: [C.rojo, C.verde, '#4a7ad8', C.lila][k % 4], t: k });
      }
      decir('¡SALTA POR LOS ESCOMBROS Y RECOGE LOS REGALOS!', C.oroClaro, 2.4);
    }
    let reloj = 0, pisada = -1;

    const escala = (api) => (api.alto >= 440 ? 2 : 1);
    function decir(txt, color, vida = 1.4) { aviso = { texto: txt, color: color || C.oroClaro, vida }; }

    function actualizar(dt, api) {
      t += dt;
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      for (let i = polvo.length - 1; i >= 0; i--) { const p = polvo[i]; p.vida -= dt; p.r += 12 * dt; p.y -= 8 * dt; if (p.vida <= 0) polvo.splice(i, 1); }
      for (let i = cascotes.length - 1; i >= 0; i--) {
        const c = cascotes[i];
        c.vy += GRAVEDAD * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.suelo !== undefined && c.y > c.suelo) { c.y = c.suelo; c.vy *= -0.2; c.vx *= 0.5; }
        c.vida -= dt; if (c.vida <= 0) cascotes.splice(i, 1);
      }
      if (fase === 'derrumbe') return actualizarDerrumbe(dt, api);
      if (fase === 'reconstruir') { if (t >= T_RECONSTRUIR + 0.8) api.ganar(); return; }
      actualizarSaltos(dt, api);
    }

    function actualizarDerrumbe(dt, api) {
      api.entrada.pulsado('accion'); api.entrada.pulsado('toque'); api.entrada.pulsado('arriba');
      if (t < T_TEMBLOR) {
        api.sacudir(0.12 + t * 0.08);
        if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) Sonido.efecto('golpe');
        return;
      }
      // cada franja se suelta a su tiempo, partida en trozos que caen
      const k = Math.floor((t - T_TEMBLOR) / T_ENTRE_TROZOS);
      if (k < FRANJAS.length && k > ultimaFranja) {
        ultimaFranja = k;
        const f = FRANJAS[k];
        Sonido.efecto('derrumbe'); api.sacudir(0.4);
        for (let x = 0; x < B_ANCHO; x += 40)
          trozos.push({ sx: x, sy: f.y0, w: 40, h: f.y1 - f.y0, x, y: f.y0, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, retraso: Math.random() * 0.15 });
      }
      for (let i = trozos.length - 1; i >= 0; i--) {
        const tr = trozos[i];
        if (tr.retraso > 0) { tr.retraso -= dt; continue; }
        tr.vy += GRAVEDAD * dt; tr.x += tr.vx * dt; tr.y += tr.vy * dt;
        const col = Math.max(0, Math.min(B_ANCHO - 1, Math.round(tr.x + tr.w / 2)));
        if (tr.y + tr.h >= SUELO_B - montonB[col]) {                         // choca con el suelo o con el montón: se rompe
          trozos.splice(i, 1);
          const cx = tr.x + tr.w / 2;
          for (let k2 = 0; k2 < 10; k2++)
            cascotes.push({ x: tr.x + Math.random() * tr.w, y: SUELO_B - montonB[col] - 4, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 120,
                            vida: 1.2 + Math.random(), w: 2 + Math.floor(Math.random() * 4), c: Math.random() < 0.6 ? '#a2432f' : '#8c857b', suelo: SUELO_B - 2 });
          for (let k2 = 0; k2 < 3; k2++) polvo.push({ x: cx + (Math.random() - 0.5) * 30, y: SUELO_B - montonB[col] - 6, r: 6 + Math.random() * 8, vida: 1.4 });
          for (let x = Math.floor(tr.x) - 6; x < tr.x + tr.w + 6; x++) if (x >= 0 && x < B_ANCHO) montonB[x] = Math.min(70, montonB[x] + 3 + Math.random() * 2);
        }
      }
      if (t >= T_DERRUMBE) { derrumbeVisto = true; fase = 'saltar'; t = 0; empezarSaltos(api); }
    }

    function actualizarSaltos(dt, api) {
      const K = escala(api), W = Math.floor(api.ancho / K), H = Math.floor(api.alto / K);
      const e = api.entrada;
      e.pulsado('accion'); e.pulsado('arriba');
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!dx && e.puntero.abajo) dx = e.puntero.x / K < W / 2 ? -1 : 1;    // tocar a un lado de la pantalla
      e.pulsado('toque');
      if (dx) jug.dir = dx;
      jug.x += dx * VEL * dt;
      if (jug.x < -6) jug.x += COL + 12; else if (jug.x > COL + 6) jug.x -= COL + 12;   // sale por un lado de la columna y entra por el otro

      reloj += dt;
      for (const p of plataformas) {
        if (p.tipo === 'movil') p.x = p.base + Math.sin(reloj * 0.8 + p.fase) * 22;   // se balancea despacio y poco
        if (p.roto) { p.vy += GRAVEDAD * dt; p.y += p.vy * dt; }
      }
      const antes = jug.y;
      jug.vy += GRAVEDAD * dt; jug.y += jug.vy * dt;
      if (jug.vy > 0) {                                                     // cayendo: rebota en la plataforma que pisa
        const suelo = jug.y >= 0 && antes <= 0 && camara !== null && camara + H > 0;   // el montón de ruinas hace de suelo mientras se ve
        const p = plataformas.find((q) => !q.roto && antes <= q.y && jug.y >= q.y && jug.x > q.x - 5 && jug.x < q.x + q.w + 5);
        if (p || suelo) {
          jug.y = p ? p.y : 0; jug.vy = -REBOTE; Sonido.efecto('saltar');
          pisada = p ? plataformas.indexOf(p) : -1;
          if (p && p.tipo === 'fragil') { p.roto = true; Sonido.efecto('golpe'); for (let k = 0; k < 6; k++) cascotes.push({ x: p.x + Math.random() * p.w, y: p.y, vx: (Math.random() - 0.5) * 60, vy: -20, vida: 0.8, w: 3, c: '#a2432f' }); }
        }
      }
      alturaMax = Math.max(alturaMax, -jug.y);

      // regalos
      for (let i = regalos.length - 1; i >= 0; i--) {
        const g = regalos[i];
        g.t += dt;
        const gx = g.p.x + g.dx, gy = g.p.y - 4;
        if (Math.abs(gx - jug.x) < 11 && jug.y > gy - 14 && jug.y < gy + 26) {
          regalos.splice(i, 1);
          recogidos++;
          Sonido.efecto('coger');
          api.aviso(`${recogidos}/${META}`, Math.round((gx + Math.floor((W - COL) / 2)) * K), Math.round((gy - camara - 16) * K), C.oroClaro);
          if (recogidos >= META) { fase = 'reconstruir'; t = 0; Sonido.efecto('completar'); decir('¡LA NAVIDAD SIGUE EN PIE!', C.oroClaro, 4); return; }
        }
      }

      extenderMapa(camara - 2 * H);
      recolocarRegalos(camara, camara + H + 10);
      // cámara: sigue a la chica hacia arriba (nunca baja); caer por debajo de la pantalla es perder
      const objetivo = Math.min(-H + 40, jug.y - H * 0.55);
      camara = camara === null ? objetivo : Math.min(camara, camara + (objetivo - camara) * Math.min(1, dt * 8));
      if (jug.y - camara > H + 30) api.perder('¡TE HAS CAIDO! VUELVE A INTENTARLO');
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    function regalo(ctx, x, y, color) {
      r(ctx, color, x - 5, y - 9, 10, 9); r(ctx, C.oro, x - 1, y - 9, 2, 9); r(ctx, C.oro, x - 5, y - 6, 10, 2);
      r(ctx, C.oro, x - 4, y - 12, 3, 3); r(ctx, C.oro, x + 1, y - 12, 3, 3);
    }

    // Vista del edificio (derrumbe y reconstrucción): la imagen de la pantalla principal centrada,
    // con la cámara vertical `cam` (en coordenadas de la imagen) y el suelo nevado de lado a lado
    function vistaEdificio(ctx, api, cam, dibujarDentro) {
      const K = escala(api), W = Math.floor(api.ancho / K), H = Math.floor(api.alto / K), ox = Math.floor((W - B_ANCHO) / 2);
      ctx.save(); ctx.scale(K, K);
      const yg = SUELO_B - cam;
      r(ctx, '#f4f8ff', 0, yg, W, 1); r(ctx, '#dbe5f5', 0, yg + 1, W, H);
      ctx.translate(ox, -cam);
      dibujarDentro(ctx);
      ctx.restore();
      return { K, W, H, ox };
    }

    function camaraEdificio(api, frac) {                                    // frac 0 = mirando el tejado, 1 = mirando la calle
      const H = Math.floor(api.alto / escala(api));
      const arriba = TECHO_B - 30, abajo = B_ALTO - H;
      if (abajo <= arriba) return abajo;                                    // cabe entero
      return Math.round(arriba + (abajo - arriba) * Math.max(0, Math.min(1, frac)));
    }

    function dibujarMonton(ctx) {
      for (let x = 0; x < B_ANCHO; x += 3) {
        const h = Math.round(montonB[x]);
        if (h <= 0) continue;
        r(ctx, '#3a2622', x, SUELO_B - h, 3, h);
        if ((x * 7) % 5 < 2) r(ctx, '#a2432f', x, SUELO_B - h, 3, 2); else if ((x * 3) % 7 < 2) r(ctx, '#8c857b', x, SUELO_B - h, 3, 2);
      }
    }

    function dibujarParticulas(ctx) {
      for (const c of cascotes) r(ctx, c.c, c.x, c.y - c.w, c.w, c.w);
      for (const p of polvo) Sprites.tramar(ctx, Math.round(p.x - p.r), Math.round(p.y - p.r), Math.round(p.r * 2), Math.round(p.r * 2), '#b4a8a0',
        (x, y) => (1 - Math.hypot(x - p.x, y - p.y) / p.r) * Math.min(1, p.vida));
    }

    function dibujar(ctx, api) {
      Comun.fondoNoche(ctx, api.t, api.alto, api.ancho);
      const img = fotoEdificio();
      const e = api.textoEscala;

      if (fase === 'derrumbe') {
        // la cámara mira el tejado mientras tiembla y baja con los trozos que caen
        const avance = t < T_TEMBLOR ? 0 : (t - T_TEMBLOR) / (FRANJAS.length * T_ENTRE_TROZOS + 0.6);
        vistaEdificio(ctx, api, camaraEdificio(api, avance), (g) => {
          const enPie = ultimaFranja + 1 < FRANJAS.length ? FRANJAS[ultimaFranja + 1].y0 : SUELO_B;   // lo que sigue en pie
          g.drawImage(img, 0, enPie, B_ANCHO, B_ALTO - enPie, 0, enPie, B_ANCHO, B_ALTO - enPie);
          if (t < T_TEMBLOR * 1.5) {                                        // grietas que crecen
            g.fillStyle = C.tinta;
            for (let k = 0; k < 7; k++) {
              let gx = 50 + k * 32, gy = TECHO_B + 30 + (k * 23) % 60;
              for (let s = 0; s < Math.floor(Math.min(1, t / T_TEMBLOR) * 30); s++) { g.fillRect(gx, gy, 1, 2); gx += ((k + s) % 3) - 1; gy += 2; }
            }
          }
          for (const tr of trozos) g.drawImage(img, tr.sx, tr.sy, tr.w, tr.h, Math.round(tr.x), Math.round(tr.y), tr.w, tr.h);
          dibujarMonton(g);
          dibujarParticulas(g);
        });
      } else if (fase === 'reconstruir') {
        // el edificio vuelve a levantarse desde el suelo (y la cámara sube con él)
        const f = Math.min(1, t / T_RECONSTRUIR), alto = Math.round((B_ALTO - TECHO_B) * f);
        vistaEdificio(ctx, api, camaraEdificio(api, 1 - f), (g) => {
          g.drawImage(img, 0, B_ALTO - alto, B_ANCHO, alto, 0, B_ALTO - alto, B_ANCHO, alto);
          if (f < 1) for (let x = 0; x < B_ANCHO; x += 6) r(g, (x / 6) % 2 ? C.oroClaro : C.blanco, x + (Math.floor(api.t * 20) % 3), B_ALTO - alto - 1, 2, 1);
          else for (let k = 0; k < 14; k++) if ((Math.floor(api.t * 6) + k) % 3 === 0) r(g, C.oroClaro, (k * 47) % B_ANCHO, TECHO_B - 10 - (k * 13) % 30, 2, 2);
        });
      } else {
        dibujarSaltos(ctx, api);
      }

      if (aviso) {                                                         // en varias líneas si no cabe
        const em = Comun.medir(aviso.texto, e + 1) <= api.ancho - 12 ? e + 1 : e;
        Comun.envolver(aviso.texto, api.ancho - 16, em).forEach((l, i) =>
          texto(ctx, l, Math.floor(api.ancho / 2), Math.floor(api.alto * 0.2) + i * (Comun.altoTexto(em) + 3 * em), aviso.color, { escala: em, centro: true, sombra: C.tinta }));
      }
      if (fase === 'saltar') {
        const altoCaja = Comun.altoTexto(e) + 8, t1 = `REGALOS ${recogidos}/${META}`, t2 = `ALTURA ${Math.floor(alturaMax / 10)} M`;
        Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
        texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
        const w2 = Comun.medir(t2, e) + 8;
        let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((api.ancho - w2) / 2)), y2 = 6;
        if (x2 + w2 > api.ancho - api.margenDerecho) { x2 = 6; y2 = 6 + altoCaja + 6; }
        Comun.caja(ctx, x2, y2, w2, altoCaja);
        texto(ctx, t2, x2 + 4, y2 + 4, C.nieve, { escala: e });
      }
    }

    function dibujarSaltos(ctx, api) {
      const K = escala(api), W = Math.floor(api.ancho / K), H = Math.floor(api.alto / K), img = fotoEdificio();
      const cam = camara === null ? -H + 40 : camara;
      ctx.save(); ctx.scale(K, K); ctx.translate(0, -cam);
      // polvo en el aire (lejos)
      for (let k = 0; k < 30; k++) {
        const y = Math.floor(cam + ((k * 97 + Math.floor(-cam * 0.5)) % (H + 40)));
        if ((k + Math.floor(api.t * 2)) % 4) r(ctx, '#5a5070', (k * 53) % W, y, 1, 1);
      }
      // el montón de ruinas abajo, de donde se sale
      if (cam > -H - 80) {
        r(ctx, '#3a2622', 0, 0, W, 60);
        for (let x = 0; x < W; x += 5) r(ctx, (x * 7) % 3 ? '#8c857b' : '#a2432f', x, -3 - ((x * 13) % 7), 6, 5 + ((x * 13) % 7));
      }
      // paredes de escombros a los lados de la columna (marcan por dónde se sube)
      const ox = Math.floor((W - COL) / 2);
      for (const [x0, x1] of [[0, ox - 4], [ox + COL + 4, W]]) {
        if (x1 <= x0) continue;
        r(ctx, '#24181c', x0, cam, x1 - x0, Math.min(H + 2, -cam));
        for (let y = Math.floor(cam / 12) * 12; y < Math.min(0, cam + H); y += 12)
          for (let x = x0 + ((y / 12) % 2) * 6; x < x1; x += 14) r(ctx, ((x + y) / 2) % 3 ? '#3a2622' : '#5e2620', x, y, 11, 8);
        r(ctx, '#8c857b', x0 === 0 ? x1 - 2 : x0, cam, 2, Math.min(H + 2, -cam));
      }
      ctx.translate(ox, 0);
      // plataformas: trozos del edificio
      for (const p of plataformas) {
        if (p.y < cam - 20 || p.y > cam + H + 20) continue;
        ctx.drawImage(img, p.sx, p.sy, Math.round(p.w), 8, Math.round(p.x), Math.round(p.y), Math.round(p.w), 8);
        r(ctx, '#2b1a14', p.x, p.y + 8, p.w, 2);
        r(ctx, p.tipo === 'movil' ? '#8ab0ff' : '#cfc8bd', p.x, p.y, p.w, 1);
        if (p.tipo === 'fragil') { ctx.fillStyle = C.tinta; for (let k = 4; k < p.w - 2; k += 7) { ctx.fillRect(Math.round(p.x + k), Math.round(p.y + 1), 1, 3); ctx.fillRect(Math.round(p.x + k + 1), Math.round(p.y + 4), 1, 3); } }
      }
      for (const g of regalos) regalo(ctx, g.p.x + g.dx, g.p.y - Math.round(Math.abs(Math.sin(g.t * 3)) * 2), g.color);
      dibujarParticulas(ctx);
      Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y), jug.dir, jug.vy < 0 ? 'subir' : 'idle', api.t);
      ctx.restore();
    }

    // Solo en modo debug: estado y atajos para las pruebas automáticas
    if (Dias.debug) window.rescateDebug = {
      estado: () => ({ fase, recogidos, alturaMax: Math.round(alturaMax), camara, pisada, vy: jug ? jug.vy : 0,
                       plataformas: plataformas ? plataformas.map((p) => ({ x: p.x, y: p.y, w: p.w, tipo: p.tipo })) : [], jug: jug ? { x: Math.round(jug.x), y: Math.round(jug.y) } : null,
                       regalos: regalos ? regalos.map((g) => ({ x: g.p.x + g.dx, y: g.p.y })) : [] }),
      llevar: (x, y) => { jug.x = x; jug.y = y; jug.vy = -REBOTE; }
    };

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: '¡SALVA LA NAVIDAD!',
      instruccion: 'ALGO VA MAL EN EL EDIFICIO... CUANDO PUEDAS, SALTA POR LOS ESCOMBROS Y RECOGE LOS 10 REGALOS. LA CHICA REBOTA SOLA: DIRIGELA CON ← → O TOCANDO A UN LADO. ¡NO TE CAIGAS!',
      pantallaCompleta: true,
      musica: 'heraldo',
      reiniciar, actualizar, dibujar
    });
  }
};
