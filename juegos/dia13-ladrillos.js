'use strict';
/* Día 13 — Apila ladrillos (tipo Stack).
   Un bloque de ladrillo va y viene sobre el muro: al pulsar (Espacio, ↑ o tocar) se suelta. Lo que sobresale
   del bloque de abajo se corta y cae; el siguiente bloque es tan ancho como lo que quedó. Si se suelta casi
   exacto es ¡PERFECTO! y conserva el ancho. Si no toca el muro, se cae y hay que reintentar.
   12 bloques para terminar el muro; cada vez se mueven más deprisa. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia13-ladrillos'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 12, ALTO = 10, ANCHO_INICIAL = 110, PERFECTO = 3;
    const ZONA = 230;                    // ancho de la zona de obra (el bloque va y viene dentro)

    let muro, bloque, trozos, polvo, aviso, terminado, racha, camara;

    function reiniciar() {
      // el primer bloque es la base, ya colocada en el suelo
      muro = [{ x: (ZONA - ANCHO_INICIAL) / 2, w: ANCHO_INICIAL }];
      trozos = []; polvo = []; aviso = null; terminado = 0; racha = 0; camara = null;
      nuevoBloque();
    }

    function nuevoBloque() {
      const arriba = muro[muro.length - 1], n = muro.length;
      const desdeIzq = n % 2 === 1;
      bloque = { x: desdeIzq ? -arriba.w : ZONA, w: arriba.w, dir: desdeIzq ? 1 : -1, vel: 62 + n * 9, cayendo: false, y: 0, vy: 0 };
    }

    function decir(t, color) { aviso = { texto: t, color, vida: 1 }; }

    function soltar(api) {
      const abajo = muro[muro.length - 1];
      let x = bloque.x, w = bloque.w;
      if (Math.abs(x - abajo.x) <= PERFECTO) {                              // casi exacto: encaja entero
        x = abajo.x; racha++;
        Sonido.efecto('pareja');
        decir(racha > 1 ? `¡PERFECTO! X${racha}` : '¡PERFECTO!', C.oroClaro);
      } else {
        const izq = Math.max(x, abajo.x), der = Math.min(x + w, abajo.x + abajo.w);
        if (der - izq <= 0) {                                               // no toca el muro: se cae entero
          trozos.push({ x, w, y: -muro.length * ALTO, vy: 0 });
          Sonido.efecto('golpe');
          api.perder('¡SE HA CAIDO EL LADRILLO! SUELTALO ENCIMA DEL MURO');
          bloque = null;
          return;
        }
        // lo que sobresale se corta y cae
        if (x < izq) trozos.push({ x, w: izq - x, y: -muro.length * ALTO, vy: 0 });
        if (x + w > der) trozos.push({ x: der, w: x + w - der, y: -muro.length * ALTO, vy: 0 });
        x = izq; w = der - izq; racha = 0;
        Sonido.efecto('carta');
      }
      muro.push({ x, w });
      for (let k = 0; k < 5; k++) polvo.push({ x: x + Math.random() * w, y: -muro.length * ALTO + ALTO, vx: (Math.random() - 0.5) * 30, vida: 0.5 });
      if (muro.length - 1 >= META) {
        terminado = 0.001; bloque = null;
        Sonido.efecto('completar');
        decir('¡MURO TERMINADO!', C.oroClaro);
        return;
      }
      nuevoBloque();
    }

    function actualizar(dt, api) {
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      for (let i = trozos.length - 1; i >= 0; i--) { const t = trozos[i]; t.vy += 500 * dt; t.y += t.vy * dt; if (t.y > 300) trozos.splice(i, 1); }
      for (let i = polvo.length - 1; i >= 0; i--) { const p = polvo[i]; p.vida -= dt; p.x += p.vx * dt; p.y -= 10 * dt; if (p.vida <= 0) polvo.splice(i, 1); }
      if (terminado > 0) { terminado += dt; if (terminado > 1.6) api.ganar(); return; }
      if (!bloque) return;

      // el bloque va y viene (un poco más allá del muro por cada lado)
      bloque.x += bloque.dir * bloque.vel * dt;
      if (bloque.x > ZONA - bloque.w / 2) { bloque.x = ZONA - bloque.w / 2; bloque.dir = -1; }
      if (bloque.x < -bloque.w / 2) { bloque.x = -bloque.w / 2; bloque.dir = 1; }
      const e = api.entrada;
      const pulsa = e.pulsado('accion') | e.pulsado('arriba');
      e.pulsado('toque');
      if (pulsa) soltar(api);
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), h); };

    // Bloque de ladrillos: hiladas con llagas desplazadas, luz arriba y sombra abajo
    function ladrillos(ctx, x, y, w, fila) {
      if (w <= 0) return;
      r(ctx, '#5e2620', x, y, w, ALTO);
      for (let h = 0; h < 2; h++) {
        const yy = y + h * 5, des = ((fila + h) % 2) * 6;
        for (let bx = x - des; bx < x + w; bx += 12) {
          const x0 = Math.max(bx, x), x1 = Math.min(bx + 11, x + w);
          if (x1 <= x0) continue;
          r(ctx, (Math.floor(bx / 12) + fila + h) % 3 ? '#a2432f' : '#b9573f', x0, yy, x1 - x0, 4);
          r(ctx, '#c46048', x0, yy, x1 - x0, 1);
        }
      }
      r(ctx, '#3a1612', x, y + ALTO - 1, w, 1);
    }

    function dibujar(ctx, api) {
      const K = api.alto >= 440 && api.ancho / 2 >= ZONA + 90 ? 2 : 1, W = Math.floor(api.ancho / K), H = Math.floor(api.alto / K);   // al doble solo si cabe la obra
      Comun.fondoNoche(ctx, api.t, api.alto, api.ancho);
      ctx.save(); ctx.scale(K, K);
      const suelo = H - 20, ox = Math.floor((W - ZONA) / 2);
      // cámara: la parte alta del muro, hacia el 45 % de la pantalla
      const alturaMuro = muro.length * ALTO;
      const objetivo = Math.max(0, alturaMuro - Math.floor(H * 0.55));
      camara = camara === null ? objetivo : camara + (objetivo - camara) * 0.12;
      ctx.translate(0, Math.round(camara));
      // ruinas de fondo y calle
      r(ctx, '#2a1c2a', 0, suelo - 46, W, 46);
      for (let x = 0; x < W; x += 9) r(ctx, (x * 7) % 3 ? '#3a2a3a' : '#4a2c30', x, suelo - 46 - ((x * 13) % 14), 10, 14);
      r(ctx, '#3a3f58', 0, suelo, W, 40); r(ctx, '#5a6278', 0, suelo, W, 2);
      // andamio a los lados de la obra
      for (const ax of [ox - 14, ox + ZONA + 10]) {
        r(ctx, '#8a92b0', ax, suelo - Math.max(140, alturaMuro + 40), 2, Math.max(140, alturaMuro + 40));
        r(ctx, '#8a92b0', ax + 6, suelo - Math.max(140, alturaMuro + 40), 2, Math.max(140, alturaMuro + 40));
        for (let y = suelo - 8; y > suelo - Math.max(140, alturaMuro + 40); y -= 20) r(ctx, '#6a7190', ax, y, 8, 2);
      }
      ctx.translate(ox, suelo);
      // el muro y la línea de meta
      muro.forEach((b, i) => ladrillos(ctx, b.x, -(i + 1) * ALTO, b.w, i));
      r(ctx, C.oro, -10, -(META + 1) * ALTO - 2, ZONA + 20, 1);
      texto(ctx, 'META', ZONA + 4, -(META + 1) * ALTO - 10, C.oro);
      // bloque que se mueve y trozos que caen
      if (bloque) ladrillos(ctx, bloque.x, -(muro.length + 1) * ALTO, bloque.w, muro.length);
      for (const t of trozos) ladrillos(ctx, t.x, t.y - ALTO, t.w, 0);
      ctx.fillStyle = '#b4a8a0';
      for (const p of polvo) ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      // la chica mira la obra desde un lado
      Sprites.personaje(ctx, -34, 0, 1, terminado > 0 && Math.floor(api.t * 6) % 2 ? 'andar' : 'idle', api.t);
      ctx.restore();

      const e = api.textoEscala;
      if (aviso) {
        const em = Comun.medir(aviso.texto, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, aviso.texto, Math.floor(api.ancho / 2), Math.floor(api.alto * 0.2), aviso.color, { escala: em, centro: true, sombra: C.tinta });
      }
      const altoCaja = Comun.altoTexto(e) + 8, t1 = `LADRILLOS ${Math.min(META, muro.length - 1)}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: el bloque que se mueve y el de arriba del muro, para las pruebas automáticas
    if (Dias.debug) window.ladrillosDebug = () => ({
      puestos: muro.length - 1, bloque: bloque ? { x: bloque.x, w: bloque.w } : null, arriba: muro[muro.length - 1], terminado: terminado > 0
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'APILA LADRILLOS',
      instruccion: 'EL BLOQUE VA Y VIENE: PULSA ESPACIO O TOCA PARA SOLTARLO ENCIMA DEL MURO. LO QUE SOBRESALGA SE CORTA. ¡LEVANTA 12 HILADAS!',
      pantallaCompleta: true,
      musica: 'fieles',
      reiniciar, actualizar, dibujar
    });
  }
};
