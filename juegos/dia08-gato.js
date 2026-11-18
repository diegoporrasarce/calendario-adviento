'use strict';
/* Día 8 — El gato del vecino.
   En la fachada hay 10 escondites (cortinas, macetas y cajas de la mudanza). Al tocar uno se mira dentro:
   o está el gato, o no hay nada (o sale otra cosa). Pistas: de vez en cuando asoma la cola, y al fallar
   se dice si se está FRÍO, TEMPLADO o ¡CALIENTE!. Tras 3 fallos el gato cambia de escondite.
   Hay que encontrarlo 3 veces. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia08-gato'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 3, FALLOS_PARA_MOVERSE = 3;
    // escondites en una escena de 320x220 (x, y = esquina; w, h = tamaño)
    const ESCONDITES = [
      { tipo: 'cortina', x: 26, y: 22, w: 40, h: 40 }, { tipo: 'cortina', x: 140, y: 22, w: 40, h: 40 },
      { tipo: 'cortina', x: 254, y: 22, w: 40, h: 40 }, { tipo: 'cortina', x: 26, y: 92, w: 40, h: 40 },
      { tipo: 'maceta', x: 128, y: 108, w: 26, h: 30 }, { tipo: 'maceta', x: 166, y: 108, w: 26, h: 30 },
      { tipo: 'maceta', x: 262, y: 110, w: 26, h: 28 },
      { tipo: 'caja', x: 14, y: 176, w: 36, h: 30 }, { tipo: 'caja', x: 102, y: 180, w: 30, h: 26 },
      { tipo: 'caja', x: 250, y: 174, w: 40, h: 32 }
    ];
    const centro = (i) => ({ x: ESCONDITES[i].x + ESCONDITES[i].w / 2, y: ESCONDITES[i].y + ESCONDITES[i].h / 2 });

    let gato, encontrados, fallos, mirando, cursor, usaTeclado, pista, proximaCola, cola, ganada, saltando;

    function moverGato(evitar) {
      let n;
      do n = Math.floor(Math.random() * ESCONDITES.length); while (n === gato || n === evitar);
      gato = n;
    }

    function reiniciar() {
      gato = -1; moverGato(-1);
      encontrados = 0; fallos = 0; cursor = 0; usaTeclado = false; pista = null; ganada = 0; saltando = null;
      mirando = ESCONDITES.map(() => ({ t: 0, contenido: null }));     // animación de "mirar dentro"
      proximaCola = 3 + Math.random() * 3; cola = 0;
    }

    function mirar(i, api) {
      if (mirando[i].t > 0 || saltando) return;
      if (i === gato) {
        mirando[i] = { t: 1.3, contenido: 'gato' };
        encontrados++; fallos = 0;
        Sonido.efecto('miau');
        const c = centro(i);
        saltando = { i, t: 0 };
        pista = { texto: encontrados >= META ? '¡TE PILLE OTRA VEZ!' : '¡MIAU! ¡TE ENCONTRE!', color: C.oroClaro, vida: 1.4 };
        if (encontrados >= META) ganada = 1.6;
        api.aviso(`${encontrados}/${META}`, ultima.x0 + c.x * ultima.K, ultima.y0 + (c.y - 22) * ultima.K, C.oroClaro);   // en coordenadas de pantalla
        return;
      }
      // no está: ¿qué hay? y pista de distancia
      const r = Math.random();
      const sorpresa = { cortina: r < 0.7 ? 'nada' : 'sombra', maceta: r < 0.6 ? 'nada' : 'pajaro', caja: r < 0.5 ? 'nada' : r < 0.8 ? 'ovillo' : 'calcetin' }[ESCONDITES[i].tipo];
      mirando[i] = { t: 0.9, contenido: sorpresa };
      Sonido.efecto(sorpresa === 'pajaro' ? 'coger' : 'carta');
      const a = centro(i), b = centro(gato), d = Math.hypot(a.x - b.x, a.y - b.y);
      pista = d < 75 ? { texto: '¡CALIENTE!', color: '#ff8a5c' } : d < 150 ? { texto: 'TEMPLADO', color: C.oroClaro } : { texto: 'FRIO, FRIO', color: C.hielo2 };
      pista.vida = 1.4;
      fallos++;
      if (fallos >= FALLOS_PARA_MOVERSE) { fallos = 0; moverGato(i); proximaCola = 1.5; }   // se cansa y cambia de sitio
    }

    function actualizar(dt, api, d) {
      for (const m of mirando) m.t = Math.max(0, m.t - dt);
      if (pista) { pista.vida -= dt; if (pista.vida <= 0) pista = null; }
      if (saltando) {
        saltando.t += dt;
        if (saltando.t > 1.3) { saltando = null; if (encontrados < META) moverGato(-1); }
      }
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); return; }

      // la cola asoma de vez en cuando (más a menudo cuantos más fallos)
      cola = Math.max(0, cola - dt);
      proximaCola -= dt;
      if (proximaCola <= 0 && !saltando) { cola = 0.7; proximaCola = (fallos >= 2 ? 2.5 : 4.5) + Math.random() * 2; }

      const e = api.entrada;
      // teclado: las flechas llevan al escondite más cercano en esa dirección
      const dirs = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
      for (const k in dirs) if (e.pulsado(k)) {
        usaTeclado = true;
        const [dx, dy] = dirs[k], o = centro(cursor);
        let mejor = -1, puntos = Infinity;
        ESCONDITES.forEach((_, j) => {
          if (j === cursor) return;
          const c = centro(j), vx = c.x - o.x, vy = c.y - o.y, avance = vx * dx + vy * dy;
          if (avance <= 4) return;
          const p = avance + Math.abs(vx * dy + vy * dx) * 2;               // penaliza irse de lado
          if (p < puntos) { puntos = p; mejor = j; }
        });
        if (mejor >= 0) cursor = mejor;
      }
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        usaTeclado = false;
        const px = (e.puntero.x - d.x0) / d.K, py = (e.puntero.y - d.y0) / d.K;
        const i = ESCONDITES.findIndex((s) => px >= s.x - 4 && px < s.x + s.w + 4 && py >= s.y - 4 && py < s.y + s.h + 4);
        if (i >= 0) { cursor = i; mirar(i, api); }
      } else if (e.pulsado('accion')) { usaTeclado = true; mirar(cursor, api); }
    }

    /* ---------- Dibujo (en unidades de la escena de 320x220) ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

    function cabezaGato(ctx, x, y) {                                       // (x, y) = centro de la cara
      r(ctx, '#e08a3a', x - 6, y - 4, 13, 9); r(ctx, '#e08a3a', x - 5, y + 5, 11, 1);
      r(ctx, '#e08a3a', x - 6, y - 7, 3, 3); r(ctx, '#e08a3a', x + 4, y - 7, 3, 3);       // orejas
      r(ctx, '#f6b77a', x - 5, y - 6, 1, 2); r(ctx, '#f6b77a', x + 5, y - 6, 1, 2);
      r(ctx, '#b0602a', x - 2, y - 4, 1, 3); r(ctx, '#b0602a', x + 2, y - 4, 1, 3);       // rayas
      r(ctx, '#3fbf5a', x - 4, y - 1, 2, 2); r(ctx, '#3fbf5a', x + 3, y - 1, 2, 2);        // ojos
      r(ctx, C.tinta, x - 3, y - 1, 1, 2); r(ctx, C.tinta, x + 4, y - 1, 1, 2);
      r(ctx, '#f08a9a', x, y + 1, 1, 1); r(ctx, C.crema, x - 2, y + 2, 5, 2);
      r(ctx, C.nieve3, x - 9, y + 1, 3, 1); r(ctx, C.nieve3, x + 7, y + 1, 3, 1);         // bigotes
    }

    function colaGato(ctx, x, y, t) {                                      // asoma por un lado y se mueve
      const o = Math.round(Math.sin(t * 10) * 1.5);
      r(ctx, '#e08a3a', x, y, 2, 7); r(ctx, '#e08a3a', x + 1 + o, y - 3, 2, 4); r(ctx, '#b0602a', x, y + 2, 2, 1);
      r(ctx, '#b0602a', x + 1 + o, y - 3, 2, 1);
    }

    function escondite(ctx, s, m, t, i) {
      const abierto = m.t > 0;
      if (s.tipo === 'cortina') {
        r(ctx, C.crema, s.x - 3, s.y - 3, s.w + 6, 3); r(ctx, '#b9b2a6', s.x - 3, s.y + s.h, s.w + 6, 3);
        r(ctx, '#2b1a14', s.x - 1, s.y - 1, s.w + 2, s.h + 2);
        r(ctx, '#ffe9a0', s.x, s.y, s.w, s.h / 2); r(ctx, '#f0a93a', s.x, s.y + s.h / 2, s.w, s.h / 2);
        if (abierto) {
          if (m.contenido === 'gato') cabezaGato(ctx, s.x + s.w / 2, s.y + s.h - 12);
          if (m.contenido === 'sombra') { r(ctx, '#5a3418', s.x + s.w / 2 - 4, s.y + s.h - 14, 8, 14); r(ctx, '#5a3418', s.x + s.w / 2 - 3, s.y + s.h - 19, 6, 5); }
        }
        // cortinas: se abren al mirar
        const ab = abierto ? Math.min(1, (1.3 - m.t) * 4, m.t * 4) : 0, w = Math.round(s.w / 2 - ab * (s.w / 2 - 4));
        const col = [C.rojo, C.verde, C.lila, C.rojo][i % 4], osc = [C.rojoOsc, C.verdeOsc, C.magenta, C.rojoOsc][i % 4];
        r(ctx, col, s.x, s.y, w, s.h); r(ctx, col, s.x + s.w - w, s.y, w, s.h);
        for (let k = 3; k < w; k += 4) { r(ctx, osc, s.x + k, s.y, 1, s.h); r(ctx, osc, s.x + s.w - k - 1, s.y, 1, s.h); }
        r(ctx, '#2b1a14', s.x, s.y - 1, s.w, 1);
      } else if (s.tipo === 'maceta') {
        const sac = abierto ? Math.round(Math.sin(t * 40) * (m.t > 0.6 ? 1 : 0)) : 0;
        if (abierto && m.contenido === 'gato') cabezaGato(ctx, s.x + s.w / 2, s.y + 2);
        // planta frondosa
        const cx = s.x + s.w / 2 + sac;
        r(ctx, C.verdeMuyOsc, cx - 12, s.y + 2, 24, 12); r(ctx, C.verdeOsc, cx - 10, s.y - 2, 20, 12); r(ctx, C.verde, cx - 7, s.y - 5, 14, 9);
        r(ctx, C.verde, cx - 12, s.y + 4, 4, 3); r(ctx, C.verde, cx + 8, s.y + 3, 4, 3); r(ctx, '#5fae74', cx - 4, s.y - 4, 3, 2);
        r(ctx, C.rojo, cx + 3, s.y - 1, 2, 2); r(ctx, C.rojo, cx - 6, s.y + 3, 2, 2);
        // maceta de barro
        r(ctx, '#8a3f22', s.x + 2, s.y + 12, s.w - 4, 3); r(ctx, '#c0643a', s.x + 4, s.y + 15, s.w - 8, s.h - 15); r(ctx, '#d9824e', s.x + 4, s.y + 15, 2, s.h - 15);
        r(ctx, '#8a3f22', s.x + s.w - 7, s.y + 15, 3, s.h - 15);
        if (abierto && m.contenido === 'pajaro') {
          const vuelo = (0.9 - m.t) * 60;
          r(ctx, '#6a7bd0', cx + vuelo, s.y - 6 - vuelo * 0.8, 5, 3); r(ctx, '#f08a2c', cx + vuelo + 5, s.y - 5 - vuelo * 0.8, 2, 1);
          r(ctx, '#8a9ae0', cx + vuelo + 1, s.y - 8 - vuelo * 0.8 + (Math.floor(t * 20) % 2) * 2, 3, 2);
        }
      } else {
        // caja de la mudanza: las solapas se abren al mirar
        r(ctx, '#a9763f', s.x, s.y, s.w, s.h); r(ctx, '#8a5c2c', s.x + s.w - 5, s.y, 5, s.h); r(ctx, '#c08d52', s.x, s.y, s.w, 2);
        r(ctx, '#d9c49a', s.x + s.w / 2 - 3, s.y, 6, s.h * 0.6);                         // cinta de embalar
        r(ctx, '#6a4422', s.x + 4, s.y + s.h - 9, 12, 1); r(ctx, '#6a4422', s.x + 4, s.y + s.h - 6, 8, 1);
        if (abierto) {
          r(ctx, '#3a2412', s.x + 1, s.y, s.w - 2, 3);
          r(ctx, '#c08d52', s.x - 7, s.y - 6, 9, 3); r(ctx, '#c08d52', s.x + s.w - 2, s.y - 6, 9, 3);   // solapas abiertas
          if (m.contenido === 'gato') cabezaGato(ctx, s.x + s.w / 2, s.y - 4);
          if (m.contenido === 'ovillo') { r(ctx, C.lila, s.x + s.w / 2 - 4, s.y - 6, 8, 7); r(ctx, C.magenta, s.x + s.w / 2 - 2, s.y - 5, 1, 5); r(ctx, C.magenta, s.x + s.w / 2 + 1, s.y - 6, 1, 6); }
          if (m.contenido === 'calcetin') { r(ctx, C.rojo, s.x + s.w / 2 - 2, s.y - 9, 5, 8); r(ctx, C.rojo, s.x + s.w / 2 + 2, s.y - 4, 4, 3); r(ctx, C.nieve, s.x + s.w / 2 - 2, s.y - 9, 5, 2); }
        } else {
          r(ctx, '#8a5c2c', s.x, s.y + 2, s.w, 1);
        }
      }
    }

    // Fachada (se dibuja una vez): ladrillo, forjados, balcón con barandilla, portal y acera nevada
    let fachada = null;
    function crearFachada() {
      const [cv, g] = Sprites.lienzoAux(320, 220);
      const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R('#5e2620', 0, 0, 320, 168);
      for (let fila = 0, y = 0; y < 168; fila++, y += 4)
        for (let x = -(fila % 2) * 4; x < 320; x += 8) { R((x * 3 + fila * 7) % 5 ? '#a2432f' : '#9a3d2b', x, y, 7, 3); R('#b9573f', x, y, 7, 1); }
      Sprites.tramar(g, 0, 0, 320, 168, '#4a1830', (x) => (Math.abs(x - 160) / 160 - 0.55) * 1.3);   // sombra solo hacia los bordes
      for (const y of [76, 142]) { R('#cfc8bd', 0, y, 320, 3); R('#8c857b', 0, y + 3, 320, 1); }
      // balcón con barandilla delante de las macetas del centro
      R('#4a5068', 118, 138, 84, 3);
      for (let x = 120; x < 200; x += 6) R('#4a5068', x, 124, 1, 14);
      R('#59607a', 118, 123, 84, 2);
      // portal
      R('#2b1a14', 150, 160, 26, 8); R('#b9b2a6', 147, 164, 32, 2);
      R('#2b1a14', 148, 166, 30, 40); R('#6b3a28', 150, 168, 26, 38); R('#f6cf63', 171, 186, 2, 3);
      R('#ffe9a0', 152, 170, 22, 6);
      // acera nevada
      R('#f4f8ff', 0, 205, 320, 2); R('#dbe5f5', 0, 207, 320, 13);
      Sprites.tramar(g, 0, 210, 320, 10, '#c5d3ea', (x, y) => (y - 210) / 12);
      return cv;
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 26 + (api.ancho - api.margenDerecho < 250 ? altoCaja + 6 : 0);
      const K = Math.max(1, Math.min(2, Math.floor(Math.min(api.ancho / 330, (api.alto - arriba - 4) / 222))));
      const x0 = Math.floor((api.ancho - 320 * K) / 2), y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - 220 * K) / 2));
      return { K, x0, y0, arriba, altoCaja };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api);
      Comun.fondoNoche(ctx, api.t, api.alto, api.ancho);
      ctx.save();
      ctx.translate(d.x0, d.y0);
      ctx.scale(d.K, d.K);
      ctx.drawImage(fachada || (fachada = crearFachada()), 0, 0);
      ESCONDITES.forEach((s, i) => escondite(ctx, s, mirando[i], api.t, i));
      // pista: la cola asoma por un lado del escondite
      if (cola > 0 && !saltando && ganada === 0) {
        const s = ESCONDITES[gato];
        colaGato(ctx, s.x + s.w + 1, s.y + s.h - 9, api.t);
      }
      // la chica en la acera, junto al portal
      Sprites.personaje(ctx, 200, 206, -1, 'idle', api.t);
      // cursor del teclado
      if (usaTeclado && Math.floor(api.t * 3) % 3) {
        const s = ESCONDITES[cursor];
        r(ctx, C.blanco, s.x - 4, s.y - 4, s.w + 8, 1); r(ctx, C.blanco, s.x - 4, s.y + s.h + 3, s.w + 8, 1);
        r(ctx, C.blanco, s.x - 4, s.y - 4, 1, s.h + 8); r(ctx, C.blanco, s.x + s.w + 3, s.y - 4, 1, s.h + 8);
      }
      ctx.restore();

      const e = api.textoEscala;
      if (pista) {                                                         // FRIO / TEMPLADO / ¡CALIENTE! (grande si cabe)
        const em = Comun.medir(pista.texto, e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, pista.texto, Math.floor(api.ancho / 2), d.arriba - 18, pista.color, { escala: em, centro: true, sombra: C.tinta });
      }

      // marcador: veces que se ha encontrado al gato
      const t1 = `ENCONTRADO ${encontrados}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8 + 18, d.altoCaja);
      ctx.save(); ctx.translate(14, 6 + Math.floor(d.altoCaja / 2) + 1); cabezaGato(ctx, 0, 0); ctx.restore();
      texto(ctx, t1, 28, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: dónde está el gato y el centro de cada escondite en coordenadas del lienzo
    let ultima = { K: 1, x0: 0, y0: 0 };
    if (Dias.debug) window.gatoDebug = () => ({
      gato, encontrados, fallos,
      centros: ESCONDITES.map((_, i) => { const c = centro(i); return { x: ultima.x0 + c.x * ultima.K, y: ultima.y0 + c.y * ultima.K }; })
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'EL GATO DEL VECINO',
      instruccion: 'EL GATO SE HA ESCONDIDO DETRAS DE UNA CORTINA, UNA MACETA O UNA CAJA. TOCA PARA MIRAR. ¡ENCUENTRALO 3 VECES! FIJATE EN SU COLA...',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'noel',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
