'use strict';
/* Minijuego de ejemplo: solo un botón "Completar".
   Cada minijuego se registra en window.JUEGOS con su iniciarJuego(contenedor, alTerminar);
   así funciona también abriendo index.html sin servidor (los módulos ES no lo permiten). */
window.JUEGOS = window.JUEGOS || {};
window.JUEGOS.ejemplo = {
  iniciarJuego(contenedor, alTerminar) {
    const boton = document.createElement('button');
    boton.className = 'boton-pixel';
    boton.textContent = 'Completar';
    boton.addEventListener('click', () => {
      boton.disabled = true;
      alTerminar(true);
    });
    contenedor.appendChild(boton);
    return () => boton.remove();   // limpieza al cerrar el modal
  }
};
