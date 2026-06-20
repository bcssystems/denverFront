let state = {
  caja: null,
  cajas: [],
  sucursales: [],
  clientes: [],
  productos: [],
  cart: [],
  editingVentaEspera: null,
  productSearchTimeout: null,
  reanudandoVentaId: null,
  esperaVentas: [],
  cancelarVentas: [],
  cancelarSelectedId: null,
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
  mostrarSelectorCaja();
}

function bindEvents() {
  document.getElementById('btnEntrarCaja')?.addEventListener('click', entrarCaja);

  document.getElementById('btnCobrarPOS')?.addEventListener('click', cobrarVenta);
  document.getElementById('btnEsperaPOS')?.addEventListener('click', ponerEnEspera);
  document.getElementById('btnNuevoClientePOS')?.addEventListener('click', () => abrirClienteModal());
  document.getElementById('btnGuardarPosCliente')?.addEventListener('click', guardarClienteDesdePOS);
  document.getElementById('btnIngresarEfectivo')?.addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('posIngresoModal')).show();
  });
  document.getElementById('btnRetirarEfectivo')?.addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('posRetiroModal')).show();
  });
  document.getElementById('btnGuardarIngreso')?.addEventListener('click', ingresarEfectivo);
  document.getElementById('btnGuardarRetiro')?.addEventListener('click', retirarEfectivo);
  document.getElementById('btnCortePOS')?.addEventListener('click', previewCorte);
  document.getElementById('btnRealizarCortePOS')?.addEventListener('click', realizarCorte);
  document.getElementById('btnGastoPOS')?.addEventListener('click', () => new bootstrap.Modal(document.getElementById('posGastoModal')).show());
  document.getElementById('btnSolicitarGastoPOS')?.addEventListener('click', solicitarGasto);
  document.getElementById('btnCancelarVentaPOS')?.addEventListener('click', abrirCancelarVentaModal);
  document.getElementById('btnConfirmarCancelarPOS')?.addEventListener('click', confirmarCancelarVenta);
  document.getElementById('btnVentaRapidaPOS')?.addEventListener('click', () => {
    cargarClientesSelect('posVrCliente');
    new bootstrap.Modal(document.getElementById('posVentaRapidaModal')).show();
  });
  document.getElementById('btnRealizarVentaRapidaPOS')?.addEventListener('click', realizarVentaRapida);
  document.getElementById('btnAbandonarCaja')?.addEventListener('click', abandonarCaja);

  document.getElementById('btnVerInventario')?.addEventListener('click', () => {
    const input = document.getElementById('posProductSearch');
    if (input) {
      input.value = '';
      input.focus();
    }
    buscarProductos(true);
  });

  const searchInput = document.getElementById('posProductSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(state.productSearchTimeout);
      state.productSearchTimeout = setTimeout(buscarProductos, 300);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarProductos();
    });
    document.addEventListener('click', (e) => {
      const results = document.getElementById('posProductResults');
      if (results && !e.target.closest('.pos-panel-product-search')) {
        results.classList.add('d-none');
      }
    });
  }

  document.querySelectorAll('input[name="precioSel"]').forEach(r => {
    r.addEventListener('change', () => {
      actualizarPreciosCart();
      recalcularTotales();
    });
  });
}

