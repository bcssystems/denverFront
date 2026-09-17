let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  pageSize: 10,
  editingId: null,
  paises: [],
  showInactive: false,
  ineClienteId: null,
};

const REGIMENES_FISCALES = [
  { value: "601", label: "601 - General de Ley Personas Morales" },
  { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { value: "606", label: "606 - Arrendamiento" },
  { value: "607", label: "607 - Enajenaci\u00f3n o Adquisici\u00f3n de Bienes" },
  { value: "608", label: "608 - Dem\u00e1s Ingresos" },
  { value: "610", label: "610 - Residentes en el Extranjero sin EP" },
  { value: "611", label: "611 - Dividendos (Socios y Accionistas)" },
  { value: "612", label: "612 - Personas F\u00edsicas con Act. Empresariales" },
  { value: "614", label: "614 - Ingresos por Intereses" },
  { value: "616", label: "616 - Sin Obligaciones Fiscales" },
  { value: "621", label: "621 - R\u00e9gimen de Incorporaci\u00f3n Fiscal" },
  { value: "625", label: "625 - Act. Empresariales con Plataformas Tecnol\u00f3gicas" },
  { value: "626", label: "626 - R\u00e9gimen Simplificado de Confianza" },
];

export function init() {
  bindEvents();
  cargarPaises();
  cargarRegimenes();
  cargarClientes(0);
}

function bindEvents() {
  document.getElementById('btnNuevoCliente')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarCliente')?.addEventListener('click', guardarCliente);
  document.getElementById('tableClientesBody')?.addEventListener('click', handleTableClick);
  const searchInput = document.getElementById('searchCliente');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce(() => {
      cargarClientes(0);
    }, 400));
  }
  document.getElementById('filtroListaNegra')?.addEventListener('change', () => cargarClientes(0));
  document.getElementById('btnToggleClientesInactivos')?.addEventListener('click', toggleInactivos);
  document.getElementById('clienteTieneCredito')?.addEventListener('change', function() {
    toggleLimiteCreditoGroup(this.checked);
  });
  document.getElementById('clienteCp')?.addEventListener('input', Utils.debounce(function() {
    const cp = this.value.trim();
    if (cp.length === 5) {
      cargarColonias(cp, '');
    }
  }, 500));
  document.getElementById('clienteIneFile')?.addEventListener('change', subirIne);
}

async function cargarPaises() {
  try {
    state.paises = await API.get('/catalogos/paises');
    const sel = document.getElementById('clientePais');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar...</option>' +
        state.paises.map(p => `<option value="${p.codigo}">${p.nombre} (${p.prefijo})</option>`).join('');
      Utils.makeSearchableSelect('clientePais');
      sel.addEventListener('change', aplicarPrefijoPais);
      aplicarPrefijoPais();
    }
  } catch (_) {}
}

function aplicarPrefijoPais() {
  const span = document.getElementById('clientePrefijo');
  if (!span) return;
  const codigo = document.getElementById('clientePais')?.value || '';
  const pais = state.paises.find(p => p.codigo === codigo);
  const prefijo = pais && pais.prefijo ? pais.prefijo : '+52';
  if (span.textContent !== prefijo) span.textContent = prefijo;
}

function cargarRegimenes() {
  const sel = document.getElementById('clienteRegimen');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      REGIMENES_FISCALES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  }
}

