'use strict';
/* Día 4 — Riega la planta.
   Un indicador va y viene por una barra (izquierda = poca agua, derecha = demasiada).
   Hay que pulsar cuando está en la zona verde tres veces seguidas: cada acierto la planta crece
   y la zona se estrecha. Un fallo devuelve la planta a brote. Con 3 aciertos florece la flor de Pascua. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia04-planta'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 3;
    const ZONAS = [0.24, 0.17, 0.11];      // ancho de la zona verde (fracción de la barra) en cada acierto
    const VELOCIDADES = [0.55, 0.75, 0.95]; // barridos por segundo

    let racha, pos, dir, zona, vertiendo, gotas, mensaje, ganada, sacudida, crecer;

    function nuevaZona() {
      const w = ZONAS[Math.min(racha, ZONAS.length - 1)];
      zona = { x0: 0.25 + Math.random() * (0.6 - w), w };              // ni pegada a los bordes ni siempre igual
    }

    function reiniciar() {
      racha = 0; pos = 0; dir = 1; vertiendo = 0; gotas = []; mensaje = null; ganada = 0; sacudida = 0; crecer = 0;
      nuevaZona();
    }

    function actualizar(dt, api) {
      sacudida = Math.max(0, sacudida - dt);
      if (mensaje) { mensaje.vida -= dt; if (mensaje.vida <= 0) mensaje = null; }
      crecer = Math.max(0, crecer - dt);
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); }

      if (vertiendo > 0) {
        vertiendo -= dt;
        if (Math.random() < 0.7) gotas.push({ x: 18 + Math.random() * 3, y: -20, vy: 10 + Math.random() * 15 });
        if (vertiendo <= 0) { vertiendo = 0; resolver(api); }
      } else if (!ganada) {
        // el indicador va y viene
        const v = VELOCIDADES[Math.min(racha, VELOCIDADES.length - 1)];
        pos += dir * v * dt;
        if (pos > 1) { pos = 1; dir = -1; } else if (pos < 0) { pos = 0; dir = 1; }
        if (api.entrada.pulsado('accion')) { vertiendo = 0.6; Sonido.efecto('agua'); }
      }
      api.entrada.pulsado('toque');

      for (let i = gotas.length - 1; i >= 0; i--) {
        const g = gotas[i];
        g.vy += 160 * dt; g.y += g.vy * dt;
        if (g.y > -13) gotas.splice(i, 1);                                 // llegan a la tierra de la maceta
      }
    }

    // Al terminar de echar agua se mira dónde se paró el indicador
    function resolver(api) {
      const dentro = pos >= zona.x0 && pos <= zona.x0 + zona.w;
      if (dentro) {
        racha++;
        crecer = 0.5;
        Sonido.efecto('pareja');
        mensaje = { texto: racha >= META ? '¡HA FLORECIDO!' : '¡PERFECTO!', color: '#8fe0a0', vida: 1.2 };
        if (racha >= META) ganada = 1.4;
        else nuevaZona();
      } else {
        const poca = pos < zona.x0;
        mensaje = { texto: poca ? '¡MUY POCA AGUA!' : '¡DEMASIADA AGUA!', color: C.rojoClaro, vida: 1.2 };
        Sonido.efecto('bloqueada');
        sacudida = 0.4;
        racha = 0;
        api.fallo();
        nuevaZona();
      }
    }

    // Solo en modo debug: estado del indicador, para las pruebas automáticas
    if (Dias.debug) window.plantaDebug = () => ({ pos, zona, racha, vertiendo });

    /* ---------- Dibujo ---------- */
    // Habitación: pared cálida, ventana con nieve y suelo de madera (por tamaño de pantalla)
    const fondos = {};
    function crearFondo(w, h, suelo) {
      const [cv, g] = Sprites.lienzoAux(w, h);
      g.fillStyle = '#4a2c3a'; g.fillRect(0, 0, w, suelo);
      g.fillStyle = '#56334a';
      for (let x = 0; x < w; x += 10) for (let y = (x / 10) % 2 ? 5 : 0; y < suelo; y += 10) g.fillRect(x + 4, y + 4, 2, 2);
      // zócalo
      g.fillStyle = '#6b3a28'; g.fillRect(0, suelo - 12, w, 12);
      g.fillStyle = '#8a4f30'; g.fillRect(0, suelo - 12, w, 2);
      // ventana con la noche nevada
      const vw = 70, vh = 56, vx = Math.floor(w / 2) - 120 < 10 ? w - vw - 14 : Math.floor(w / 2) + 60, vy = Math.max(30, suelo - 140);
      g.fillStyle = C.crema; g.fillRect(vx - 4, vy - 4, vw + 8, vh + 8);
      g.fillStyle = C.noche; g.fillRect(vx, vy, vw, vh);
      Sprites.tramar(g, vx, vy, vw, vh, C.nocheClara, (x, y) => (y - vy) / vh);
      g.fillStyle = C.nieve;
      for (let i = 0; i < 22; i++) g.fillRect(vx + (i * 29) % vw, vy + (i * 17) % (vh - 8), 1, 1);
      g.fillRect(vx, vy + vh - 6, vw, 6);
      g.fillStyle = C.crema; g.fillRect(vx + vw / 2 - 1, vy, 3, vh); g.fillRect(vx, vy + vh / 2 - 1, vw, 3);
      g.fillStyle = C.rojo; g.fillRect(vx - 8, vy - 6, 10, vh + 14); g.fillRect(vx + vw - 2, vy - 6, 10, vh + 14);   // cortinas
      g.fillStyle = C.rojoOsc; g.fillRect(vx - 2, vy - 6, 2, vh + 14); g.fillRect(vx + vw + 6, vy - 6, 2, vh + 14);
      // suelo de madera
      g.fillStyle = C.madera; g.fillRect(0, suelo, w, h - suelo);
      g.fillStyle = C.maderaOsc;
      for (let y = suelo + 6; y < h; y += 7) g.fillRect(0, y, w, 1);
      for (let y = suelo, f = 0; y < h; y += 7, f++) for (let x = (f % 2) * 20; x < w; x += 40) g.fillRect(x, y, 1, 6);
      g.fillStyle = '#c98a3a'; g.fillRect(0, suelo, w, 1);
      return cv;
    }

    // Maceta con la planta según la racha (0 brote … 3 flor de Pascua). Origen: centro de la base.
    function planta(ctx, etapa, t) {
      const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      // maceta de barro
      r('#8a3f22', -6, -9, 12, 9); r('#c0643a', -5, -9, 9, 9); r('#d9824e', -5, -9, 2, 8);
      r('#8a3f22', -8, -12, 16, 3); r('#d9824e', -8, -12, 16, 1);
      r('#4a2a18', -6, -13, 12, 1);                                        // tierra
      const vaiven = Math.round(Math.sin(t * 2) * 0.6);
      if (etapa === 0) {
        r(C.verde, 0, -16, 1, 3); r(C.verde, -2, -17, 2, 1); r(C.verdeOsc, 1, -18, 2, 1);
        return;
      }
      const alto = [0, 9, 15, 19][etapa];
      r(C.verdeOsc, 0, -13 - alto, 1, alto);
      const hoja = (y, lado, l) => { r(C.verde, lado > 0 ? 1 : -l, y, l, 2); r(C.verdeOsc, lado > 0 ? 1 + l - 1 : -l, y + 1, 1, 1); };
      hoja(-17, -1, 3); hoja(-19, 1, 3);
      if (etapa >= 2) { hoja(-23, -1, 4); hoja(-25, 1, 4); hoja(-21, 1, 5); }
      if (etapa >= 3) {
        // flor de Pascua: brácteas rojas en estrella y centro amarillo
        const cy = -13 - alto + vaiven;
        r(C.verde, -6, cy + 2, 13, 2);
        r(C.rojo, -1, cy - 6, 3, 13); r(C.rojo, -6, cy - 1, 13, 3);
        r(C.rojo, -4, cy - 4, 2, 2); r(C.rojo, 3, cy - 4, 2, 2); r(C.rojo, -4, cy + 3, 2, 2); r(C.rojo, 3, cy + 3, 2, 2);
        r(C.rojoOsc, 1, cy - 6, 1, 13); r(C.rojoOsc, -6, cy + 1, 13, 1);
        r(C.oro, -1, cy - 1, 3, 3); r(C.oroClaro, 0, cy, 1, 1);
      } else {
        r(C.verde, -1, -13 - alto, 3, 2);
      }
    }

    // Regadera en las manos de la chica. Origen: pies de la chica (mirando a la derecha).
    function regadera(ctx, inclinada) {
      const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      ctx.save();
      ctx.translate(0, -5);
      if (inclinada) { ctx.translate(6, -12); ctx.rotate(0.35); ctx.translate(-6, 12); }
      r('#2f7a8a', 2, -15, 9, 7); r('#4fa0b0', 2, -15, 9, 2); r('#1f5560', 2, -9, 9, 1);
      r('#2f7a8a', 4, -18, 5, 1); r('#2f7a8a', 4, -18, 1, 3); r('#2f7a8a', 8, -18, 1, 3);   // asa
      r('#2f7a8a', 11, -13, 2, 2); r('#2f7a8a', 13, -14, 2, 2); r('#2f7a8a', 15, -15, 2, 2); // pitorro
      r('#4fa0b0', 16, -16, 2, 1);
      ctx.restore();
    }

    function dibujar(ctx, api) {
      const ancho = api.ancho, alto = api.alto, suelo = alto - 40;
      const clave = ancho + 'x' + alto;
      ctx.drawImage(fondos[clave] || (fondos[clave] = crearFondo(ancho, alto, suelo)), 0, 0);

      // escena ampliada (x2, o x3 si sobra alto, como en el móvil): la chica a la izquierda y la maceta delante
      const K = alto >= 400 ? 3 : 2;
      const cx = Math.floor(ancho / 2) - 18 * K;
      ctx.save();
      ctx.translate(cx + (sacudida > 0 ? Math.round(Math.sin(api.t * 50)) : 0), suelo);
      ctx.scale(K, K);
      Sprites.personaje(ctx, 0, 0, 1, 'idle', api.t);
      regadera(ctx, vertiendo > 0);
      ctx.save(); ctx.translate(24, 0);
      ctx.fillStyle = C.hielo2;
      for (const g of gotas) ctx.fillRect(Math.round(g.x - 24), Math.round(g.y), 1, 2);
      const etapa = Math.min(META, racha);
      if (crecer > 0 && Math.floor(crecer * 10) % 2) ctx.translate(0, -1);   // da un saltito al crecer
      planta(ctx, etapa, api.t);
      ctx.restore();
      ctx.restore();

      // barra: izquierda poca agua, derecha demasiada
      const e = api.textoEscala;
      const bw = Math.min(260, ancho - 40), bx = Math.floor((ancho - bw) / 2), by = Math.max(46, Math.floor(alto * 0.22)), bh = 12;
      Comun.caja(ctx, bx, by, bw, bh);
      Sprites.tramar(ctx, bx, by, bw, bh, '#5a2a1a', (x) => Math.abs((x - bx) / bw - 0.5) * 1.2);
      ctx.fillStyle = C.verde; ctx.fillRect(bx + Math.round(zona.x0 * bw), by, Math.round(zona.w * bw), bh);
      ctx.fillStyle = '#7ec98f'; ctx.fillRect(bx + Math.round(zona.x0 * bw), by, Math.round(zona.w * bw), 2);
      const ix = bx + Math.round(pos * bw);
      ctx.fillStyle = C.blanco; ctx.fillRect(ix - 1, by - 4, 3, bh + 8);
      ctx.fillRect(ix - 3, by - 7, 7, 2); ctx.fillRect(ix - 2, by - 5, 5, 1);
      texto(ctx, 'POCA', bx, by + bh + 6, C.hielo, { escala: e });
      texto(ctx, 'MUCHA', bx + bw - Comun.medir('MUCHA', e), by + bh + 6, C.hielo, { escala: e });

      // marcador: gotas de la racha
      const hAlto = Comun.altoTexto(e) + 8, t1 = 'SEGUIDOS';
      const wCaja = Comun.medir(t1, e) + 12 + META * 8 * e;
      Comun.caja(ctx, 6, 6, wCaja, hAlto);
      texto(ctx, t1, 10, 10, C.nieve, { escala: e });
      for (let i = 0; i < META; i++) {                                       // una gota por acierto seguido
        const gx = 16 + Comun.medir(t1, e) + i * 8 * e, gy = 6 + Math.floor(hAlto / 2) - 3 * e;
        ctx.fillStyle = i < racha ? C.hielo2 : C.nocheClara;
        ctx.fillRect(gx + e, gy, 2 * e, e); ctx.fillRect(gx, gy + e, 4 * e, 4 * e); ctx.fillRect(gx + e, gy + 5 * e, 2 * e, e);
      }

      if (mensaje) {
        const em = Comun.medir(mensaje.texto, e + 1) <= ancho - 12 ? e + 1 : e;   // grande si cabe
        texto(ctx, mensaje.texto, Math.floor(ancho / 2), by + bh + 10 + Comun.altoTexto(e) + 6, mensaje.color, { escala: em, centro: true, sombra: C.tinta });
      }
    }

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'RIEGA LA PLANTA',
      instruccion: 'PULSA ESPACIO O TOCA CUANDO LA FLECHA ESTE EN LA ZONA VERDE. ACIERTA 3 VECES SEGUIDAS PARA QUE LA PLANTA FLOREZCA.',
      pantallaCompleta: true,
      musica: 'nochedepaz',
      reiniciar, actualizar, dibujar
    });
  }
};