async function mostrarSelectorCaja() {
  document.getElementById('pos-caja-selector').classList.remove('d-none');
  document.getElementById('pos-interface').classList.add('d-none');
  try {
    state.sucursales = await API.get('/sucursales');
    const selSuc = document.getElementById('posSucursalSelect');
    selSuc.innerHTML = '<option value="">-- Selecciona una sucursal --</option>' +
      state.sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
    selSuc.addEventListener('change', async () => {
      const idSucursal = parseInt(selSuc.value);
      const cajaSel = document.getElementById('posCajaSelect');
      const entrarBtn = document.getElementById('btnEntrarCaja');
      if (idSucursal) {
        try {
          state.cajas = await API.get('/cajas/sucursal/' + idSucursal);
          cajaSel.innerHTML = '<option value="">-- Selecciona una caja --</option>' +
            state.cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
          cajaSel.disabled = false;
        } catch (_) {
          cajaSel.innerHTML = '<option value="">Error al cargar cajas</option>';
          cajaSel.disabled = true;
        }
      } else {
        cajaSel.innerHTML = '<option value="">-- Primero selecciona sucursal --</option>';
        cajaSel.disabled = true;
        entrarBtn.disabled = true;
      }
    });
    document.getElementById('posCajaSelect').addEventListener('change', () => {
      const id = parseInt(document.getElementById('posCajaSelect').value);
      document.getElementById('btnEntrarCaja').disabled = !id;
    });
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function entrarCaja() {
  const id = parseInt(document.getElementById('posCajaSelect').value);
  if (!id) { Utils.showToast('Selecciona una caja', 'warning'); return; }

  try {
    state.caja = await API.get('/cajas/' + id);
    if (state.caja.estado === 'CERRADA') {
      const saldo = await Utils.promptInput('Saldo Inicial', '¿Con cu\u00e1nto efectivo comienzas?', '0');
      if (saldo === null) return;
      await API.post('/cajas/' + id + '/apertura', { saldoInicial: parseFloat(saldo) || 0 });
      state.caja = await API.get('/cajas/' + id);
      Utils.showToast('Caja abierta exitosamente', 'success');
    }
    iniciarPOS();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function iniciarPOS() {
  document.getElementById('pos-caja-selector').classList.add('d-none');
  document.getElementById('pos-interface').classList.remove('d-none');
  state.reanudandoVentaId = null;
  actualizarSaldoCaja();
  cargarClientesSelect('posCliente');
  cargarClientesSelect('posVrCliente');
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  limpiarCart();
  buscarProductos();
  cargarEsperas();
}

function actualizarSaldoCaja() {
  const el = document.getElementById('posSaldoActual');
  if (el && state.caja) el.textContent = '$' + (state.caja.saldoActual || 0).toFixed(2);
}

async function refreshCaja() {
  if (!state.caja) return;
  try {
    state.caja = await API.get('/cajas/' + state.caja.idCaja);
    actualizarSaldoCaja();
  } catch (_) {}
}

function getStockSucursal(producto) {
  if (!state.caja?.idSucursal || !producto?.inventarioSucursales) return producto?.stockActual || 0;
  const inv = producto.inventarioSucursales.find(i => i.idSucursal === state.caja.idSucursal);
  return inv != null ? inv.stock : 0;
}

async function cargarClientesSelect(selectId) {
  try {
    const result = await API.get('/clientes?page=0&size=500');
    state.clientes = result.content || [];
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const label = selectId === 'posVrCliente' ? 'Mostrador' : 'Cliente mostrador...';
    sel.innerHTML = `<option value="">${label}</option>` +
      state.clientes.map(c =>
        `<option value="${c.idCliente}">${Utils.esc(c.nombre + ' ' + (c.apellidoPaterno || ''))}</option>`
      ).join('');
    if (selectId === 'posCliente') {
      Utils.makeSearchableSelect('posCliente');
    }
  } catch (_) {}
}

async function cargarPaises(selectId) {
  try {
    const paises = await API.get('/catalogos/paises');
    const sel = document.getElementById(selectId);
    if (sel) {
      sel.innerHTML = paises.map(p =>
        `<option value="${p.codigo}" ${p.codigo === 'MX' ? 'selected' : ''}>${p.nombre} (${p.prefijo})</option>`
      ).join('');
    }
  } catch (_) {}
}

function cargarRegimenes(selectId) {
  const sel = document.getElementById(selectId);
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      REGIMENES_FISCALES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  }
}

function actualizarPreciosCart() {
  const precioIdx = parseInt(document.querySelector('input[name="precioSel"]:checked')?.value) || 1;
  const precioKey = 'precio' + precioIdx;
  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && p[precioKey]) {
      d.precioUnitario = p[precioKey];
    }
  });
  renderCart();
}