async function cargarClientes(page) {
  state.currentPage = page;
  const search = document.getElementById('searchCliente')?.value || '';
  const soloListaNegra = document.getElementById('filtroListaNegra')?.checked || false;
  try {
    let result;
    if (soloListaNegra) {
      result = await API.get('/clientes/lista-negra');
      state.data = result || [];
      state.totalPages = 1;
    } else {
      result = await API.get('/clientes?search=' + encodeURIComponent(search) + '&activo=' + (state.showInactive ? 'false' : 'true') + '&page=' + page + '&size=' + state.pageSize);
      state.data = result.content;
      state.totalPages = result.totalPages;
    }
    renderTable();
    renderPagination();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableClientesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13"><div class="empty-state"><i class="fas fa-address-book"></i><p>No hay clientes</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c => {
    const saldo = c.saldoActual;
    const saldoRojo = saldo != null && saldo > 0;
    const creditoHtml = c.tieneCredito
      ? '<span class="badge bg-info"><i class="fas fa-check me-1"></i>Sí</span>' + (c.tieneIne ? '' : ' <span class="badge bg-danger" title="Falta INE"><i class="fas fa-id-card"></i></span>')
      : '<span class="text-muted">-</span>';
    const limiteHtml = c.tieneCredito
      ? (c.limiteCredito != null ? '$' + c.limiteCredito.toFixed(2) : '<span class="badge bg-warning text-dark">Ilimitado</span>')
      : '-';
    const ineBtn = c.tieneIne
      ? '<button class="btn-action" data-id="' + c.idCliente + '" data-action="ver-ine" title="Ver INE"><i class="fas fa-eye"></i></button>'
      : '';
    return `<tr${c.enListaNegra ? ' style="background:rgba(220,38,38,0.04)"' : ''}>
    <td>${Utils.esc(c.nombre)}</td>
    <td>${Utils.esc(c.apellidoPaterno || '')} ${Utils.esc(c.apellidoMaterno || '')}</td>
    <td>${Utils.esc(c.telefono) || '-'}</td>
    <td>${Utils.esc(c.codigoPais) || '-'}</td>
    <td>${Utils.esc(c.regimenFiscal) || '-'}</td>
    <td style="max-width:160px;white-space:normal">${Utils.esc(c.direccion || '')}${c.cp ? ' (CP: ' + c.cp + ')' : ''}</td>
    <td>${creditoHtml}</td>
    <td>${limiteHtml}</td>
    <td class="text-end" style="${saldoRojo ? 'color:var(--danger);font-weight:600' : ''}">${saldo != null ? '$' + saldo.toFixed(2) : '-'}</td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" data-id="${c.idCliente}" data-ln="${c.enListaNegra ? 1 : 0}" data-nombre="${Utils.esc(c.nombre + ' ' + (c.apellidoPaterno || ''))}" ${c.enListaNegra ? 'checked' : ''} title="Lista negra">
    </td>
    <td>${Utils.esc(c.motivoListaNegra) || '-'}</td>
    <td>${c.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
    <td class="acciones-cell">
      <button class="btn-action" data-id="${c.idCliente}" data-action="ine" title="Subir INE"><i class="fas fa-id-card"></i></button>
      ${ineBtn}
      <button class="btn-action btn-action-edit" data-id="${c.idCliente}" title="Editar"><i class="fas fa-edit"></i></button>
      <button class="btn-action btn-action-delete" data-id="${c.idCliente}" title="Eliminar"><i class="fas fa-trash"></i></button>
    </td>
  </tr>`;
  }).join('');

  tbody.querySelectorAll('input[data-ln]').forEach(cb => {
    cb.addEventListener('change', e => {
      e.stopPropagation();
      toggleListaNegra(parseInt(cb.dataset.id), cb.checked, cb.dataset.nombre);
    });
  });
}

function toggleInactivos() {
  state.showInactive = !state.showInactive;
  state.currentPage = 0;
  const btn = document.getElementById('btnToggleClientesInactivos');
  if (btn) {
    btn.innerHTML = state.showInactive
      ? '<i class="fas fa-eye-slash me-1"></i> Mostrar activos'
      : '<i class="fas fa-eye me-1"></i> Mostrar inactivos';
  }
  cargarClientes(0);
}

function renderPagination() {
  const container = document.getElementById('paginationClientes');
  if (!container || state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }
  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarClientes(page);
    });
  });
}

