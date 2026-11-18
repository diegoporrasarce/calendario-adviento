'use strict';
/* Día 7 — Muñeco de nieve.
   Arriba se balancea una bola de nieve: al pulsar (Espacio o tocar) cae sobre el monton.
   Base, cuerpo, cabeza y, por último, el sombrero, cada vez más rápido. Si cae muy descentrada
   rueda y se rompe (hay que reintentar); si cae algo torcida aguanta, pero queda ladeada.
   Al terminar se añaden solos los ojos, la nariz, los botones y los brazos. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia07-muneco'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    // piezas en orden: radio (o medio ancho del sombrero) y velocidad del balanceo (radianes por segundo)
    const PIEZAS = [
      { tipo: 'bola', r: 27, vel: 1.7 },
      { tipo: 'bola', r: 20, vel: 2.1 },
      { tipo: 'bola', r: 14, vel: 2.6 },
      { tipo: 'sombrero', r: 8, vel: 3.1 }
    ];
    const PERFECTO = 0.3, AGUANTA = 0.8;   // desvío permitido, en fracción del radio de la pieza de debajo
    const GRAVEDAD = 520;

    let monton, pieza, fase, x, y, vy, rodando, trozos, mensaje, adornos, terminado;

    function reiniciar() {
      monton = [];                         // piezas ya colocadas: { tipo, r, x (desvío horizontal), y (centro) }
      pieza = 0; fase = Math.random() * 6; vy = 0; rodando = null; trozos = []; mensaje = null; adornos = 0; terminado = 0;
      x = 0; y = null;
    }

    // Altura (en la escena, suelo en y = 0, hacia arriba negativo) del centro de la siguiente pieza
    function siguienteY(p) {
      if (!monton.length) return -p.r;
      const de = monton[monton.length - 1];
      return p.tipo === 'sombrero' ? de.y - de.r + 2 : de.y - de.r - p.r + 5;     // se encajan un poco (el sombrero apoya)
    }

    function decir(t, color) { mensaje = { texto: t, color, vida: 1 }; }

    function actualizar(dt, api, esc) {
      if (mensaje) { mensaje.vida -= dt; if (mensaje.vida <= 0) mensaje = null; }
      for (let i = trozos.length - 1; i >= 0; i--) {
        const t = trozos[i];
        t.vy += GRAVEDAD * dt; t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.y > 0) { t.y = 0; t.vx *= 0.6; t.vy *= -0.3; t.vida -= dt * 2; }
        t.vida -= dt;
        if (t.vida <= 0) trozos.splice(i, 1);
      }

      // final: van apareciendo los adornos y luego se gana
      if (terminado > 0) {
        terminado += dt;
        const antes = adornos;
        adornos = Math.min(4, Math.floor((terminado - 0.3) / 0.35) + 1);
        if (adornos > antes) Sonido.efecto('coger');
        if (terminado > 2.3) api.ganar();
        return;
      }

      // una pieza rueda y se rompe tras caer mal
      if (rodando) {
        rodando.t += dt;
        rodando.x += rodando.dir * 60 * dt;
        rodando.vy += GRAVEDAD * dt; rodando.y = Math.min(-rodando.r, rodando.y + rodando.vy * dt);
        if (rodando.t > 0.55) {
          for (let k = 0; k < 18; k++)
            trozos.push({ x: rodando.x, y: rodando.y, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 120, vida: 0.9 });
          Sonido.efecto('golpe'); api.sacudir(0.25);
          rodando = null;
          api.perder(pieza === 0 ? 'LA BASE SE HA ESCAPADO' : '¡SE HA CAIDO LA BOLA! PRUEBA A SOLTARLA MAS CENTRADA');
        }
        return;
      }

      const p = PIEZAS[pieza];
      if (y === null) {                    // balanceándose arriba
        fase += p.vel * dt;
        x = Math.sin(fase) * esc.amplitud;
        if (api.entrada.pulsado('accion')) { y = esc.alturaSuelta; vy = 0; Sonido.efecto('carta'); }
        api.entrada.pulsado('toque');
        return;
      }

      // cayendo
      vy += GRAVEDAD * dt; y += vy * dt;
      const destino = siguienteY(p);
      if (y < destino) return;
      y = destino;
      const de = monton[monton.length - 1];
      const desvio = de ? (x - de.x) / de.r : 0;
      if (!de || Math.abs(desvio) <= AGUANTA) {
        const bien = !de || Math.abs(desvio) <= PERFECTO;
        // si queda bien, se recoloca un poco hacia el centro de la de abajo
        const xFinal = de && bien ? de.x + (x - de.x) * 0.4 : x;
        monton.push({ tipo: p.tipo, r: p.r, x: xFinal, y });
        Sonido.efecto(bien ? 'pareja' : 'escalera');
        if (de) decir(bien ? '¡PERFECTO!' : '¡UF, POR POCO!', bien ? C.oroClaro : C.lila);
        pieza++; y = null; fase = Math.random() * 6;
        if (pieza >= PIEZAS.length) { terminado = 0.001; decir('¡QUE MUÑECO MAS BONITO!', C.oroClaro); }
      } else {
        rodando = { r: p.r, x, y, vy: 0, dir: Math.sign(desvio) || 1, t: 0, tipo: p.tipo };
        y = null;
      }
    }

    /* ---------- Dibujo ---------- */
    // Bola de nieve tramada (luz arriba a la izquierda), una vez por radio
    const bolas = {};
    function bola(ctx, cx, cy, r) {
      if (!bolas[r]) {
        const [cv, g] = Sprites.lienzoAux(2 * r + 1, 2 * r + 1);
        for (let yy = -r; yy <= r; yy++)
          for (let xx = -r; xx <= r; xx++) {
            const d = Math.hypot(xx, yy);
            if (d > r + 0.3) continue;
            const luz = 0.5 - (xx * 0.5 + yy * 0.7) / r * 0.45 + (d > r - 1.5 ? -0.15 : 0);
            const u = Sprites.umbral(xx + r, yy + r);
            g.fillStyle = luz > 0.75 + u * 0.15 ? C.blanco : luz > 0.42 + u * 0.2 ? C.nieve : luz > 0.2 + u * 0.15 ? C.nieve3 : C.nieve4;
            g.fillRect(xx + r, yy + r, 1, 1);
          }
        bolas[r] = cv;
      }
      ctx.drawImage(bolas[r], Math.round(cx) - r, Math.round(cy) - r);
    }

    function sombrero(ctx, cx, cy) {
      const x = Math.round(cx), y = Math.round(cy);             // (x, y) = centro del ala
      ctx.fillStyle = C.tinta; ctx.fillRect(x - 8, y - 1, 17, 2); ctx.fillRect(x - 5, y - 10, 11, 9);
      ctx.fillStyle = '#2c2c3a'; ctx.fillRect(x - 4, y - 9, 2, 7);
      ctx.fillStyle = C.rojo; ctx.fillRect(x - 5, y - 4, 11, 2);
      ctx.fillStyle = C.oro; ctx.fillRect(x + 2, y - 4, 2, 2);
    }

    function pintarPieza(ctx, p, cx, cy) {
      if (p.tipo === 'sombrero') sombrero(ctx, cx, cy); else bola(ctx, cx, cy, p.r);
    }

    // Adornos que se añaden solos al final (sobre las tres bolas)
    function pintarAdornos(ctx, n) {
      const [base, cuerpo, cabeza] = monton;
      const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
      if (n >= 1) { r(C.tinta, cabeza.x - 4, cabeza.y - 3, 2, 2); r(C.tinta, cabeza.x + 3, cabeza.y - 3, 2, 2); }   // ojos
      if (n >= 2) { r(C.naranja, cabeza.x, cabeza.y, 6, 2); r('#c0641e', cabeza.x + 4, cabeza.y + 1, 2, 1); }          // nariz de zanahoria
      if (n >= 3) {                                                                                                   // bufanda y botones
        r(C.rojo, cuerpo.x - 9, cuerpo.y - cuerpo.r + 1, 19, 3); r(C.rojo, cuerpo.x + 4, cuerpo.y - cuerpo.r + 3, 3, 7);
        r(C.rojoOsc, cuerpo.x + 4, cuerpo.y - cuerpo.r + 8, 3, 2);
        for (const dy of [-5, 1, 7]) r(C.tinta, cuerpo.x, cuerpo.y + dy, 2, 2);
        r(C.tinta, base.x, base.y - 8, 2, 2);
      }
      if (n >= 4) {                                                                                                   // brazos de rama
        r(C.maderaOsc, cuerpo.x - cuerpo.r - 12, cuerpo.y - 4, 13, 2); r(C.maderaOsc, cuerpo.x - cuerpo.r - 12, cuerpo.y - 8, 2, 4);
        r(C.maderaOsc, cuerpo.x + cuerpo.r - 1, cuerpo.y - 3, 13, 2); r(C.maderaOsc, cuerpo.x + cuerpo.r + 10, cuerpo.y - 7, 2, 4);
      }
    }

    // Jardín nevado (una vez por tamaño)
    const fondos = {};
    function crearFondo(w, h, suelo) {
      const [cv, g] = Sprites.lienzoAux(w, h);
      Comun.fondoNoche(g, 0, h, w);
      // casas lejanas
      g.fillStyle = '#141a3c';
      for (let x = -10, i = 0; x < w; x += 46 + (i * 13) % 20, i++) {
        const hh = 26 + (i * 29) % 30;
        g.fillRect(x, suelo - hh, 40, hh);
        g.fillStyle = '#ffd98a';
        for (let wy = suelo - hh + 6; wy < suelo - 6; wy += 9) if ((i + wy) % 3) g.fillRect(x + 8 + (wy % 2) * 16, wy, 4, 4);
        g.fillStyle = C.nieve3; g.fillRect(x, suelo - hh, 40, 2);
        g.fillStyle = '#141a3c';
      }
      g.fillStyle = C.nieve2; g.fillRect(0, suelo, w, h - suelo);
      g.fillStyle = C.nieve; g.fillRect(0, suelo, w, 2);
      Sprites.tramar(g, 0, suelo + 6, w, h - suelo - 6, C.nieve3, (xx, yy) => (yy - suelo - 6) / 24);
      return cv;
    }

    function dibujar(ctx, api) {
      const ancho = api.ancho, alto = api.alto, suelo = alto - 22;
      const clave = ancho + 'x' + alto;
      ctx.drawImage(fondos[clave] || (fondos[clave] = crearFondo(ancho, alto, suelo)), 0, 0);

      // la escena se amplía al doble si hay altura de sobra (móvil vertical)
      const K = alto >= 420 ? 2 : 1;
      const cx = Math.floor(ancho / 2);
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 14 + (ancho - api.margenDerecho < 230 ? altoCaja + 6 : 0);
      ctx.save();
      ctx.translate(cx, suelo);
      ctx.scale(K, K);
      // la chica mira desde un lado (fuera del alcance del balanceo)
      Sprites.personaje(ctx, -Math.min(escena.amplitud + 30, Math.floor(ancho / K / 2) - 12), 0, 1, terminado > 0 && Math.floor(api.t * 6) % 2 ? 'andar' : 'idle', api.t);
      // sombra del muñeco
      ctx.fillStyle = C.nieve3; ctx.fillRect(-29, 0, 59, 2);
      for (const p of monton) pintarPieza(ctx, p, p.x, p.y);
      if (adornos) pintarAdornos(ctx, adornos);
      if (rodando) pintarPieza(ctx, rodando, rodando.x, rodando.y);
      ctx.fillStyle = C.nieve;
      for (const t of trozos) ctx.fillRect(Math.round(t.x), Math.round(t.y), 2, 2);

      // la pieza que se balancea (o cae), con la cuerda de la que cuelga y una guía de puntos
      if (pieza < PIEZAS.length && !rodando && terminado === 0) {
        const p = PIEZAS[pieza];
        const alturaSuelta = Math.round((arriba - suelo) / K) + p.r + 4;
        const py = y === null ? alturaSuelta : y;
        if (y === null) {
          ctx.fillStyle = C.nieve3; ctx.fillRect(Math.round(x), alturaSuelta - p.r - 40, 1, 40 - (p.tipo === 'sombrero' ? 8 : 0));
          ctx.fillStyle = '#5a6aa8';
          for (let gy = alturaSuelta + p.r + 4; gy < siguienteY(p) - p.r; gy += 6) ctx.fillRect(Math.round(x), gy, 1, 2);
        }
        pintarPieza(ctx, p, x, py);
        // datos que necesita actualizar() (en unidades de la escena)
        escena.amplitud = Math.min(110, Math.floor(ancho / K / 2) - 30);
        escena.alturaSuelta = alturaSuelta;
      }
      ctx.restore();

      if (mensaje) {
        const em = Comun.medir(mensaje.texto, e + 1) <= ancho - 12 ? e + 1 : e;
        texto(ctx, mensaje.texto, cx, arriba + 10, mensaje.color, { escala: em, centro: true, sombra: C.tinta });
      }

      // marcador: piezas colocadas
      const t1 = `PIEZAS ${monton.length}/${PIEZAS.length}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    const escena = { amplitud: 100, alturaSuelta: -150 };

    // Solo en modo debug: posición de la pieza y del monton, para las pruebas automáticas
    if (Dias.debug) window.munecoDebug = () => ({
      pieza, x, cayendo: y !== null, monton: monton.map((p) => p.x), terminado: terminado > 0, rodando: !!rodando
    });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'MUÑECO DE NIEVE',
      instruccion: 'LA BOLA SE BALANCEA: PULSA ESPACIO O TOCA PARA SOLTARLA ENCIMA DE LA ANTERIOR. BASE, CUERPO, CABEZA Y SOMBRERO. ¡QUE NO SE CAIGA!',
      pantallaCompleta: true,
      musica: 'alegria',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, escena),
      dibujar
    });
  }
};
