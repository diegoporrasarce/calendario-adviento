'use strict';
/* Día 2 — Atrapa copos.
   La chica lleva un gorro boca arriba y se mueve a izquierda y derecha para coger copos.
   Los carámbanos quitan 3 copos. 20 copos para ganar antes de que se acabe el tiempo. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia02-copos'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { ANCHO, PALETA: C, texto } = Comun;
    const META = 20, TIEMPO = 45, VEL = 125, CASTIGO = 3;
    let SUELO = 214;                                    // se recalcula con la altura del lienzo (más alto en móvil vertical)

    let chica, copos, carambanos, chispas, cuenta, quedan, proxCopo, proxCarambano, inmune;

    // Siluetas de tejados nevados al fondo (se dibujan una vez)
    const [tejados, g] = Sprites.lienzoAux(ANCHO, 80);
    (() => {
      let x = 0, i = 0;
      while (x < ANCHO) {
        const w = 34 + ((i * 37) % 30), h = 30 + ((i * 53) % 34);
        g.fillStyle = '#141a3c'; g.fillRect(x, 80 - h, w, h);
        g.fillStyle = C.nieve3; g.fillRect(x, 80 - h, w, 2);
        g.fillStyle = '#ffd98a';                                           // ventanas encendidas
        for (let wy = 80 - h + 7; wy < 74; wy += 9)
          for (let wx = x + 5; wx < x + w - 6; wx += 9) if ((wx * 7 + wy * 3 + i) % 5 < 2) g.fillRect(wx, wy, 3, 4);
        if (i % 3 === 1) { g.fillStyle = '#141a3c'; g.fillRect(x + w - 10, 80 - h - 8, 5, 8); }   // chimenea
        x += w + 2; i++;
      }
    })();

    function reiniciar() {
      chica = { x: ANCHO / 2, dir: 1, andando: false };
      copos = []; carambanos = []; chispas = [];
      cuenta = 0; quedan = TIEMPO; proxCopo = 0.4; proxCarambano = 4; inmune = 0;
    }

    // Zona del gorro (boca arriba sobre la cabeza): ahí se cogen los copos
    const gorro = () => ({ x0: chica.x - 7, x1: chica.x + 7, y0: SUELO - 34, y1: SUELO - 27 });

    function actualizar(dt, api) {
      SUELO = api.alto - 26;
      const e = api.entrada;
      // movimiento: flechas, o seguir el dedo/ratón mientras se mantiene pulsado
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!dx && e.puntero.abajo && Math.abs(e.puntero.x - chica.x) > 2) dx = Math.sign(e.puntero.x - chica.x);
      chica.andando = dx !== 0;
      if (dx) chica.dir = dx;
      chica.x = Math.max(10, Math.min(ANCHO - 10, chica.x + dx * VEL * dt));

      quedan -= dt;
      inmune = Math.max(0, inmune - dt);
      const avance = 1 - quedan / TIEMPO;                                  // 0..1: se pone más difícil

      // aparecen copos (a veces dos) y, pasados unos segundos, carámbanos
      proxCopo -= dt;
      if (proxCopo <= 0) {
        proxCopo = 0.7 + Math.random() * 0.45;
        const n = Math.random() < 0.25 ? 2 : 1;
        for (let i = 0; i < n; i++)
          copos.push({ x: 14 + Math.random() * (ANCHO - 28), y: -6 - i * 20, vy: 34 + Math.random() * 26 + avance * 14,
                       f: Math.random() * 6, grande: Math.random() < 0.3 });
      }
      proxCarambano -= dt;
      if (proxCarambano <= 0) {
        proxCarambano = 2.6 - avance * 1.2 + Math.random() * 1.2;
        carambanos.push({ x: 12 + Math.random() * (ANCHO - 24), y: -12, vy: 70 + Math.random() * 25 + avance * 25, aviso: 0.6 });
      }

      const z = gorro();
      for (let i = copos.length - 1; i >= 0; i--) {
        const c = copos[i];
        c.y += c.vy * dt;
        const cx = c.x + Math.sin(api.t * 2 + c.f) * 6;
        if (c.y >= z.y0 && c.y <= z.y1 && cx >= z.x0 && cx <= z.x1) {
          copos.splice(i, 1);
          cuenta++;
          Sonido.efecto('coger');
          api.aviso('+1', chica.x, z.y0 - 8, C.nieve);
          for (let k = 0; k < 6; k++) chispas.push({ x: cx, y: z.y0, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, vida: 0.4 });
          if (cuenta >= META) { api.ganar(); return; }
        } else if (c.y > SUELO + 2) copos.splice(i, 1);
      }

      for (let i = carambanos.length - 1; i >= 0; i--) {
        const k = carambanos[i];
        if (k.aviso > 0) { k.aviso -= dt; continue; }                       // primero tiembla en el borde de arriba
        k.y += k.vy * dt;
        const toca = k.y + 10 >= z.y0 && k.y <= SUELO && Math.abs(k.x - chica.x) <= 7;
        if (toca && inmune <= 0) {
          carambanos.splice(i, 1);
          cuenta = Math.max(0, cuenta - CASTIGO);
          inmune = 0.8;
          Sonido.efecto('golpe');
          api.sacudir(0.25);
          api.aviso('-' + CASTIGO, chica.x, z.y0 - 8, C.rojoClaro);
        } else if (k.y > SUELO) carambanos.splice(i, 1);
      }

      for (let i = chispas.length - 1; i >= 0; i--) {
        const s = chispas[i];
        s.vida -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 120 * dt;
        if (s.vida <= 0) chispas.splice(i, 1);
      }

      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO: ${cuenta} DE ${META} COPOS`); }
    }

    function dibujarCopo(ctx, x, y, grande) {
      ctx.fillStyle = C.nieve;
      if (grande) {
        ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5);
        ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 1, 1); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1);
        ctx.fillStyle = C.hielo2; ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      }
    }

    function dibujarCarambano(ctx, x, y) {
      const filas = [5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
      filas.forEach((w, j) => {
        const x0 = x - Math.floor(w / 2);
        ctx.fillStyle = C.hielo3; ctx.fillRect(x0, y + j, w, 1);
        if (w > 1) { ctx.fillStyle = C.hielo; ctx.fillRect(x0, y + j, 1, 1); }
        if (w > 3) { ctx.fillStyle = C.hielo2; ctx.fillRect(x0 + 1, y + j, w - 3, 1); }
      });
    }

    // Gorro de Navidad del revés, como un cuenco sobre la cabeza
    function dibujarGorro(ctx, x, y) {
      ctx.fillStyle = C.crema; ctx.fillRect(x - 7, y, 15, 2);              // ribete blanco (boca del gorro)
      ctx.fillStyle = C.nieve3; ctx.fillRect(x - 7, y + 1, 15, 1);
      ctx.fillStyle = C.rojo; ctx.fillRect(x - 6, y + 2, 13, 2); ctx.fillRect(x - 5, y + 4, 11, 2); ctx.fillRect(x - 3, y + 6, 7, 1);
      ctx.fillStyle = C.rojoOsc; ctx.fillRect(x + 3, y + 2, 4, 2); ctx.fillRect(x + 3, y + 4, 3, 2);
      ctx.fillStyle = C.blanco; ctx.fillRect(x + 6, y + 5, 3, 3);           // borla colgando
      if (cuenta > 0) {                                                     // nieve acumulada dentro
        ctx.fillStyle = C.nieve;
        const h = Math.min(3, 1 + Math.floor(cuenta / 7));
        ctx.fillRect(x - 5, y - h + 1, 11, h);
      }
    }

    function dibujar(ctx, api) {
      SUELO = api.alto - 26;
      Comun.fondoNoche(ctx, api.t, api.alto);
      ctx.drawImage(tejados, 0, SUELO - 80);
      // suelo nevado con trama
      ctx.fillStyle = C.nieve2; ctx.fillRect(0, SUELO, ANCHO, api.alto - SUELO);
      ctx.fillStyle = C.nieve; ctx.fillRect(0, SUELO, ANCHO, 2);
      Sprites.tramar(ctx, 0, SUELO + 8, ANCHO, api.alto - SUELO - 8, C.nieve3, (x, y) => (y - SUELO - 8) / 20);

      for (const k of carambanos) {
        const temblando = k.aviso > 0;
        dibujarCarambano(ctx, Math.round(k.x + (temblando ? (Math.floor(api.t * 30) % 2) : 0)), Math.round(Math.max(k.y, temblando ? 0 : k.y)));
      }
      for (const c of copos) dibujarCopo(ctx, Math.round(c.x + Math.sin(api.t * 2 + c.f) * 6), Math.round(c.y), c.grande);

      // la chica parpadea tras un golpe
      if (inmune <= 0 || Math.floor(api.t * 12) % 2) {
        Sprites.personaje(ctx, Math.round(chica.x), SUELO, chica.dir, chica.andando ? 'andar' : 'idle', api.t);
        dibujarGorro(ctx, Math.round(chica.x), SUELO - 32);
      }
      ctx.fillStyle = C.nieve;
      for (const s of chispas) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);

      // marcador: copos y tiempo (el texto crece en pantallas pequeñas)
      const e = api.textoEscala, alto = 5 * e + 8;
      Comun.caja(ctx, 6, 6, 20 + Comun.medir('20/20', e), alto);
      dibujarCopo(ctx, 13, 6 + Math.floor(alto / 2), true);
      texto(ctx, `${cuenta}/${META}`, 21, 10, C.nieve, { escala: e });
      const anchoNum = Comun.medir('45', e), anchoBarra = 50;
      const xT = Math.floor((ANCHO - (anchoBarra + anchoNum + 12)) / 2);   // centrado: la esquina derecha es del botón X
      Comun.caja(ctx, xT, 6, anchoBarra + anchoNum + 12, alto);
      const frac = Math.max(0, quedan / TIEMPO), color = quedan < 10 ? C.rojoClaro : C.verde;
      ctx.fillStyle = C.nocheClara; ctx.fillRect(xT + 4, 10, anchoBarra, alto - 8);
      ctx.fillStyle = color; ctx.fillRect(xT + 4, 10, Math.round(anchoBarra * frac), alto - 8);
      texto(ctx, String(Math.ceil(quedan)), xT + anchoBarra + 8, 10, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ATRAPA COPOS',
      instruccion: `COGE ${META} COPOS CON EL GORRO MOVIENDOTE CON LAS FLECHAS O CON EL DEDO. ¡OJO CON LOS CARAMBANOS, QUITAN ${CASTIGO}!`,
      altoFlexible: true,
      reiniciar, actualizar, dibujar
    });
  }
};