function handleTableClick(e) {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  if (btn.dataset.action === 'edit' || btn.classList.contains('btn-action-edit')) abrirModal(id);
  else if (btn.dataset.action === 'delete' || btn.classList.contains('btn-action-delete')) confirmarEliminar(id);
  else if (btn.dataset.action === 'ine') abrirSubirIne(id);
  else if (btn.dataset.action === 'ver-ine') verIne(id);
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
  document.getElementById('clienteModalTitle').textContent = id ? 'Editar Cliente' : 'Nuevo Cliente';
  document.getElementById('formCliente').reset();
  document.getElementById('clienteId').value = '';
  aplicarPrefijoPais();

  if (id) {
    const c = state.data.find(c => c.idCliente === id);
    if (c) {
      document.getElementById('clienteId').value = c.idCliente;
      document.getElementById('clienteNombre').value = c.nombre || '';
      document.getElementById('clienteApaterno').value = c.apellidoPaterno || '';
      document.getElementById('clienteAmaterno').value = c.apellidoMaterno || '';
      const ladaEl = document.getElementById('clienteLada');
      if (ladaEl) {
        const tel = (c.telefono || '').replace(/\D/g, '');
        if (tel.length === 10) {
          ladaEl.value = tel.slice(0, 3);
          document.getElementById('clienteTelefono').value = tel.slice(3);
        } else {
          ladaEl.value = '';
          document.getElementById('clienteTelefono').value = c.telefono || '';
        }
      } else {
        document.getElementById('clienteTelefono').value = c.telefono || '';
      }
      document.getElementById('clientePais').value = c.codigoPais || '';
      Utils.updateSearchableOptions('clientePais');
      aplicarPrefijoPais();
      document.getElementById('clienteWhatsapp').value = c.whatsapp || '';
      document.getElementById('clienteEmpresa').value = c.empresa || '';
      document.getElementById('clienteRegimen').value = c.regimenFiscal || '';
      document.getElementById('clienteRfc').value = c.rfc || '';
      document.getElementById('clienteRepresentanteLegal').value = c.representanteLegal || '';
      document.getElementById('clienteDireccionEntrega').value = c.direccionEntrega || '';
      document.getElementById('clienteCp').value = c.cp || '';
      document.getElementById('clienteEstado').value = c.estado || '';
      document.getElementById('clienteMunicipio').value = c.municipio || '';
      document.getElementById('clienteCalle').value = c.calle || '';
      document.getElementById('clienteNumExt').value = c.numExt || '';
      document.getElementById('clienteNumInt').value = c.numInt || '';
      if (c.cp) {
        cargarColonias(c.cp, c.colonia || '');
      }
      document.getElementById('clienteTieneCredito').checked = c.tieneCredito || false;
      document.getElementById('clienteCreditoIlimitado').checked = c.limiteCredito == null && c.tieneCredito;
      document.getElementById('clienteLimiteCredito').value = c.limiteCredito || '';
      toggleLimiteCreditoGroup(c.tieneCredito || false);
    }
  } else {
    document.getElementById('clienteTieneCredito').checked = false;
    document.getElementById('clienteCreditoIlimitado').checked = false;
    document.getElementById('clienteLimiteCredito').value = '';
    toggleLimiteCreditoGroup(false);
  }
  modal.show();
}

function toggleLimiteCreditoGroup(show) {
  const limiteGroup = document.getElementById('clienteLimiteCreditoGroup');
  const ilimitadoGroup = document.getElementById('clienteCreditoIlimitadoGroup');
  if (limiteGroup) limiteGroup.style.display = show ? 'block' : 'none';
  if (ilimitadoGroup) ilimitadoGroup.style.display = show ? 'block' : 'none';
}

function combinarTelefonoCliente() {
  const lada = document.getElementById('clienteLada')?.value.replace(/\D/g, '').trim() || '';
  const num = document.getElementById('clienteTelefono').value.trim();
  const local = num.replace(/\D/g, '');
  if (lada && local.length >= 7) return lada + local;
  return num;
}