async function buscarProductos(showAll) {
  const q = document.getElementById('posProductSearch')?.value?.trim() || '';
  const results = document.getElementById('posProductResults');
  const list = document.getElementById('posProductList');
  if (!results || !list) return;

  if (q.length < 1 && !showAll) {
    results.classList.add('d-none');
    return;
  }

  try {
    const hasQuery = q.length > 0;
    const sucursalParam = state.caja?.idSucursal ? '&idSucursal=' + state.caja.idSucursal : '';
    const url = hasQuery
      ? '/productos?search=' + encodeURIComponent(q) + '&activo=true&page=0&size=20' + sucursalParam
      : '/productos?activo=true&page=0&size=50&sort=sku,ASC' + sucursalParam;
    const data = await API.get(url);
    state.productos = data.content || [];
    if (state.productos.length === 0) {
      list.innerHTML = '<div class="pos-product-result-item text-muted">Sin resultados</div>';
    } else {
      list.innerHTML = state.productos.map(p => {
        const stock = getStockSucursal(p);
        return `<div class="pos-product-result-item" data-id="${p.idProducto}">
          <div>
            <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
            <small class="text-muted">SKU: ${Utils.esc(p.sku || '-')} | Stock: ${stock}</small>
          </div>
          <div class="text-end">
            <div class="fw-bold" style="color:var(--primary)">$${(p.precio1 || 0).toFixed(2)}</div>
            <button class="btn btn-sm btn-success pos-add-cart" data-id="${p.idProducto}" style="font-size:0.7rem">
              <i class="fas fa-cart-plus"></i>
            </button>
          </div>
        </div>`;
      }).join('');

      list.querySelectorAll('.pos-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prodId = parseInt(btn.dataset.id);
          agregarAlCart(prodId);
        });
      });

      list.querySelectorAll('.pos-product-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.pos-add-cart')) return;
          const prodId = parseInt(item.dataset.id);
          agregarAlCart(prodId);
        });
      });
    }
    results.classList.remove('d-none');
  } catch (_) {
    list.innerHTML = '<div class="pos-product-result-item text-muted">Error al buscar</div>';
    results.classList.remove('d-none');
  }
}

function agregarAlCart(prodId) {
  const p = state.productos.find(x => x.idProducto === prodId);
  if (!p) return;

  const precioIdx = parseInt(document.querySelector('input[name="precioSel"]:checked')?.value) || 1;
  const precioKey = 'precio' + precioIdx;
  const precio = p[precioKey] || 0;

  const stockSuc = getStockSucursal(p);
  if (stockSuc <= 0) {
    Utils.showToast('Producto sin stock en esta sucursal', 'warning');
    return;
  }

  const existente = state.cart.find(d => d.idProducto === prodId);
  if (existente) {
    const stockSuc = getStockSucursal(p);
    if (existente.cantidad >= stockSuc) {
      Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
      return;
    }
    existente.cantidad++;
  } else {
    state.cart.push({
      idProducto: prodId,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: 1,
      precioUnitario: precio,
      stockActual: getStockSucursal(p),
    });
  }

  renderCart();
  document.getElementById('posProductResults')?.classList.add('d-none');
  document.getElementById('posProductSearch').value = '';
}

