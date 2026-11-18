'use strict';
/* Día 6 — Sube la escalera (ritmo).
   Por la derecha suben flechas al compás de «Carol of the Bells». Hay que pulsar ↑ (o Espacio, o tocar)
   cuando cada flecha llega al recuadro. Acierto = un peldaño más; fallo = resbala uno (pero nunca baja
   del último piso alcanzado). Hay que subir los 6 pisos antes de que acabe el tiempo. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia06-escalera'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const PISOS = 6, PELDANOS_PISO = 4, META = PISOS * PELDANOS_PISO;
    const TIEMPO = 40;
    const VENTANA = 0.17, PERFECTO = 0.08;     // segundos de margen para acertar (y para "¡PERFECTO!")
    const VEL_FLECHA = 95;                     // px por segundo que suben las flechas
    const SEP = 8;                             // separación entre peldaños (px, en unidades de la escena)
    const ALTO_ESCENA = PISOS * PELDANOS_PISO * SEP + 34;   // del suelo a lo alto de la puerta del tejado
    const TEMPO_SIN_AUDIO = 0.28;              // si no hay audio, el mismo ritmo con un reloj propio

    let peldano, altura, flechas, siguienteCompas, quedan, aviso, ganada, tSubir, relojPropio, latido;

    // Pulso actual de la música (o del reloj propio si el audio no está en marcha)
    function reloj() {
      const m = Sonido.pulsoMusica();
      if (m) return { pulso: m.pulso, tempo: m.tempo, compas: m.compas };
      return { pulso: relojPropio / TEMPO_SIN_AUDIO, tempo: TEMPO_SIN_AUDIO, compas: 3 };
    }

    function reiniciar() {
      peldano = 0; altura = 0; flechas = []; quedan = TIEMPO; aviso = null; ganada = 0; tSubir = 0;
      relojPropio = 0; latido = 0;
      const r = reloj();
      siguienteCompas = Math.floor(r.pulso / r.compas) + 2;          // las flechas empiezan dos compases después
    }

    // Flechas: una al principio de cada compás y, cada pocos compases, otra en el tercer pulso
    function generarFlechas(r) {
      while (siguienteCompas * r.compas < r.pulso + 14) {
        const k = siguienteCompas++;
        flechas.push({ pulso: k * r.compas, estado: 'pendiente', t: 0 });
        const doble = quedan > TIEMPO / 2 ? k % 3 === 2 : k % 2 === 1;   // en la segunda mitad, más dobles
        if (doble) flechas.push({ pulso: k * r.compas + 2, estado: 'pendiente', t: 0 });
      }
    }

    const pisoAlcanzado = () => Math.floor(peldano / PELDANOS_PISO);

    function decir(texto, color) { aviso = { texto, color, vida: 0.7 }; }

    function resbalar() {
      const minimo = pisoAlcanzado() * PELDANOS_PISO;
      if (peldano > minimo) peldano--;
      Sonido.efecto('bloqueada');
      decir('¡FALLO!', C.rojoClaro);
    }

    function actualizar(dt, api) {
      relojPropio += dt;
      latido = Math.max(0, latido - dt);
      if (aviso) { aviso.vida -= dt; if (aviso.vida <= 0) aviso = null; }
      altura += (peldano - altura) * Math.min(1, dt * 12);              // la chica sube con suavidad
      if (ganada > 0) { ganada -= dt; if (ganada <= 0) api.ganar(); return; }

      const r = reloj();
      generarFlechas(r);
      const e = api.entrada;
      const pulsa = e.pulsado('arriba') | e.pulsado('accion');
      e.pulsado('toque');

      if (pulsa) {
        // la flecha pendiente más cercana al momento de la pulsación
        let mejor = null, distancia = Infinity;
        for (const f of flechas) {
          if (f.estado !== 'pendiente') continue;
          const d = Math.abs(f.pulso - r.pulso) * r.tempo;
          if (d < distancia) { distancia = d; mejor = f; }
        }
        if (mejor && distancia <= VENTANA) {
          mejor.estado = 'acertada';
          const piso = pisoAlcanzado();
          peldano++; tSubir += 0.17; latido = 0.15;
          Sonido.efecto('escalera');
          decir(distancia <= PERFECTO ? '¡PERFECTO!' : '¡BIEN!', distancia <= PERFECTO ? C.oroClaro : '#8fe0a0');
          if (pisoAlcanzado() > piso) { Sonido.efecto('coger'); api.aviso(`¡PISO ${pisoAlcanzado()}!`, Math.floor(api.ancho * 0.35), Math.floor(api.alto * 0.4), C.oroClaro); }
          if (peldano >= META) { ganada = 1; Sonido.efecto('pareja'); return; }
        } else {
          resbalar();                                                      // a destiempo
        }
      }

      // flechas que pasan sin pulsar
      for (const f of flechas) {
        if (f.estado === 'pendiente' && (r.pulso - f.pulso) * r.tempo > VENTANA) { f.estado = 'fallada'; resbalar(); }
        if (f.estado !== 'pendiente') f.t += dt;
      }
      flechas = flechas.filter((f) => f.t < 0.4);

      quedan -= dt;
      if (quedan <= 0) { quedan = 0; api.perder(`SE ACABO EL TIEMPO EN EL PISO ${pisoAlcanzado()} DE ${PISOS}`); }
    }

    /* ---------- Dibujo ---------- */
    // Escena (en unidades de la escena, se dibuja ampliada K veces): la escalera en x = 0, el suelo en y = 0
    function escena(ctx, t) {
      const r = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const arriba = -META * SEP - 30;
      // muro de ladrillo a la izquierda
      r('#5e2620', -96, arriba, 88, -arriba + 4);
      for (let y = arriba, f = 0; y < 0; y += 4, f++)
        for (let x = -96 - (f % 2) * 4; x < -8; x += 8) { r(f % 3 ? '#a2432f' : '#9a3d2b', Math.max(x, -96), y, Math.min(7, -8 - Math.max(x, -96)), 3); }
      Sprites.tramar(ctx, -40, arriba, 32, -arriba, '#4a1830', (x) => (x + 40) / 32 * 0.7);
      for (let p = 0; p <= PISOS; p++) {
        const y = -p * PELDANOS_PISO * SEP;
        // forjado y pasarela
        r('#cfc8bd', -98, y, 92, 2); r('#8c857b', -98, y + 2, 92, 1);
        r('#4a5068', -6, y, 24, 2); r('#8890ac', -6, y, 24, 1);
        if (p > 0 && p < PISOS) {
          // ventana iluminada y placa con el número del piso, justo encima de su forjado
          // (el piso p es donde se llega al subir p plantas; el 6 es el tejado con la puerta de casa)
          const ys = y - PELDANOS_PISO * SEP;
          r('#3b2622', -70, ys + 7, 16, 13); r('#ffe9a0', -69, ys + 8, 14, 5); r('#f0a93a', -69, ys + 13, 14, 6);
          r('#3b2622', -63, ys + 8, 2, 11);
          r(C.tinta, -42, ys + 7, 11, 11); r(C.oro, -42, ys + 7, 11, 1);
          Comun.texto(ctx, String(p), -39, ys + 9, C.oroClaro);
        }
      }
      // tejado nevado y la puerta de casa arriba del todo
      const yt = -PISOS * PELDANOS_PISO * SEP;
      r('#f4f8ff', -100, yt - 3, 120, 3);
      r('#2b1a14', -30, yt - 22, 14, 20); r('#c2802a', -29, yt - 21, 12, 19); r('#f6cf63', -20, yt - 12, 2, 2);
      Sprites.corona(ctx, -23, yt - 16, '#c2802a');
      r(C.tinta, -46, yt - 19, 11, 11); r(C.oro, -46, yt - 19, 11, 1);      // placa del piso 6 (casa)
      Comun.texto(ctx, String(PISOS), -43, yt - 17, C.oroClaro);
      // escalera de mano
      r('#8a92b0', -5, yt - 10, 1, -yt + 10); r('#8a92b0', 5, yt - 10, 1, -yt + 10);
      for (let i = 0; i <= META + 1; i++) r('#6a7190', -4, -i * SEP - 1, 9, 1);
      Sprites.abeto(ctx, 40, 6, 46); Sprites.abeto(ctx, -120, 6, 40);
      // la chica en la escalera
      const y = -Math.round(altura * SEP);
      Sprites.personaje(ctx, 0, y, 1, peldano > 0 || altura > 0.05 ? 'subir' : 'idle', peldano > 0 ? tSubir : t);
    }

    function flechaIcono(ctx, x, y, color, sombra) {
      const filas = [[6, 1], [5, 3], [4, 5], [3, 7], [2, 9], [1, 11], [4, 5], [4, 5], [4, 5], [4, 5]];
      ctx.fillStyle = sombra;
      filas.forEach(([a, w], j) => ctx.fillRect(x + a - 6 + 1, y + j + 1, w, 1));
      ctx.fillStyle = color;
      filas.forEach(([a, w], j) => ctx.fillRect(x + a - 6, y + j, w, 1));
    }

    function dibujar(ctx, api) {
      const ancho = api.ancho, alto = api.alto;
      Comun.fondoNoche(ctx, api.t, alto, ancho);

      // el edificio entero siempre a la vista: al doble si cabe (móvil vertical), si no a tamaño normal
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arribaLibre = 6 + altoCaja + 10 + (ancho - api.margenDerecho < 230 ? altoCaja + 6 : 0);
      const sueloPantalla = alto - 14;
      const K = (sueloPantalla - arribaLibre) >= ALTO_ESCENA * 2 ? 2 : 1;
      const xEscalera = Math.floor(ancho * 0.42) + (K === 1 ? 20 : 0);
      // suelo nevado de lado a lado
      ctx.fillStyle = '#f4f8ff'; ctx.fillRect(0, sueloPantalla, ancho, 2);
      ctx.fillStyle = '#dbe5f5'; ctx.fillRect(0, sueloPantalla + 2, ancho, alto - sueloPantalla);
      ctx.save();
      ctx.translate(xEscalera, sueloPantalla);
      ctx.scale(K, K);
      escena(ctx, api.t);
      ctx.restore();

      // carril de las flechas a la derecha
      const r = reloj();
      const carrilX = Math.min(ancho - 34, xEscalera + 40 * K + 50), carrilW = 26;
      const receptorY = 6 + altoCaja + 22 + (ancho - api.margenDerecho < 230 ? altoCaja + 6 : 0);
      ctx.fillStyle = '#0b0d22'; ctx.fillRect(carrilX - carrilW / 2, receptorY - 8, carrilW, alto - receptorY + 8);
      ctx.fillStyle = '#26305f'; ctx.fillRect(carrilX - carrilW / 2, receptorY - 8, 1, alto); ctx.fillRect(carrilX + carrilW / 2 - 1, receptorY - 8, 1, alto);
      // recuadro donde hay que pulsar (late con cada pulso de la música)
      const enPulso = (r.pulso % 1 + 1) % 1 < 0.15 || latido > 0;
      ctx.fillStyle = enPulso ? C.oroClaro : C.oro;
      ctx.fillRect(carrilX - 11, receptorY - 4, 22, 2); ctx.fillRect(carrilX - 11, receptorY + 13, 22, 2);
      ctx.fillRect(carrilX - 11, receptorY - 4, 2, 19); ctx.fillRect(carrilX + 9, receptorY - 4, 2, 19);
      for (const f of flechas) {
        const y = receptorY + Math.round((f.pulso - r.pulso) * r.tempo * VEL_FLECHA);
        if (y > alto + 12) continue;
        if (f.estado === 'pendiente') flechaIcono(ctx, carrilX, y, C.nieve, C.tinta);
        else if (f.estado === 'acertada') { if (Math.floor(f.t * 20) % 2 === 0) flechaIcono(ctx, carrilX, receptorY - Math.round(f.t * 30), '#8fe0a0', C.verdeOsc); }
        else flechaIcono(ctx, carrilX, y, C.rojoOsc, C.tinta);
      }
      if (aviso) {                                                         // centrado en el carril, sin salirse de la pantalla
        const mitad = Math.ceil(Comun.medir(aviso.texto, e) / 2) + 4;
        texto(ctx, aviso.texto, Math.min(carrilX, ancho - mitad), receptorY + 22, aviso.color, { centro: true, sombra: C.tinta, escala: e });
      }

      // marcadores: piso y tiempo
      const t1 = `PISO ${pisoAlcanzado()}/${PISOS}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
      const anchoBarra = 50, anchoNum = Comun.medir('40', e), w2 = anchoBarra + anchoNum + 12;
      let x2 = Math.max(Comun.medir(t1, e) + 22, Math.floor((ancho - w2) / 2)), y2 = 6;
      if (x2 + w2 > ancho - api.margenDerecho) { x2 = 6; y2 = 6 + altoCaja + 6; }
      Comun.caja(ctx, x2, y2, w2, altoCaja);
      const frac = Math.max(0, quedan / TIEMPO);
      ctx.fillStyle = C.nocheClara; ctx.fillRect(x2 + 4, y2 + 4, anchoBarra, altoCaja - 8);
      ctx.fillStyle = quedan < 10 ? C.rojoClaro : C.verde; ctx.fillRect(x2 + 4, y2 + 4, Math.round(anchoBarra * frac), altoCaja - 8);
      texto(ctx, String(Math.ceil(quedan)), x2 + anchoBarra + 8, y2 + 4, quedan < 10 ? C.rojoClaro : C.nieve, { escala: e });
    }

    // Solo en modo debug: reloj y flechas, para las pruebas automáticas
    if (Dias.debug) window.escaleraDebug = () => {
      const r = reloj();
      return { pulso: r.pulso, tempo: r.tempo, peldano, flechas: flechas.filter((f) => f.estado === 'pendiente').map((f) => f.pulso) };
    };

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'SUBE LA ESCALERA',
      instruccion: 'PULSA ↑ (O TOCA) CUANDO CADA FLECHA LLEGUE AL RECUADRO, AL RITMO DE LA MUSICA. SUBE LOS 6 PISOS EN 40 SEGUNDOS. SI FALLAS, RESBALAS.',
      pantallaCompleta: true,
      musica: 'campanas',
      reiniciar, actualizar, dibujar
    });
  }
};
