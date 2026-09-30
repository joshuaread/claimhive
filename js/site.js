/**
 * Claim Hive — Universal Site Script ("site.js")
 * Manages responsive navigation, mobile drawer with viewport bounds & body scroll lock,
 * active page highlights, and toast notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Drawer & Viewport Bounds
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-menu-drawer');
  const siteHeader = document.querySelector('.site-header');

  function updateDrawerPosition() {
    if (siteHeader && mobileDrawer) {
      const rect = siteHeader.getBoundingClientRect();
      const topOffset = Math.max(0, Math.round(rect.bottom));
      mobileDrawer.style.top = topOffset + 'px';
      mobileDrawer.style.height = (window.innerHeight - topOffset) + 'px';
    }
  }

  function openDrawer() {
    updateDrawerPosition();
    mobileDrawer.classList.add('open');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'true');
      mobileToggle.innerHTML = '✕';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (mobileDrawer) mobileDrawer.classList.remove('open');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.innerHTML = '☰';
    }
    document.body.style.overflow = '';
  }

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.contains('open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close when tapping any link inside mobile drawer
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Recalculate on screen resize or phone orientation change
    window.addEventListener('resize', () => {
      if (mobileDrawer.classList.contains('open')) {
        updateDrawerPosition();
      }
    });
  }

  // 2. Robust Active Page Highlighting (supports clean URLs, GitHub Pages subpaths, and .html)
  const rawPath = window.location.pathname.split('/').filter(Boolean).pop() || 'index';
  const cleanCurrent = rawPath.replace(/\.html$/, '');

  document.querySelectorAll('.nav-link').forEach(link => {
    const rawHref = (link.getAttribute('href') || '').split('?')[0].split('#')[0];
    const cleanHref = (rawHref.split('/').pop() || '').replace(/\.html$/, '');

    const isMatch = (cleanHref === cleanCurrent) ||
                    ((cleanCurrent === 'claimhive' || cleanCurrent === 'index') && (cleanHref === 'index' || cleanHref === ''));

    if (isMatch && cleanHref !== '') {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. Global Toast Utility
  window.showToast = function(message) {
    let toast = document.getElementById('copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'copy-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  };
});