function renderCart() {
  const tbody = document.getElementById('posCartBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state py-3"><i class="fas fa-cart-plus"></i><p>Agrega productos a la venta</p></div></td></tr>';
  } else {
    tbody.innerHTML = state.cart.map((d, i) => `<tr>
      <td>
        <div class="fw-semibold small">${Utils.esc(d.nombre)}</div>
        <small class="text-muted">${d.sku || ''}</small>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button class="pos-cart-qty-btn pos-cart-qty-minus" data-index="${i}"><i class="fas fa-minus"></i></button>
          <span class="fw-semibold px-1">${d.cantidad}</span>
          <button class="pos-cart-qty-btn pos-cart-qty-plus" data-index="${i}"><i class="fas fa-plus"></i></button>
        </div>
      </td>
      <td>$${d.precioUnitario.toFixed(2)}</td>
      <td class="fw-semibold">$${(d.cantidad * d.precioUnitario).toFixed(2)}</td>
      <td><button class="pos-cart-remove" data-index="${i}"><i class="fas fa-times"></i></button></td>
    </tr>`).join('');

    tbody.querySelectorAll('.pos-cart-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        if (state.cart[i].cantidad > 1) {
          state.cart[i].cantidad--;
        } else {
          state.cart.splice(i, 1);
        }
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        const p = state.productos.find(x => x.idProducto === state.cart[i].idProducto);
        if (p && state.cart[i].cantidad >= getStockSucursal(p)) {
          Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
          return;
        }
        state.cart[i].cantidad++;
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cart.splice(parseInt(btn.dataset.index), 1);
        renderCart();
      });
    });
  }

  recalcularTotales();
}

function recalcularTotales() {
  const precioIdx = parseInt(document.querySelector('input[name="precioSel"]:checked')?.value) || 1;
  let subtotal = 0;
  let descuento = 0;

  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p) {
      const precio1 = p.precio1 || 0;
      const precioActual = d.precioUnitario;
      d.subtotal = d.cantidad * d.precioUnitario;
      subtotal += d.subtotal;
      descuento += (precio1 - precioActual) * d.cantidad;
    }
  });

  descuento = Math.max(0, descuento);
  const total = Math.max(0, subtotal);

  document.getElementById('posSubtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('posDescuento').textContent = '-$' + descuento.toFixed(2);
  document.getElementById('posTotal').textContent = '$' + total.toFixed(2);
}

function limpiarCart() {
  state.cart = [];
  renderCart();
}

