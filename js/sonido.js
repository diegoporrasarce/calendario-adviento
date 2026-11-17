'use strict';
/* Sonido generado en código con Web Audio (sin archivos): música de fondo, efectos y voz de los diálogos. */
const Sonido = (() => {
  const CLAVE = 'adviento.silencio';
  let ctx = null, salida = null, canalMusica = null;
  let silencio = false;
  try { silencio = localStorage.getItem(CLAVE) === '1'; } catch (e) { /* sin almacenamiento */ }

  const frecuencia = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Una nota con envolvente corta. `destino` permite separar música y efectos.
  function nota(midi, cuando, dur, tipo, volumen, destino) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frecuencia(midi);
    g.gain.setValueAtTime(0, cuando);
    g.gain.linearRampToValueAtTime(volumen, cuando + 0.01);
    g.gain.exponentialRampToValueAtTime(volumen * 0.5, cuando + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, cuando + dur);
    osc.connect(g).connect(destino || salida);
    osc.start(cuando); osc.stop(cuando + dur + 0.02);
  }

  function ruido(cuando, dur, volumen, corte) {
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = corte; g.gain.value = volumen;
    src.connect(f).connect(g).connect(salida);
    src.start(cuando);
  }

  /* ---------- Música: «Jingle Bells» (dominio público), estrofa + estribillo en bucle ---------- */
  const N = { G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69 };
  const { G3, A3, B3, C4, D4, E4, F4, G4, A4 } = N;
  // [nota, duración en tiempos]
  const ESTROFA = [
    [G3, 1], [E4, 1], [D4, 1], [C4, 1], [G3, 3], [G3, .5], [G3, .5],
    [G3, 1], [E4, 1], [D4, 1], [C4, 1], [A3, 4],
    [A3, 1], [F4, 1], [E4, 1], [D4, 1], [B3, 4],
    [G4, 1], [G4, 1], [F4, 1], [D4, 1], [E4, 4],
    [G3, 1], [E4, 1], [D4, 1], [C4, 1], [G3, 4],
    [G3, 1], [E4, 1], [D4, 1], [C4, 1], [A3, 4],
    [A3, 1], [F4, 1], [E4, 1], [D4, 1], [G4, 1], [G4, 1], [G4, 1], [G4, 1],
    [A4, 1], [G4, 1], [F4, 1], [D4, 1], [C4, 2], [G4, 2]
  ];
  const ESTRIBILLO_A = [
    [E4, 1], [E4, 1], [E4, 2], [E4, 1], [E4, 1], [E4, 2],
    [E4, 1], [G4, 1], [C4, 1.5], [D4, .5], [E4, 4],
    [F4, 1], [F4, 1], [F4, 1.5], [F4, .5], [F4, 1], [E4, 1], [E4, 1], [E4, .5], [E4, .5]
  ];
  const MELODIA = [
    ...ESTROFA,
    ...ESTRIBILLO_A, [E4, 1], [D4, 1], [D4, 1], [E4, 1], [D4, 2], [G4, 2],
    ...ESTRIBILLO_A, [G4, 1], [G4, 1], [F4, 1], [D4, 1], [C4, 4]
  ];
  // Fundamental del acorde de cada compás (bajo)
  const BAJO = [48, 48, 48, 53, 53, 55, 55, 48, 48, 48, 48, 53, 53, 55, 55, 48,
                48, 48, 48, 48, 53, 48, 50, 55, 48, 48, 48, 48, 53, 48, 55, 48];
  const TEMPO = 0.36;                                  // segundos por tiempo
  const eventos = [];
  let tiempos = 0;
  for (const [m, d] of MELODIA) { eventos.push({ t: tiempos, m: m + 12, d: d * 0.9, tipo: 'square', v: 0.5 }); tiempos += d; }
  BAJO.forEach((m, compas) => {
    eventos.push({ t: compas * 4, m, d: 1.6, tipo: 'triangle', v: 1 });
    eventos.push({ t: compas * 4 + 2, m: m + 7, d: 1.6, tipo: 'triangle', v: 0.8 });
    for (let i = 0; i < 4; i++) eventos.push({ t: compas * 4 + i, m: 96, d: 0.12, tipo: 'sine', v: i % 2 ? 0.35 : 0.2 });   // cascabel
  });
  eventos.sort((a, b) => a.t - b.t);
  const TOTAL = BAJO.length * 4;

  let inicioBucle = 0, indice = 0;
  function programarMusica() {
    if (!ctx || ctx.state !== 'running') return;
    const limite = ctx.currentTime + 0.4;
    for (;;) {
      if (indice >= eventos.length) { indice = 0; inicioBucle += TOTAL * TEMPO; }
      const e = eventos[indice];
      const cuando = inicioBucle + e.t * TEMPO;
      if (cuando > limite) break;
      if (cuando >= ctx.currentTime - 0.05) nota(e.m, Math.max(cuando, ctx.currentTime), e.d * TEMPO, e.tipo, e.v, canalMusica);
      indice++;
    }
  }

  // Debe llamarse desde un gesto del usuario (los navegadores bloquean el audio hasta entonces).
  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    salida = ctx.createGain();
    salida.gain.value = silencio ? 0 : 1;
    salida.connect(ctx.destination);
    canalMusica = ctx.createGain();
    canalMusica.gain.value = 0.045;
    canalMusica.connect(salida);
    inicioBucle = ctx.currentTime + 0.3;
    setInterval(programarMusica, 100);
  }

  /* ---------- Efectos ---------- */
  function efecto(nombre) {
    if (!ctx || silencio) return;
    const t = ctx.currentTime;
    if (nombre === 'abrir') [72, 76, 79, 84].forEach((m, i) => nota(m, t + i * 0.07, 0.22, 'triangle', 0.16));
    else if (nombre === 'bloqueada') { nota(46, t, 0.09, 'square', 0.07); nota(43, t + 0.11, 0.14, 'square', 0.07); }
    else if (nombre === 'completar') [72, 76, 79, 84, 88, 91].forEach((m, i) => nota(m, t + i * 0.09, i === 5 ? 0.5 : 0.16, 'square', 0.09));
    else if (nombre === 'cerrar') { nota(76, t, 0.07, 'triangle', 0.1); nota(69, t + 0.06, 0.1, 'triangle', 0.1); }
    else if (nombre === 'paso') ruido(t, 0.06, 0.05, 900);
    else if (nombre === 'escalera') nota(60 + Math.floor(Math.random() * 3), t, 0.05, 'triangle', 0.06);
    // efectos de los minijuegos
    else if (nombre === 'empezar') [67, 72, 79].forEach((m, i) => nota(m, t + i * 0.08, 0.14, 'square', 0.08));
    else if (nombre === 'coger') { nota(84 + Math.floor(Math.random() * 3), t, 0.06, 'square', 0.06); nota(91, t + 0.05, 0.08, 'triangle', 0.08); }
    else if (nombre === 'golpe') { ruido(t, 0.18, 0.18, 500); nota(40, t, 0.16, 'square', 0.08); }
    else if (nombre === 'perder') [67, 63, 60, 55].forEach((m, i) => nota(m, t + i * 0.13, 0.18, 'triangle', 0.12));
  }

  /* ---------- Voz de los diálogos: un pitido corto por letra, con tono según la letra ---------- */
  const ESCALA = [0, 2, 4, 5, 7, 9, 11, 12];
  let letras = 0;
  function voz(letra) {
    if (!ctx || silencio || !/[a-záéíóúüñ]/i.test(letra)) return;
    if (letras++ % 2) return;                            // una de cada dos, para que no se amontonen
    const t = ctx.currentTime;
    const vocal = 'aeiouáéíóú'.indexOf(letra.toLowerCase());
    const grado = vocal >= 0 ? ESCALA[(vocal % 5) + 2] : ESCALA[letra.toLowerCase().charCodeAt(0) % 5];
    const base = frecuencia(76 + grado) * (0.97 + Math.random() * 0.06);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * (vocal >= 0 ? 1.06 : 0.94), t + 0.05);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g).connect(salida);
    osc.start(t); osc.stop(t + 0.07);
  }

  function alternarSilencio() {
    silencio = !silencio;
    try { localStorage.setItem(CLAVE, silencio ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    if (salida) salida.gain.value = silencio ? 0 : 1;
    return silencio;
  }

  return { iniciar, efecto, voz, alternarSilencio, enSilencio: () => silencio };
})();
