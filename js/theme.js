/**
 * Theme & Responsive Navigation Manager — Accra English Club
 * Gestion unifiée du thème, du menu mobile 3 points (⋮) et du tiroir déroulant responsive.
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
  window.AEC.toggleTheme = function () {};
  window.AEC.applyTheme = function () {};

  // --- Mobile 3-Dots Navigation Controller ---
  function setupMobileNavigation() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // 1. Assurer la présence du bouton 3 points dans la topbar
    let moreBtn = document.getElementById('topbarMoreBtn');
    if (!moreBtn) {
      moreBtn = document.createElement('button');
      moreBtn.id = 'topbarMoreBtn';
      moreBtn.className = 'topbar-more-btn';
      moreBtn.setAttribute('aria-label', 'Menu de navigation');
      moreBtn.setAttribute('title', 'Ouvrir le menu');
      moreBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2.2"/>
          <circle cx="12" cy="12" r="2.2"/>
          <circle cx="12" cy="19" r="2.2"/>
        </svg>
      `;

      // Insérer à la fin de la topbar (ou dans la zone d'action droite)
      const rightRow = topbar.querySelector('.row') || topbar;
      rightRow.appendChild(moreBtn);
    }

    // 2. Assurer la présence du tiroir de navigation mobile
    let drawer = document.getElementById('mobileNavDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'mobileNavDrawer';
      drawer.className = 'mobile-nav-drawer';
      drawer.innerHTML = `
        <div class="mobile-nav-backdrop" id="mobileNavBackdrop"></div>
        <div class="mobile-nav-panel">
          <div class="mobile-nav-header">
            <div class="mobile-nav-title">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="#2563eb"/>
                <text x="7" y="20" font-family="Outfit,sans-serif" font-weight="800" font-size="16" fill="white">A</text>
              </svg>
              <span>Accra English Club</span>
            </div>
            <button class="mobile-nav-close" id="mobileNavClose" aria-label="Fermer le menu">✕</button>
          </div>
          <div class="mobile-nav-links">
            <a href="index.html" class="mobile-nav-link" data-page="index.html">
              <span class="nav-ic">🏠</span> Accueil
            </a>
            <a href="games.html?cat=solo" class="mobile-nav-link" data-page="games.html?cat=solo">
              <span class="nav-ic">👤</span> Jeux Solo
            </a>
            <a href="games.html?cat=group" class="mobile-nav-link" data-page="games.html?cat=group">
              <span class="nav-ic">👥</span> Jeux Équipes &amp; TV
            </a>
            <a href="games.html?cat=multi" class="mobile-nav-link" data-page="games.html?cat=multi">
              <span class="nav-ic">🌐</span> Multijoueur Live
            </a>
            <a href="learning.html" class="mobile-nav-link" data-page="learning.html">
              <span class="nav-ic">📖</span> Learning &amp; Histoires
            </a>
            <a href="teaching.html" class="mobile-nav-link" data-page="teaching.html">
              <span class="nav-ic">🎓</span> Teaching &amp; Formulaires
            </a>
            <a href="questionnaire.html" class="mobile-nav-link" data-page="questionnaire.html">
              <span class="nav-ic">📝</span> Questionnaire &amp; Évaluations
            </a>
            <div class="mobile-nav-divider"></div>
            <div class="mobile-nav-section-label">Outils &amp; Ressources</div>
            <a href="games.html?cat=season" class="mobile-nav-link" data-page="games.html?cat=season">
              <span class="nav-ic">🏆</span> Classement Saison
            </a>
            <a href="games.html?cat=tools" class="mobile-nav-link" data-page="games.html?cat=tools">
              <span class="nav-ic">✏️</span> Éditeur de Contenu
            </a>
            <a href="https://drive.google.com/drive/folders/1ZJQ3BmKeTyELWlOViCRWl0PoxY_fFWyc" target="_blank" rel="noopener noreferrer" class="mobile-nav-link">
              <span class="nav-ic">📁</span> Google Drive
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    // 3. Détecter la page active et la surligner
    const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const currentSearch = window.location.search.toLowerCase();
    const currentFull = currentPath + currentSearch;

    const links = drawer.querySelectorAll('.mobile-nav-link');
    links.forEach(link => {
      const page = (link.getAttribute('data-page') || '').toLowerCase();
      if (!page) return;
      if (page.includes('?')) {
        if (currentFull.includes(page)) link.classList.add('active');
      } else if (currentPath === page && !currentSearch.includes('cat=')) {
        link.classList.add('active');
      }
    });

    // 4. Gestion des événements d'ouverture / fermeture
    function openMenu() {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    moreBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (drawer.classList.contains('open')) closeMenu();
      else openMenu();
    };

    const closeBtn = document.getElementById('mobileNavClose');
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.preventDefault();
        closeMenu();
      };
    }

    const backdrop = document.getElementById('mobileNavBackdrop');
    if (backdrop) {
      backdrop.onclick = function () {
        closeMenu();
      };
    }

    // Fermer quand un lien est cliqué
    links.forEach(l => {
      l.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Fermer avec la touche Échap
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileNavigation);
  } else {
    setupMobileNavigation();
  }
})();
