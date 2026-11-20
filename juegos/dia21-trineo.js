'use strict';
/* Día 21 — Trineo por la cuesta.
   Vista desde arriba: la chica baja en trineo por la calle nevada, que se desplaza hacia arriba. Con ← → (o
   arrastrando el dedo) esquiva muñecos de nieve, abetos, rocas y otros trineos, y recoge regalos. Al chocar
   se para un momento y pierde un regalo. Llega a la meta al reunir 12. No se puede perder. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia21-trineo'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 12, W = 190, CALLE = [22, 168], LIBRE = [30, 160];       // ancho de la escena, bordes de la calle y por dónde va el trineo
    const TRINEO_Y = 58, V_INI = 72, V_MAX = 210, LATERAL = 115;
    const COLORES = [[C.rojo, C.oro], [C.verde, C.nieve], ['#4a7ad8', C.oroClaro], ['#9a5ad0', C.nieve], [C.oro, C.rojo]];
    const RADIO = { muneco: 6, abeto: 6, roca: 8, nino: 7 };

    let x, vx, dist, vel, regalos, objetos, proxFila, aturdido, invulnerable, final, chispas, filas, rastro, metaY;

    function reiniciar() {
      x = 95; vx = 0; dist = 0; vel = V_INI; regalos = 0; objetos = []; proxFila = 150; aturdido = 0; invulnerable = 0;
      final = 0; chispas = []; filas = 0; rastro = [];
    }

    // Una fila nueva bajo la pantalla: 1 o 2 obstáculos dejando siempre un hueco ancho, y a veces un regalo en él
    function nuevaFila(yMundo) {
      filas++;
      const dificil = Math.min(1, dist / 2600);
      const n = Math.random() < 0.25 + dificil * 0.45 ? 2 : 1;
      const ocupadas = [];
      for (let k = 0; k < n; k++) {
        for (let intento = 0; intento < 20; intento++) {
          const ox = LIBRE[0] + 6 + Math.random() * (LIBRE[1] - LIBRE[0] - 12);
          if (ocupadas.some((o) => Math.abs(o - ox) < 60)) continue;        // entre dos obstáculos siempre cabe el trineo
          const tipos = filas > 8 && Math.random() < 0.18 + dificil * 0.2 ? ['nino'] : ['muneco', 'abeto', 'roca'];
          const tipo = tipos[Math.floor(Math.random() * tipos.length)];
          objetos.push({ tipo, x: ox, y: yMundo + (Math.random() * 16 - 8), vx: tipo === 'nino' ? (Math.random() < 0.5 ? -1 : 1) * (22 + dificil * 18) : 0 });
          ocupadas.push(ox);
          break;
        }
      }
      if (Math.random() < 0.7) {
        for (let intento = 0; intento < 20; intento++) {
          const gx = LIBRE[0] + 4 + Math.random() * (LIBRE[1] - LIBRE[0] - 8);
          if (ocupadas.some((o) => Math.abs(o - gx) < 24)) continue;
          const [c1, c2] = COLORES[Math.floor(Math.random() * COLORES.length)];
          objetos.push({ tipo: 'regalo', x: gx, y: yMundo + 30, c1, c2 });
          break;
        }
      }
    }

    function disposicion(api) {
      const K = Math.max(1, Math.floor(Math.min(api.ancho / W, api.alto / 190)));
      return { K, H: Math.ceil(api.alto / K), ox: Math.floor((api.ancho / K - W) / 2) };
    }

    function actualizar(dt, api, d) {
      if (aturdido > 0) aturdido -= dt;
      if (invulnerable > 0) invulnerable -= dt;
      for (const c of chispas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vida -= dt; }
      chispas = chispas.filter((c) => c.vida > 0);
      if (final > 0) { final += dt; vel = Math.max(0, vel - 90 * dt); dist += vel * dt; if (final > 2.2) api.ganar(); return; }

      // velocidad: va subiendo poco a poco; tras un choque arranca despacio
      // la velocidad no para de subir (hasta V_MAX); el giro también se hace algo más rápido para poder esquivar
      const objetivoV = Math.min(V_MAX, V_INI + dist * 0.045);
      vel = aturdido > 0 ? 0 : Math.min(objetivoV, vel + 40 * dt);
      dist += vel * dt;

      // dirección: flechas con un poco de inercia, o el dedo (va hacia donde está)
      const e = api.entrada;
      const lateral = LATERAL * (0.85 + 0.45 * (objetivoV - V_INI) / (V_MAX - V_INI));
      let meta = ((e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0)) * lateral;
      if (!e.derecha && !e.izquierda && e.puntero.abajo) meta = Math.max(-lateral, Math.min(lateral, ((e.puntero.x / d.K - d.ox) - x) * 6));
      if (aturdido > 0) meta = 0;
      vx += (meta - vx) * Math.min(1, dt * 9);
      x = Math.max(LIBRE[0], Math.min(LIBRE[1], x + vx * dt));
      if (Math.abs(vx) > 60 && Math.random() < 0.5) chispas.push({ x: x - Math.sign(vx) * 6, y: dist + TRINEO_Y + 6, vx: -vx * 0.3 + Math.random() * 20 - 10, vy: -20 - Math.random() * 20, vida: 0.35 });
      if (vel > 0 && Math.floor(dist / 3) !== Math.floor((dist - vel * dt) / 3)) { rastro.push({ x, y: dist + TRINEO_Y }); if (rastro.length > 90) rastro.shift(); }

      // filas nuevas por debajo de la pantalla; los objetos que ya quedaron arriba se borran
      while (proxFila < dist + d.H + 40) { nuevaFila(proxFila); proxFila += Math.max(70, 92 - dist * 0.006); }
      objetos = objetos.filter((o) => o.y > dist - 40 && !o.cogido);
      for (const o of objetos) if (o.vx) {                                  // los otros trineos cruzan la calle
        o.x += o.vx * dt;
        if (o.x < LIBRE[0] || o.x > LIBRE[1]) { o.vx = -o.vx; o.x = Math.max(LIBRE[0], Math.min(LIBRE[1], o.x)); }
      }

      // choques y regalos (el trineo está en dist + TRINEO_Y)
      const ty = dist + TRINEO_Y;
      for (const o of objetos) {
        const dy = o.y - ty, dx = o.x - x;
        if (o.tipo === 'regalo') {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            o.cogido = true; regalos++; Sonido.efecto('coger');
            if (regalos >= META) { final = 0.001; metaY = dist + TRINEO_Y + 34; objetos = objetos.filter((q) => q.tipo === 'regalo' || q.y < metaY - 60 || q.y > metaY + 40); Sonido.efecto('completar'); return; }
          }
        } else if (invulnerable <= 0 && Math.abs(dx) < RADIO[o.tipo] + 4 && Math.abs(dy) < 7) {
          aturdido = 0.8; invulnerable = 2; vx = 0; api.sacudir(0.25); Sonido.efecto('golpe');
          if (regalos > 0) { regalos--; api.aviso('-1', (x + d.ox) * d.K, (TRINEO_Y - 18) * d.K, C.rojoClaro); }
          for (let k = 0; k < 10; k++) chispas.push({ x, y: ty, vx: Math.random() * 80 - 40, vy: Math.random() * 80 - 40, vida: 0.5 });
        }
      }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };
    const ruido = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    function farola(ctx, px, py) {
      r(ctx, '#3a3a44', px, py - 24, 2, 24); r(ctx, '#3a3a44', px - 2, py - 1, 6, 2);
      r(ctx, C.tinta, px - 2, py - 29, 6, 5); r(ctx, C.oroClaro, px - 1, py - 28, 4, 3); r(ctx, C.nieve, px - 2, py - 30, 6, 1);
    }

    function nino(ctx, px, py, dir) {                                     // otro trineo con un niño, de lado
      r(ctx, C.rojoOsc, px - 8, py + 1, 16, 1); r(ctx, C.rojoOsc, px + 7 * dir, py - 1, 1, 2);
      r(ctx, '#a9763f', px - 7, py - 2, 14, 3);
      r(ctx, '#4a7ad8', px - 3, py - 9, 7, 7); r(ctx, C.piel, px - 2, py - 14, 5, 5); r(ctx, C.verde, px - 3, py - 15, 7, 2); r(ctx, C.nieve, px, py - 17, 2, 2);
    }

    function chica(ctx, px, py, t) {                                      // la chica en su trineo, vista de frente (baja hacia la pantalla)
      const ladeo = Math.round(Math.max(-1, Math.min(1, vx / 60)));
      r(ctx, C.rojoOsc, px - 8, py - 12, 1, 18); r(ctx, C.rojoOsc, px + 7, py - 12, 1, 18);      // patines
      r(ctx, C.rojoOsc, px - 8, py + 6, 3, 1); r(ctx, C.rojoOsc, px + 5, py + 6, 3, 1);
      r(ctx, '#8a5a30', px - 6, py - 12, 12, 17);
      for (let k = 0; k < 4; k++) r(ctx, '#b07a44', px - 6, py - 11 + k * 4, 12, 2);                 // tablas
      r(ctx, '#2a3a6a', px - 4, py - 1, 3, 6); r(ctx, '#2a3a6a', px + 1, py - 1, 3, 6);            // piernas hacia delante
      r(ctx, '#2b1a14', px - 4, py + 4, 3, 2); r(ctx, '#2b1a14', px + 1, py + 4, 3, 2);
      r(ctx, C.rojo, px - 5 + ladeo, py - 9, 10, 9);                                             // abrigo
      r(ctx, C.verde, px - 4 + ladeo, py - 10, 8, 2);                                            // bufanda
      r(ctx, '#6b3f23', px - 4 + ladeo, py - 17, 8, 8);                                          // pelo
      r(ctx, C.piel, px - 3 + ladeo, py - 15, 6, 5);                                             // cara
      r(ctx, '#6b3f23', px - 3 + ladeo, py - 16, 6, 2); r(ctx, '#6b3f23', px - 5 + ladeo, py - 14, 1, 6); r(ctx, '#6b3f23', px + 4 + ladeo, py - 14, 1, 6);
      r(ctx, C.tinta, px - 2 + ladeo, py - 13, 1, 1); r(ctx, C.tinta, px + 1 + ladeo, py - 13, 1, 1);
      r(ctx, '#e88a8a', px - 1 + ladeo, py - 11, 2, 1);
      r(ctx, C.rojo, px - 6, py - 6, 2, 3); r(ctx, C.rojo, px + 4, py - 6, 2, 3);                  // manos en la cuerda
      if (aturdido > 0 && Math.floor(t * 8) % 2) { r(ctx, C.oroClaro, px - 8, py - 22, 2, 2); r(ctx, C.oroClaro, px + 6, py - 21, 2, 2); r(ctx, C.oroClaro, px - 1, py - 24, 2, 2); }
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t, Wv = Math.ceil(api.ancho / d.K);
      ctx.fillStyle = '#eef3fb'; ctx.fillRect(0, 0, api.ancho, api.alto);
      ctx.save(); ctx.scale(d.K, d.K); ctx.translate(d.ox, 0);
      const top = dist, yP = (yMundo) => Math.round(yMundo - top);
      // nieve de los lados con abetos y casitas, y la calle algo más pisada
      const xIni = -d.ox - 10, xFin = Wv - d.ox + 10;
      for (let gy = Math.floor(top / 6) * 6; gy < top + d.H + 6; gy += 6)
        for (let gx = Math.floor(xIni / 6) * 6; gx < xFin; gx += 6) if (ruido(gx, gy) > 0.86) r(ctx, '#d7e1f0', gx, yP(gy), 2, 1);
      r(ctx, '#dfe7f3', CALLE[0], 0, CALLE[1] - CALLE[0], d.H);
      for (let gy = Math.floor(top / 5) * 5; gy < top + d.H + 5; gy += 5)
        for (let gx = CALLE[0]; gx < CALLE[1]; gx += 5) if (ruido(gx + 7, gy) > 0.9) r(ctx, '#cfd9ea', gx, yP(gy), 3, 1);
      r(ctx, '#b9c4d8', CALLE[0] - 2, 0, 2, d.H); r(ctx, '#b9c4d8', CALLE[1], 0, 2, d.H);
      // huella del trineo
      for (const p of rastro) { r(ctx, '#c5d0e2', p.x - 7, yP(p.y) - 4, 1, 3); r(ctx, '#c5d0e2', p.x + 6, yP(p.y) - 4, 1, 3); }
      // decorado de los lados (por filas de 40 px del mundo)
      const decorado = [];
      for (let fy = Math.floor((top - 40) / 40) * 40; fy < top + d.H + 40; fy += 40) {
        decorado.push({ y: fy + 30, f: () => farola(ctx, CALLE[0] - 10, yP(fy + 30)) }, { y: fy + 10, f: () => farola(ctx, CALLE[1] + 8, yP(fy + 10)) });
        for (let gx = Math.floor(xIni / 26) * 26; gx < xFin; gx += 26) {
          if (gx > CALLE[0] - 30 && gx < CALLE[1] + 18) continue;
          const v = ruido(gx, fy);
          if (v > 0.45) decorado.push({ y: fy + v * 30, f: () => Sprites.abeto(ctx, gx + 8, yP(fy + v * 30), 18 + Math.floor(v * 14)) });
        }
      }
      // objetos del juego (ordenados por altura para que se tapen bien)
      for (const o of objetos) decorado.push({ y: o.y, f: () => {
        const py = yP(o.y);
        if (o.tipo === 'muneco') Sprites.muneco(ctx, Math.round(o.x), py + 4);
        else if (o.tipo === 'abeto') Sprites.abeto(ctx, Math.round(o.x), py + 5, 22);
        else if (o.tipo === 'roca') { r(ctx, '#6f6a78', o.x - 8, py - 3, 16, 7); r(ctx, '#8c8796', o.x - 6, py - 4, 10, 3); r(ctx, C.nieve, o.x - 7, py - 5, 12, 2); r(ctx, '#c5d0e2', o.x - 9, py + 3, 18, 1); }
        else if (o.tipo === 'nino') nino(ctx, Math.round(o.x), py, Math.sign(o.vx) || 1);
        else if (o.tipo === 'regalo') { const b = Math.floor(t * 3 + o.x) % 2; r(ctx, '#c5d0e2', o.x - 5, py + 4, 10, 1); Sprites.regalo(ctx, Math.round(o.x) - 5, py - 4 - b, 10, 8, o.c1, o.c2); }
      } });
      // la meta: línea a cuadros en el suelo y pancarta en lo alto (la chica pasa por debajo)
      if (final > 0) {
        decorado.push({ y: metaY - 40, f: () => { const my = yP(metaY); for (let gx = CALLE[0]; gx < CALLE[1]; gx += 4) { r(ctx, (gx / 4) % 2 ? C.tinta : C.blanco, gx, my, 4, 2); r(ctx, (gx / 4) % 2 ? C.blanco : C.tinta, gx, my + 2, 4, 2); } } });
        decorado.push({ y: metaY + 1, f: () => { const my = yP(metaY); r(ctx, '#3a3a44', CALLE[0] - 2, my - 36, 2, 38); r(ctx, '#3a3a44', CALLE[1], my - 36, 2, 38);
          r(ctx, C.tinta, CALLE[0], my - 37, CALLE[1] - CALLE[0], 12); r(ctx, C.rojo, CALLE[0] + 1, my - 36, CALLE[1] - CALLE[0] - 2, 10);
          texto(ctx, 'META', Math.round((CALLE[0] + CALLE[1]) / 2), my - 34, C.blanco, { centro: true }); } });
      }
      if (!(invulnerable > 0 && aturdido <= 0 && Math.floor(t * 10) % 2)) decorado.push({ y: dist + TRINEO_Y, f: () => chica(ctx, Math.round(x), TRINEO_Y, t) });
      decorado.sort((a, b) => a.y - b.y).forEach((o) => o.f());
      for (const c of chispas) r(ctx, C.nieve, c.x, yP(c.y), 2, 2);
      ctx.restore();

      const e = api.textoEscala;
      if (final > 0) {
        const m = '¡TODOS LOS REGALOS!', em = Comun.medir(m, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(m, em) + 12, h = Comun.altoTexto(em) + 12;
        const bx = Math.floor((api.ancho - w) / 2), by = Math.floor(api.alto * 0.5);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, m, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
      const t1 = `REGALOS ${regalos}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, Comun.altoTexto(e) + 8);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: posición y objetos cercanos (y relativa al trineo), para las pruebas automáticas
    if (Dias.debug) window.trineoDebug = () => ({ x, regalos, final: final > 0, aturdido: aturdido > 0, dist: Math.round(dist), vel: Math.round(vel),
      objetos: objetos.map((o) => ({ tipo: o.tipo, x: o.x, dy: o.y - dist - TRINEO_Y, vx: o.vx || 0 })) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'TRINEO POR LA CUESTA',
      instruccion: 'BAJA EN TRINEO POR LA CALLE NEVADA. ESQUIVA MUÑECOS, ABETOS, ROCAS Y OTROS TRINEOS CON ← → (O ARRASTRANDO EL DEDO) Y RECOGE 12 REGALOS PARA LLEGAR A LA META.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'trineo',
      reiniciar,
      actualizar: (dt, api) => actualizar(dt, api, disposicion(api)),
      dibujar
    });
  }
};
