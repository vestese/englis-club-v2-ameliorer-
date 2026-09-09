/**
 * Theme Manager — Accra English Club
 * Gère le mode sombre/clair avec persistance localStorage
 */
(function () {
  'use strict';

  const KEY = 'aec-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    // Update toggle icons
    const icons = document.querySelectorAll('.dm-icon');
    icons.forEach(el => {
      el.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    const labels = document.querySelectorAll('.dm-label');
    labels.forEach(el => {
      el.textContent = theme === 'dark' ? 'Clair' : 'Sombre';
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    // Apply saved theme immediately (prevents flash)
    const saved = localStorage.getItem(KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);

    // Wire up all toggle buttons
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#darkModeToggle, .theme-toggle-btn');
      if (btn) toggleTheme();
    });
  }

  // Run as early as possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also expose globally
  window.AEC = window.AEC || {};
  window.AEC.toggleTheme = toggleTheme;
  window.AEC.applyTheme = applyTheme;
})();
