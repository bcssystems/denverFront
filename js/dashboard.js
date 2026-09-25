let _sidebarDelegationReady = false;

function initSidebarDelegation() {
  if (_sidebarDelegationReady) return;
  _sidebarDelegationReady = true;

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.sidebar-sub-toggle');
    if (toggle) {
      e.preventDefault();
      const targetId = toggle.dataset.target;
      const submenu = document.getElementById(targetId);
      if (submenu) {
        const isOpening = !submenu.classList.contains('open');
        document.querySelectorAll('.sidebar-submenu.open').forEach(sm => {
          sm.classList.remove('open');
          const prevToggle = document.querySelector('.sidebar-sub-toggle[aria-controls="' + sm.id + '"]');
          if (prevToggle) prevToggle.classList.remove('open');
          const prevToggleByTarget = document.querySelector('.sidebar-sub-toggle[data-target="' + sm.id + '"]');
          if (prevToggleByTarget) prevToggleByTarget.classList.remove('open');
        });
        document.querySelectorAll('.sidebar-sub-toggle.open').forEach(t => {
          if (t !== toggle) t.classList.remove('open');
        });
        if (isOpening) {
          submenu.classList.add('open');
          toggle.classList.add('open');
        }
      }
      return;
    }

    const link = e.target.closest('[data-view]');
    if (link) {
      e.preventDefault();

      const ruta = link.getAttribute('data-view');
      const modulo = link.getAttribute('data-module');

      Utils.cargarVista(ruta, modulo);

      document.querySelectorAll('.sidebar-item').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (window.innerWidth < 992 && sidebar) {
        sidebar.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('active');
      }
    }
  });
}

const Dashboard = {
  init() {
    const username = localStorage.getItem('userNombre') || localStorage.getItem('username') || 'Usuario';
    const displayName = document.getElementById('display-name');
    if (displayName) displayName.textContent = username;

    const avatar = document.getElementById('topbar-avatar');
    if (avatar) avatar.textContent = (localStorage.getItem('username') || 'U').charAt(0).toUpperCase();

    this.filtrarSidebar();
    this.bindEvents();
  },

  filtrarSidebar() {
    document.querySelectorAll('#sidebar-nav li[style*="display"]').forEach(li => {
      li.style.display = '';
    });

    const links = document.querySelectorAll('.sidebar-item[data-permiso]');
    links.forEach(link => {
      const permiso = link.dataset.permiso;
      if (permiso && !Utils.hasPermiso(permiso)) {
        const li = link.closest('li');
        if (li) li.style.display = 'none';
      }
    });

    document.querySelectorAll('ul.sidebar-submenu').forEach(sub => {
      const hasVisible = Array.from(sub.children).some(li => li.style.display !== 'none');
      if (!hasVisible) {
        const toggle = document.querySelector('[data-target="' + sub.id + '"]');
        const parentLi = toggle ? toggle.closest('li') : null;
        if (parentLi) parentLi.style.display = 'none';
      }
    });
  },

  bindEvents() {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => Auth.logout());
    }

    const reloadBtn = document.getElementById('btn-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => Utils.recargarModulo());
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('sidebar-open');
        if (overlay) overlay.classList.toggle('active');
      });

      if (overlay) {
        overlay.addEventListener('click', () => {
          sidebar.classList.remove('sidebar-open');
          overlay.classList.remove('active');
        });
      }

      document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 &&
            sidebar.classList.contains('sidebar-open') &&
            !sidebar.contains(e.target) &&
            !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('sidebar-open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    }
  },
};
