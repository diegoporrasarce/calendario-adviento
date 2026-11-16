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
  // Día de diciembre actual. Antes del 1 de diciembre devuelve 0 (ninguna puerta).
  function calcularDiaActual() {
    if (debug) {
      const n = parseInt(params.get('dia'), 10);
      return Number.isNaN(n) ? 1 : Math.max(0, Math.min(31, n));
    }
    const hoy = new Date();
    return hoy.getMonth() === 11 ? hoy.getDate() : 0;
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

  function estado(n) {
    if (abiertas.has(n)) return 'abierta';
    return n <= diaActual ? 'disponible' : 'bloqueada';
  }

  function info() {
    if (debug) return `DEBUG · hoy = ${diaActual} de diciembre · ${abiertas.size}/${TOTAL} abiertas`;
    if (diaActual === 0) {
      const d = diasHastaDiciembre();
      return `Faltan ${d} ${d === 1 ? 'día' : 'días'} para el 1 de diciembre`;
    }
    return `Hoy: ${diaActual} de diciembre · ${abiertas.size}/${TOTAL} abiertas`;
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

  function cargarJuego(nombre) {
    return new Promise((ok, fallo) => {
      if (!/^[\w-]+$/.test(nombre)) return fallo(new Error('Nombre de juego no válido'));
      window.JUEGOS = window.JUEGOS || {};
      if (window.JUEGOS[nombre]) return ok(window.JUEGOS[nombre]);
      const s = document.createElement('script');
      s.src = `juegos/${nombre}.js`;
      s.onload = () => (window.JUEGOS[nombre] ? ok(window.JUEGOS[nombre]) : fallo(new Error('El archivo no registra el juego')));
      s.onerror = () => fallo(new Error('No se pudo cargar juegos/' + nombre + '.js'));
      document.head.appendChild(s);
    });
  }

  function cerrarModal() {
    if (!modalAbierto) return;
    modalAbierto = false;
    ficha++;
    if (typeof limpiarJuego === 'function') { try { limpiarJuego(); } catch (e) { /* ignorar */ } }
    limpiarJuego = null;
    $('modal-juego').replaceChildren();
    $('modal').classList.add('oculto');
  }

  // Abre la puerta n si está permitido. Devuelve false si todavía no toca.
  function abrirPuerta(n) {
    if (n < 1 || n > TOTAL || n > diaActual) return false;
    const entrada = datos.find((d) => d.dia === n);
    const miFicha = ++ficha;

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
    } else if (entrada.tipo === 'minijuego') {
      $('modal-texto').textContent = entrada.texto || '';
      const contenedor = $('modal-juego');
      cargarJuego(entrada.juego).then((juego) => {
        if (miFicha !== ficha) return;
        limpiarJuego = juego.iniciarJuego(contenedor, () => {
          if (miFicha !== ficha) return;
          marcarAbierta(n);
          $('modal-texto').textContent = '¡Completado!' + (entrada.recompensa ? '\n' + entrada.recompensa : '');
        });
      }).catch((err) => {
        if (miFicha === ficha) $('modal-texto').textContent = 'No se pudo cargar el minijuego: ' + err.message;
      });
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
    $('modal').addEventListener('pointerdown', (e) => { if (e.target === $('modal')) cerrarModal(); });
  });
  document.addEventListener('keydown', (e) => {
    if (modalAbierto && e.key === 'Escape') cerrarModal();
  });

  return {
    TOTAL, debug, diaActual, cargar, estado, info, abrirPuerta, cerrarModal,
    hayModal: () => modalAbierto
  };
})();
