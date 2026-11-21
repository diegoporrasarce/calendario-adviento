'use strict';
/* Día 24 — La persecución.
   1) Escena: en el tejado del edificio aparece el Grinch, coge el saco de regalos y sale corriendo.
   2) Carrera por los tejados (3 fases, cada una más rápida): la chica corre sola; Espacio / ↑ / tocar para saltar
      chimeneas y huecos entre edificios. Los regalos que se le caen del saco al ladrón se pueden recoger.
      Si se cae por un hueco, vuelve a subir en el tejado siguiente (y pierde 2 regalos); si choca con una chimenea,
      se para hasta que salta. No se puede perder.
   3) Al final le alcanza: el Grinch se rinde, se quita la máscara… y era el autor del calendario disfrazado.
      Diálogo con su retrato (líneas en dias.json: "dialogoFinal"; nombre en "autor") y, al terminar, se gana. */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS['dia24-persecucion'] = {
  iniciarJuego(contenedor, alTerminar, datos) {
    const { PALETA: C, texto } = Comun;
    const G = 720, SALTO = 268, COYOTE = 0.09, BUFFER = 0.14;
    const FASES = [
      { largo: 1300, vel: 92, hueco: [26, 42], chimenea: 0.35 },
      { largo: 1500, vel: 112, hueco: [32, 52], chimenea: 0.55 },
      { largo: 1700, vel: 132, hueco: [38, 60], chimenea: 0.75 }
    ];
    const INICIO = 440;                                                    // tejado del edificio del calendario
    const LINEAS = (Array.isArray(datos && datos.dialogoFinal) && datos.dialogoFinal.length ? datos.dialogoFinal : [
      '¡Vale, vale! Me has pillado…',
      'No era un ladrón de verdad: solo quería regalarte una última aventura antes de Nochebuena.',
      'Los regalos siempre fueron para ti. ¡Feliz Navidad!'
    ]).map((l) => String(l).replace(/…/g, '...'));
    const AUTOR = String((datos && datos.autor) || 'YO').toUpperCase();

    // ---------- Recorrido (siempre el mismo, con una semilla fija) ----------
    let semilla = 24;
    const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
    const entre = (a, b) => a + azar() * (b - a);
    const tejados = [], regalosMapa = [], limites = [];
    (function generar() {
      tejados.push({ x0: -200, x1: INICIO, y: 150, tipo: 0, chimeneas: [{ x: 120, w: 12, h: 16, decor: true }] });
      let x = INICIO, y = 150, fin = INICIO;
      FASES.forEach((f, i) => {
        fin += f.largo; limites.push(fin);
        while (x < fin) {
          const hueco = entre(f.hueco[0], f.hueco[1]), w = entre(130, 240), ny = Math.max(122, Math.min(172, y + entre(-18, 18)));
          const t = { x0: x + hueco, x1: x + hueco + w, y: ny, tipo: 1 + Math.floor(azar() * 3), chimeneas: [] };
          // regalo en lo alto del salto sobre el hueco
          regalosMapa.push({ x: x + hueco / 2, y: Math.min(y, ny) - 38 });
          // chimeneas (separadas y lejos de los bordes) y regalos sobre el tejado
          let cx = t.x0 + 70;
          while (cx < t.x1 - 115) {
            if (azar() < f.chimenea) { t.chimeneas.push({ x: cx, w: 12, h: 14 + Math.floor(azar() * 5) }); regalosMapa.push({ x: cx + 6, y: ny - 44 }); cx += 75; }
            else { if (azar() < 0.5) regalosMapa.push({ x: cx + 10, y: ny - (azar() < 0.5 ? 10 : 30) }); cx += 45; }
          }
          tejados.push(t);
          x = t.x1; y = ny;
        }
      });
      // último tejado: largo y llano; ahí se acaba la huida
      const hueco = 34;
      tejados.push({ x0: x + hueco, x1: x + hueco + 420, y, tipo: 2, chimeneas: [], ultimo: true });
      regalosMapa.push({ x: x + hueco / 2, y: y - 38 });
    })();
    const FINAL = tejados[tejados.length - 1], PARADA = FINAL.x0 + 300;    // donde se rinde el ladrón

    const tejadoEn = (x) => tejados.find((t) => x >= t.x0 && x <= t.x1);
    const faseEn = (x) => { const i = limites.findIndex((l) => x < l); return i < 0 ? FASES.length - 1 : i; };

    let estado, reloj, jug, ladron, regalos, cogidos, camara, cartel, saco, linea, letras, nieve, parpadeo, avisoFinal;

    function reiniciar() {
      estado = 'intro'; reloj = 0; cogidos = 0; cartel = null; linea = 0; letras = 0; parpadeo = 0; avisoFinal = false;
      jug = { x: 70, y: 150, vy: 0, enSuelo: true, aire: 0, buffer: 0, parada: 0, inv: 0 };
      ladron = { x: 330, y: 230, dist: 110, visible: false, saco: false, dir: -1, mascara: 1, manos: 0 };
      saco = { x: 250, y: 150, visible: true };
      regalos = regalosMapa.map((r) => ({ ...r, cogido: false, caido: 0 }));
      for (const t of tejados) for (const c of t.chimeneas) c.tocada = false;
      camara = 0;
      nieve = Array.from({ length: 50 }, () => ({ x: Math.random() * 700, y: Math.random() * 260, v: 12 + Math.random() * 18 }));
    }

    function decir(quien, txt, vida = 2.2) { cartel = { quien, txt, vida }; }

    // ---------- Lógica ----------
    function actualizar(dt, api) {
      reloj += dt;
      if (cartel) { cartel.vida -= dt; if (cartel.vida <= 0) cartel = null; }
      if (jug.inv > 0) jug.inv -= dt;
      for (const s of nieve) { s.y += s.v * dt; s.x -= 8 * dt; if (s.y > 260) { s.y = -5; s.x = Math.random() * 700; } }
      const e = api.entrada, pulsa = e.pulsado('accion') | e.pulsado('arriba') | e.pulsado('toque');

      if (estado === 'intro') return intro(dt, pulsa);
      if (estado === 'carrera') return carrera(dt, api, pulsa);
      if (estado === 'pillado') return pillado(dt, pulsa);
      if (estado === 'dialogo') {
        const t = LINEAS[linea];
        letras = Math.min(t.length, letras + dt * 38);
        if (pulsa) {
          if (letras < t.length) letras = t.length;
          else if (linea < LINEAS.length - 1) { linea++; letras = 0; Sonido.efecto('carta'); }
          else { estado = 'fin'; reloj = 0; Sonido.efecto('completar'); }
        }
        return;
      }
      if (estado === 'fin' && reloj > 0.6) api.ganar();
    }

    function intro(dt, pulsa) {
      // el Grinch sube por el borde del tejado, coge el saco y escapa
      if (reloj > 0.6) { ladron.visible = true; ladron.y = Math.max(150, 230 - (reloj - 0.6) * 260); }
      if (reloj > 1.0 && !cartel && reloj < 1.2) decir('ladron', '¡JE, JE, JE! ¡ESTOS REGALOS SON MÍOS!');
      if (reloj < 2.6) ladron.x = 330;
      else if (reloj < 3.2) ladron.x = 330 - (reloj - 2.6) * 120;           // va a por el saco
      else if (reloj < 3.6) ladron.x = 258;
      else { ladron.dir = 1; ladron.x = 258 + (reloj - 3.6) * 140; }       // y sale corriendo
      if (reloj > 3.2 && !ladron.saco) { ladron.saco = true; saco.visible = false; Sonido.efecto('coger'); decir('chica', '¡EH! ¡DEVUÉLVEME LOS REGALOS!'); }
      if (reloj > 4.6 || (pulsa && reloj > 1.2)) {
        estado = 'carrera'; reloj = 0; ladron.saco = true; ladron.visible = true; saco.visible = false; ladron.dir = 1; ladron.y = 150;
        ladron.dist = Math.max(90, ladron.x - jug.x); decir('fase', 'FASE 1: ¡A POR ÉL!', 1.6);
      }
    }

    function carrera(dt, api, pulsa) {
      const fase = faseEn(jug.x), f = FASES[fase];
      const ultimoTramo = jug.x >= FINAL.x0 - 40;
      // velocidad (parada tras chocar con una chimenea)
      if (jug.parada > 0) jug.parada -= dt;
      const vel = jug.parada > 0 ? 0 : f.vel;
      // salto con margen: se puede pulsar un poco antes de tocar el suelo o un poco después de dejarlo
      if (pulsa) jug.buffer = BUFFER; else jug.buffer -= dt;
      jug.aire = jug.enSuelo ? 0 : jug.aire + dt;
      if (jug.buffer > 0 && (jug.enSuelo || jug.aire < COYOTE) && jug.vy >= 0) { jug.vy = -SALTO; jug.enSuelo = false; jug.aire = COYOTE; jug.buffer = 0; Sonido.efecto('saltar'); }
      const antesX = jug.x, antesY = jug.y;
      jug.x += vel * dt;
      jug.vy += G * dt; jug.y += jug.vy * dt;
      // suelo
      const t = tejadoEn(jug.x);
      jug.enSuelo = false;
      if (t && jug.vy >= 0 && antesY <= t.y + 1 && jug.y >= t.y) { jug.y = t.y; jug.vy = 0; jug.enSuelo = true; }
      else if (t && jug.y > t.y + 3 && !tejadoEn(antesX)) { jug.x = t.x0 - 1; }   // se ha dado contra la pared: cae
      // chimeneas: si las toca, se para hasta que salte
      if (t) for (const c of t.chimeneas) {
        if (c.decor) continue;
        const arriba = t.y - c.h;
        if (jug.x + 4 > c.x && jug.x - 4 < c.x + c.w && jug.y > arriba + 1) {
          jug.x = c.x - 4.01; jug.parada = Math.max(jug.parada, 0.05);
          if (!c.tocada) { c.tocada = true; jug.parada = 0.45; ladron.dist = Math.min(230, ladron.dist + 25); Sonido.efecto('golpe'); api.sacudir(0.2); decir('chica', '¡AY!', 0.8); }
        }
      }
      // caída por un hueco: vuelve a aparecer al principio del tejado siguiente
      if (jug.y > 270) {
        const sig = tejados.find((q) => q.x0 > jug.x - 10) || FINAL;
        jug.x = sig.x0 + 14; jug.y = sig.y; jug.vy = 0; jug.enSuelo = true; jug.inv = 1.2;
        const pierde = Math.min(2, cogidos); cogidos -= pierde;
        ladron.dist = Math.min(230, ladron.dist + 35);
        Sonido.efecto('perder'); api.sacudir(0.3); decir('chica', pierde ? `¡UPS! -${pierde} REGALOS` : '¡UPS!', 1.2);
      }
      // regalos: caen del saco cuando pasa el ladrón; se cogen al tocarlos
      for (const r of regalos) {
        if (!r.cogido && r.caido === 0 && ladron.x > r.x) r.caido = 0.001;
        if (r.caido > 0 && r.caido < 1) r.caido = Math.min(1, r.caido + dt * 2.5);
        if (!r.cogido && r.caido >= 1 && Math.abs(r.x - jug.x) < 10 && Math.abs(r.y - (jug.y - 12)) < 16) { r.cogido = true; cogidos++; Sonido.efecto('coger'); }
      }
      // el ladrón: por delante, se aleja con cada tropiezo y se acerca poco a poco; al final se para
      ladron.dist += (110 - ladron.dist) * Math.min(1, dt * 0.25);
      ladron.x = ultimoTramo ? Math.min(PARADA, Math.max(ladron.x + FASES[2].vel * 0.6 * dt, jug.x + 40)) : jug.x + ladron.dist;
      ladron.y = alturaLadron(ladron.x);
      if (ladron.x >= PARADA - 0.5 && jug.x >= PARADA - 24) {
        estado = 'pillado'; reloj = 0; jug.x = PARADA - 24; jug.y = FINAL.y; jug.vy = 0; ladron.dir = -1;
        Sonido.efecto('completar'); decir('chica', '¡TE PILLÉ!', 1.6);
      }
      // aviso de fase nueva
      const nueva = faseEn(jug.x);
      if (nueva !== fase) { Sonido.efecto('empezar'); decir('fase', nueva === 1 ? 'FASE 2: ¡MÁS RÁPIDO!' : 'FASE 3: ¡CASI LO TIENES!', 1.6); }
      if (ultimoTramo && !avisoFinal) { avisoFinal = true; decir('fase', '¡SE HA QUEDADO SIN TEJADOS!', 1.6); }
    }

    // el ladrón salta los huecos en arco
    function alturaLadron(x) {
      const t = tejadoEn(x);
      if (t) return t.y;
      const i = tejados.findIndex((q) => q.x0 > x), a = tejados[i - 1], b = tejados[i];
      if (!a || !b) return 150;
      const k = (x - a.x1) / (b.x0 - a.x1);
      return a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 26;
    }

    function pillado(dt, pulsa) {
      // se rinde, suelta el saco, levanta las manos y se quita la máscara
      if (reloj > 0.5 && ladron.saco) { ladron.saco = false; saco.visible = true; saco.x = ladron.x + 16; saco.y = FINAL.y; Sonido.efecto('golpe'); }
      if (reloj > 1.0 && reloj < 1.1 && (!cartel || cartel.quien !== 'ladron')) decir('ladron', '¡VALE, VALE! ¡ME RINDO!', 1.6);
      ladron.manos = reloj > 2.4 ? 1 : 0;
      if (reloj > 2.6) ladron.mascara = Math.max(0, 1 - (reloj - 2.6) / 0.8);   // la máscara sube y sale
      if (reloj > 2.6 && reloj < 2.7) { Sonido.efecto('abrir'); parpadeo = 0.6; }
      if (parpadeo > 0) parpadeo -= dt;
      if (reloj > 3.8 && reloj < 3.9 && (!cartel || cartel.quien !== 'chica')) decir('chica', '¿¡ERAS TÚ!?', 1.8);
      if (reloj > 5.4 || (pulsa && reloj > 4)) { estado = 'dialogo'; linea = 0; letras = 0; ladron.manos = 0; cartel = null; }
    }

    // ---------- Dibujo ----------
    const r = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const LADRILLOS = [['#7a2e24', '#5e2620'], ['#4a3a5a', '#3a2c4a'], ['#3e5068', '#2e3c52'], ['#6b4a3a', '#56392c']];

    function disposicion(api) {
      const K = Math.max(1, Math.min(Math.floor(api.alto / 150), Math.floor(api.ancho / 240)));
      const W = Math.ceil(api.ancho / K), H = Math.ceil(api.alto / K);
      return { K, W, H, oy: Math.round(H * 0.74 - 150) };
    }

    function edificio(ctx, t, cam, d) {
      const [c1, c2] = LADRILLOS[t.tipo];
      const x0 = Math.round(t.x0 - cam), w = Math.round(t.x1 - t.x0), y = t.y + d.oy;
      r(ctx, c1, x0, y, w, d.H - y + 2);
      for (let fy = y + 6, f = 0; fy < d.H; fy += 5, f++) for (let fx = x0 + (f % 2 ? 0 : 4); fx < x0 + w - 2; fx += 9) r(ctx, c2, fx, fy, 6, 1);
      for (let fy = y + 16; fy < d.H - 6; fy += 26) for (let fx = x0 + 14; fx < x0 + w - 18; fx += 30) {
        const luz = ((fx + cam) * 7 + fy * 3) % 5 !== 0;
        r(ctx, C.tinta, fx - 1, fy - 1, 12, 14); r(ctx, luz ? '#ffd98a' : '#22283e', fx, fy, 10, 12); if (luz) r(ctx, '#ffefb8', fx, fy, 10, 3);
        r(ctx, C.tinta, fx + 4, fy, 1, 12);
      }
      r(ctx, '#3a2a2a', x0 - 2, y - 2, w + 4, 4);
      r(ctx, C.nieve, x0 - 3, y - 4, w + 6, 3); r(ctx, C.nieve2, x0 - 3, y - 1, w + 6, 1);
      for (let fx = x0; fx < x0 + w; fx += 7) r(ctx, C.hielo, fx + 2, y + 2, 1, 2 + ((fx + Math.round(cam)) % 3));
      for (const c of t.chimeneas) {
        const cx = Math.round(c.x - cam), cy = y - c.h;
        r(ctx, '#7a3a2c', cx, cy, c.w, c.h); r(ctx, '#5e2c22', cx, cy + 5, c.w, 1); r(ctx, '#5e2c22', cx + 5, cy + 9, 1, 4);
        r(ctx, '#cfc8bd', cx - 1, cy - 2, c.w + 2, 3); r(ctx, C.nieve, cx - 1, cy - 4, c.w + 2, 2);
      }
      if (t.ultimo) {                                                     // final: un muro alto con guirnalda
        const mx = Math.round(t.x1 - cam) - 30;
        r(ctx, '#5e2620', mx, y - 60, 30, 60); r(ctx, C.nieve, mx - 2, y - 62, 34, 3);
      }
    }

    function sacoRegalos(ctx, x, y, t) {                                   // (x, y) = base del saco
      r(ctx, '#6b4a2a', x - 9, y - 14, 18, 14); r(ctx, '#8a6238', x - 8, y - 13, 16, 3); r(ctx, '#5a3a20', x - 9, y - 2, 18, 2);
      Sprites.regalo(ctx, x - 6, y - 19, 6, 6, C.rojo, C.oro); Sprites.regalo(ctx, x + 1, y - 18, 5, 5, C.verde, C.nieve);
      r(ctx, '#c9a227', x - 2, y - 14, 4, 2);
    }

    // El Grinch / el autor disfrazado (16 x 26). (x, y) = pies; dir 1 = mira a la derecha
    function ladronSprite(ctx, x, y, dir, modo, t, conSaco, mascara, manos) {
      let frame = 3; if (modo === 'correr') frame = [0, 1, 2, 1][Math.floor(t * 10) % 4];
      const b = frame === 1 ? -1 : 0;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y) - 26); if (dir < 0) ctx.scale(-1, 1); ctx.translate(-8, 0);
      const R = (c, a, d, w, h) => r(ctx, c, a, d, w, h);
      ctx.globalAlpha = 0.25; R('#000', 3, 25, 11, 1); ctx.globalAlpha = 1;
      if (conSaco) {                                                      // saco a la espalda
        R('#6b4a2a', -1, 10 + b, 8, 9); R('#8a6238', 0, 10 + b, 6, 2); Sprites.regalo(ctx, 0, 7 + b, 4, 4, C.rojo, C.oro); R('#c9a227', 5, 9 + b, 3, 2);
      }
      // piernas de pelo verde y botas
      const lejos = [5, 7, 10, 6][frame], cerca = [10, 8, 5, 9][frame];
      R('#2f6b2a', lejos, 19, 2, 5); R(C.tinta, lejos, 23, 3, 3);
      R('#4f9a3c', cerca, 19, 2, 5); R('#16161c', cerca, 23, 3, 3); R('#3a3a44', cerca, 23, 3, 1);
      // abrigo rojo de Papá Noel con ribete blanco y cinturón
      R(C.rojo, 5, 12 + b, 7, 8); R(C.rojoOsc, 5, 12 + b, 1, 8);
      R(C.nieve, 5, 19 + b, 7, 1); R(C.nieve, 8, 12 + b, 1, 7); R(C.tinta, 5, 16 + b, 7, 1); R(C.oro, 8, 16 + b, 2, 1);
      // brazo: corriendo, quieto o con las manos en alto
      if (manos) { R(C.rojo, 10, 6 + b, 2, 6); R(C.nieve, 10, 6 + b, 2, 1); R('#4f9a3c', 10, 4 + b, 2, 2); R(C.rojo, 4, 6 + b, 2, 6); R('#4f9a3c', 4, 4 + b, 2, 2); }
      else { const a = frame === 0 ? -1 : frame === 2 ? 1 : 0; R(C.rojoOsc, 8 + a, 13 + b, 2, 5); R(C.nieve, 8 + a, 17 + b, 2, 1); R('#4f9a3c', 8 + a, 18 + b, 2, 2); }
      // cuello de pelo verde (el disfraz)
      R('#4f9a3c', 5, 11 + b, 7, 2); R('#6fb84c', 6, 11 + b, 1, 1); R('#6fb84c', 9, 12 + b, 1, 1);
      // cabeza de verdad (debajo de la máscara): pelo castaño y cara
      if (mascara < 1) {
        R('#f2ccb4', 6, 4 + b, 7, 7); R('#d6a890', 6, 10 + b, 7, 1);
        R('#88683e', 5, 1 + b, 8, 3); R('#aa8856', 7, 1 + b, 3, 1); R('#88683e', 5, 4 + b, 2, 4); R('#60482a', 12, 2 + b, 1, 3);
        R('#88683e', 7, 4 + b, 5, 1);
        R('#3c2418', 10, 6 + b, 1, 2); R('#60462a', 9, 5 + b, 3, 1); R('#ecb2a2', 8, 8 + b, 2, 1); R('#b27066', 11, 9 + b, 1, 1);
      }
      // la máscara del Grinch (cara verde, ojos amarillos, sonrisa y gorro); al quitársela, sube y se aparta
      if (mascara > 0) {
        const sube = Math.round((1 - mascara) * 14), lado = Math.round((1 - mascara) * 8);
        ctx.save(); ctx.translate(lado, -sube);
        R('#7cb342', 5, 4 + b, 8, 7); R('#5a8f2e', 5, 9 + b, 8, 2); R('#5a8f2e', 4, 5 + b, 1, 4);
        R('#1f3d14', 8, 5 + b, 5, 1);                                     // cejas
        R('#f2e24c', 9, 6 + b, 2, 1); R('#f2e24c', 12, 6 + b, 1, 1); R(C.rojo, 10, 6 + b, 1, 1);
        R('#1f3d14', 7, 9 + b, 6, 1); R('#1f3d14', 6, 8 + b, 1, 1); R('#1f3d14', 13, 8 + b, 1, 1); R(C.nieve, 9, 9 + b, 1, 1); R(C.nieve, 11, 9 + b, 1, 1);
        R(C.rojo, 4, 1 + b, 9, 3); R(C.rojo, 2, 2 + b, 3, 2); R(C.nieve, 0, 3 + b, 2, 2); R(C.rojoOsc, 4, 3 + b, 9, 1);   // gorro caído hacia atrás
        R(C.nieve, 4, 4 + b, 10, 1);
        ctx.restore();
      }
      ctx.restore();
    }

    function mascaraSuelo(ctx, x, y) {                                     // la máscara del Grinch, tirada boca arriba
      x = Math.round(x); y = Math.round(y);
      r(ctx, '#7cb342', x - 4, y - 5, 8, 5); r(ctx, '#5a8f2e', x - 4, y - 1, 8, 1);
      r(ctx, '#f2e24c', x - 2, y - 4, 1, 1); r(ctx, '#f2e24c', x + 1, y - 4, 1, 1); r(ctx, '#1f3d14', x - 2, y - 2, 4, 1);
      r(ctx, C.rojo, x + 4, y - 4, 6, 3); r(ctx, C.nieve, x + 3, y - 4, 1, 4); r(ctx, C.nieve, x + 10, y - 3, 2, 2);
    }

    function bocadillo(ctx, cadena, cx, pie, e, api, colorTexto) {        // en pantalla; pie = punta abajo
      const lineas = Comun.envolver(cadena, Math.min(api.ancho - 24, 150 * e), e);
      const lh = Comun.altoTexto(e) + 3 * e, w = Math.max(...lineas.map((l) => Comun.medir(l, e))) + 10, h = lineas.length * lh + 6;
      const x = Math.max(6, Math.min(api.ancho - 6 - w, Math.round(cx - w / 2))), y = Math.max(6, Math.round(pie - h - 4));
      r(ctx, C.tinta, x - 1, y - 1, w + 2, h + 2); r(ctx, C.blanco, x, y, w, h);
      const px = Math.max(x + 4, Math.min(x + w - 6, Math.round(cx)));
      r(ctx, C.blanco, px - 2, y + h, 5, 3); r(ctx, C.tinta, px - 3, y + h, 1, 3); r(ctx, C.tinta, px + 3, y + h, 1, 3);
      lineas.forEach((l, i) => texto(ctx, l, x + Math.round(w / 2), y + 4 + i * lh, colorTexto, { escala: e, centro: true }));
    }

    const retratos = {};
    function retrato(nombre) {
      if (!retratos[nombre]) { const cv = document.createElement('canvas'); Sprites.pintarRetrato(cv, nombre); retratos[nombre] = cv; }
      return retratos[nombre];
    }

    function dibujar(ctx, api) {
      const d = disposicion(api), t = api.t, e = api.textoEscala;
      // cámara: la chica al 30 % del ancho; en las escenas, entre los dos
      const objetivo = estado === 'carrera' ? jug.x - d.W * 0.3 : estado === 'intro' ? 0 : (jug.x + ladron.x) / 2 - d.W / 2;
      camara += (objetivo - camara) * (estado === 'carrera' ? 1 : 0.08);
      const cam = Math.round(camara);
      Comun.fondoNoche(ctx, t, api.alto, api.ancho);
      ctx.save(); ctx.scale(d.K, d.K);
      // luna y ciudad lejana (paralaje)
      ctx.fillStyle = '#fdf6d8'; Sprites.disco(ctx, d.W - 50, 34, 14); ctx.fillStyle = '#e8dcb0'; Sprites.disco(ctx, d.W - 46, 38, 3);
      const lejos = Math.round(cam * 0.2);
      for (let i = -1; i < d.W / 40 + 2; i++) {
        const k = i + Math.floor(lejos / 40), px = i * 40 - (((lejos % 40) + 40) % 40), alto = 30 + (((k * 37) % 5) + 5) % 5 * 12;
        r(ctx, '#1b2245', px, d.oy + 150 - alto, 34, alto + 200);
        for (let wy = d.oy + 156 - alto; wy < d.H; wy += 10) if ((((k * 13 + wy) % 4) + 4) % 4 === 0) r(ctx, '#ffd98a', px + 6 + (((k + wy) % 3) + 3) % 3 * 9, wy, 3, 3);
      }
      // tejados
      for (const tj of tejados) if (tj.x1 - cam > -20 && tj.x0 - cam < d.W + 20) {
        if (tj.tipo === 0) {                                              // el edificio del calendario
          const x0 = Math.round(tj.x0 - cam), w = tj.x1 - tj.x0, y = tj.y + d.oy;
          r(ctx, '#7a2e24', x0, y, w, d.H - y + 2);
          for (let fy = y + 6, f = 0; fy < d.H; fy += 5, f++) for (let fx = x0 + (f % 2 ? 0 : 4); fx < x0 + w; fx += 9) r(ctx, '#5e2620', fx, fy, 6, 1);
          for (let fx = x0 + 230; fx < x0 + w; fx += 12) if ((Math.floor(t * 3) + fx / 12) % 2) r(ctx, [C.rojoClaro, C.oroClaro, C.hielo2, C.verde][Math.abs(fx / 12) % 4], fx, y + 6, 2, 2);
          r(ctx, C.nieve, x0, y - 4, w + 3, 3); r(ctx, C.nieve2, x0, y - 1, w + 3, 1);
          const cx = Math.round(120 - cam); r(ctx, '#7a2e24', cx, y - 16, 12, 16); r(ctx, C.nieve, cx - 1, y - 18, 14, 3); Sprites.humo(ctx, cx + 6, y - 20, t);
        } else edificio(ctx, tj, cam, d);
      }
      // regalos que se le caen al ladrón
      for (const g of regalos) {
        if (g.cogido || g.caido === 0) continue;
        const gx = g.x - cam; if (gx < -10 || gx > d.W + 10) continue;
        const k = g.caido, y = g.y + d.oy - (1 - k) * 20 + Math.sin(t * 4 + g.x) * 1.5;
        Sprites.regalo(ctx, Math.round(gx) - 4, Math.round(y) - 4, 8, 7, (g.x | 0) % 3 ? C.rojo : C.verde, C.oro);
      }
      if (saco.visible) sacoRegalos(ctx, saco.x - cam, saco.y + d.oy, t);
      // personajes
      const corre = estado === 'carrera' || (estado === 'intro' && reloj > 3.2);
      if (ladron.visible) ladronSprite(ctx, ladron.x - cam, ladron.y + d.oy, ladron.dir, corre ? 'correr' : 'quieto', t, ladron.saco, ladron.mascara, ladron.manos);
      if (estado !== 'carrera' && estado !== 'intro' && ladron.mascara <= 0) mascaraSuelo(ctx, ladron.x - cam + 14, ladron.y + d.oy);
      if (parpadeo > 0) for (let k = 0; k < 8; k++) r(ctx, C.oroClaro, ladron.x - cam - 14 + ((k * 37) % 28), ladron.y + d.oy - 40 + ((k * 23) % 22), 2, 2);
      if (!(jug.inv > 0 && Math.floor(t * 10) % 2)) {
        const modo = estado === 'carrera' ? (jug.enSuelo ? (jug.parada > 0 ? 'idle' : 'andar') : 'subir') : 'idle';
        Sprites.personaje(ctx, Math.round(jug.x - cam), Math.round(jug.y + d.oy), 1, modo, estado === 'carrera' ? t * 1.6 : t);
      }
      for (const s of nieve) { const sx = ((s.x - cam * 0.5) % (d.W + 20) + d.W + 20) % (d.W + 20); r(ctx, C.nieve, sx, s.y * d.H / 260, 1, 1); }
      ctx.restore();

      // bocadillos
      if (cartel && cartel.quien !== 'fase') {
        const quien = cartel.quien === 'ladron' ? ladron : jug;
        const sx = (quien.x - cam) * d.K, sy = (quien.y + d.oy - 30) * d.K;
        bocadillo(ctx, cartel.txt, sx, sy, e, api, cartel.quien === 'ladron' ? C.verdeOsc : '#2b1a14');
      } else if (cartel) {
        const em = Comun.medir(cartel.txt, e + 1) + 20 <= api.ancho ? e + 1 : e, w = Comun.medir(cartel.txt, em) + 12, h = Comun.altoTexto(em) + 12;
        const bx = Math.floor((api.ancho - w) / 2), by = Math.floor(api.alto * 0.22);
        Comun.caja(ctx, bx, by, w, h); texto(ctx, cartel.txt, bx + 6, by + 6, C.oroClaro, { escala: em });
      }
      // diálogo final con el retrato del autor (con el disfraz y sin la máscara)
      if (estado === 'dialogo' || estado === 'fin') {
        const t2 = LINEAS[linea].slice(0, Math.floor(letras)), P = Math.max(1, e), rw = 32 * P, rh = 40 * P;
        const ancho = Math.min(api.ancho - 16, 420 * Math.max(1, e * 0.8)), x0 = Math.floor((api.ancho - ancho) / 2);
        const lineas = Comun.envolver(t2 || ' ', ancho - rw - 22, e), lh = Comun.altoTexto(e) + 3 * e;
        const alto = Math.max(rh + 10, Comun.altoTexto(e) + 14 + Comun.envolver(LINEAS[linea], ancho - rw - 22, e).length * lh + 10);
        const y0 = api.alto - alto - 10;
        Comun.caja(ctx, x0, y0, ancho, alto);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(retrato('autor'), x0 + 5, y0 + 5, rw, rh);
        texto(ctx, AUTOR, x0 + rw + 14, y0 + 6, C.oroClaro, { escala: e });
        lineas.forEach((l, i) => texto(ctx, l, x0 + rw + 14, y0 + 10 + Comun.altoTexto(e) + 4 + i * lh, C.nieve, { escala: e }));
        if (letras >= LINEAS[linea].length && Math.floor(t * 2) % 2) texto(ctx, '↓', x0 + ancho - 12, y0 + alto - Comun.altoTexto(e) - 4, C.oroClaro, { escala: e });
      }
      // HUD de la carrera: regalos y barra de progreso con la chica, el ladrón y la meta
      if (estado === 'carrera') {
        const t1 = `REGALOS ${cogidos}`, hc = Comun.altoTexto(e) + 8;
        Comun.caja(ctx, 6, 6, Comun.medir(t1, e) + 8, hc); texto(ctx, t1, 10, 10, C.oroClaro, { escala: e });
        const bx = 6, by = 6 + hc + 8, bw = Math.min(api.ancho - 12 - api.margenDerecho * 0, 220 * e), bh = 4 * e;
        Comun.caja(ctx, bx, by, bw, bh);
        const total = PARADA - 70, pos = (x) => bx + Math.max(0, Math.min(1, (x - 70) / total)) * bw;
        r(ctx, C.verde, bx, by, pos(jug.x) - bx, bh);
        r(ctx, '#7cb342', pos(ladron.x) - e, by - 2 * e, 3 * e, bh + 4 * e); r(ctx, C.rojo, pos(ladron.x) - e, by - 3 * e, 3 * e, e);
        r(ctx, C.oroClaro, pos(jug.x) - e, by - e, 2 * e, bh + 2 * e);
        for (const l of limites) r(ctx, C.nieve3, pos(l), by, 1, bh);
      }
    }

    // Solo en modo debug: estado para las pruebas automáticas
    if (Dias.debug) window.persecucionDebug = () => {
      const t = tejadoEn(jug.x) || null, sig = tejados.find((q) => q.x0 > jug.x) || null;
      const chim = t ? t.chimeneas.filter((c) => !c.decor && c.x > jug.x - 2).map((c) => ({ x: c.x, w: c.w, h: c.h })) : [];
      return { estado, x: jug.x, y: jug.y, enSuelo: jug.enSuelo, fase: faseEn(jug.x), regalos: cogidos, ladronX: ladron.x, finTejado: t ? t.x1 : null,
        tejadoY: t ? t.y : null, siguiente: sig ? { x0: sig.x0, y: sig.y } : null, chimeneas: chim, vel: FASES[faseEn(jug.x)].vel, linea, parada: jug.parada };
    };

    return Comun.crearJuego(contenedor, alTerminar, {
      titulo: 'LA PERSECUCIÓN',
      instruccion: '¡ALGUIEN QUIERE ROBAR LOS REGALOS DE NAVIDAD! CORRE TRAS ÉL POR LOS TEJADOS: SALTA CHIMENEAS Y HUECOS CON ESPACIO, ↑ O TOCANDO LA PANTALLA, Y RECOGE LOS REGALOS QUE SE LE CAEN.',
      sinDerrota: true,
      pantallaCompleta: true,
      musica: 'persecucion',
      reiniciar,
      actualizar,
      dibujar
    });
  }
};
