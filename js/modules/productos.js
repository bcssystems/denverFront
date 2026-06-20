let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 10,
  searchTerm: '',
  filterSucursal: '',
  sortField: 'idProducto',
  sortDir: 'DESC',
  editingId: null,
  currentProductoId: null,
};

export function init() {
  bindEvents();
  cargarProductos(0);
  cargarSucursalesSelect();
  cargarStats();
}

function bindEvents() {
  const btnNuevo = document.getElementById('btnNuevoProducto');
  if (btnNuevo) btnNuevo.addEventListener('click', () => abrirModal(null));

  const btnGuardar = document.getElementById('btnGuardarProducto');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarProducto);

  const searchInput = document.getElementById('searchProducto');
  if (searchInput) searchInput.addEventListener('input', Utils.debounce(e => {
    state.searchTerm = e.target.value;
    state.currentPage = 0;
    cargarProductos(0);
  }, 400));

  const filterSucursal = document.getElementById('filterSucursal');
  if (filterSucursal) filterSucursal.addEventListener('change', e => {
    state.filterSucursal = e.target.value;
    state.currentPage = 0;
    cargarProductos(0);
  });

  const tableBody = document.getElementById('tableProductosBody');
  if (tableBody) tableBody.addEventListener('click', handleTableClick);

  const multimediaInput = document.getElementById('multimediaInput');
  if (multimediaInput) multimediaInput.addEventListener('change', subirMultimedia);

  const btnMovimiento = document.getElementById('btnRegistrarMovimiento');
  if (btnMovimiento) btnMovimiento.addEventListener('click', () => abrirModalMovimiento());
}

async function cargarStats() {
  try {
    const stats = await API.get('/productos/stats');
    document.getElementById('statsTotal').textContent = stats.total || 0;
    document.getElementById('statsStock').textContent = stats.stockGlobal || 0;
    document.getElementById('statsActivos').textContent = stats.activos || 0;
  } catch (_) {}
}