async function guardarCliente() {
  const tieneCredito = document.getElementById('clienteTieneCredito').checked;
  const ilimitado = document.getElementById('clienteCreditoIlimitado').checked;
  const data = {
    nombre: document.getElementById('clienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('clienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('clienteAmaterno').value.trim(),
    telefono: combinarTelefonoCliente(),
    codigoPais: document.getElementById('clientePais').value,
    whatsapp: document.getElementById('clienteWhatsapp').value.trim(),
    empresa: document.getElementById('clienteEmpresa').value.trim(),
    regimenFiscal: document.getElementById('clienteRegimen').value,
    rfc: document.getElementById('clienteRfc').value.trim(),
    representanteLegal: document.getElementById('clienteRepresentanteLegal').value.trim(),
    direccionEntrega: document.getElementById('clienteDireccionEntrega').value.trim(),
    cp: document.getElementById('clienteCp').value.trim() || null,
    calle: document.getElementById('clienteCalle').value.trim(),
    numExt: document.getElementById('clienteNumExt').value.trim(),
    numInt: document.getElementById('clienteNumInt').value.trim(),
    colonia: document.getElementById('clienteColonia')?.value || '',
    municipio: document.getElementById('clienteMunicipio').value.trim(),
    estado: document.getElementById('clienteEstado').value.trim(),
    direccion: buildDireccionString(),
    tieneCredito: tieneCredito,
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.apellidoPaterno) { Utils.showToast('El apellido paterno es obligatorio', 'warning'); return; }
  if (!data.telefono) { Utils.showToast('El tel\u00e9fono es obligatorio', 'warning'); return; }
  if (!data.regimenFiscal) { Utils.showToast('El r\u00e9gimen fiscal es obligatorio', 'warning'); return; }
  if (data.codigoPais === 'MEX' && !data.cp) { Utils.showToast('El C.P. es obligatorio', 'warning'); return; }

  if (tieneCredito) {
    data.limiteCredito = ilimitado ? null : (parseFloat(document.getElementById('clienteLimiteCredito').value) || 0);
  } else {
    data.limiteCredito = 0;
  }

  try {
    if (state.editingId) {
      await API.put('/clientes/' + state.editingId, data);
      Utils.showToast('Cliente actualizado', 'success');
    } else {
      await API.post('/clientes', data);
      Utils.showToast('Cliente creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('clienteModal'))?.hide();
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('¿Eliminar este cliente?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/clientes/' + id);
    Utils.showToast('Cliente eliminado', 'success');
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function toggleListaNegra(id, enListaNegra, nombre) {
  if (!enListaNegra) {
    const ok = await Utils.confirm('\u00bfQuitar de la lista negra a ' + nombre + '?', 'Lista negra');
    if (!ok) { cargarClientes(state.currentPage); return; }
  }
  try {
    const motivo = enListaNegra ? await Utils.promptInput('Agregar a lista negra', 'Motivo', '') : null;
    await API.put('/clientes/' + id + '/lista-negra', { enListaNegra, motivo });
    Utils.showToast(enListaNegra ? 'Cliente en lista negra' : 'Cliente retirado de lista negra', 'success');
    cargarClientes(state.currentPage);
  } catch (err) {
    Utils.showToast(err.message, 'error');
    cargarClientes(state.currentPage);
  }
}

function abrirSubirIne(id) {
  state.ineClienteId = id;
  const input = document.getElementById('clienteIneFile');
  if (!input) return;
  input.value = '';
  input.click();
}

async function subirIne() {
  const id = state.ineClienteId;
  const input = document.getElementById('clienteIneFile');
  const file = input && input.files[0];
  if (!id || !file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    await API.requestUpload('/clientes/' + id + '/ine', formData);
    Utils.showToast('INE guardado', 'success');
    if (input) input.value = '';
    state.ineClienteId = null;
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function verIne(id) {
  try {
    const token = API.getToken();
    const response = await fetch(API.baseUrl + '/clientes/' + id + '/ine', {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
    });
    if (!response.ok) throw new Error('No se pudo cargar la INE');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function buildDireccionString() {
  const calle = document.getElementById('clienteCalle').value.trim();
  const numExt = document.getElementById('clienteNumExt').value.trim();
  const numInt = document.getElementById('clienteNumInt').value.trim();
  const colonia = document.getElementById('clienteColonia')?.value || '';
  const municipio = document.getElementById('clienteMunicipio').value.trim();
  const estado = document.getElementById('clienteEstado').value.trim();
  const cp = document.getElementById('clienteCp').value.trim();

  const parts = [];
  if (calle) parts.push(calle);
  if (numExt) parts.push('Ext. ' + numExt);
  if (numInt) parts.push('Int. ' + numInt);
  if (colonia) parts.push(colonia);
  if (municipio) parts.push(municipio);
  if (estado) parts.push(estado);
  if (cp) parts.push('C.P. ' + cp);

  return parts.join(', ');
}

const cpCache = {};

async function cargarColonias(cp, selectedColonia) {
  if (!cp || cp.length !== 5) return;
  if (cpCache[cp]) {
    aplicarDatosCP(cpCache[cp], selectedColonia);
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://api.zippopotam.us/MX/' + cp, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data && data.places) {
      const result = {
        colonias: data.places.map(p => p['place name']),
        estado: data.places[0]?.state || ''
      };
      cpCache[cp] = result;
      aplicarDatosCP(result, selectedColonia);
    }
  } catch (_) {
    document.getElementById('clienteEstado').value = '';
    document.getElementById('clienteColonia').innerHTML = '<option value="">No disponible</option>';
    console.warn('Error al consultar CP:', cp);
  }
}

function aplicarDatosCP(result, selectedColonia) {
  const sel = document.getElementById('clienteColonia');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      result.colonias.map(c => `<option value="${c}" ${c === selectedColonia ? 'selected' : ''}>${c}</option>`).join('');
    sel.disabled = false;
  }
  const estadoInput = document.getElementById('clienteEstado');
  if (estadoInput) estadoInput.value = result.estado;
}