let state = {
  page: 0,
  totalPages: 0,
  size: 15,
};

export function init() {
  bindEvents();
  cargarSucursales();
}

function bindEvents() {
  document.getElementById('btnFiltrar')?.addEventListener('click', () => buscar(0));
  document.getElementById('btnLimpiar')?.addEventListener('click', limpiar);
  document.getElementById('filterSucursal')?.addEventListener('change', async (e) => {
    const idSucursal = parseInt(e.target.value);
    const selCaja = document.getElementById('filterCaja');
    selCaja.innerHTML = '<option value="">Todas</option>';
    if (idSucursal) {
      try {
        const cajas = await API.get('/cajas/sucursal/' + idSucursal);
        selCaja.innerHTML += cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
      } catch (_) {}
    }
  });
}

async function cargarSucursales() {
  try {
    const sucursales = await API.get('/sucursales');
    const sel = document.getElementById('filterSucursal');
    sel.innerHTML = '<option value="">Todas</option>' +
      sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
  } catch (_) {}
}

function limpiar() {
  document.getElementById('filterSucursal').value = '';
  document.getElementById('filterCaja').innerHTML = '<option value="">Todas</option>';
  document.getElementById('filterDesde').value = '';
  document.getElementById('filterHasta').value = '';
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-calculator"></i><p>Selecciona filtros y presiona Buscar</p></div></td></tr>';
  document.getElementById('pagination').innerHTML = '';
}

async function buscar(page) {
  state.page = page;
  const body = document.getElementById('tableBody');
  if (!body) return;

  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.size);

  const idSucursal = parseInt(document.getElementById('filterSucursal').value);
  const idCaja = parseInt(document.getElementById('filterCaja').value);
  const desde = document.getElementById('filterDesde').value;
  const hasta = document.getElementById('filterHasta').value;

  if (idSucursal) params.set('idSucursal', idSucursal);
  if (idCaja) params.set('idCaja', idCaja);
  if (desde) params.set('fechaInicio', desde + 'T00:00:00');
  if (hasta) params.set('fechaFin', hasta + 'T23:59:59');

  body.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Buscando...</p></div></td></tr>';

  try {
    const result = await API.get('/cortes?' + params.toString());
    const cortes = result.content || [];
    state.totalPages = result.totalPages;

    if (cortes.length === 0) {
      body.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-calculator"></i><p>Sin resultados</p></div></td></tr>';
    } else {
      body.innerHTML = cortes.map(c => `<tr>
        <td>${c.idCorte}</td>
        <td>${Utils.esc(c.cajaNombre || '')}</td>
        <td>${Utils.esc(c.sucursalNombre || '')}</td>
        <td>$${(c.saldoInicial || 0).toFixed(2)}</td>
        <td class="fw-semibold">$${(c.totalVentas || 0).toFixed(2)}</td>
        <td class="text-success">$${(c.totalIngresos || 0).toFixed(2)}</td>
        <td class="text-danger">$${(c.totalEgresos || 0).toFixed(2)}</td>
        <td class="fw-bold" style="color:var(--primary)">$${(c.saldoFinalContado || 0).toFixed(2)}</td>
        <td>${Utils.formatDateTime(c.fechaApertura)}</td>
        <td>${Utils.formatDateTime(c.fechaCierre)}</td>
        <td>${Utils.esc(c.usuario || '')}</td>
      </tr>`).join('');
    }

    renderPagination();
  } catch (_) {
    body.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al consultar</p></div></td></tr>';
  }
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.page === 0 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.page - 1}"><i class="fas fa-chevron-left"></i></a></li>`;

  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.page - 2 && i <= state.page + 2)) {
      html += `<li class="page-item ${i === state.page ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.page - 3 || i === state.page + 3) {
      html += '<li class="page-item disabled"><a class="page-link" href="#">...</a></li>';
    }
  }

  html += `<li class="page-item ${state.page === state.totalPages - 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.page + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const p = parseInt(el.dataset.page);
      if (p >= 0 && p < state.totalPages) buscar(p);
    });
  });
}
