'use strict';
/* Lógica de días: fecha actual (o simulada), progreso guardado y modal de contenido. */
const Dias = (() => {
  const TOTAL = 24;
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1';
  const CLAVE = debug ? 'adviento.progreso.debug' : 'adviento.progreso';

  let datos = [];                 // entradas de dias.json
  let abiertas = new Set(leerProgreso());
  let modalAbierto = false;
  let ficha = 0;                  // invalida cargas asíncronas de un modal ya cerrado
  let limpiarJuego = null;

  /* ---------- Fecha ---------- */
  // Día de diciembre actual: en noviembre devuelve 0 (ninguna puerta, cuenta atrás);
  // en diciembre, el día del mes; de enero a octubre, 25 (pasada la Navidad, todas accesibles).
  function calcularDiaActual() {
    if (debug) {
      const n = parseInt(params.get('dia'), 10);
      return Number.isNaN(n) ? 1 : Math.max(0, Math.min(31, n));
    }
    const hoy = new Date();
    if (hoy.getMonth() === 11) return hoy.getDate();
    return hoy.getMonth() === 10 ? 0 : 25;
  }
  const diaActual = calcularDiaActual();

  function diasHastaDiciembre() {
    const hoy = new Date();
    const uno = new Date(hoy.getFullYear(), 11, 1);
    return Math.max(1, Math.ceil((uno - hoy) / 86400000));
  }

  /* ---------- Progreso ---------- */
  function leerProgreso() {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(v) ? v.filter(Number.isInteger) : [];
    } catch (e) { return []; }
  }
  function guardarProgreso() {
    try { localStorage.setItem(CLAVE, JSON.stringify([...abiertas])); } catch (e) { /* sin almacenamiento */ }
  }
  function marcarAbierta(n) {
    if (!abiertas.has(n)) { abiertas.add(n); guardarProgreso(); }
  }

  // Una puerta de un día que aún no ha llegado está siempre cerrada con candado, aunque se jugara antes
  // (pasa al probar con ?dia=N o si cambia la fecha); las ya jugadas cuentan como 'abierta'.
  function estado(n) {
    if (n > diaActual) return 'bloqueada';
    return abiertas.has(n) ? 'abierta' : 'disponible';
  }
  const jugadas = () => [...abiertas].filter((n) => n <= diaActual).length;

  function info() {
    if (debug) return `DEBUG · hoy = ${diaActual} de diciembre · ${jugadas()}/${TOTAL} jugadas`;
    if (diaActual === 0) {
      const d = diasHastaDiciembre();
      return `Faltan ${d} ${d === 1 ? 'día' : 'días'} para el 1 de diciembre`;
    }
    if (diaActual > TOTAL) return `¡Feliz Navidad! Todas las puertas están abiertas · ${abiertas.size}/${TOTAL} vistas`;
    return `Hoy: ${diaActual} de diciembre · ${jugadas()}/${TOTAL} jugadas`;
  }

  /* ---------- Carga de dias.json ---------- */
  async function cargar() {
    const resp = await fetch('dias.json', { cache: 'no-cache' });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();
    datos = Array.isArray(json.dias) ? json.dias : [];
  }

  /* ---------- Modal ---------- */
  const $ = (id) => document.getElementById(id);

  // Inserta un <script>; en modo debug evita la caché para ver siempre la última versión.
  function cargarScript(ruta) {
    return new Promise((ok, fallo) => {
      const s = document.createElement('script');
      s.src = ruta + (debug ? '?t=' + Date.now() : '');
      s.onload = ok;
      s.onerror = () => fallo(new Error('No se pudo cargar ' + ruta));
      document.head.appendChild(s);
    });
  }

  async function cargarJuego(nombre) {
    if (!/^[\w-]+$/.test(nombre)) throw new Error('Nombre de juego no válido');
    window.JUEGOS = window.JUEGOS || {};
    if (window.JUEGOS[nombre]) return window.JUEGOS[nombre];
    if (typeof Comun === 'undefined' && nombre !== 'ejemplo') await cargarScript('juegos/comun.js');   // base compartida
    await cargarScript(`juegos/${nombre}.js`);
    if (!window.JUEGOS[nombre]) throw new Error('El archivo no registra el juego');
    return window.JUEGOS[nombre];
  }

  /* ---------- Diálogo estilo RPG (tipo "dialogo") ---------- */
  let dialogo = null;             // { n, lineas, i, letras, reloj }

  function pintarLinea() {
    const linea = dialogo.lineas[dialogo.i];
    $('dialogo-texto').textContent = linea.slice(0, dialogo.letras);
    $('dialogo-sigue').classList.toggle('oculto', dialogo.letras < linea.length);
  }

  function empezarLinea() {
    dialogo.letras = 0;
    clearInterval(dialogo.reloj);
    dialogo.reloj = setInterval(() => {            // el texto aparece letra a letra
      if (!dialogo) return;
      Sonido.voz(dialogo.lineas[dialogo.i][dialogo.letras] || '');
      dialogo.letras++;
      pintarLinea();
      if (dialogo.letras >= dialogo.lineas[dialogo.i].length) clearInterval(dialogo.reloj);
    }, 28);
    pintarLinea();
  }

  // Completa la línea si aún se está escribiendo; si no, pasa a la siguiente o termina.
  function avanzarDialogo() {
    if (!dialogo) return;
    const linea = dialogo.lineas[dialogo.i];
    if (dialogo.letras < linea.length) {
      clearInterval(dialogo.reloj);
      dialogo.letras = linea.length;
      pintarLinea();
    } else if (dialogo.i < dialogo.lineas.length - 1) {
      dialogo.i++;
      empezarLinea();
    } else {
      marcarAbierta(dialogo.n);
      cerrarModal();
    }
  }

  function abrirDialogo(n, entrada) {
    const lineas = (Array.isArray(entrada.lineas) ? entrada.lineas : [entrada.texto || '']).map(String).filter(Boolean);
    if (!lineas.length) lineas.push('...');
    const retrato = $('dialogo-retrato');
    retrato.classList.toggle('oculto', !Sprites.pintarRetrato(retrato, entrada.retrato));
    $('dialogo-nombre').textContent = entrada.personaje || '';
    dialogo = { n, lineas, i: 0, letras: 0, reloj: 0 };
    $('dialogo').classList.remove('oculto');
    empezarLinea();
  }

  /* ---------- Minijuegos (tipo "minijuego"), a pantalla completa sobre la escena ---------- */
  // Devuelve la capa del minijuego. Si el navegador sirve un index.html antiguo (de caché) que no la
  // tiene, la crea aquí, para que una mezcla de versiones no deje el juego bloqueado.
  function pantallaJuego() {
    let capa = $('pantalla-juego');
    if (!capa) {
      capa = document.createElement('div');
      capa.id = 'pantalla-juego';
      capa.className = 'oculto';
      capa.innerHTML = '<div id="juego-contenedor"></div>' +
        '<button id="juego-cerrar" class="boton-pixel" type="button" aria-label="Cerrar el minijuego">X</button>';
      ($('marco') || document.body).appendChild(capa);
    }
    const cerrar = $('juego-cerrar');
    if (!cerrar.dataset.listo) {
      cerrar.dataset.listo = '1';
      cerrar.addEventListener('click', (e) => { e.currentTarget.blur(); cerrarModal(); });
    }
    return { capa, contenedor: $('juego-contenedor') };
  }

  function quitarMinijuego() {
    if (typeof limpiarJuego === 'function') { try { limpiarJuego(); } catch (e) { console.error(e); } }
    limpiarJuego = null;
    const { capa, contenedor } = pantallaJuego();
    contenedor.replaceChildren();
    capa.classList.add('oculto');
    document.body.classList.remove('jugando');
  }

  // Mensaje del modal al terminar (o saltar) el minijuego.
  function mostrarRecompensa(n, entrada) {
    $('modal-dia').textContent = `Día ${n}`;
    $('modal-titulo').textContent = entrada.titulo || `Día ${n}`;
    $('modal-foto').classList.add('oculto');
    $('modal-texto').textContent = '¡Completado!' + (entrada.recompensa ? '\n' + entrada.recompensa : '');
    $('modal').classList.remove('oculto');
    document.querySelector('#modal .caja').focus();
  }

  function abrirMinijuego(n, entrada, miFicha) {
    const { capa, contenedor } = pantallaJuego();
    contenedor.replaceChildren();
    capa.classList.remove('oculto');
    document.body.classList.add('jugando');
    cargarJuego(entrada.juego).then((juego) => {
      if (miFicha !== ficha) return;
      // el tercer argumento son los datos del día en dias.json (palabras, preguntas, fotos…)
      limpiarJuego = juego.iniciarJuego(contenedor, () => {
        if (miFicha !== ficha) return;
        marcarAbierta(n);
        quitarMinijuego();
        mostrarRecompensa(n, entrada);
      }, entrada);
    }).catch((err) => {
      if (miFicha !== ficha) return;
      const p = document.createElement('p');
      p.className = 'juego-error';
      p.textContent = 'No se pudo cargar el minijuego: ' + err.message;
      contenedor.appendChild(p);
    });
  }

  function cerrarModal() {
    if (!modalAbierto) return;
    modalAbierto = false;
    ficha++;
    Sonido.efecto('cerrar');
    if (dialogo) { clearInterval(dialogo.reloj); dialogo = null; }
    $('dialogo').classList.add('oculto');
    quitarMinijuego();
    $('modal-juego').replaceChildren();
    $('modal').classList.add('oculto');
  }

  // Abre la puerta n si está permitido. Devuelve false si todavía no toca.
  function abrirPuerta(n) {
    if (n < 1 || n > TOTAL || n > diaActual) return false;
    const entrada = datos.find((d) => d.dia === n);
    const miFicha = ++ficha;

    if (entrada && entrada.tipo === 'dialogo') {       // no usa la caja del modal, sino el diálogo sobre la escena
      abrirDialogo(n, entrada);
      modalAbierto = true;
      return true;
    }
    if (entrada && entrada.tipo === 'minijuego') {     // ocupa toda la escena; al ganar se enseña el mensaje en el modal
      abrirMinijuego(n, entrada, miFicha);
      modalAbierto = true;
      return true;
    }

    $('modal-dia').textContent = `Día ${n}`;
    $('modal-titulo').textContent = entrada ? (entrada.titulo || `Día ${n}`) : `Día ${n}`;
    const foto = $('modal-foto');
    foto.classList.add('oculto'); foto.removeAttribute('src'); foto.alt = '';
    $('modal-texto').textContent = '';
    $('modal-juego').replaceChildren();

    if (!entrada) {
      $('modal-texto').textContent = 'Esta puerta aún no tiene contenido en dias.json.';
    } else if (entrada.tipo === 'mensaje') {
      $('modal-texto').textContent = entrada.texto || '';
      marcarAbierta(n);
    } else if (entrada.tipo === 'foto') {
      $('modal-texto').textContent = entrada.texto || '';
      foto.alt = entrada.alt || entrada.titulo || '';
      foto.onerror = () => { foto.classList.add('oculto'); $('modal-texto').textContent += '\n(No se pudo cargar la foto)'; };
      foto.src = entrada.imagen;
      foto.classList.remove('oculto');
      marcarAbierta(n);
    } else {
      $('modal-texto').textContent = `Tipo de contenido desconocido: ${entrada.tipo}`;
    }

    modalAbierto = true;
    $('modal').classList.remove('oculto');
    document.querySelector('#modal .caja').focus();   // sin foco en botones: evita que Espacio lo cierre
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('modal-cerrar').addEventListener('click', cerrarModal);
    pantallaJuego();                // prepara la capa del minijuego y su botón de cerrar
    $('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) cerrarModal(); });
    $('dialogo').addEventListener('click', avanzarDialogo);
  });
  // Este listener (document) se ejecuta antes que el de main.js (window), así que la misma
  // pulsación que abre el diálogo no lo avanza.
  document.addEventListener('keydown', (e) => {
    if (!modalAbierto) return;
    if (e.key === 'Escape') cerrarModal();
    else if (dialogo && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      e.stopPropagation();        // si esta pulsación cierra el diálogo, que main.js no vuelva a abrir la puerta
      if (!e.repeat) avanzarDialogo();
    }
  });

  return {
    TOTAL, debug, diaActual, cargar, estado, info, abrirPuerta, cerrarModal,
    hayModal: () => modalAbierto, hayDialogo: () => !!dialogo, avanzarDialogo
  };
})();
