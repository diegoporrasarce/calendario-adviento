'use strict';
/* Día 16 — Puzzle deslizante.
   Una foto vuestra (campo "imagen" de dias.json) "rota por el terremoto" en 3x3: 8 piezas y un hueco.
   Se toca una pieza junto al hueco para deslizarla (o se usan las flechas: la pieza se mueve en esa
   dirección). A un lado, la foto en pequeño como guía. Se desordena con movimientos válidos desde la
   foto entera, así que siempre tiene solución. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia16-puzle'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const N = 3, HUECO = N * N - 1;
    const foto = new Image();
    let fotoLista = false, fotoFallo = false;
    foto.onload = () => { fotoLista = true; };
    foto.onerror = () => { fotoFallo = true; };
    foto.src = (datos && datos.imagen) || 'fotos/postal-navidad.png';

    let piezas, movs, anim, final;      // piezas[posición] = número de pieza (HUECO = vacío)

    function vecinos(i) {
      const x = i % N, y = Math.floor(i / N), v = [];
      if (x > 0) v.push(i - 1); if (x < N - 1) v.push(i + 1); if (y > 0) v.push(i - N); if (y < N - 1) v.push(i + N);
      return v;
    }
    const resuelto = () => piezas.every((p, i) => p === i);

    function reiniciar() {
      piezas = [...Array(N * N).keys()];
      let hueco = HUECO, antes = -1;
      for (let k = 0; k < 120 || resuelto(); k++) {                        // desordenar con movimientos válidos
        const v = vecinos(hueco).filter((i) => i !== antes);
        const i = v[Math.floor(Math.random() * v.length)];
        [piezas[hueco], piezas[i]] = [piezas[i], piezas[hueco]];
        antes = hueco; hueco = i;
      }
      movs = 0; anim = null; final = 0;
    }

    function mover(i) {
      const hueco = piezas.indexOf(HUECO);
      if (!vecinos(hueco).includes(i) || anim) return false;
      anim = { desde: i, hasta: hueco, pieza: piezas[i], t: 0 };
      [piezas[hueco], piezas[i]] = [piezas[i], piezas[hueco]];
      movs++;
      Sonido.efecto('carta');
      if (resuelto()) { final = 0.001; Sonido.efecto('completar'); }
      return true;
    }

    function disposicion(api) {
      const e = api.textoEscala, altoCaja = Comun.altoTexto(e) + 8;
      const arriba = 6 + altoCaja + 14 + (api.ancho - api.margenDerecho < 240 ? altoCaja + 6 : 0);
      const vertical = api.alto - arriba > api.ancho * 1.15;
      // tablero grande y la foto guía (más pequeña) al lado o debajo
      const lado = vertical
        ? Math.floor(Math.min((api.ancho - 20) / N, (api.alto - arriba - 110) / N))
        : Math.floor(Math.min((api.ancho - 130) / N, (api.alto - arriba - 16) / N));
      const tam = lado * N, guia = vertical ? Math.min(80, api.alto - arriba - tam - 34) : Math.min(90, Math.floor(tam / 2));
      const x0 = vertical ? Math.floor((api.ancho - tam) / 2) : Math.floor((api.ancho - tam - guia - 16) / 2);
      const y0 = arriba + Math.max(0, Math.floor((api.alto - arriba - (vertical ? tam + guia + 24 : tam)) / 2));
      const gx = vertical ? Math.floor((api.ancho - guia) / 2) : x0 + tam + 16, gy = vertical ? y0 + tam + 20 : y0;
      return { lado, x0, y0, gx, gy, guia, e, altoCaja };
    }

    function actualizar(dt, api, d) {
      if (anim) { anim.t += dt / 0.12; if (anim.t >= 1) anim = null; }
      if (final > 0) { final += dt; if (final > 2) api.ganar(); return; }
      const e = api.entrada, hueco = piezas.indexOf(HUECO), hx = hueco % N, hy = Math.floor(hueco / N);
      // flechas: la pieza del lado opuesto al hueco se mueve en esa dirección
      if (e.pulsado('izquierda') && hx < N - 1) mover(hueco + 1);
      if (e.pulsado('derecha') && hx > 0) mover(hueco - 1);
      if (e.pulsado('arriba') && hy < N - 1) mover(hueco + N);
      if (e.pulsado('abajo') && hy > 0) mover(hueco - N);
      if (e.pulsado('toque')) {
        e.pulsado('accion');
        const cx = Math.floor((e.puntero.x - d.x0) / d.lado), cy = Math.floor((e.puntero.y - d.y0) / d.lado);
        if (cx >= 0 && cy >= 0 && cx < N && cy < N) mover(cy * N + cx);
      }
      e.pulsado('accion');
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

    function trozo(ctx, p, x, y, lado) {
      if (fotoLista) {
        const sw = foto.naturalWidth / N, sh = foto.naturalHeight / N;
        ctx.drawImage(foto, (p % N) * sw, Math.floor(p / N) * sh, sw, sh, Math.round(x), Math.round(y), lado, lado);
      } else {
        r(ctx, ['#c8383f', '#3f8a5c', '#4a7ad8', '#f2c94c', '#9a5ad0', '#f08a2c', '#5cd6ff', '#e8a096', '#8a92b0'][p], x, y, lado, lado);
        texto(ctx, String(p + 1), x + lado / 2, y + lado / 2 - 7, C.blanco, { escala: 2, centro: true, sombra: C.tinta });
      }
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), L = d.lado, t = api.t;
      ctx.fillStyle = '#1b1426'; ctx.fillRect(0, 0, api.ancho, api.alto);
      // marco del cuadro
      r(ctx, C.oro, d.x0 - 6, d.y0 - 6, L * N + 12, L * N + 12); r(ctx, '#8a5a1e', d.x0 - 3, d.y0 - 3, L * N + 6, L * N + 6);
      r(ctx, '#0b0d22', d.x0, d.y0, L * N, L * N);
      piezas.forEach((p, i) => {
        if (p === HUECO && final === 0) return;
        let x = d.x0 + (i % N) * L, y = d.y0 + Math.floor(i / N) * L;
        if (anim && anim.hasta === i) {                                     // deslizándose desde su sitio anterior
          const k = Math.min(1, anim.t);
          x = d.x0 + ((anim.desde % N) + ((i % N) - (anim.desde % N)) * k) * L;
          y = d.y0 + (Math.floor(anim.desde / N) + (Math.floor(i / N) - Math.floor(anim.desde / N)) * k) * L;
        }
        trozo(ctx, p, x, y, L);
        if (final === 0) {                                                  // bordes de pieza rota
          r(ctx, C.tinta, x, y, L, 1); r(ctx, C.tinta, x, y, 1, L);
          r(ctx, '#4a4050', x + L - 1, y, 1, L); r(ctx, '#4a4050', x, y + L - 1, L, 1);
          r(ctx, C.tinta, x + 4 + (p * 7) % (L - 10), y + 2, 1, 4);         // grietas
        }
      });
      if (final > 0 && Math.floor(t * 6) % 2) {                             // la foto, entera, brilla
        r(ctx, C.oroClaro, d.x0 - 6, d.y0 - 6, L * N + 12, 2); r(ctx, C.oroClaro, d.x0 - 6, d.y0 + L * N + 4, L * N + 12, 2);
      }
      // foto guía
      if (d.guia > 20) {
        r(ctx, C.nieve3, d.gx - 2, d.gy - 2, d.guia + 4, d.guia + 4);
        if (fotoLista) ctx.drawImage(foto, d.gx, d.gy, d.guia, d.guia); else r(ctx, '#3a3f58', d.gx, d.gy, d.guia, d.guia);
        texto(ctx, 'GUIA', d.gx + d.guia / 2, d.gy + d.guia + 6, C.nieve3, { centro: true });
      }
      const e = d.e;
      if (final > 0) {
        const em = Comun.medir('¡RECOMPUESTA!', e + 1) <= api.ancho - 12 ? e + 1 : e;
        texto(ctx, '¡RECOMPUESTA!', Math.floor(api.ancho / 2), d.y0 - Comun.altoTexto(em) - 12, C.oroClaro, { escala: em, centro: true, sombra: C.tinta });
      }
      if (fotoFallo) texto(ctx, 'NO SE PUDO CARGAR LA FOTO', Math.floor(api.ancho / 2), api.alto - 14, C.rojoClaro, { centro: true });
      const t1 = `MOVIMIENTOS ${movs}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, d.altoCaja);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: el tablero, para las pruebas (resolver con movimientos válidos)
    let ultima = null;
    if (Dias.debug) window.puzleDebug = () => ({ piezas: [...piezas], final: final > 0, movs, fotoLista,
      centros: ultima ? piezas.map((_, i) => ({ x: ultima.x0 + (i % N) * ultima.lado + ultima.lado / 2, y: ultima.y0 + Math.floor(i / N) * ultima.lado + ultima.lado / 2 })) : [] });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'PUZZLE DESLIZANTE',
      instruccion: 'EL TERREMOTO HA ROTO LA POSTAL DE NAVIDAD. TOCA UNA PIEZA JUNTO AL HUECO PARA MOVERLA (O USA LAS FLECHAS) HASTA RECOMPONERLA.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'puzle',
      reiniciar,
      actualizar: (dt, api) => { ultima = disposicion(api); actualizar(dt, api, ultima); },
      dibujar
    });
  }
};
