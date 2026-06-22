let state = {
  page: 0,
  totalPages: 0,
  size: 15,
  currentCorte: null,
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
  document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
  document.getElementById('btnReimprimirCorte')?.addEventListener('click', reimprimirCorte);
}

function handleTableClick(e) {
  const btn = e.target.closest('.ver-corte-btn');
  if (btn) {
    const id = parseInt(btn.dataset.id);
    verCorte(id);
  }
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
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-calculator"></i><p>Selecciona filtros y presiona Buscar</p></div></td></tr>';
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

  body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Buscando...</p></div></td></tr>';

  try {
    const result = await API.get('/cortes?' + params.toString());
    const cortes = result.content || [];
    state.totalPages = result.totalPages;

    if (cortes.length === 0) {
      body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-calculator"></i><p>Sin resultados</p></div></td></tr>';
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
        <td><button class="btn btn-sm btn-outline-primary ver-corte-btn" data-id="${c.idCorte}" title="Ver detalle"><i class="fas fa-eye"></i></button></td>
      </tr>`).join('');
    }

    renderPagination();
  } catch (_) {
    body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al consultar</p></div></td></tr>';
  }
}

async function verCorte(id) {
  try {
    const corte = await API.get('/cortes/' + id);
    state.currentCorte = corte;
    document.getElementById('corteDetailId').textContent = corte.idCorte;

    const body = document.getElementById('corteDetailBody');
    body.innerHTML = `
      <div class="col-md-6">
        <div class="panel-card p-3">
          <table class="table table-sm table-borderless mb-0">
            <tr><td class="text-muted">Caja</td><td class="fw-semibold text-end">${Utils.esc(corte.cajaNombre || '')}</td></tr>
            <tr><td class="text-muted">Sucursal</td><td class="fw-semibold text-end">${Utils.esc(corte.sucursalNombre || '')}</td></tr>
            <tr><td class="text-muted">Usuario</td><td class="fw-semibold text-end">${Utils.esc(corte.usuario || '')}</td></tr>
            <tr><td class="text-muted">Apertura</td><td class="fw-semibold text-end">${Utils.formatDateTime(corte.fechaApertura)}</td></tr>
            <tr><td class="text-muted">Cierre</td><td class="fw-semibold text-end">${Utils.formatDateTime(corte.fechaCierre)}</td></tr>
          </table>
        </div>
      </div>
      <div class="col-md-6">
        <div class="panel-card p-3">
          <table class="table table-sm table-borderless mb-0">
            <tr><td class="text-muted">Saldo Inicial</td><td class="fw-semibold text-end">$${(corte.saldoInicial || 0).toFixed(2)}</td></tr>
            <tr><td class="text-muted">Ventas</td><td class="fw-semibold text-end">$${(corte.totalVentas || 0).toFixed(2)}</td></tr>
            <tr><td class="text-muted">Contado</td><td class="fw-semibold text-end">$${(corte.totalVentasContado || 0).toFixed(2)}</td></tr>
            <tr><td class="text-muted">Cr\u00e9dito</td><td class="fw-semibold text-end">$${(corte.totalVentasCredito || 0).toFixed(2)}</td></tr>
            <tr><td class="text-muted">Ingresos</td><td class="text-success fw-semibold text-end">+$${(corte.totalIngresos || 0).toFixed(2)}</td></tr>
            <tr><td class="text-muted">Egresos</td><td class="text-danger fw-semibold text-end">-$${(corte.totalEgresos || 0).toFixed(2)}</td></tr>
            <tr class="border-top"><td class="fw-bold">Saldo Final</td><td class="fw-bold text-end" style="color:var(--primary)">$${(corte.saldoFinalContado || 0).toFixed(2)}</td></tr>
          </table>
        </div>
      </div>
      <div class="col-12">
        <div class="panel-card p-3">
          <h6 class="fw-semibold mb-2">Desglose por Forma de Pago</h6>
          ${corte.detallePagos && corte.detallePagos.length > 0 ? `
          <table class="table table-sm table-custom mb-0">
            <thead>
              <tr>
                <th>Forma de Pago</th>
                <th class="text-end">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${corte.detallePagos.map(d => `
              <tr>
                <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
                <td class="text-end fw-semibold">$${(d.monto || 0).toFixed(2)}</td>
              </tr>`).join('')}
              <tr class="border-top">
                <td class="fw-bold">Total</td>
                <td class="text-end fw-bold">$${corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>` : '<p class="text-muted small mb-0">Sin desglose de pagos</p>'}
        </div>
      </div>
    `;

    new bootstrap.Modal(document.getElementById('corteDetailModal')).show();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function reimprimirCorte() {
  const corte = state.currentCorte;
  if (!corte) return;

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Corte de Caja #${corte.idCorte || ''}</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; padding: 20px; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #8B4513; margin-bottom: 2px; }
    .header .sub { font-size: 10px; color: #666; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .info-table { width: 100%; font-size: 11px; margin-bottom: 8px; }
    .info-table td { padding: 2px 4px; }
    .info-table td:last-child { text-align: right; }
    .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
    .data-table td:last-child { text-align: right; font-weight: 600; }
    .data-table .total-row td { font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: none; padding-top: 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DENVER HATS</h1>
    <div class="sub">Corte de Caja</div>
  </div>
  <div class="divider"></div>
  <table class="info-table">
    <tr><td><strong>Corte #</strong></td><td>${corte.idCorte || '-'}</td></tr>
    <tr><td><strong>Fecha de Corte</strong></td><td>${fechaStr}</td></tr>
    <tr><td><strong>Hora</strong></td><td>${horaStr}</td></tr>
    <tr><td><strong>Caja</strong></td><td>${Utils.esc(corte.cajaNombre || '')}</td></tr>
    <tr><td><strong>Sucursal</strong></td><td>${Utils.esc(corte.sucursalNombre || '')}</td></tr>
    <tr><td><strong>Usuario</strong></td><td>${Utils.esc(corte.usuario || '')}</td></tr>
    <tr><td><strong>Apertura</strong></td><td>${corte.fechaApertura ? new Date(corte.fechaApertura).toLocaleString('es-MX') : '-'}</td></tr>
    <tr><td><strong>Cierre</strong></td><td>${corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleString('es-MX') : now.toLocaleString('es-MX')}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section-title">Resumen del Corte</div>
  <table class="data-table">
    <tr><td>Saldo Inicial</td><td>$${(corte.saldoInicial || 0).toFixed(2)}</td></tr>
    <tr><td>Total Ventas</td><td>$${(corte.totalVentas || 0).toFixed(2)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Contado</td><td>$${(corte.totalVentasContado || 0).toFixed(2)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Cr\u00e9dito</td><td>$${(corte.totalVentasCredito || 0).toFixed(2)}</td></tr>
    <tr><td>Total Ingresos</td><td style="color:#059669">+$${(corte.totalIngresos || 0).toFixed(2)}</td></tr>
    <tr><td>Total Egresos</td><td style="color:#dc2626">-$${(corte.totalEgresos || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td>Saldo Final</td><td>$${(corte.saldoFinalContado || 0).toFixed(2)}</td></tr>
  </table>
  ${corte.detallePagos && corte.detallePagos.length > 0 ? `
  <div class="divider"></div>
  <div class="section-title">Desglose por Forma de Pago</div>
  <table class="data-table">
    ${corte.detallePagos.map(d => `
    <tr><td>${Utils.esc(d.tipoPagoNombre || '')}</td><td>$${(d.monto || 0).toFixed(2)}</td></tr>
    `).join('')}
  </table>` : ''}
  <div class="footer">
    <p>--- Fin del Corte ---</p>
    <p>${fechaStr} ${horaStr}</p>
  </div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
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