async function cobrarVenta() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }
  if (state.cart.length === 0) { Utils.showToast('Agrega productos a la venta', 'warning'); return; }

  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.querySelector('input[name="precioSel"]:checked')?.value) || 1;
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;

  for (const d of state.cart) {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && getStockSucursal(p) < d.cantidad) {
      Utils.showToast('Stock insuficiente en esta sucursal: ' + d.nombre, 'error');
      return;
    }
  }

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId || null,
    tipoVenta: tipoVenta,
    precioSeleccionado: precioIdx,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    detalles: state.cart.map(d => ({
      idProducto: d.idProducto,
      descripcion: null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
    })),
  };

  try {
    if (state.reanudandoVentaId) {
      await API.post('/ventas/' + state.reanudandoVentaId + '/cancelar', {});
      state.reanudandoVentaId = null;
    }
    await API.post('/ventas', request);
    Utils.showToast('Venta registrada exitosamente', 'success');
    limpiarCart();
    await refreshCaja();
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function ponerEnEspera() {
  if (state.cart.length === 0 || !state.caja) return;
  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.querySelector('input[name="precioSel"]:checked')?.value) || 1;
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId || null,
    tipoVenta: tipoVenta,
    precioSeleccionado: precioIdx,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    detalles: state.cart.map(d => ({
      idProducto: d.idProducto,
      descripcion: null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
    })),
  };

  try {
    const venta = await API.post('/ventas', request);
    await API.post('/ventas/' + venta.idVenta + '/espera', {});
    Utils.showToast('Venta puesta en espera', 'success');
    limpiarCart();
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function ingresarEfectivo() {
  const monto = parseFloat(document.getElementById('posIngresoMonto').value);
  const motivo = document.getElementById('posIngresoMotivo').value.trim();
  if (!monto || monto <= 0) { Utils.showToast('Monto inv\u00e1lido', 'warning'); return; }
  if (!motivo) { Utils.showToast('Motivo requerido', 'warning'); return; }

  try {
    await API.post('/cajas/' + state.caja.idCaja + '/ingresos', { monto, motivo });
    Utils.showToast('Ingreso registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posIngresoModal'))?.hide();
    document.getElementById('posIngresoMonto').value = '';
    document.getElementById('posIngresoMotivo').value = '';
    await refreshCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function retirarEfectivo() {
  const monto = parseFloat(document.getElementById('posRetiroMonto').value);
  const motivo = document.getElementById('posRetiroMotivo').value.trim();
  if (!monto || monto <= 0) { Utils.showToast('Monto inv\u00e1lido', 'warning'); return; }
  if (!motivo) { Utils.showToast('Motivo requerido', 'warning'); return; }

  try {
    await API.post('/cajas/' + state.caja.idCaja + '/egresos', { monto, motivo });
    Utils.showToast('Retiro registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posRetiroModal'))?.hide();
    document.getElementById('posRetiroMonto').value = '';
    document.getElementById('posRetiroMotivo').value = '';
    await refreshCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function solicitarGasto() {
  const desc = document.getElementById('posGastoDesc').value.trim();
  const monto = parseFloat(document.getElementById('posGastoMonto').value);
  if (!desc) { Utils.showToast('Descripci\u00f3n requerida', 'warning'); return; }
  if (!monto || monto <= 0) { Utils.showToast('Monto inv\u00e1lido', 'warning'); return; }

  try {
    await API.post('/gastos', { idCaja: state.caja.idCaja, descripcion: desc, monto });
    Utils.showToast('Gasto solicitado, espera autorizaci\u00f3n', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posGastoModal'))?.hide();
    document.getElementById('posGastoDesc').value = '';
    document.getElementById('posGastoMonto').value = '';
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function previewCorte() {
  if (!state.caja) return;
  try {
    const corte = await API.get('/cajas/' + state.caja.idCaja + '/corte-preview');
    const body = document.getElementById('posCorteBody');
    body.innerHTML = `
      <div class="row g-3">
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Inicial</small>
          <h5 class="mb-0">$${corte.saldoInicial.toFixed(2)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ventas</small>
          <h5 class="mb-0 text-success">$${corte.totalVentas.toFixed(2)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Esperado</small>
          <h5 class="mb-0" style="color:var(--primary)">$${corte.saldoEsperado.toFixed(2)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Contado</small>
          <div>$${corte.totalVentasContado.toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Cr\u00e9dito</small>
          <div>$${corte.totalVentasCredito.toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ingresos</small>
          <div class="text-success fw-semibold">+$${corte.totalIngresos.toFixed(2)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Egresos</small>
          <div class="text-danger fw-semibold">-$${corte.totalEgresos.toFixed(2)}</div>
        </div></div>
      </div>
      <hr>
      <div class="text-center">
        <h5>Saldo Final</h5>
        <h3 class="fw-bold" style="color:var(--primary)">$${corte.saldoFinalContado.toFixed(2)}</h3>
      </div>
    `;
    new bootstrap.Modal(document.getElementById('posCorteModal')).show();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarCorte() {
  if (!state.caja) return;
  if (state.esperaVentas.length > 0) {
    const ok = await Utils.confirm('Ventas en Espera',
      'Hay ' + state.esperaVentas.length + ' venta(s) en espera. \u00bfRealizar corte de todas formas?');
    if (!ok) return;
  }
  try {
    await API.post('/cajas/' + state.caja.idCaja + '/corte', {});
    Utils.showToast('Corte realizado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCorteModal'))?.hide();
    state.caja = null;
    mostrarSelectorCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarEsperas() {
  if (!state.caja) return;
  try {
    state.esperaVentas = await API.get('/ventas/caja/' + state.caja.idCaja + '/espera');
    renderEsperas();
  } catch (_) {}
}

function renderEsperas() {
  const list = document.getElementById('posEsperaList');
  const count = document.getElementById('posEsperaCount');
  if (!list) return;
  count.textContent = state.esperaVentas.length;
  if (state.esperaVentas.length === 0) {
    list.innerHTML = '<small class="text-muted">Sin ventas en espera</small>';
    return;
  }
  list.innerHTML = state.esperaVentas.map(v =>
    `<div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="font-size:0.8rem">
      <div>
        <div class="fw-semibold">#${v.idVenta} ${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</div>
        <small class="text-muted">$${v.total.toFixed(2)}</small>
      </div>
      <div class="d-flex gap-1">
        <button class="btn btn-sm btn-success px-2 pos-reanudar-espera" data-id="${v.idVenta}" title="Reanudar" style="font-size:0.7rem">
          <i class="fas fa-play"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger px-2 pos-cancelar-espera" data-id="${v.idVenta}" title="Cancelar venta" style="font-size:0.7rem">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>`
  ).join('');

  list.querySelectorAll('.pos-reanudar-espera').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      reanudarEspera(parseInt(btn.dataset.id));
    });
  });

  list.querySelectorAll('.pos-cancelar-espera').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cancelarEspera(parseInt(btn.dataset.id));
    });
  });
}

async function reanudarEspera(idVenta) {
  try {
    const venta = await API.get('/ventas/' + idVenta);
    if (!venta.detalles || venta.detalles.length === 0) {
      Utils.showToast('La venta no tiene productos', 'warning');
      return;
    }

    state.reanudandoVentaId = idVenta;
    state.cart = venta.detalles.map(d => ({
      idProducto: d.idProducto,
      nombre: d.productoNombre || d.descripcion || 'Producto',
      sku: d.productoSku || '',
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
    }));

    Utils.showToast('Venta #' + idVenta + ' cargada. Modifica y cobra.', 'info');
    renderCart();

    const tipoRadios = document.querySelectorAll('input[name="tipoVenta"]');
    tipoRadios.forEach(r => {
      if (r.value === venta.tipoVenta) r.checked = true;
    });

    if (venta.clienteId) {
      const sel = document.getElementById('posCliente');
      if (sel) {
        const opt = sel.querySelector(`option[value="${venta.clienteId}"]`);
        if (opt) opt.selected = true;
      }
    }

    document.getElementById('posProductSearch')?.focus();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cancelarEspera(idVenta) {
  const ok = await Utils.confirm('Cancelar Venta en Espera',
    'La venta #' + idVenta + ' est\u00e1 en espera. \u00bfCancelarla definitivamente?');
  if (!ok) return;
  try {
    await API.post('/ventas/' + idVenta + '/cancelar', {});
    Utils.showToast('Venta en espera cancelada', 'success');
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function abrirCancelarVentaModal() {
  if (!state.caja) return;
  state.cancelarSelectedId = null;
  document.getElementById('btnConfirmarCancelarPOS').classList.add('d-none');
  document.getElementById('posCancelarEmpty').classList.add('d-none');

  try {
    state.cancelarVentas = await API.get('/ventas/caja/' + state.caja.idCaja);
  } catch (_) {
    state.cancelarVentas = [];
  }

  const body = document.getElementById('posCancelarVentaBody');
  if (state.cancelarVentas.length === 0) {
    body.innerHTML = '';
    document.getElementById('posCancelarEmpty').classList.remove('d-none');
  } else {
    body.innerHTML = state.cancelarVentas.map(v =>
      `<tr class="pos-cancelar-row ${v.estado === 'CANCELADA' ? 'text-muted' : ''}" data-id="${v.idVenta}" style="cursor:pointer">
        <td>
          <input type="radio" name="cancelarSel" value="${v.idVenta}" ${v.estado === 'CANCELADA' ? 'disabled' : ''}
            class="form-check-input pos-cancelar-radio">
        </td>
        <td>${v.idVenta}</td>
        <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
        <td>$${v.total.toFixed(2)}</td>
        <td>${new Date(v.fecha).toLocaleString()}</td>
      </tr>`
    ).join('');

    body.querySelectorAll('.pos-cancelar-radio').forEach(r => {
      r.addEventListener('change', () => {
        state.cancelarSelectedId = parseInt(r.value);
        document.getElementById('btnConfirmarCancelarPOS').classList.remove('d-none');
      });
    });

    body.querySelectorAll('.pos-cancelar-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        const radio = row.querySelector('.pos-cancelar-radio');
        if (radio && !radio.disabled) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  new bootstrap.Modal(document.getElementById('posCancelarModal')).show();
}

async function confirmarCancelarVenta() {
  if (!state.cancelarSelectedId) { Utils.showToast('Selecciona una venta', 'warning'); return; }
  const ok = await Utils.confirm('Confirmar Cancelaci\u00f3n',
    '\u00bfEst\u00e1s seguro de cancelar la venta #' + state.cancelarSelectedId + '?');
  if (!ok) return;
  try {
    await API.post('/ventas/' + state.cancelarSelectedId + '/cancelar', {});
    Utils.showToast('Venta #' + state.cancelarSelectedId + ' cancelada', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCancelarModal'))?.hide();
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarVentaRapida() {
  if (!state.caja) return;
  const desc = document.getElementById('posVrDescripcion').value.trim();
  const precioVenta = parseFloat(document.getElementById('posVrVenta').value);
  const cantidad = parseInt(document.getElementById('posVrCantidad').value) || 1;

  if (!desc) { Utils.showToast('Descripci\u00f3n requerida', 'warning'); return; }
  if (!precioVenta || precioVenta <= 0) { Utils.showToast('Precio inv\u00e1lido', 'warning'); return; }

  const tempId = -Date.now();
  state.cart.push({
    idProducto: tempId,
    nombre: desc,
    sku: 'VR',
    cantidad: cantidad,
    precioUnitario: precioVenta,
    stockActual: 999999,
  });

  renderCart();
  bootstrap.Modal.getInstance(document.getElementById('posVentaRapidaModal'))?.hide();
  document.getElementById('posVrDescripcion').value = '';
  document.getElementById('posVrVenta').value = '';
  document.getElementById('posVrCantidad').value = '1';
  document.getElementById('posVrCompra').value = '';
  Utils.showToast('Item agregado al carrito', 'success');
}

async function abandonarCaja() {
  if (state.cart.length > 0) {
    const ok = await Utils.confirm('Carrito lleno',
      'Tienes productos en el carrito. \u00bfAbandonar de todas formas?');
    if (!ok) return;
  }
  state.cart = [];
  state.caja = null;
  state.reanudandoVentaId = null;
  state.esperaVentas = [];
  mostrarSelectorCaja();
}

function abrirClienteModal() {
  document.getElementById('formPosCliente').reset();
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  new bootstrap.Modal(document.getElementById('posClienteModal')).show();
}

async function guardarClienteDesdePOS() {
  const data = {
    nombre: document.getElementById('posClienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('posClienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('posClienteAmaterno').value.trim(),
    telefono: document.getElementById('posClienteTelefono').value.trim(),
    codigoPais: document.getElementById('posClientePais').value,
    whatsapp: document.getElementById('posClienteWhatsapp').value.trim(),
    empresa: document.getElementById('posClienteEmpresa').value.trim(),
    regimenFiscal: document.getElementById('posClienteRegimen').value,
  };

  if (!data.nombre) { Utils.showToast('Nombre requerido', 'warning'); return; }
  if (!data.apellidoPaterno) { Utils.showToast('Apellido paterno requerido', 'warning'); return; }
  if (!data.telefono) { Utils.showToast('Tel\u00e9fono requerido', 'warning'); return; }
  if (!data.regimenFiscal) { Utils.showToast('R\u00e9gimen fiscal requerido', 'warning'); return; }

  try {
    await API.post('/clientes', data);
    Utils.showToast('Cliente creado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posClienteModal'))?.hide();
    await cargarClientesSelect('posCliente');
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
