'use strict';
/* Día 21 — Trineo por la cuesta (en primera persona).
   Pseudo-3D: la calle nevada se pierde hacia el horizonte (con curvas) y abajo se ven la punta del trineo y las
   manoplas con la cuerda. Con ← → (o el dedo a un lado de la pantalla) se esquivan muñecos de nieve, abetos,
   rocas y otros trineos, y se recogen regalos. La velocidad no para de subir. Al chocar se para un momento y
   pierde un regalo. Llega a la meta al reunir 12. No se puede perder.
   Unidades del mundo: la calle mide 2 de ancho (de -1 a 1); la profundidad z va en las mismas unidades. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia21-trineo'] = {
  iniciarJuego(contenedor, alTerminar) {
    const { PALETA: C, texto } = Comun;
    const META = 12, LIBRE = 0.82, ALTURA_OJO = 0.55, LEJOS = 120;
    const V_INI = 16, V_MAX = 44, LATERAL = 2.4, MEDIO_TRINEO = 0.14;
    const COLORES = [[C.rojo, C.oro], [C.verde, C.nieve], ['#4a7ad8', C.oroClaro], ['#9a5ad0', C.nieve], [C.oro, C.rojo]];
    const ANCHO_OBJ = { muneco: 0.22, abeto: 0.28, roca: 0.3, nino: 0.28 };   // medio ancho para los choques
    const ALTO_OBJ = { muneco: 0.8, abeto: 1.15, roca: 0.3, nino: 0.55, regalo: 0.3 };

    let x, vx, dist, vel, regalos, objetos, proxFila, aturdido, invulnerable, final, filas, metaZ, rojo, giroFondo;

    function reiniciar() {
      x = 0; vx = 0; dist = 0; vel = 0; regalos = 0; objetos = []; proxFila = 40; aturdido = 0; invulnerable = 0;
      final = 0; filas = 0; metaZ = null; rojo = 0; giroFondo = 0;
    }

    // Curvatura de la calle (cambia despacio): desplaza cada punto lejano c·dz² hacia un lado
    const curva = (z) => 0.0035 * Math.sin(z / 170) + 0.0015 * Math.sin(z / 61);

    // Una fila nueva al fondo: 1 o 2 obstáculos dejando siempre hueco para el trineo, y a veces un regalo
    function nuevaFila(z) {
      filas++;
      const dificil = Math.min(1, dist / 1800);
      const n = Math.random() < 0.25 + dificil * 0.45 ? 2 : 1, puestas = [];
      for (let k = 0; k < n; k++) for (let intento = 0; intento < 20; intento++) {
        const ox = (Math.random() * 2 - 1) * (LIBRE - 0.05);
        if (puestas.some((p) => Math.abs(p - ox) < 1.05)) continue;          // entre dos obstáculos siempre cabe
        const tipo = filas > 6 && Math.random() < 0.18 + dificil * 0.2 ? 'nino' : ['muneco', 'abeto', 'roca'][Math.floor(Math.random() * 3)];
        objetos.push({ tipo, x: ox, z: z + Math.random() * 3, vx: tipo === 'nino' ? (Math.random() < 0.5 ? -1 : 1) * (0.25 + dificil * 0.25) : 0 });
        puestas.push(ox);
        break;
      }
      if (Math.random() < 0.7) for (let intento = 0; intento < 20; intento++) {
        const gx = (Math.random() * 2 - 1) * (LIBRE - 0.05);
        if (puestas.some((p) => Math.abs(p - gx) < 0.4)) continue;
        const [c1, c2] = COLORES[Math.floor(Math.random() * COLORES.length)];
        objetos.push({ tipo: 'regalo', x: gx, z: z + 6, c1, c2 });
        break;
      }
    }

    function actualizar(dt, api) {
      if (aturdido > 0) aturdido -= dt;
      if (invulnerable > 0) invulnerable -= dt;
      if (rojo > 0) rojo -= dt;
      if (final > 0) { final += dt; vel = Math.max(0, vel - 14 * dt); dist += vel * dt; if (final > 2.6) api.ganar(); return; }

      const objetivoV = Math.min(V_MAX, V_INI + dist * 0.016);              // cada vez más rápido
      vel = aturdido > 0 ? 0 : Math.min(objetivoV, vel + 9 * dt);
      dist += vel * dt;
      giroFondo += curva(dist) * vel * dt * 60;                             // el paisaje del fondo gira con las curvas

      const e = api.entrada, lateral = LATERAL * (0.8 + 0.6 * (objetivoV - V_INI) / (V_MAX - V_INI));
      let meta = ((e.derecha ? 1 : 0) - (e.izquierda ? 1 : 0)) * lateral;
      if (!e.derecha && !e.izquierda && e.puntero.abajo) meta = Math.max(-1, Math.min(1, (e.puntero.x - api.ancho / 2) / (api.ancho * 0.2))) * lateral;
      if (aturdido > 0) meta = 0;
      vx += (meta - vx) * Math.min(1, dt * 8);
      x = Math.max(-LIBRE, Math.min(LIBRE, x + vx * dt));

      while (proxFila < dist + LEJOS) { nuevaFila(proxFila); proxFila += Math.max(16, vel * 0.8) + Math.random() * 3; }      // unos 0,8 s entre filas, vaya a la velocidad que vaya
      objetos = objetos.filter((o) => o.z > dist - 2 && !o.cogido);
      for (const o of objetos) if (o.vx) {
        o.x += o.vx * dt;
        if (Math.abs(o.x) > LIBRE) { o.vx = -o.vx; o.x = Math.sign(o.x) * LIBRE; }
      }

      // choques y regalos al llegar a la altura del trineo
      for (const o of objetos) {
        const dz = o.z - dist, dx = o.x - x;
        if (dz > 1.2 || dz < -0.6) continue;
        if (o.tipo === 'regalo') {
          if (Math.abs(dx) < 0.32) {
            o.cogido = true; regalos++; Sonido.efecto('coger');
            if (regalos >= META) {
              final = 0.001; metaZ = dist + 10; Sonido.efecto('completar');
              objetos = objetos.filter((q) => q.tipo === 'regalo' || q.z > metaZ + 6);
              return;
            }
          }
        } else if (invulnerable <= 0 && Math.abs(dx) < ANCHO_OBJ[o.tipo] + MEDIO_TRINEO) {
          aturdido = 0.8; invulnerable = 2; vx = 0; rojo = 0.25; api.sacudir(0.3); Sonido.efecto('golpe');
          if (regalos > 0) { regalos--; api.aviso('-1', api.ancho / 2, api.alto * 0.62, C.rojoClaro); }
        }
      }
    }

    /* ---------- Dibujo ---------- */
    const r = (ctx, c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const ruido = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    function camara(api) {
      const F = Math.min(api.ancho, api.alto * 1.5) * 1.4;                  // píxeles por unidad a 1 de distancia
      return { F, cx: api.ancho / 2, hor: Math.round(api.alto * 0.4) };
    }
    // De (lateral respecto al centro de la calle, distancia) a pantalla
    function proyectar(cam, l, dz) {
      const k = cam.F / dz;
      return { sx: cam.cx + (l - x + curva(dist) * dz * dz) * k, sy: cam.hor + ALTURA_OJO * k, k };
    }

    // Dibuja un sprite hecho de rectángulos, escalado para medir `altoMundo` unidades a esa distancia; (0, 0) = pies
    function escalado(ctx, cam, l, dz, altoMundo, altoPx, dibujo) {
      const p = proyectar(cam, l, dz), esc = altoMundo * p.k / altoPx;
      if (p.sx < -200 || p.sx > cam.cx * 2 + 200 || p.k > 4000) return;
      ctx.save(); ctx.translate(Math.round(p.sx), Math.round(p.sy)); ctx.scale(esc, esc); dibujo(); ctx.restore();
    }

    // Abeto a cualquier tamaño sin crear un lienzo por cada píxel de alto: tamaños redondeados y, los grandes, escalados
    function arbol(ctx, sx, sy, alto) {
      if (alto > 140) { ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.scale(alto / 140, alto / 140); Sprites.abeto(ctx, 0, 0, 140); ctx.restore(); return; }
      Sprites.abeto(ctx, Math.round(sx), Math.round(sy), alto < 24 ? Math.max(5, Math.round(alto)) : Math.round(alto / 6) * 6);
    }

    function roca(ctx) { r(ctx, '#5c5866', -8, -6, 16, 6); r(ctx, '#7a7686', -6, -7, 10, 3); r(ctx, C.nieve, -7, -8, 12, 2); r(ctx, '#3a3a44', -8, 0, 16, 1); }
    function nino(ctx, dir) {
      r(ctx, C.rojoOsc, -8, 1, 16, 1); r(ctx, C.rojoOsc, 7 * dir, -1, 1, 2); r(ctx, '#a9763f', -7, -2, 14, 3);
      r(ctx, '#4a7ad8', -3, -9, 7, 7); r(ctx, C.piel, -2, -14, 5, 5); r(ctx, C.verde, -3, -15, 7, 2); r(ctx, C.nieve, 0, -17, 2, 2);
    }
    function farola(ctx) {
      r(ctx, '#2b2b36', -1, -30, 2, 30); r(ctx, '#2b2b36', -3, -1, 6, 2);
      r(ctx, C.tinta, -3, -36, 6, 6); r(ctx, C.oroClaro, -2, -35, 4, 4); r(ctx, C.nieve, -3, -37, 6, 1);
    }

    function fondo(ctx, api, cam, t) {
      Comun.fondoNoche(ctx, t, cam.hor + 2, api.ancho);
      // montañas y tejados lejanos, que se desplazan con las curvas
      const desp = -giroFondo;
      for (let i = -2; i < api.ancho / 60 + 3; i++) {
        const bx = ((i * 60 + desp * 0.4) % (api.ancho + 120) + api.ancho + 120) % (api.ancho + 120) - 60, alto = 18 + ruido(i, 1) * 26;
        ctx.fillStyle = '#2c3560';
        ctx.beginPath(); ctx.moveTo(bx - 50, cam.hor); ctx.lineTo(bx, cam.hor - alto); ctx.lineTo(bx + 50, cam.hor); ctx.fill();
        r(ctx, '#c5d3ea', bx - 6, cam.hor - alto + 1, 12, 3);
      }
      for (let i = -2; i < api.ancho / 34 + 3; i++) {
        const bx = ((i * 34 + desp) % (api.ancho + 68) + api.ancho + 68) % (api.ancho + 68) - 34, alto = 6 + ruido(i, 7) * 12;
        r(ctx, '#1b2245', bx, cam.hor - alto, 26, alto);
        if (ruido(i, 3) > 0.4) r(ctx, C.oroClaro, bx + 6, cam.hor - alto + 3, 3, 2);
        r(ctx, C.nieve2, bx - 1, cam.hor - alto - 1, 28, 2);
      }
    }

    function suelo(ctx, api, cam) {
      // de arriba (lejos) abajo (cerca), una franja por fila de píxeles
      for (let y = cam.hor + 1; y < api.alto; y++) {
        const dz = ALTURA_OJO * cam.F / (y - cam.hor);
        if (dz > LEJOS + 30) { r(ctx, '#c9d4e8', 0, y, api.ancho, 1); continue; }
        const k = cam.F / dz, centro = cam.cx + (-x + curva(dist) * dz * dz) * k, mitad = k;
        const banda = Math.floor((dist + dz) / 2.5) % 2, bordillo = Math.max(1, 0.1 * k);
        r(ctx, banda ? '#e6edf8' : '#dbe4f2', 0, y, api.ancho, 1);
        r(ctx, banda ? '#cbd7ea' : '#c2cfe5', centro - mitad, y, mitad * 2, 1);
        r(ctx, banda ? C.rojo : C.nieve, centro - mitad - bordillo, y, bordillo, 1);
        r(ctx, banda ? C.rojo : C.nieve, centro + mitad, y, bordillo, 1);
        if (Math.floor((dist + dz) / 1.2) % 2) r(ctx, '#d6e0ef', centro - mitad * 0.02, y, Math.max(1, mitad * 0.04), 1);   // marcas del centro
      }
    }

    function trineo(ctx, api, t) {
      // la punta del trineo, las rodillas y las manoplas con la cuerda, en primer plano
      const P = Math.max(2, Math.floor(api.alto / 90)), cx = Math.round(api.ancho / 2 - vx * P * 2), base = api.alto;
      const tiembla = vel > 0 && Math.floor(t * 20) % 2 ? P / 2 : 0, y0 = base - 22 * P + tiembla;
      const R = (c, px, py, w, h) => r(ctx, c, cx + px * P, y0 + py * P, w * P, h * P);
      R(C.rojoOsc, -22, 4, 2, 18); R(C.rojoOsc, 20, 4, 2, 18); R(C.rojoOsc, -21, 2, 2, 3); R(C.rojoOsc, 19, 2, 2, 3);   // patines curvados
      R(C.rojoOsc, -20, 0, 3, 2); R(C.rojoOsc, 17, 0, 3, 2);
      R('#7a5236', -18, 6, 36, 16);
      for (let k = 0; k < 4; k++) R('#b07a44', -18, 7 + k * 4, 36, 2);                                     // tablas
      R('#5c3e2a', -18, 6, 36, 1);
      R('#2a3a6a', -15, 10, 9, 12); R('#2a3a6a', 6, 10, 9, 12); R('#3a4a7a', -14, 10, 7, 3); R('#3a4a7a', 7, 10, 7, 3);   // rodillas
      // cuerda de la punta a las manos
      const tira = Math.round(-vx * 2);
      R('#e8dcc0', -12 + tira, 2, 24, 1); R('#e8dcc0', -12 + tira, 2, 1, 7); R('#e8dcc0', 11 + tira, 2, 1, 7);
      R(C.rojo, -15 + tira, 7, 6, 5); R(C.rojoOsc, -15 + tira, 11, 6, 1); R(C.nieve, -15 + tira, 7, 6, 1);   // manoplas
      R(C.rojo, 9 + tira, 7, 6, 5); R(C.rojoOsc, 9 + tira, 11, 6, 1); R(C.nieve, 9 + tira, 7, 6, 1);
      // nieve que salta por los lados al girar
      if (Math.abs(vx) > 0.4) for (let k = 0; k < 6; k++) {
        const lado = vx > 0 ? -1 : 1, sx = cx + lado * (22 + ruido(k, Math.floor(t * 12)) * 10) * P;
        r(ctx, C.nieve, sx, base - (4 + ruido(k + 9, Math.floor(t * 12)) * 14) * P, P, P);
      }
    }

    function dibujar(ctx, api) {
      const cam = camara(api), t = api.t;
      ctx.imageSmoothingEnabled = false;
      fondo(ctx, api, cam, t);
      suelo(ctx, api, cam);
      // todo lo que hay a los lados y en la calle, de lejos a cerca
      const lista = [];
      for (let z = Math.floor(dist / 6) * 6 + 6; z < dist + LEJOS; z += 6) {
        for (const lado of [-1, 1]) {
          const v = ruido(z, lado);
          lista.push({ dz: z - dist, f: (dz) => { const p = proyectar(cam, lado * (1.7 + v * 2.6), dz); arbol(ctx, p.sx, p.sy, (1.3 + v * 1.1) * p.k); } });
          if (z % 18 === 0) lista.push({ dz: z - dist + 0.01, f: (dz) => escalado(ctx, cam, lado * 1.25, dz, 1.3, 37, () => farola(ctx)) });
        }
      }
      for (const o of objetos) lista.push({ dz: o.z - dist, f: (dz) => {
        if (o.tipo === 'muneco') escalado(ctx, cam, o.x, dz, ALTO_OBJ.muneco, 27, () => Sprites.muneco(ctx, 0, 0));
        else if (o.tipo === 'abeto') { const p = proyectar(cam, o.x, dz); arbol(ctx, p.sx, p.sy, ALTO_OBJ.abeto * p.k); }
        else if (o.tipo === 'roca') escalado(ctx, cam, o.x, dz, ALTO_OBJ.roca, 8, () => roca(ctx));
        else if (o.tipo === 'nino') escalado(ctx, cam, o.x, dz, ALTO_OBJ.nino, 18, () => nino(ctx, Math.sign(o.vx) || 1));
        else escalado(ctx, cam, o.x, dz, ALTO_OBJ.regalo, 9, () => { const b = Math.floor(t * 3 + o.x * 10) % 2; r(ctx, '#b5c2d8', -5, 0, 10, 1); Sprites.regalo(ctx, -5, -8 - b, 10, 8, o.c1, o.c2); });
      } });
      if (metaZ !== null) lista.push({ dz: metaZ - dist, f: (dz) => escalado(ctx, cam, 0, dz, 1.6, 40, () => {
        r(ctx, '#3a3a44', -46, -40, 2, 40); r(ctx, '#3a3a44', 44, -40, 2, 40);
        r(ctx, C.tinta, -45, -41, 90, 12); r(ctx, C.rojo, -44, -40, 88, 10); texto(ctx, 'META', 0, -38, C.blanco, { centro: true });
        for (let gx = -44; gx < 44; gx += 4) { r(ctx, (gx / 4) % 2 ? C.tinta : C.blanco, gx, -1, 4, 1); r(ctx, (gx / 4) % 2 ? C.blanco : C.tinta, gx, 0, 4, 1); }
      }) });
      lista.filter((o) => o.dz > 0.35).sort((a, b) => b.dz - a.dz).forEach((o) => o.f(o.dz));

      trineo(ctx, api, t);
      if (rojo > 0) { ctx.globalAlpha = rojo * 1.6; ctx.fillStyle = C.rojo; ctx.fillRect(0, 0, api.ancho, api.alto); ctx.globalAlpha = 1; }
      if (aturdido > 0 && Math.floor(t * 8) % 2) for (let k = 0; k < 5; k++) r(ctx, C.oroClaro, api.ancho / 2 - 40 + k * 20, api.alto * 0.5 + (k % 2) * 8, 4, 4);

      const e = api.textoEscala;
      if (final > 0) {
        const m = '¡TODOS LOS REGALOS!', em = Comun.medir(m, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(m, em) + 12, h = Comun.altoTexto(em) + 12;
        const bx = Math.floor((api.ancho - w) / 2), by = Math.floor(api.alto * 0.18);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, m, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
      const t1 = `REGALOS ${regalos}/${META}`;
      Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, Comun.altoTexto(e) + 8);
      texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
    }

    // Solo en modo debug: posición y objetos (dy = distancia por delante), para las pruebas automáticas
    if (Dias.debug) window.trineoDebug = () => ({ x, regalos, final: final > 0, aturdido: aturdido > 0, dist: Math.round(dist), vel: Math.round(vel * 10) / 10,
      objetos: objetos.map((o) => ({ tipo: o.tipo, x: o.x, dy: o.z - dist, vx: o.vx || 0 })) });

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'TRINEO POR LA CUESTA',
      instruccion: 'BAJA EN TRINEO POR LA CALLE NEVADA. ESQUIVA MUÑECOS, ABETOS, ROCAS Y OTROS TRINEOS CON ← → (O TOCANDO A UN LADO) Y RECOGE 12 REGALOS PARA LLEGAR A LA META. ¡CADA VEZ IRÁS MÁS RÁPIDO!',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'trineo',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
