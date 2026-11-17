'use strict';
/* Día 2 — Atrapa copos.
   La chica lleva un gorro boca arriba y se mueve a izquierda y derecha para coger copos.
   Los carámbanos quitan 3 copos. 20 copos para ganar antes de que se acabe el tiempo.
   Ocupa toda la pantalla: el ancho y el alto del campo se leen de api en cada fotograma. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia02-copos'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 20, TIEMPO = 60, CASTIGO = 3;
    let ancho = 320, alto = 240, suelo = 214;

    let chica, copos, carambanos, chispas, cuenta, quedan, proxCopo, proxCarambano, inmune;

    // Siluetas de tejados nevados al fondo (se dibujan una vez por ancho de pantalla)
    const tejados = {};
    function crearTejados(w) {
      const [cv, g] = Sprites.lienzoAux(w, 80);
      let x = 0, i = 0;
      while (x < w) {
        const tw = 34 + ((i * 37) % 30), h = 30 + ((i * 53) % 34);
        g.fillStyle = '#141a3c'; g.fillRect(x, 80 - h, tw, h);
        g.fillStyle = C.nieve3; g.fillRect(x, 80 - h, tw, 2);
        g.fillStyle = '#ffd98a';                                           // ventanas encendidas
        for (let wy = 80 - h + 7; wy < 74; wy += 9)
          for (let wx = x + 5; wx < x + tw - 6; wx += 9) if ((wx * 7 + wy * 3 + i) % 5 < 2) g.fillRect(wx, wy, 3, 4);
        if (i % 3 === 1) { g.fillStyle = '#141a3c'; g.fillRect(x + tw - 10, 80 - h - 8, 5, 8); }   // chimenea
        x += tw + 2; i++;
      }
      return cv;
    }

    // Tamaño del campo de juego (cambia con la pantalla)
    function medir(api) {
      ancho = api.ancho; alto = api.alto; suelo = alto - 26;
    }
    const velocidad = () => 130 + (ancho - 320) * 0.45;                    // en pantallas anchas corre más
    const caida = () => alto / 240;                                        // los copos tardan lo mismo en caer en cualquier alto

    function nuevoCopo(y) {
      return { x: 16 + Math.random() * (ancho - 32), y, vy: 48 + Math.random() * 26, f: Math.random() * 6, grande: Math.random() < 0.4 };
    }

    function reiniciar(api) {
      medir(api);
      chica = { x: ancho / 2, dir: 1, andando: false };
      // nada más empezar ya hay copos cayendo a distintas alturas
      copos = [0.15, 0.3, 0.45, 0.6].map((k) => nuevoCopo(Math.floor(suelo * k)));
      carambanos = []; chispas = [];
      cuenta = 0; quedan = TIEMPO; proxCopo = 0.5; proxCarambano = 5; inmune = 0;
    }

    // Zona del gorro (boca arriba sobre la cabeza): ahí se cogen los copos (con margen por su tamaño)
    const gorro = () => ({ x0: chica.x - 11, x1: chica.x + 11, y0: suelo - 38, y1: suelo - 26 });

    function actualizar(dt, api) {
      medir(api);
      const e = api.entrada;
      // movimiento: flechas, o seguir el dedo/ratón mientras se mantiene pulsado
      let dx = (e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0);
      if (!dx && e.puntero.abajo && Math.abs(e.puntero.x - chica.x) > 2) dx = Math.sign(e.puntero.x - chica.x);
      chica.andando = dx !== 0;
      if (dx) chica.dir = dx;
      chica.x = Math.max(10, Math.min(ancho - 10, chica.x + dx * velocidad() * dt));

      quedan -= dt;
      inmune = Math.max(0, inmune - dt);
      const avance = 1 - quedan / TIEMPO;                                  // 0..1: se pone más difícil

      // aparecen copos (más en pantallas anchas) y, pasados unos segundos, carámbanos
      proxCopo -= dt;
      if (proxCopo <= 0) {
        proxCopo = (0.75 + Math.random() * 0.5) * (320 / ancho) ** 0.5;
        copos.push(nuevoCopo(-8));
        if (Math.random() < 0.25) copos.push(nuevoCopo(-30));
      }
      proxCarambano -= dt;
      if (proxCarambano <= 0) {
        proxCarambano = (2.8 - avance * 1.3 + Math.random() * 1.2) * (320 / ancho) ** 0.5;
        carambanos.push({ x: 14 + Math.random() * (ancho - 28), y: -14, vy: 80 + Math.random() * 25 + avance * 30, aviso: 0.6 });
      }

      const z = gorro();
      for (let i = copos.length - 1; i >= 0; i--) {
        const c = copos[i];
        c.y += c.vy * caida() * (1 + avance * 0.3) * dt;
        const cx = c.x + Math.sin(api.t * 2 + c.f) * 6;
        if (c.y >= z.y0 && c.y <= z.y1 && cx >= z.x0 && cx <= z.x1) {
          copos.splice(i, 1);
          cuenta++;
          Sonido.efecto('coger');
          api.aviso('+1', chica.x, z.y0 - 10, C.nieve);
          for (let k = 0; k < 8; k++) chispas.push({ x: cx, y: z.y0, vx: (Math.random() - 0.5) * 60, vy: -25 - Math.random() * 35, vida: 0.45 });
          if (cuenta >= META) { api.ganar(); return; }
        } else if (c.y > suelo + 2) copos.splice(i, 1);
      }

      for (let i = carambanos.length - 1; i >= 0; i--) {
        const k = carambanos[i];
        if (k.aviso > 0) { k.aviso -= dt; continue; }                       // primero tiembla en el borde de arriba
        k.y += k.vy * caida() * dt;
        const toca = k.y + 14 >= z.y0 && k.y <= suelo && Math.abs(k.x - chica.x) <= 9;
        if (toca && inmune <= 0) {
          carambanos.splice(i, 1);
          cuenta = Math.max(0, cuenta - CASTIGO);
          inmune = 0.8;
          Sonido.efecto('golpe');
          api.sacudir(0.25);
          api.aviso('-' + CASTIGO, chica.x, z.y0 - 10, C.rojoClaro);
        } else if (k.y > suelo) carambanos.splice(i, 1);
      }

      for (let i = chispas.length - 1; i >= 0; i--) {
        const s = chispas[i];
        s.vida -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 120 * dt;
        if (s.vida <= 0) chispas.splice(i, 1);
      }

      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO: ${cuenta} DE ${META} COPOS`); }
    }

    // Copos grandes (9x9) y medianos (7x7), con el centro azulado
    function dibujarCopo(ctx, x, y, grande) {
      const r = grande ? 4 : 3;
      ctx.fillStyle = C.nieve;
      ctx.fillRect(x - r, y, 2 * r + 1, 1); ctx.fillRect(x, y - r, 1, 2 * r + 1);       // brazos en cruz
      for (let d = 1; d < r; d++) {                                                       // brazos en diagonal
        ctx.fillRect(x - d, y - d, 1, 1); ctx.fillRect(x + d, y - d, 1, 1);
        ctx.fillRect(x - d, y + d, 1, 1); ctx.fillRect(x + d, y + d, 1, 1);
      }
      ctx.fillRect(x - r, y - 1, 1, 3); ctx.fillRect(x + r, y - 1, 1, 3);                 // puntas
      ctx.fillRect(x - 1, y - r, 3, 1); ctx.fillRect(x - 1, y + r, 3, 1);
      ctx.fillStyle = C.hielo2; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = C.blanco; ctx.fillRect(x, y, 1, 1);
    }

    function dibujarCarambano(ctx, x, y) {
      const filas = [7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
      filas.forEach((w, j) => {
        const x0 = x - Math.floor(w / 2);
        ctx.fillStyle = C.hielo3; ctx.fillRect(x0, y + j, w, 1);
        if (w > 1) { ctx.fillStyle = C.hielo; ctx.fillRect(x0, y + j, 1, 1); }
        if (w > 3) { ctx.fillStyle = C.hielo2; ctx.fillRect(x0 + 1, y + j, w - 3, 1); }
      });
    }

    // Gorro de Navidad del revés, como un cuenco sobre la cabeza
    function dibujarGorro(ctx, x, y) {
      ctx.fillStyle = C.crema; ctx.fillRect(x - 9, y, 19, 2);              // ribete blanco (boca del gorro)
      ctx.fillStyle = C.nieve3; ctx.fillRect(x - 9, y + 1, 19, 1);
      ctx.fillStyle = C.rojo; ctx.fillRect(x - 8, y + 2, 17, 2); ctx.fillRect(x - 6, y + 4, 13, 2); ctx.fillRect(x - 4, y + 6, 9, 1);
      ctx.fillStyle = C.rojoOsc; ctx.fillRect(x + 4, y + 2, 5, 2); ctx.fillRect(x + 3, y + 4, 4, 2);
      ctx.fillStyle = C.blanco; ctx.fillRect(x + 8, y + 5, 3, 3);           // borla colgando
      if (cuenta > 0) {                                                     // nieve acumulada dentro
        ctx.fillStyle = C.nieve;
        const h = Math.min(3, 1 + Math.floor(cuenta / 7));
        ctx.fillRect(x - 7, y - h + 1, 15, h);
      }
    }

    function dibujar(ctx, api) {
      medir(api);
      Comun.fondoNoche(ctx, api.t, alto, ancho);
      ctx.drawImage(tejados[ancho] || (tejados[ancho] = crearTejados(ancho)), 0, suelo - 80);
      // suelo nevado con trama
      ctx.fillStyle = C.nieve2; ctx.fillRect(0, suelo, ancho, alto - suelo);
      ctx.fillStyle = C.nieve; ctx.fillRect(0, suelo, ancho, 2);
      Sprites.tramar(ctx, 0, suelo + 8, ancho, alto - suelo - 8, C.nieve3, (x, y) => (y - suelo - 8) / 20);

      for (const k of carambanos) {
        const temblando = k.aviso > 0;
        dibujarCarambano(ctx, Math.round(k.x + (temblando ? Math.floor(api.t * 30) % 2 : 0)), Math.round(temblando ? 0 : k.y));
      }
      for (const c of copos) dibujarCopo(ctx, Math.round(c.x + Math.sin(api.t * 2 + c.f) * 6), Math.round(c.y), c.grande);

      // la chica parpadea tras un golpe
      if (inmune <= 0 || Math.floor(api.t * 12) % 2) {
        Sprites.personaje(ctx, Math.round(chica.x), suelo, chica.dir, chica.andando ? 'andar' : 'idle', api.t);
        dibujarGorro(ctx, Math.round(chica.x), suelo - 32);
      }
      ctx.fillStyle = C.nieve;
      for (const s of chispas) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);

      // marcador: copos a la izquierda y tiempo en el centro (la esquina derecha es del botón X)
      const e = api.textoEscala, altoCaja = 5 * e + 8;
      Comun.caja(ctx, 6, 6, 22 + Comun.medir('20/20', e), altoCaja);
      dibujarCopo(ctx, 14, 6 + Math.floor(altoCaja / 2), false);
      texto(ctx, `${cuenta}/${META}`, 23, 10, C.nieve, { escala: e });
      const anchoNum = Comun.medir('60', e), anchoBarra = 50, anchoCaja = anchoBarra + anchoNum + 12;
      const xT = Math.floor((ancho - anchoCaja) / 2);
      Comun.caja(ctx, xT, 6, anchoCaja, altoCaja);
      const frac = Math.max(0, quedan / TIEMPO), color = quedan < 10 ? C.rojoClaro : C.verde;
      ctx.fillStyle = C.nocheClara; ctx.fillRect(xT + 4, 10, anchoBarra, altoCaja - 8);
      ctx.fillStyle = color; ctx.fillRect(xT + 4, 10, Math.round(anchoBarra * frac), altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), xT + anchoBarra + 8, 10, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'ATRAPA COPOS',
      instruccion: `COGE ${META} COPOS CON EL GORRO MOVIENDOTE CON LAS FLECHAS O CON EL DEDO. ¡OJO CON LOS CARAMBANOS, QUITAN ${CASTIGO}!`,
      pantallaCompleta: true,
      reiniciar, actualizar, dibujar
    });
  }
};