async function cargarProductos(page) {
  state.currentPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.pageSize);
  params.set('sort', state.sortField + ',' + state.sortDir);
  if (state.searchTerm) params.set('search', state.searchTerm);
  if (state.filterSucursal) params.set('idSucursal', state.filterSucursal);

  try {
    const result = await API.get('/productos?' + params.toString());
    state.data = result.content;
    state.totalPages = result.totalPages;
    state.totalElements = result.totalElements;
    renderTable();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function cargarSucursalesSelect() {
  try {
    const sucursales = await API.get('/sucursales');
    const selects = document.querySelectorAll('.sucursal-select');
    selects.forEach(sel => {
      sel.innerHTML = '<option value="">Todas las sucursales</option>' +
        sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
      Utils.makeSearchableSelect(sel.id);
    });

    const stockSelects = document.querySelectorAll('.sucursal-stock-select');
    stockSelects.forEach(sel => {
      sel.innerHTML = '<option value="">Seleccionar sucursal</option>' +
        sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
      Utils.makeSearchableSelect(sel.id);
    });
  } catch (err) {
    console.warn('Error al cargar sucursales:', err);
  }
}

function renderTable() {
  const tbody = document.getElementById('tableProductosBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-box-open"></i><p>No hay productos</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(p => {
    const imgHtml = p.multimedia && p.multimedia.length > 0
      ? `<img src="${Utils.esc(p.multimedia.find(m => m.esPrincipal)?.url || p.multimedia[0].url)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover" alt="">`
      : '<div style="width:40px;height:40px;border-radius:6px;background:var(--border-light);display:flex;align-items:center;justify-content:center;color:var(--text-muted)"><i class="fas fa-image"></i></div>';

    let stockDisplay = p.stockActual;
    let stockClass = Utils.getStockClass(p.stockActual, p.stockMinimo);
    if (state.filterSucursal) {
      const sucInv = (p.inventarioSucursales || []).find(i => i.idSucursal === parseInt(state.filterSucursal));
      if (sucInv) {
        stockDisplay = sucInv.stock;
        stockClass = Utils.getStockClass(sucInv.stock, p.stockMinimo);
      }
    }

    return `<tr class="${p.activo ? '' : 'inactive-row'}">
      <td>${imgHtml}</td>
      <td><strong>${Utils.esc(p.sku)}</strong></td>
      <td>${Utils.esc(p.nombre)}</td>
      <td><span class="${stockClass}">${stockDisplay}</span></td>
      <td>$${(p.precio1 || 0).toFixed(2)}</td>
      <td><span class="badge-status ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="acciones-cell">
        <button class="btn-action btn-action-image" data-id="${p.idProducto}" data-action="multimedia" title="Multimedia"><i class="fas fa-images"></i></button>
        <button class="btn-action btn-action-edit" data-id="${p.idProducto}" data-action="edit" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="btn-action btn-action-delete" data-id="${p.idProducto}" data-action="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const container = document.getElementById('paginationProductos');
  if (!container) return;

  if (state.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';

  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;

  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }

  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;

  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarProductos(page);
    });
  });
}

function handleTableClick(e) {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;

  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'edit') {
    abrirModal(id);
  } else if (action === 'delete') {
    confirmarEliminar(id);
  } else if (action === 'multimedia') {
    verMultimedia(id);
  }
}

async function abrirModal(id) {
  state.editingId = id;
  const modalEl = document.getElementById('productoModal');
  if (!modalEl) return;

  const modal = new bootstrap.Modal(modalEl);
  const title = document.getElementById('productoModalTitle');
  const form = document.getElementById('formProducto');
  form.reset();

  document.getElementById('productoId').value = '';

  const skuField = document.getElementById('productoSku');
  const editing = !!id;

  const sucursalRow = document.getElementById('productoSucursalRow');
  if (sucursalRow) sucursalRow.style.display = id ? 'none' : '';

  if (id) {
    title.textContent = 'Editar Producto';
    try {
      const p = await API.get('/productos/' + id);
      document.getElementById('productoId').value = p.idProducto;
      document.getElementById('productoNombre').value = p.nombre || '';
      document.getElementById('productoDescripcion').value = p.descripcion || '';
      document.getElementById('productoPrecio1').value = p.precio1 || '';
      document.getElementById('productoPrecio2').value = p.precio2 || '';
      document.getElementById('productoPrecio3').value = p.precio3 || '';
      document.getElementById('productoPrecio4').value = p.precio4 || '';
      document.getElementById('productoStock').value = p.stockActual || 0;
      document.getElementById('productoStockMin').value = p.stockMinimo || '';
      document.getElementById('productoStockMax').value = p.stockMaximo || '';
      document.getElementById('productoMaterial').value = p.material || '';
      document.getElementById('productoNumeroMolde').value = p.numeroMolde || '';
      document.getElementById('productoTalla').value = p.talla || '';
      document.getElementById('productoAccesorio1').value = p.accesorio1 || '';
      document.getElementById('productoAccesorio2').value = p.accesorio2 || '';
      document.getElementById('productoActivo').checked = p.activo !== false;
      if (skuField) {
        skuField.value = p.sku || '';
        skuField.readOnly = true;
      }
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
  } else {
    title.textContent = 'Nuevo Producto';
    document.getElementById('productoActivo').checked = true;
    if (skuField) {
      skuField.value = '';
      skuField.readOnly = false;
    }
  }

  modal.show();
}

async function guardarProducto() {
  Utils.syncSearchableSelects();

  const data = {
    sku: document.getElementById('productoSku').value.trim(),
    nombre: document.getElementById('productoNombre').value.trim(),
    descripcion: document.getElementById('productoDescripcion').value.trim(),
    precio1: parseFloat(document.getElementById('productoPrecio1').value) || null,
    precio2: parseFloat(document.getElementById('productoPrecio2').value) || null,
    precio3: parseFloat(document.getElementById('productoPrecio3').value) || null,
    precio4: parseFloat(document.getElementById('productoPrecio4').value) || null,
    stockActual: parseInt(document.getElementById('productoStock').value) || 0,
    stockMinimo: parseInt(document.getElementById('productoStockMin').value) || null,
    stockMaximo: parseInt(document.getElementById('productoStockMax').value) || null,
    material: document.getElementById('productoMaterial').value.trim() || null,
    numeroMolde: document.getElementById('productoNumeroMolde').value.trim() || null,
    talla: document.getElementById('productoTalla').value.trim() || null,
    accesorio1: document.getElementById('productoAccesorio1').value.trim() || null,
    accesorio2: document.getElementById('productoAccesorio2').value.trim() || null,
    activo: document.getElementById('productoActivo').checked,
  };

  if (!state.editingId) {
    const sel = document.getElementById('productoSucursal');
    if (sel) data.idSucursal = parseInt(sel.value) || null;
  }

  if (!data.sku) {
    Utils.showToast('El SKU es obligatorio', 'warning');
    return;
  }
  if (!data.nombre) {
    Utils.showToast('El nombre es obligatorio', 'warning');
    return;
  }

  try {
    if (state.editingId) {
      await API.put('/productos/' + state.editingId, data);
      Utils.showToast('Producto actualizado', 'success');
    } else {
      await API.post('/productos', data);
      Utils.showToast('Producto creado', 'success');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('productoModal'));
    if (modal) modal.hide();
    cargarProductos(0);
    cargarStats();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction(
    '¿Desactivar este producto?', 'Confirmar', 'Desactivar'
  );
  if (!confirmed) return;

  try {
    await API.del('/productos/' + id);
    Utils.showToast('Producto desactivado', 'success');
    cargarProductos(state.currentPage);
    cargarStats();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function verMultimedia(id) {
  state.currentProductoId = id;
  const modalEl = document.getElementById('multimediaModal');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  try {
    const p = await API.get('/productos/' + id);
    document.getElementById('multimediaProductoName').textContent = p.nombre + ' (' + p.sku + ')';
    renderMultimedia(p.multimedia || []);
  } catch (err) {
    Utils.showToast(err.message, 'error');
    return;
  }

  renderStockSucursal(id);
  renderMovimientosRecientes(id);

  modal.show();
}

function renderMultimedia(list) {
  const container = document.getElementById('multimediaGallery');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-images"></i><p>Sin archivos multimedia</p></div>';
    return;
  }

  container.innerHTML = list.map(m => {
    const isVideo = m.tipo === 'VIDEO';
    const badge = m.esPrincipal ? '<div class="media-badge"><i class="fas fa-star"></i></div>' : '';
    return `<div class="media-item">
      ${badge}
      ${isVideo
        ? '<video src="' + Utils.esc(m.url) + '" muted></video>'
        : '<img src="' + Utils.esc(m.url) + '" alt="' + Utils.esc(m.nombreArchivo) + '">'}
      <button class="media-delete" data-id="${m.idMultimedia}" title="Eliminar"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');

  container.querySelectorAll('.media-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      try {
        await API.del('/productos/multimedia/' + id);
        Utils.showToast('Archivo eliminado', 'success');
        verMultimedia(state.currentProductoId);
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
  });
}

async function subirMultimedia(e) {
  const file = e.target.files[0];
  if (!file || !state.currentProductoId) return;

  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('esPrincipal', 'false');

  try {
    await API.requestUpload('/productos/' + state.currentProductoId + '/multimedia', formData);
    Utils.showToast('Archivo subido', 'success');
    verMultimedia(state.currentProductoId);
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }

  e.target.value = '';
}

async function renderStockSucursal(idProducto) {
  const container = document.getElementById('stockSucursalList');
  if (!container) return;

  try {
    const p = await API.get('/productos/' + idProducto);
    const inv = p.inventarioSucursales || [];

    if (inv.length === 0) {
      container.innerHTML = '<p class="text-muted small">Sin stock en sucursales</p>';
      return;
    }

    container.innerHTML = inv.map(i =>
      `<div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
        <span><strong>${Utils.esc(i.sucursalNombre)}</strong></span>
        <span class="fw-semibold ${Utils.getStockClass(i.stock, p.stockMinimo)}">${i.stock} unidades</span>
      </div>`
    ).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted small">Error al cargar stock</p>';
  }
}

async function renderMovimientosRecientes(idProducto) {
  const container = document.getElementById('movimientosRecientes');
  if (!container) return;

  try {
    const result = await API.get(`/kardex?idProducto=${idProducto}&size=5`);
    const movs = result.content || [];

    if (movs.length === 0) {
      container.innerHTML = '<p class="text-muted small">Sin movimientos</p>';
      return;
    }

    container.innerHTML = movs.map(m =>
      `<div class="d-flex justify-content-between align-items-center mb-1 small p-1 border-bottom">
        <span class="badge ${m.tipoMovimiento === 'ENTRADA' ? 'bg-success' : m.tipoMovimiento === 'SALIDA' ? 'bg-danger' : 'bg-warning'}">${m.tipoMovimiento}</span>
        <span>Cant: ${m.cantidad}</span>
        <span>Stock: ${m.stockAnterior} → ${m.stockNuevo}</span>
        <span class="text-muted">${Utils.formatDateTime(m.fechaMovimiento)}</span>
        <span class="text-muted">${Utils.esc(m.usuario)}</span>
      </div>`
    ).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-muted small">Error al cargar movimientos</p>';
  }
}

function abrirModalMovimiento() {
  const modalEl = document.getElementById('movimientoModal');
  if (!modalEl) return;

  document.getElementById('movimientoProductoId').value = state.currentProductoId || '';
  document.getElementById('movimientoForm').reset();
  bootstrap.Modal.getOrCreateInstance(modalEl).show();

  document.getElementById('btnGuardarMovimiento').onclick = async () => {
    const data = {
      tipoMovimiento: document.getElementById('movimientoTipo').value,
      cantidad: parseInt(document.getElementById('movimientoCantidad').value) || 0,
      idSucursal: parseInt(document.getElementById('movimientoSucursal').value) || null,
      referencia: document.getElementById('movimientoReferencia').value.trim(),
      observacion: document.getElementById('movimientoObservacion').value.trim(),
    };

    if (!data.cantidad || data.cantidad <= 0) {
      Utils.showToast('La cantidad debe ser mayor a 0', 'warning');
      return;
    }

    try {
      const idProducto = parseInt(document.getElementById('movimientoProductoId').value);
      await API.post(`/productos/${idProducto}/movimiento-stock`, data);
      Utils.showToast('Movimiento registrado', 'success');
      bootstrap.Modal.getInstance(modalEl).hide();
      if (state.currentProductoId) verMultimedia(state.currentProductoId);
      cargarProductos(state.currentPage);
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  };
}
