'use strict';
/* Día 23 — La estrella del tejado.
   Plataformas sencillo por la fachada del mismo edificio de la pantalla principal: la chica lleva la estrella
   y sube por andamios (uno se mueve) hasta el tejado, donde la coloca. ← → para andar, ↑ / Espacio / tocar
   para saltar. Saltos generosos y sin caídas mortales (si se cae, aterriza más abajo). No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia23-estrella'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const VEL = 85, SALTO = 278, G = 650;                                 // salto de unos 59 px de alto y 75 de largo
    const B_ANCHO = Edificio.ANCHO, B_ALTO = Edificio.MUNDO_ALTO, SUELO = Edificio.sueloY(0);
    const TECHO = Edificio.CIELO + 2;                                     // tejado nevado
    // andamios: x, ancho, y (coordenadas de la imagen del edificio); el 6.º se mueve a los lados
    const ANDAMIOS = [
      { x: 60, w: 40, y: 366 }, { x: 118, w: 40, y: 332 }, { x: 180, w: 36, y: 300 }, { x: 130, w: 40, y: 268 },
      { x: 80, w: 36, y: 236 }, { x: 106, w: 42, y: 204, mueve: 22 }, { x: 156, w: 40, y: 172 }, { x: 204, w: 40, y: 140 }
    ];
    const ESTRELLA_X = 148;                                               // dónde se coloca, en el tejado

    let jug, camara, final, reloj, foto;

    function fotoEdificio() {                                             // el edificio tal y como se ve en la pantalla principal
      if (foto) return foto;
      const [cv, g] = Sprites.lienzoAux(B_ANCHO, B_ALTO);
      g.drawImage(Edificio.imagenFondo(), 0, 0);
      for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarHalo(g, n, Dias.estado(n), 0, 0);
      for (let n = 1; n <= Dias.TOTAL; n++) Edificio.dibujarPuerta(g, n, Dias.estado(n), 0, 0);
      return (foto = cv);
    }

    function reiniciar() { jug = { x: 30, y: SUELO, vy: 0, dir: 1, enSuelo: true, andando: false }; camara = null; final = 0; reloj = 0; }

    const posAndamio = (a) => a.x + (a.mueve ? Math.sin(reloj * 0.9) * a.mueve : 0);
    // suelos posibles bajo la chica: calle, andamios y tejado (solo se pisan desde arriba)
    function suelos() {
      const l = [{ x0: -50, x1: B_ANCHO + 50, y: SUELO }, { x0: Edificio.X0 - 8, x1: Edificio.X1 + 8, y: TECHO }];
      for (const a of ANDAMIOS) { const x = posAndamio(a); l.push({ x0: x, x1: x + a.w, y: a.y, a }); }
      return l;
    }

    let entradaDebug = null;
    function actualizar(dt, api, d) {
      reloj += dt; entradaDebug = api.entrada;
      if (final > 0) { final += dt; if (final > 2.4) api.ganar(); return; }
      const e = api.entrada;
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!dx && e.puntero.abajo) { const px = (e.puntero.x - d.ox) / d.K; if (Math.abs(px - jug.x) > 12) dx = Math.sign(px - jug.x); }
      const salta = e.pulsado('arriba') | e.pulsado('accion') | e.pulsado('toque');
      if (salta && jug.enSuelo) { jug.vy = -SALTO; jug.enSuelo = false; Sonido.efecto('saltar'); }
      if (dx) jug.dir = dx;
      jug.andando = !!dx && jug.enSuelo;
      jug.x = Math.max(6, Math.min(B_ANCHO - 6, jug.x + dx * VEL * dt));
      // si va sobre el andamio que se mueve, la lleva con él
      const pisa = jug.enSuelo && suelos().find((s) => s.a && s.a.mueve && Math.abs(jug.y - s.y) < 1 && jug.x >= s.x0 - 4 && jug.x <= s.x1 + 4);
      if (pisa) jug.x += Math.cos(reloj * 0.9) * 0.9 * pisa.a.mueve * dt;
      const antes = jug.y;
      jug.vy += G * dt; jug.y += jug.vy * dt;
      jug.enSuelo = false;
      if (jug.vy >= 0) for (const s of suelos()) {
        if (antes <= s.y + 0.5 && jug.y >= s.y && jug.x >= s.x0 - 4 && jug.x <= s.x1 + 4) { jug.y = s.y; jug.vy = 0; jug.enSuelo = true; break; }
      }
      // en el tejado, junto al sitio de la estrella: se coloca
      if (jug.enSuelo && jug.y === TECHO && Math.abs(jug.x - ESTRELLA_X) < 18) { final = 0.001; Sonido.efecto('completar'); }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function estrella(ctx, x, y, k, t) {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
      r(ctx, C.oro, -1, -7, 3, 15); r(ctx, C.oro, -7, -1, 15, 3); r(ctx, C.oro, -3, -3, 7, 7); r(ctx, C.oro, -5, 3, 3, 3); r(ctx, C.oro, 3, 3, 3, 3);
      r(ctx, C.oroClaro, -1, -6, 1, 6); r(ctx, C.oroClaro, -6, -1, 6, 1);
      if (Math.floor(t * 4) % 2) { r(ctx, C.blanco, 0, -10, 1, 2); r(ctx, C.blanco, 9, 0, 2, 1); r(ctx, C.blanco, -10, 0, 2, 1); }
      ctx.restore();
    }

    function disposicion(api) {
      const K = api.alto >= 480 && api.ancho >= 680 ? 2 : 1;
      const H = Math.floor(api.alto / K);
      return { K, ox: Math.floor((api.ancho - B_ANCHO * K) / 2), H };
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t, img = fotoEdificio();
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      // cámara: la chica hacia el 60 % de la pantalla, sin pasarse del suelo ni del cielo
      const objetivo = Math.max(Math.min(0, B_ALTO - d.H), Math.min(B_ALTO - d.H, Math.round(jug.y - d.H * 0.6)));
      camara = camara === null ? objetivo : camara + (objetivo - camara) * 0.12;
      ctx.save(); ctx.scale(d.K, d.K);
      const W = Math.floor(api.ancho / d.K);
      // suelo nevado de lado a lado
      r(ctx, '#f4f8ff', 0, SUELO - camara, W, 1); r(ctx, '#dbe5f5', 0, SUELO + 1 - camara, W, d.H);
      ctx.translate(Math.floor((W - B_ANCHO) / 2), -Math.round(camara));
      ctx.drawImage(img, 0, 0);
      // andamios: tablón de madera con soportes metálicos
      for (const a of ANDAMIOS) {
        const x = posAndamio(a);
        r(ctx, '#8a92b0', x + 3, a.y + 3, 2, 8); r(ctx, '#8a92b0', x + a.w - 5, a.y + 3, 2, 8);
        r(ctx, C.tinta, x - 1, a.y - 1, a.w + 2, 5); r(ctx, '#a9763f', x, a.y, a.w, 3); r(ctx, '#c08d52', x, a.y, a.w, 1);
        if (a.mueve) { r(ctx, '#8c857b', x + a.w / 2, a.y - 40, 1, 40); }
      }
      // el sitio de la estrella (un destello en el tejado) o la estrella ya colocada
      if (final > 0) {
        estrella(ctx, ESTRELLA_X, TECHO - 34, 2, t);
        for (let k = 0; k < 12; k++) if ((Math.floor(t * 6) + k) % 3 === 0) r(ctx, C.oroClaro, ESTRELLA_X - 60 + (k * 37) % 120, TECHO - 60 + (k * 23) % 40, 2, 2);
      } else if (Math.floor(t * 2) % 2) r(ctx, C.oroClaro, ESTRELLA_X - 1, TECHO - 4, 3, 3);
      // la chica (con la estrella en alto mientras no la ha colocado)
      Sprites.personaje(ctx, Math.round(jug.x), Math.round(jug.y), jug.dir, !jug.enSuelo ? 'subir' : jug.andando ? 'andar' : 'idle', t);
      if (final === 0) estrella(ctx, jug.x + jug.dir * 3, jug.y - 30, 1, t);
      ctx.restore();

      const e = api.textoEscala;
      if (final > 0) {
        const em = Comun.medir('¡ESTRELLA COLOCADA!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡ESTRELLA COLOCADA!', Math.floor(api.ancho / 2), Math.floor(api.alto * 0.18), C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      const altura = Math.max(0, Math.round((SUELO - jug.y) / (SUELO - TECHO) * 100));
      const t1 = `SUBIDA ${altura} %`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, Comun.altoTexto(e) + 8);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: estado y andamios, para las pruebas automáticas
    if (Dias.debug) window.estrellaDebug = () => ({ final: final > 0, teclas: entradaDebug ? [entradaDebug.izquierda, entradaDebug.derecha] : null, jug: { x: jug.x, y: jug.y, enSuelo: jug.enSuelo }, techo: TECHO, estrellaX: ESTRELLA_X,
      andamios: ANDAMIOS.map((a) => ({ x: posAndamio(a), w: a.w, y: a.y })) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'LA ESTRELLA DEL TEJADO',
      instruccion: 'SUBE POR LOS ANDAMIOS DE LA FACHADA HASTA EL TEJADO Y COLOCA LA ESTRELLA. ← → PARA ANDAR, ↑ O ESPACIO (O TOCAR) PARA SALTAR.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'estrella',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, disposicion(api)),
      dibujar
    });
  }
};
