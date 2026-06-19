let state = { data: [], cajas: [] };

export function init() {
  bindEvents();
  cargarCajas();
  cargarGastos();
}

function bindEvents() {
  document.getElementById('btnNuevoGasto')?.addEventListener('click', () => abrirModal());
  document.getElementById('btnGuardarGasto')?.addEventListener('click', guardarGasto);
  document.getElementById('tableGastosBody')?.addEventListener('click', handleTableClick);
  document.getElementById('filtroCajaGasto')?.addEventListener('change', cargarGastos);
  document.getElementById('btnVerPendientes')?.addEventListener('click', () => {
    document.getElementById('filtroCajaGasto').value = '';
    cargarGastosPendientes();
  });
}

async function cargarCajas() {
  try {
    state.cajas = await API.get('/cajas');
    const sels = ['filtroCajaGasto', 'gastoCaja'];
    sels.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.innerHTML = '<option value="">' + (id === 'filtroCajaGasto' ? 'Todas las cajas' : 'Seleccionar caja...') + '</option>' +
          state.cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
        if (id === 'gastoCaja') Utils.makeSearchableSelect('gastoCaja');
      }
    });
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarGastos() {
  try {
    const cajaId = document.getElementById('filtroCajaGasto')?.value;
    state.data = cajaId ? await API.get('/gastos/caja/' + cajaId) : await API.get('/gastos/caja/0');
    // If no filter, get pendientes
    if (!cajaId) {
      try {
        state.data = await API.get('/gastos/pendientes');
      } catch (_) {
        state.data = [];
      }
    }
    renderTable();
  } catch (err) {
    state.data = [];
    renderTable();
  }
}

async function cargarGastosPendientes() {
  try {
    state.data = await API.get('/gastos/pendientes');
    renderTable();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableGastosBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-money-bill-wave"></i><p>No hay gastos</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(g => {
    const badgeClass = {
      'PENDIENTE': 'badge-warning',
      'AUTORIZADO': 'badge-active',
      'RECHAZADO': 'badge-inactive',
    }[g.estado] || 'badge-inactive';

    return `<tr>
      <td>${Utils.esc(g.cajaNombre) || '-'}</td>
      <td>${Utils.esc(g.descripcion)}</td>
      <td><strong>$${g.monto.toFixed(2)}</strong></td>
      <td>${Utils.esc(g.usuario) || '-'}</td>
      <td><span class="badge-status ${badgeClass}">${g.estado}</span></td>
      <td>${Utils.formatDateTime(g.fechaCreacion)}</td>
      <td class="acciones-cell">
        ${g.estado === 'PENDIENTE' ? `
          <button class="btn-action" style="color:var(--success)" data-id="${g.idGasto}" data-action="autorizar" title="Autorizar"><i class="fas fa-check"></i></button>
          <button class="btn-action" style="color:var(--danger)" data-id="${g.idGasto}" data-action="rechazar" title="Rechazar"><i class="fas fa-times"></i></button>
        ` : '-'}
      </td>
    </tr>`;
  }).join('');
}

function handleTableClick(e) {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'autorizar') confirmarAccion(id, 'autorizar');
  else if (action === 'rechazar') confirmarAccion(id, 'rechazar');
}

async function confirmarAccion(id, accion) {
  const msg = accion === 'autorizar' ? '¿Autorizar este gasto?' : '¿Rechazar este gasto?';
  const confirmed = await Utils.confirmAction(msg, 'Confirmar', accion === 'autorizar' ? 'Autorizar' : 'Rechazar');
  if (!confirmed) return;
  try {
    await API.post('/gastos/' + id + '/' + accion, {});
    Utils.showToast('Gasto ' + (accion === 'autorizar' ? 'autorizado' : 'rechazado'), 'success');
    cargarGastos();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirModal() {
  document.getElementById('formGasto').reset();
  new bootstrap.Modal(document.getElementById('gastoModal')).show();
}

async function guardarGasto() {
  const data = {
    idCaja: parseInt(document.getElementById('gastoCaja').value),
    descripcion: document.getElementById('gastoDescripcion').value.trim(),
    monto: parseFloat(document.getElementById('gastoMonto').value),
  };

  if (!data.idCaja) { Utils.showToast('Selecciona una caja', 'warning'); return; }
  if (!data.descripcion) { Utils.showToast('La descripci&oacute;n es obligatoria', 'warning'); return; }
  if (isNaN(data.monto) || data.monto <= 0) { Utils.showToast('Monto inv&aacute;lido', 'warning'); return; }

  try {
    await API.post('/gastos', data);
    Utils.showToast('Gasto solicitado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('gastoModal'))?.hide();
    cargarGastos();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
