/**
 * Theme Manager — Accra English Club
 * Mode unique et unifié : professionnel, propre et harmonique (pas d'inversion ni de clignotement)
 */
(function () {
  'use strict';
  try {
    localStorage.removeItem('aec-theme');
    localStorage.removeItem('theme');
    if (document.documentElement.hasAttribute('data-theme')) {
      document.documentElement.removeAttribute('data-theme');
    }
  } catch (e) {}

  window.AEC = window.AEC || {};
  window.AEC.toggleTheme = function () { /* Désactivé : thème unique propre */ };
  window.AEC.applyTheme = function () { /* Thème unifié permanent */ };
})();
