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

  /* ---------- Música: villancicos de dominio público, una pista por escena ---------- */
  // Cada pista: tempo (segundos por tiempo), compas (tiempos por compás), melodia [[nota, tiempos]]
  // (null = silencio; suena una octava por encima), bajo (fundamental de cada compás), tipo de onda y cascabel.
  const N = { C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, A4: 69, B4: 71, C5: 72 };
  const { D3, E3, F3, G3, A3, B3, C4, D4, E4, F4, Fs4, G4, A4, B4, C5 } = N;

  // «Jingle Bells»: estrofa + estribillo (el edificio)
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

  // «Deck the Halls»
  const DECK_A = [[G4, 1.5], [F4, .5], [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [C4, 1],
                  [D4, .5], [E4, .5], [F4, .5], [D4, .5], [E4, 1.5], [D4, .5], [C4, 1], [B3, 1], [C4, 2]];

  const PISTAS = {
    edificio: {
      tempo: 0.36, compas: 4, tipo: 'square', cascabel: true,
      melodia: [...ESTROFA,
        ...ESTRIBILLO_A, [E4, 1], [D4, 1], [D4, 1], [E4, 1], [D4, 2], [G4, 2],
        ...ESTRIBILLO_A, [G4, 1], [G4, 1], [F4, 1], [D4, 1], [C4, 4]],
      bajo: [48, 48, 48, 53, 53, 55, 55, 48, 48, 48, 48, 53, 53, 55, 55, 48,
             48, 48, 48, 48, 53, 48, 50, 55, 48, 48, 48, 48, 53, 48, 55, 48]
    },
    deck: {
      tempo: 0.27, compas: 4, tipo: 'square',
      melodia: [...DECK_A, ...DECK_A,
        [D4, 1.5], [E4, .5], [F4, 1], [D4, 1], [E4, 1.5], [F4, .5], [G4, 1], [D4, 1],
        [E4, .5], [Fs4, .5], [G4, 1], [A4, .5], [B4, .5], [C5, 1], [B4, 1], [A4, 1], [G4, 2],
        [G4, 1.5], [F4, .5], [E4, 1], [D4, 1], [C4, 1], [D4, 1], [E4, 1], [C4, 1],
        [A4, .5], [A4, .5], [A4, .5], [A4, .5], [G4, 1.5], [F4, .5], [E4, 1], [D4, 1], [C4, 2]],
      bajo: [48, 48, 55, 48, 48, 48, 55, 48, 55, 48, 50, 55, 48, 48, 53, 48]
    },
    wewish: {
      tempo: 0.3, compas: 3, tipo: 'square',
      melodia: [[C4, 1], [C4, .5], [D4, .5], [C4, .5], [B3, .5], [A3, 1], [A3, 1], [A3, 1],
        [D4, 1], [D4, .5], [E4, .5], [D4, .5], [C4, .5], [B3, 1], [G3, 1], [G3, 1],
        [E4, 1], [E4, .5], [F4, .5], [E4, .5], [D4, .5], [C4, 1], [A3, 1], [G3, .5], [G3, .5],
        [A3, 1], [D4, 1], [B3, 1], [C4, 2], [G3, 1]],
      bajo: [48, 53, 55, 52, 57, 53, 55, 48]
    },
    // Melodías originales compuestas para el calendario (días 20 a 23)
    sopa: {
      tempo: 0.34, compas: 3, tipo: 'triangle',
      melodia: [[55, 1], [60, 1], [64, 1], [62, 2], [60, 1], [57, 1], [60, 1], [65, 1], [64, 3],
        [62, 1], [59, 1], [55, 1], [57, 2], [59, 1], [60, 1], [64, 1], [62, 1], [60, 3]],
      bajo: [48, 43, 53, 48, 55, 53, 55, 48]
    },
    trineo: {
      tempo: 0.22, compas: 4, tipo: 'triangle', cascabel: true,
      melodia: [[64, 1.5], [62, .5], [60, 1], [59, 1], [57, 2], [60, 2], [62, 1.5], [60, .5], [59, 1], [57, 1], [55, 4],
        [64, 1.5], [65, .5], [67, 1], [64, 1], [62, 2], [60, 2], [59, 1], [60, 1], [62, 1], [59, 1], [60, 4]],
      bajo: [48, 45, 50, 43, 48, 45, 43, 48]
    },
    reparto: {
      tempo: 0.25, compas: 4, tipo: 'square',
      melodia: [[60, .5], [62, .5], [64, 1], [67, 1], [64, 1], [65, 1], [64, .5], [62, .5], [60, 2],
        [62, .5], [64, .5], [65, 1], [69, 1], [65, 1], [67, 4],
        [60, .5], [62, .5], [64, 1], [67, 1], [69, 1], [67, 1], [65, .5], [64, .5], [62, 2],
        [64, 1], [62, 1], [59, 1], [55, 1], [60, 4]],
      bajo: [48, 53, 53, 55, 48, 53, 55, 48]
    },
    estrella: {
      tempo: 0.28, compas: 4, tipo: 'square',
      melodia: [[55, 1], [60, 1], [64, 1], [67, 1], [65, 2], [64, 1], [62, 1], [64, 1], [62, 1], [60, 1], [59, 1], [60, 2], [55, 2],
        [57, 1], [60, 1], [65, 1], [69, 1], [67, 2], [65, 1], [64, 1], [62, 1], [64, 1], [65, 1], [62, 1], [60, 4]],
      bajo: [48, 53, 48, 55, 53, 48, 55, 48]
    },
    // Melodías originales compuestas para el calendario (días 15 a 19)
    pintura: {
      tempo: 0.26, compas: 4, tipo: 'square',
      melodia: [[52, 1], [55, 1], [60, 1], [55, 1], [57, 1], [60, 1], [59, 2], [57, 1], [55, 1], [53, 1], [55, 1], [52, 2], [55, 2],
        [52, 1], [55, 1], [60, 1], [64, 1], [62, 1], [60, 1], [59, 1], [57, 1], [55, 1], [57, 1], [59, 1], [62, 1], [60, 4]],
      bajo: [48, 53, 53, 48, 48, 53, 55, 48]
    },
    puzle: {
      tempo: 0.36, compas: 3, tipo: 'triangle',
      melodia: [[64, 2], [62, 1], [60, 3], [62, 1], [64, 1], [65, 1], [64, 3], [62, 2], [60, 1], [59, 3], [60, 1], [62, 1], [59, 1], [60, 3]],
      bajo: [48, 45, 50, 48, 53, 55, 55, 48]
    },
    bolas: {
      tempo: 0.22, compas: 4, tipo: 'square',
      melodia: [0, 1].flatMap(() => [[57, .5], [57, .5], [60, 1], [57, .5], [55, .5], [52, 1], [53, .5], [53, .5], [57, 1], [55, 2],
                                     [57, .5], [57, .5], [60, 1], [62, .5], [60, .5], [57, 1], [55, 1], [52, 1], [57, 2]]),
      bajo: [45, 50, 45, 52, 45, 50, 45, 52]
    },
    cables: {
      tempo: 0.26, compas: 4, tipo: 'square',
      melodia: [0, 1].flatMap(() => [[48, .5], [52, .5], [55, .5], [60, .5], [55, .5], [52, .5], [55, .5], [60, .5],
                                     [53, .5], [57, .5], [60, .5], [65, .5], [60, .5], [57, .5], [60, .5], [65, .5],
                                     [55, .5], [59, .5], [62, .5], [67, .5], [62, .5], [59, .5], [62, .5], [67, .5],
                                     [60, 1], [55, 1], [52, 1], [48, 1]]),
      bajo: [48, 53, 55, 48, 48, 53, 55, 48]
    },
    // Melodía original, alegre y tranquila, para la mudanza del día 1
    mudanza: {
      tempo: 0.3, compas: 4, tipo: 'triangle',
      melodia: [[60, 1], [64, 1], [67, 1], [72, 1], [71, .5], [69, .5], [67, 1], [64, 1], [65, 1],
        [67, 1], [65, .5], [64, .5], [62, 1], [60, 1], [62, 1], [64, 1], [62, 2],
        [60, 1], [64, 1], [67, 1], [72, 1], [74, .5], [72, .5], [71, 1], [69, 1], [67, 1],
        [65, 1], [69, 1], [67, .5], [65, .5], [64, 1], [62, 1], [59, 1], [60, 2]],
      bajo: [48, 48, 53, 43, 48, 50, 53, 48]
    },
    // Melodía original, rápida y con un punto de misterio, para la persecución del día 24
    persecucion: {
      tempo: 0.18, compas: 4, tipo: 'square', cascabel: true,
      melodia: [[69, .5], [72, .5], [76, 1], [74, .5], [72, .5], [71, 1], [69, .5], [71, .5], [72, 1], [71, .5], [69, .5], [68, 1],
        [69, .5], [72, .5], [76, 1], [77, .5], [76, .5], [74, 1], [72, .5], [71, .5], [69, 1], [68, 1], [69, 1],
        [64, .5], [64, .5], [69, 1], [71, .5], [72, .5], [74, 1], [76, .5], [74, .5], [72, 1], [71, 1], [69, 1],
        [65, .5], [69, .5], [72, 1], [71, .5], [69, .5], [68, 1], [69, 1], [64, 1], [69, 2]],
      bajo: [45, 45, 53, 52, 45, 48, 50, 52]
    },
    // Melodía original, saltarina, para los bolos de nieve (día 19)
    bolos: {
      tempo: 0.26, compas: 4, tipo: 'square', cascabel: true,
      melodia: [[67, .5], [67, .5], [72, 1], [71, .5], [69, .5], [67, 1], [64, .5], [65, .5], [67, 1], [69, 1], [67, 1],
        [65, .5], [65, .5], [69, 1], [67, .5], [65, .5], [64, 1], [62, .5], [64, .5], [65, 1], [62, 1], [60, 1],
        [67, .5], [67, .5], [72, 1], [74, .5], [72, .5], [71, 1], [69, .5], [71, .5], [72, 1], [67, 1], [64, 1],
        [65, .5], [69, .5], [67, 1], [65, .5], [64, .5], [62, 1], [60, 1], [64, 1], [60, 2]],
      bajo: [48, 45, 53, 55, 48, 45, 50, 48]
    },
    // Melodía navideña original (compuesta para el calendario), alegre, en do mayor
    fontanera: {
      tempo: 0.27, compas: 4, tipo: 'square',
      melodia: [[52, 1], [55, 1], [60, 1], [55, 1], [57, 1], [55, .5], [53, .5], [52, 2],
        [50, 1], [53, 1], [57, 1], [53, 1], [55, 1], [53, .5], [52, .5], [50, 2],
        [52, 1], [55, 1], [60, 1], [64, 1], [62, 1], [60, .5], [59, .5], [57, 2],
        [55, 1], [57, .5], [59, .5], [60, 1], [62, 1], [60, 3], [null, 1]],
      bajo: [48, 53, 50, 55, 48, 53, 55, 48]
    },
    // «Adeste Fideles» («Venid, fieles»), primera frase
    fieles: {
      tempo: 0.3, compas: 4, tipo: 'square',
      melodia: [[55, 2], [50, 1], [55, 1], [57, 2], [50, 2], [59, 1], [57, 1], [59, 1], [60, 1], [59, 2], [57, 1], [55, 1],
        [55, 2], [54, 1], [52, 1], [54, 1], [55, 1], [57, 1], [59, 1], [54, 2], [52, 1.5], [50, .5], [50, 4]],
      bajo: [43, 50, 43, 50, 52, 50, 45, 50]
    },
    // «Hark! The Herald Angels Sing» (F. Mendelssohn), primera frase
    heraldo: {
      tempo: 0.24, compas: 4, tipo: 'square',
      melodia: [[55, 1], [60, 1], [60, 1.5], [59, .5], [60, 1], [64, 1], [64, 1], [62, 1],
        [67, 1], [67, 1], [67, 1.5], [65, .5], [64, 1], [62, 1], [64, 2],
        [55, 1], [60, 1], [60, 1.5], [59, .5], [60, 1], [64, 1], [64, 1], [62, 1],
        [67, 1], [62, 1], [62, 1.5], [59, .5], [59, 1], [57, 1], [55, 2]],
      bajo: [48, 48, 48, 55, 48, 48, 50, 55]
    },
    // «O Tannenbaum» (tradicional alemán), primera frase dos veces
    tannenbaum: {
      tempo: 0.34, compas: 3, tipo: 'triangle',
      melodia: [0, 1].flatMap((k) => [[55, .75], [55, .25], [55, 1.5], [57, .5], [59, .75], [59, .25], [59, 1.5], [59, .5],
                                      [57, .5], [59, .5], [60, 1], [54, 1], ...(k === 0 ? [[57, 1], [55, 1], [50, 1]] : [[57, 1], [55, 2]])]),
      bajo: [43, 43, 50, 43, 43, 43, 50, 43]
    },
    // «We Three Kings» (J. H. Hopkins, 1857), primera frase en compás ternario de corcheas
    reyes: {
      tempo: 0.22, compas: 3, tipo: 'triangle',
      melodia: [0, 1, 2].flatMap((k) => [[59, 2], [57, 1], [55, 2], [52, 1], [54, 1], [55, 1], [54, 1], [52, 3]]),
      bajo: [52, 52, 47, 52, 52, 52, 47, 52, 55, 52, 47, 52]
    },
    // «God Rest Ye Merry Gentlemen» (tradicional inglés, en mi menor), primera frase dos veces
    caballeros: {
      tempo: 0.25, compas: 4, tipo: 'square',
      melodia: [0, 1].flatMap(() => [[52, 1], [52, 1], [59, 1], [59, 1], [57, 1], [55, 1], [54, 1], [52, 1],
                                     [50, 1], [52, 1], [54, 1], [55, 1], [57, 1], [59, 3]]),
      bajo: [52, 52, 50, 47, 52, 52, 50, 52]
    },
    // «The First Noel» (tradicional inglés), estrofa dos veces
    noel: {
      tempo: 0.3, compas: 3, tipo: 'square',
      melodia: [[null, 1], [52, 1], [50, 1],
        ...[0, 1].flatMap((k) => [
          [48, 1.5], [50, .5], [52, .5], [53, .5], [55, 2], [57, .5], [59, .5], [60, 1], [59, 1], [57, 1],
          [55, 2], [57, .5], [59, .5], [60, 1], [59, 1], [57, 1], [55, 1], [57, 1], [59, 1],
          [60, 1], [55, 1], [53, 1], ...(k === 0 ? [[52, 2], [52, .5], [50, .5]] : [[52, 3]])])],
      bajo: [48, 48, 48, 53, 48, 53, 55, 48, 48, 48, 48, 53, 48, 53, 55, 48, 48]
    },
    // «Joy to the World» (Händel / L. Mason)
    alegria: {
      tempo: 0.32, compas: 4, tipo: 'square',
      melodia: [[60, 1], [59, .75], [57, .25], [55, 1.5], [53, .5], [52, 1], [50, 1], [48, 1.5], [55, .5],
        [57, 1.5], [57, .5], [59, 1.5], [59, .5], [60, 3], [null, 1],
        [60, .5], [60, .5], [59, .5], [57, .5], [55, .5], [55, .75], [53, .25], [52, .5],
        [60, .5], [60, .5], [59, .5], [57, .5], [55, .5], [55, .75], [53, .25], [52, .5],
        [60, 1], [57, .5], [55, 1.5], [53, .5], [52, .5], [53, 1], [52, 1], [50, 1], [48, 1]],
      bajo: [48, 48, 53, 48, 48, 48, 53, 48]
    },
    // «Carol of the Bells» (Shchedryk, M. Leontóvich, 1916): el motivo de cuatro notas sobre un bajo que baja
    campanas: {
      tempo: 0.28, compas: 3, tipo: 'square',
      melodia: [
        ...Array.from({ length: 8 }, () => [[58, 1], [A3, .5], [58, .5], [G3, 1]]).flat(),
        ...Array.from({ length: 8 }, () => [[D4, 1], [C4, .5], [D4, .5], [58, 1]]).flat()],
      bajo: [55, 53, 51, 50, 55, 53, 51, 50, 55, 53, 51, 50, 55, 53, 51, 50]
    },
    // «Good King Wenceslas» (en sol mayor)
    wenceslao: {
      tempo: 0.28, compas: 4, tipo: 'square',
      melodia: [
        ...[0, 1].flatMap(() => [[G3, 1], [G3, 1], [G3, 1], [A3, 1], [G3, 1], [G3, 1], [D3, 2],
                                 [E3, 1], [D3, 1], [E3, 1], [54, 1], [G3, 2], [G3, 2]]),
        [D4, 1], [C4, 1], [B3, 1], [A3, 1], [B3, 1], [A3, 1], [G3, 2],
        [E3, 1], [D3, 1], [E3, 1], [54, 1], [G3, 2], [G3, 2],
        [D3, 1], [D3, 1], [E3, 1], [54, 1], [G3, 1], [G3, 1], [A3, 2],
        [D4, 1], [C4, 1], [B3, 1], [A3, 1], [G3, 2], [C4, 2], [G3, 4]],
      bajo: [43, 43, 50, 43, 43, 43, 50, 43, 43, 50, 48, 43, 50, 43, 48, 43, 43]
    },
    nochedepaz: {
      tempo: 0.33, compas: 3, tipo: 'triangle',
      melodia: [[G3, 1.5], [A3, .5], [G3, 1], [E3, 3], [G3, 1.5], [A3, .5], [G3, 1], [E3, 3],
        [D4, 2], [D4, 1], [B3, 3], [C4, 2], [C4, 1], [G3, 3],
        [A3, 2], [A3, 1], [C4, 1.5], [B3, .5], [A3, 1], [G3, 1.5], [A3, .5], [G3, 1], [E3, 3],
        [A3, 2], [A3, 1], [C4, 1.5], [B3, .5], [A3, 1], [G3, 1.5], [A3, .5], [G3, 1], [E3, 3],
        [D4, 2], [D4, 1], [F4, 1.5], [D4, .5], [B3, 1], [C4, 3], [E4, 3],
        [C4, 1], [G3, 1], [E3, 1], [G3, 1.5], [F3, .5], [D3, 1], [C4 - 12, 3], [null, 3]],
      bajo: [48, 48, 48, 48, 55, 55, 48, 48, 53, 53, 48, 48, 53, 53, 48, 48, 55, 55, 48, 48, 48, 55, 48, 48]
    }
  };

  // Convierte una pista en una lista de notas ordenada por tiempo.
  function compilar(p) {
    const ev = [];
    let t = 0;
    for (const [m, d] of p.melodia) {
      if (m !== null) ev.push({ t, m: m + 12, d: d * 0.9, tipo: p.tipo, v: p.tipo === 'square' ? 0.5 : 1.1 });
      t += d;
    }
    const c = p.compas;
    p.bajo.forEach((m, k) => {
      const t0 = k * c;
      ev.push({ t: t0, m, d: c === 3 ? 1.2 : 1.6, tipo: 'triangle', v: 1 });
      if (c === 3) { ev.push({ t: t0 + 1, m: m + 7, d: 0.8, tipo: 'triangle', v: 0.6 }); ev.push({ t: t0 + 2, m: m + 12, d: 0.8, tipo: 'triangle', v: 0.6 }); }
      else ev.push({ t: t0 + 2, m: m + 7, d: 1.6, tipo: 'triangle', v: 0.8 });
      if (p.cascabel) for (let i = 0; i < c; i++) ev.push({ t: t0 + i, m: 96, d: 0.12, tipo: 'sine', v: i % 2 ? 0.35 : 0.2 });
    });
    ev.sort((a, b) => a.t - b.t);
    return { eventos: ev, total: Math.max(t, p.bajo.length * c), tempo: p.tempo };
  }

  let pista = compilar(PISTAS.edificio), nombrePista = 'edificio';
  let inicioBucle = 0, indice = 0;
  let origenPista = 0;                                 // momento (reloj de audio) en que empezó la pista actual
  function programarMusica() {
    if (!ctx || ctx.state !== 'running') return;
    const limite = ctx.currentTime + 0.4;
    for (;;) {
      if (indice >= pista.eventos.length) { indice = 0; inicioBucle += pista.total * pista.tempo; }
      const e = pista.eventos[indice];
      const cuando = inicioBucle + e.t * pista.tempo;
      if (cuando > limite) break;
      if (cuando >= ctx.currentTime - 0.05) nota(e.m, Math.max(cuando, ctx.currentTime), e.d * pista.tempo, e.tipo, e.v, canalMusica);
      indice++;
    }
  }

  function nuevoCanal() {
    canalMusica = ctx.createGain();
    canalMusica.gain.value = 0.045;
    canalMusica.connect(salida);
  }

  // Cambia la música: 'edificio' o el nombre de una pista de PISTAS. La anterior se apaga con un fundido.
  function musica(nombre) {
    if (!PISTAS[nombre] || nombre === nombrePista) return;
    nombrePista = nombre;
    pista = compilar(PISTAS[nombre]);
    indice = 0;
    if (!ctx) return;
    const viejo = canalMusica, t = ctx.currentTime;
    viejo.gain.setValueAtTime(viejo.gain.value, t);
    viejo.gain.linearRampToValueAtTime(0, t + 0.3);
    setTimeout(() => viejo.disconnect(), 600);
    nuevoCanal();
    inicioBucle = origenPista = t + 0.35;
  }

  // Pulso de la música tal y como se oye ahora (descontando la latencia de salida), para los juegos de ritmo.
  // Devuelve null si el audio aún no está en marcha.
  function pulsoMusica() {
    if (!ctx || ctx.state !== 'running') return null;
    const latencia = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return { pulso: (ctx.currentTime - latencia - origenPista) / pista.tempo, tempo: pista.tempo, compas: PISTAS[nombrePista].compas };
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
    nuevoCanal();
    inicioBucle = origenPista = ctx.currentTime + 0.3;
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
    else if (nombre === 'carta') { ruido(t, 0.04, 0.06, 2500); nota(81, t, 0.04, 'triangle', 0.06); }
    else if (nombre === 'pareja') [79, 84, 88].forEach((m, i) => nota(m, t + i * 0.06, 0.12, 'square', 0.07));
    else if (nombre === 'agua') { ruido(t, 0.6, 0.07, 1400); ruido(t + 0.15, 0.4, 0.05, 900); }
    else if (nombre === 'miau') {                         // maullido: sube y baja de tono con un poco de vibrato
      const osc = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      osc.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1800;
      osc.frequency.setValueAtTime(520, t); osc.frequency.linearRampToValueAtTime(820, t + 0.12);
      osc.frequency.linearRampToValueAtTime(600, t + 0.35); osc.frequency.linearRampToValueAtTime(430, t + 0.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(f).connect(g).connect(salida); osc.start(t); osc.stop(t + 0.6);
    }
    else if (nombre === 'derrumbe') { ruido(t, 1.2, 0.25, 300); ruido(t + 0.3, 0.9, 0.2, 180); nota(33, t, 1, 'square', 0.06); }
    else if (nombre === 'saltar') { nota(67, t, 0.06, 'square', 0.05); nota(74, t + 0.04, 0.06, 'square', 0.05); }
    else if (nombre === 'perder') [67, 63, 60, 55].forEach((m, i) => nota(m, t + i * 0.13, 0.18, 'triangle', 0.12));
  }

  /* ---------- Voz de los diálogos: un pitido corto por letra, con tono según la letra ---------- */
  const ESCALA = [0, 2, 4, 5, 7, 9, 11, 12];
  let letras = 0;
  function voz(letra, tono = 0) {                       // tono: semitonos (cada personaje, su voz)
    if (!ctx || silencio || !/[a-záéíóúüñ]/i.test(letra)) return;
    if (letras++ % 2) return;                            // una de cada dos, para que no se amontonen
    const t = ctx.currentTime;
    const vocal = 'aeiouáéíóú'.indexOf(letra.toLowerCase());
    const grado = vocal >= 0 ? ESCALA[(vocal % 5) + 2] : ESCALA[letra.toLowerCase().charCodeAt(0) % 5];
    const base = frecuencia(76 + grado + tono) * (0.97 + Math.random() * 0.06);
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

  return { iniciar, musica, pulsoMusica, efecto, voz, alternarSilencio, enSilencio: () => silencio };
})();
