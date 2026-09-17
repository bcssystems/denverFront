import { printRemisionVenta } from './printing.js';

let state = {
  caja: null,
  cajas: [],
  sucursales: [],
  clientes: [],
  productos: [],
  cart: [],
  editingVentaEspera: null,
  activeEsperaId: null,
  productSearchTimeout: null,
  posProductPanelOpen: false,
  reanudandoVentaId: null,
  esperaVentas: [],
  cancelarVentas: [],
  cancelarSelectedId: null,
  lastCortePreview: null,
  reservas: [],
  gastosPendientes: 0,
  idCotizacionActiva: null,
  configs: {},
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
  cargarConfiguraciones();
  const lastCajaId = localStorage.getItem('lastCajaId');
  const lastSucursalId = localStorage.getItem('lastSucursalId');
  if (lastCajaId && lastSucursalId) {
    autoEntrarCaja(lastCajaId);
  } else {
    mostrarSelectorCaja();
  }
}

async function autoEntrarCaja(id) {
  try {
    const caja = await API.get('/cajas/' + id);
    if (caja.estado === 'ABIERTA') {
      state.caja = caja;
      const selSuc = document.getElementById('posSucursalSelect');
      const cajaSel = document.getElementById('posCajaSelect');
      if (selSuc) selSuc.value = caja.idSucursal || '';
      if (cajaSel) {
        cajaSel.innerHTML = '<option value="' + caja.idCaja + '">' + Utils.esc(caja.nombre) + '</option>';
        cajaSel.value = caja.idCaja;
      }
      document.getElementById('pos-caja-selector')?.classList.add('d-none');
      iniciarPOS();
      actualizarCajaInfo();
    } else {
      mostrarSelectorCaja();
    }
  } catch (_) {
    mostrarSelectorCaja();
  }
}

function bindEvents() {
  document.getElementById('btnEntrarCaja')?.addEventListener('click', entrarCaja);

  document.getElementById('btnCobrarPOS')?.addEventListener('click', cobrarVenta);
  document.getElementById('btnConfirmarCobroPOS')?.addEventListener('click', confirmarCobro);
  document.getElementById('btnConfirmarCreditoPOS')?.addEventListener('click', confirmarCreditoPOS);
  document.getElementById('posCreditoInteres')?.addEventListener('input', actualizarMontoOriginalCredito);
  document.getElementById('posCreditoPlazo')?.addEventListener('change', actualizarMontoOriginalCredito);
  document.getElementById('btnEsperaPOS')?.addEventListener('click', ponerEnEspera);
  document.getElementById('btnNuevoClientePOS')?.addEventListener('click', () => abrirClienteModal());
  document.getElementById('btnGuardarPosCliente')?.addEventListener('click', guardarClienteDesdePOS);
  document.getElementById('posClienteCp')?.addEventListener('input', Utils.debounce(function() {
    const cp = this.value.trim();
    if (cp.length === 5) cargarColoniasPOS(cp, '');
  }, 500));
  document.getElementById('posClienteTieneCredito')?.addEventListener('change', function() {
    const group = document.getElementById('posClienteLimiteCreditoGroup');
    if (group) group.style.display = this.checked ? 'block' : 'none';
  });
  document.getElementById('btnIngresarEfectivo')?.addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('posIngresoModal')).show();
  });
  document.getElementById('btnGuardarIngreso')?.addEventListener('click', ingresarEfectivo);
  document.getElementById('btnCortePOS')?.addEventListener('click', previewCorte);
  document.getElementById('btnRealizarCortePOS')?.addEventListener('click', realizarCorte);
  document.getElementById('btnGastoPOS')?.addEventListener('click', () => {
    const el = document.getElementById('posGastoCajaInfo');
    if (el && state.caja) {
      el.textContent = 'Caja: ' + (state.caja.nombre || '—') + ' | Sucursal: ' + (state.caja.sucursalNombre || '—');
    }
    new bootstrap.Modal(document.getElementById('posGastoModal')).show();
  });
  document.getElementById('btnSolicitarGastoPOS')?.addEventListener('click', solicitarGasto);
  document.getElementById('btnCancelarVentaPOS')?.addEventListener('click', abrirCancelarVentaModal);
  document.getElementById('btnConfirmarCancelarPOS')?.addEventListener('click', confirmarCancelarVenta);
  document.getElementById('btnVentaRapidaPOS')?.addEventListener('click', () => {
    // VR no longer needs its own cliente select
    new bootstrap.Modal(document.getElementById('posVentaRapidaModal')).show();
  });
  document.getElementById('btnRealizarVentaRapidaPOS')?.addEventListener('click', realizarVentaRapida);
  document.getElementById('btnAbandonarCaja')?.addEventListener('click', abandonarCaja);
  document.getElementById('btnPromocionesPOS')?.addEventListener('click', abrirPromocionesModal);

  document.getElementById('btnVerInventario')?.addEventListener('click', () => {
    const input = document.getElementById('posProductSearch');
    if (input) {
      input.value = '';
      input.focus();
    }
    state.posProductPanelOpen = true;
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
        state.posProductPanelOpen = false;
      }
    });
  }

  document.getElementById('precioSelector')?.addEventListener('change', () => {
    actualizarPreciosCart();
    recalcularTotales();
  });
}

async function mostrarSelectorCaja() {
  window.__cajaAbierta = false;
  detenerPollingCaja();
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

    const lastCajaId = localStorage.getItem('lastCajaId');
    const lastSucursalId = localStorage.getItem('lastSucursalId');

    if (lastSucursalId) {
      selSuc.value = lastSucursalId;
      selSuc.dispatchEvent(new Event('change'));

      // Wait briefly for cajas to load, then auto-select
      setTimeout(() => {
        const cajaSel = document.getElementById('posCajaSelect');
        if (lastCajaId && cajaSel) {
          const opt = cajaSel.querySelector(`option[value="${lastCajaId}"]`);
          if (opt) {
            cajaSel.value = lastCajaId;
            document.getElementById('btnEntrarCaja').disabled = false;
          }
        }
      }, 300);
    }

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
    localStorage.setItem('lastCajaId', id);
    localStorage.setItem('lastSucursalId', state.caja.idSucursal || '');
    iniciarPOS();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarProductosParaVenta() {
  if (!state.caja?.idSucursal) return;
  try {
    const data = await API.get('/productos/para-venta?page=0&size=500&sort=sku,ASC&idSucursal=' + state.caja.idSucursal);
    state.productos = data.content || [];
  } catch (_) { state.productos = []; }
}

async function cargarCotizacionDesdeLocalStorage() {
  try {
    const raw = localStorage.getItem('cotizacionParaVenta');
    if (!raw) return;
    const quote = JSON.parse(raw);
    localStorage.removeItem('cotizacionParaVenta');
    state.idCotizacionActiva = quote.idCotizacion || null;

    if (quote.precioSeleccionado) {
      const sel = document.getElementById('precioSelector');
      if (sel) sel.value = quote.precioSeleccionado;
    }

    if (quote.idCliente) {
      const sel = document.getElementById('posCliente');
      if (sel) sel.value = quote.idCliente;
    }

    if (quote.detalles && quote.detalles.length > 0) {
      for (const d of quote.detalles) {
        const existente = state.cart.find(x => x.idProducto === d.idProducto);
        if (existente) {
          try {
            await API.put('/carrito/actualizar', {
              idCaja: state.caja.idCaja,
              idProducto: d.idProducto,
              cantidad: existente.cantidad + d.cantidad,
            });
            existente.cantidad += d.cantidad;
          } catch (_) {}
        } else {
          try {
            await API.post('/carrito/agregar', {
              idCaja: state.caja.idCaja,
              idProducto: d.idProducto,
              cantidad: d.cantidad,
            });
          } catch (_) {}
          const producto = state.productos.find(p => p.idProducto === d.idProducto);
          state.cart.push({
            idProducto: d.idProducto,
            nombre: producto ? producto.nombre : d.productoNombre || 'Producto',
            sku: producto ? producto.sku : d.productoSku || '',
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            stockActual: producto ? getStockSucursal(producto) : 0,
            atributos: producto ? (producto.atributos || []) : [],
          });
        }
      }
    }

    if (quote.cobraEnvio && quote.montoEnvio > 0) {
      const envioExistente = state.cart.find(x => x.sku === 'ENVIO');
      if (envioExistente) {
        envioExistente.precioUnitario = quote.montoEnvio;
      } else {
        state.cart.push({
          idProducto: null,
          nombre: 'Env\u00edo' + (quote.paqueteria ? ' - ' + quote.paqueteria : ''),
          sku: 'ENVIO',
          cantidad: 1,
          precioUnitario: quote.montoEnvio,
          stockActual: 0,
          atributos: [],
          descripcion: 'Env\u00edo' + (quote.paqueteria ? ' - ' + quote.paqueteria : ''),
        });
      }
    }

    renderCart();
    if (quote.detalles && quote.detalles.length > 0) {
      Utils.showToast('Cotizaci\u00f3n #' + (quote.idCotizacion || '') + ' cargada en el carrito', 'success');
    }
  } catch (_) {}
}

async function iniciarPOS() {
  document.getElementById('pos-caja-selector').classList.add('d-none');
  document.getElementById('pos-interface').classList.remove('d-none');
  state.reanudandoVentaId = null;
  window.__cajaAbierta = true;
  actualizarSaldoCaja();
  cargarClientesSelect('posCliente');
  cargarClientesSelect('posVrCliente');
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  state.cart = [];
  await cargarProductosParaVenta();
  await cargarReservasSucursal();
  await sincronizarCarritoDesdeServidor();
  await cargarCotizacionDesdeLocalStorage();
  await verificarGastosPendientes();
  cargarEsperas();
  iniciarPollingCaja();
  actualizarCajaInfo();
}

function actualizarCajaInfo() {
  const el = document.getElementById('posCajaInfo');
  if (el && state.caja) {
    el.textContent = 'Caja: ' + (state.caja.nombre || '—') + ' | Sucursal: ' + (state.caja.sucursalNombre || '—');
  }
}

async function verificarGastosPendientes() {
  if (!state.caja?.idCaja) return;
  try {
    const count = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    state.gastosPendientes = count || 0;
    actualizarBotonCorte();
  } catch (_) { state.gastosPendientes = 0; }
}

function actualizarBotonCorte() {
  const btn = document.getElementById('btnCortePOS');
  if (!btn) return;
  if (state.gastosPendientes > 0) {
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.title = 'Hay ' + state.gastosPendientes + ' gasto(s) pendiente(s) por autorizar';
  } else {
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.title = '';
  }
}

function actualizarSaldoCaja() {}

async function refreshCaja() {
  if (!state.caja) return;
  try {
    state.caja = await API.get('/cajas/' + state.caja.idCaja);
    actualizarSaldoCaja();
  } catch (_) {}
}

async function cargarConfiguraciones() {
  try {
    const list = await API.get('/configuraciones');
    state.configs = {};
    (list || []).forEach(c => { if (c.clave) state.configs[c.clave] = c.valor; });
  } catch (_) {}
}

function getStockSucursal(producto) {
  if (!state.caja?.idSucursal || !producto?.inventarioSucursales) return producto?.stockActual || 0;
  const inv = producto.inventarioSucursales.find(i => i.idSucursal === state.caja.idSucursal);
  return inv != null ? inv.stock : 0;
}

function cantidadEnEsperaSucursal(idProducto) {
  let total = 0;
  (state.esperaVentas || []).forEach(v => {
    (v.detalles || []).forEach(d => {
      if (d.idProducto === idProducto) total += (d.cantidad || 0);
    });
  });
  return total;
}

function stockCajaDisponible(producto) {
  if (!producto) return 0;
  return getStockSucursal(producto) + cantidadEnEsperaSucursal(producto.idProducto);
}

function isReservadoPorOtraCaja(productoId) {
  return state.reservas.some(r => r.idProducto === productoId && r.idCaja !== state.caja?.idCaja);
}

async function cargarReservasSucursal() {
  if (!state.caja?.idSucursal) return;
  try {
    state.reservas = await API.get('/carrito/reservados/' + state.caja.idSucursal);
  } catch (_) {
    state.reservas = [];
  }
}

async function sincronizarCarritoDesdeServidor() {
  if (!state.caja?.idCaja) return;

  const reservasCaja = state.reservas.filter(r => r.idCaja === state.caja.idCaja);
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const precioKey = 'precio' + precioIdx;

  const serverItems = reservasCaja.map(r => {
    const prod = state.productos.find(p => p.idProducto === r.idProducto);
    return {
      idProducto: r.idProducto,
      nombre: r.productoNombre || (prod ? prod.nombre : 'Producto'),
      sku: r.productoSku || (prod ? prod.sku : ''),
      cantidad: r.cantidad,
      precioUnitario: prod ? (prod[precioKey] || 0) : 0,
      atributos: prod ? (prod.atributos || []) : [],
    };
  });

  try {
    const rapidos = await API.get('/carrito/rapidos/' + state.caja.idCaja);
    const vrItems = rapidos.map(r => ({
      idProducto: -r.idItemRapido,
      nombre: r.descripcion,
      sku: 'VR',
      cantidad: r.cantidad,
      precioUnitario: r.precioVenta,
      stockActual: 999999,
      _idRapido: r.idItemRapido,
    }));
    state.cart = [...serverItems, ...vrItems];
  } catch (_) {
    state.cart = serverItems;
  }

  renderCart();
}

function iniciarPollingCaja() {
  detenerPollingCaja();
  state._pollInterval = setInterval(async () => {
    if (!state.caja) { detenerPollingCaja(); return; }
    await cargarReservasSucursal();
    if (state.posProductPanelOpen && state.productos.length > 0) {
      const list = document.getElementById('posProductList');
      if (list) buscarProductos(true);
    }
    const reservasCaja = state.reservas.filter(r => r.idCaja === state.caja.idCaja);
    const cartServerCount = state.cart.filter(d => d.sku !== 'VR' && d.sku !== 'ENVIO').length;
    if (reservasCaja.length !== cartServerCount) {
      const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
      const precioKey = 'precio' + precioIdx;
      const envioItems = state.cart.filter(d => d.sku === 'ENVIO');
      const nuevosCart = reservasCaja.map(r => {
        const existente = state.cart.find(d => d.idProducto === r.idProducto);
        if (existente) return { ...existente, cantidad: r.cantidad };
        const prod = state.productos.find(p => p.idProducto === r.idProducto);
        return {
          idProducto: r.idProducto,
          nombre: r.productoNombre || (prod ? prod.nombre : 'Producto'),
          sku: r.productoSku || (prod ? prod.sku : ''),
          cantidad: r.cantidad,
          precioUnitario: prod ? (prod[precioKey] || 0) : 0,
          atributos: prod ? (prod.atributos || []) : [],
        };
      });
      state.cart = [...envioItems, ...nuevosCart];
    }
    try {
      const rapidos = await API.get('/carrito/rapidos/' + state.caja.idCaja);
      const existingVr = state.cart.filter(d => d.sku === 'VR');
      const serverVrIds = rapidos.map(r => r.idItemRapido);
      const nuevosVr = rapidos.map(r => {
        const existente = existingVr.find(v => v._idRapido === r.idItemRapido);
        return {
          idProducto: -r.idItemRapido,
          nombre: r.descripcion,
          sku: 'VR',
          cantidad: existente ? existente.cantidad : r.cantidad,
          precioUnitario: r.precioVenta,
          stockActual: 999999,
          _idRapido: r.idItemRapido,
        };
      });
      const vrChanged = JSON.stringify(existingVr.map(v => v._idRapido).sort()) !== JSON.stringify(serverVrIds.sort())
        || existingVr.some(v => { const s = rapidos.find(r => r.idItemRapido === v._idRapido); return s && s.cantidad !== v.cantidad; });
      if (vrChanged || (state.cart.some(d => d.sku === 'VR') !== rapidos.length > 0)) {
        state.cart = [...state.cart.filter(d => d.sku !== 'VR'), ...nuevosVr];
      }
    } catch (_) {}
    renderCart();
  }, 5000);
}

function detenerPollingCaja() {
  if (state._pollInterval) {
    clearInterval(state._pollInterval);
    state._pollInterval = null;
  }
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
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
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
    state.posProductPanelOpen = false;
    return;
  }

  try {
    const hasQuery = q.length > 0;
    const sucursalParam = state.caja?.idSucursal ? '&idSucursal=' + state.caja.idSucursal : '';
    const url = hasQuery
      ? '/productos/para-venta?search=' + encodeURIComponent(q) + '&page=0&size=20' + sucursalParam
      : '/productos/para-venta?page=0&size=50&sort=sku,ASC' + sucursalParam;
    const data = await API.get(url);
    state.productos = data.content || [];
    if (state.productos.length === 0) {
      list.innerHTML = '<div class="pos-product-result-item text-muted">Sin resultados</div>';
    } else {
      const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
      const precioKey = 'precio' + precioIdx;

      const sorted = [...state.productos].sort((a, b) => {
        const stA = getStockSucursal(a) > 0 ? 0 : 1;
        const stB = getStockSucursal(b) > 0 ? 0 : 1;
        return stA - stB;
      });

      list.innerHTML = sorted.map(p => {
        const stock = getStockSucursal(p);
        const sinStock = stock <= 0;
        const reservado = isReservadoPorOtraCaja(p.idProducto);
        const disabled = reservado || sinStock;
        const attrHtml = p.atributos && p.atributos.length
          ? '<div class="mt-1">' + p.atributos.map(a => `<span class="badge bg-secondary me-1" style="font-size:0.65rem">${Utils.esc(a.nombreAtributo)}: ${Utils.esc(a.nombreValor)}</span>`).join('') + '</div>'
          : '';
        return `<div class="pos-product-result-item ${disabled ? 'text-muted opacity-50' : ''}" data-id="${p.idProducto}" data-sin-stock="${sinStock}">
          <div>
            <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
            ${attrHtml}
            <small class="text-muted">SKU: ${Utils.esc(p.sku || '-')} | Stock: ${stock}</small>
            ${sinStock ? '<br><small class="badge bg-secondary mt-1"><i class="fas fa-times-circle me-1"></i>Sin stock</small>' : ''}
            ${reservado ? '<br><small class="badge bg-warning text-dark mt-1"><i class="fas fa-lock me-1"></i>En uso en otra caja</small>' : ''}
          </div>
          <div class="text-end">
            <div class="fw-bold" style="color:var(--primary)">$${(p[precioKey] || 0).toFixed(2)}</div>
            <button class="btn btn-sm ${disabled ? 'btn-secondary' : 'btn-success'} pos-add-cart" data-id="${p.idProducto}" style="font-size:0.7rem" ${disabled ? 'disabled' : ''}>
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
          if (item.dataset.sinStock === 'true') {
            Utils.showToast('Producto sin stock en esta sucursal', 'warning');
            return;
          }
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

async function agregarAlCart(prodId) {
  const p = state.productos.find(x => x.idProducto === prodId);
  if (!p) return;

  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const precioKey = 'precio' + precioIdx;
  const precio = p[precioKey] || 0;

  const stockSuc = stockCajaDisponible(p);
  if (stockSuc <= 0) {
    Utils.showToast('Producto sin stock en esta sucursal', 'warning');
    return;
  }

  const existente = state.cart.find(d => d.idProducto === prodId);
  if (existente) {
    if (existente.cantidad >= stockSuc) {
      Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
      return;
    }
    try {
      await API.put('/carrito/actualizar', {
        idCaja: state.caja.idCaja,
        idProducto: prodId,
        cantidad: existente.cantidad + 1,
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
    existente.cantidad++;
  } else {
    try {
      await API.post('/carrito/agregar', {
        idCaja: state.caja.idCaja,
        idProducto: prodId,
        cantidad: 1,
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
    state.cart.push({
      idProducto: prodId,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: 1,
      precioUnitario: precio,
      stockActual: stockCajaDisponible(p),
      atributos: p.atributos || [],
    });
  }

  renderCart();
  document.getElementById('posProductResults')?.classList.add('d-none');
  document.getElementById('posProductSearch').value = '';
  state.posProductPanelOpen = false;
}

function renderCart() {
  const tbody = document.getElementById('posCartBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state py-3"><i class="fas fa-cart-plus"></i><p>Agrega productos a la venta</p></div></td></tr>';
  } else {
    tbody.innerHTML = state.cart.map((d, i) => {
      const attrHtml = d.atributos && d.atributos.length
        ? '<div class="mt-1">' + d.atributos.map(a => '<span class="badge bg-secondary me-1" style="font-size:0.6rem">' + Utils.esc(a.nombreAtributo) + ': ' + Utils.esc(a.nombreValor) + '</span>').join('') + '</div>'
        : '';
      return '<tr>' +
      '<td>' +
        '<div class="fw-semibold small">' + Utils.esc(d.nombre) + '</div>' +
        attrHtml +
        '<small class="text-muted" style="font-size:0.65rem">' + (d.sku || '') + '</small>' +
      '</td>' +
      '<td>' +
        '<div class="d-flex align-items-center gap-1">' +
          '<button class="pos-cart-qty-btn pos-cart-qty-minus" data-index="' + i + '"><i class="fas fa-minus"></i></button>' +
          '<span class="fw-semibold px-1">' + d.cantidad + '</span>' +
          '<button class="pos-cart-qty-btn pos-cart-qty-plus" data-index="' + i + '"><i class="fas fa-plus"></i></button>' +
        '</div>' +
      '</td>' +
      '<td>$' + d.precioUnitario.toFixed(2) + '</td>' +
      '<td class="fw-semibold">$' + (d.cantidad * d.precioUnitario).toFixed(2) + '</td>' +
      '<td><button class="pos-cart-remove" data-index="' + i + '"><i class="fas fa-times"></i></button></td>' +
    '</tr>';
    }).join('');
    tbody.querySelectorAll('.pos-cart-qty-minus').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.sku === 'VR') {
          if (item.cantidad > 1) {
            item.cantidad--;
            try { await API.put('/carrito/rapidos/' + item._idRapido, { idCaja: state.caja.idCaja, cantidad: item.cantidad }); } catch (_) {}
          } else {
            try { await API.del('/carrito/rapidos/' + item._idRapido); } catch (_) {}
            state.cart.splice(i, 1);
          }
          renderCart();
          return;
        }
        if (item.sku === 'ENVIO') {
          state.cart.splice(i, 1);
          renderCart();
          return;
        }
        if (item.cantidad > 1) {
          try {
            await API.put('/carrito/actualizar', {
              idCaja: state.caja.idCaja,
              idProducto: item.idProducto,
              cantidad: item.cantidad - 1,
            });
          } catch (err) { Utils.showToast(err.message, 'error'); return; }
          item.cantidad--;
        } else {
          try {
            await API.del('/carrito/quitar/' + item.idProducto + '?idCaja=' + state.caja.idCaja);
          } catch (_) {}
          state.cart.splice(i, 1);
        }
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-qty-plus').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        const p = state.productos.find(x => x.idProducto === item.idProducto);
        if (item.sku === 'VR') {
          item.cantidad++;
          try { await API.put('/carrito/rapidos/' + item._idRapido, { idCaja: state.caja.idCaja, cantidad: item.cantidad }); } catch (_) {}
          renderCart();
          return;
        }
        if (item.sku === 'ENVIO') {
          state.cart.splice(i, 1);
          renderCart();
          return;
        }
        if (p && item.cantidad >= stockCajaDisponible(p)) {
          Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
          return;
        }
        try {
          await API.put('/carrito/actualizar', {
            idCaja: state.caja.idCaja,
            idProducto: item.idProducto,
            cantidad: item.cantidad + 1,
          });
        } catch (err) { Utils.showToast(err.message, 'error'); return; }
        item.cantidad++;
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.sku === 'VR') {
          if (item._idRapido) {
            try { await API.del('/carrito/rapidos/' + item._idRapido); } catch (_) {}
          }
        } else if (item.sku === 'ENVIO') {
          // ENVIO items are local-only, no server API needed
        } else if (state.caja?.idCaja) {
          try {
            await API.del('/carrito/quitar/' + item.idProducto + '?idCaja=' + state.caja.idCaja);
          } catch (_) {}
        }
        state.cart.splice(i, 1);
        renderCart();
      });
    });
  }

  recalcularTotales();
}

function recalcularTotales() {
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
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
    } else {
      // VR items (temp negative IDs) always contribute to subtotal
      d.subtotal = d.cantidad * d.precioUnitario;
      subtotal += d.subtotal;
    }
  });

  descuento = Math.max(0, descuento);
  const total = Math.max(0, subtotal);

  document.getElementById('posSubtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('posDescuento').textContent = '-$' + descuento.toFixed(2);
  document.getElementById('posTotal').textContent = '$' + total.toFixed(2);
}

async function limpiarCart() {
  if (state.caja?.idCaja) {
    try {
      await API.del('/carrito/limpiar?idCaja=' + state.caja.idCaja);
    } catch (_) {}
    try {
      await API.del('/carrito/rapidos/limpiar?idCaja=' + state.caja.idCaja);
    } catch (_) {}
  }
  state.cart = [];
  state.activeEsperaId = null;
  state.reanudandoVentaId = null;
  renderCart();
}

async function cobrarVenta() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }
  if (state.cart.length === 0) { Utils.showToast('Agrega productos a la venta', 'warning'); return; }

  for (const d of state.cart) {
    if (d.sku === 'ENVIO' || d.sku === 'VR') continue;
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && getStockSucursal(p) + cantidadEnEsperaSucursal(d.idProducto) < d.cantidad) {
      Utils.showToast('Stock insuficiente en esta sucursal: ' + d.nombre, 'error');
      return;
    }
  }

  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';

  if (tipoVenta === 'CREDITO') {
    const clienteId = parseInt(document.getElementById('posCliente').value) || null;
    if (!clienteId) {
      Utils.showToast('Selecciona un cliente para venta a cr\u00e9dito', 'warning');
      return;
    }
    const cliente = state.clientes.find(c => c.idCliente === clienteId);
    if (!cliente || !cliente.tieneCredito) {
      Utils.showToast('El cliente no tiene cr\u00e9dito habilitado', 'warning');
      return;
    }
    const disponible = (cliente.limiteCredito || 0) - (cliente.saldoActual || 0);
    if (total > disponible) {
      Utils.showToast('El total excede el l\u00edmite de cr\u00e9dito disponible ($' + disponible.toFixed(2) + ')', 'warning');
      return;
    }
    document.getElementById('posCreditoTotal').textContent = '$' + total.toFixed(2);
    document.getElementById('posCreditoClienteName').textContent = (cliente.nombre || '') + ' ' + (cliente.apellidoPaterno || '');
    document.getElementById('posCreditoInteres').value = '0';
    actualizarMontoOriginalCredito();
    new bootstrap.Modal(document.getElementById('posCreditoModal')).show();
    return;
  }

  document.getElementById('posCobroTotal').textContent = '$' + total.toFixed(2);
  document.getElementById('posCobroNota').value = '';
  await cargarFormasPagoCobro();
  new bootstrap.Modal(document.getElementById('posCobroModal')).show();
}

async function cargarFormasPagoCobro() {
  const container = document.getElementById('posCobroPagos');
  container.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando formas de pago...</div>';

  try {
    const tipos = await API.get('/tipos-pago');
    const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));

    if (!tipos || tipos.length === 0) {
      container.innerHTML = '<div class="text-center py-3 text-muted">No hay formas de pago configuradas</div>';
      return;
    }

    container.innerHTML = tipos.map((t) => {
      const isEfectivo = t.nombre.toUpperCase() === 'EFECTIVO';
      return `<div class="payment-row border rounded p-2 mb-1">
        <div class="row g-2 align-items-center">
          <div class="col-3">
            <span class="fw-semibold small">${Utils.esc(t.nombre)}</span>
          </div>
          <div class="col-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control payment-monto" data-id="${t.idTipoPago}" step="0.01" min="0" value="0.00">
            </div>
          </div>
          <div class="col-6">
            <input type="text" class="form-control form-control-sm payment-referencia" data-id="${t.idTipoPago}" placeholder="${isEfectivo ? '' : 'Referencia (ej. \u00faltimos 4 d\u00edgitos)'}" ${isEfectivo ? 'disabled' : ''}>
          </div>
        </div>
      </div>`;
    }).join('');

    container.addEventListener('input', recalcularSumaCobro);

    recalcularSumaCobro();
  } catch (err) {
    container.innerHTML = '<div class="text-center py-3 text-danger">Error al cargar formas de pago</div>';
  }
}

function recalcularSumaCobro() {
  let suma = 0;
  document.querySelectorAll('.payment-monto').forEach(inp => {
    suma += parseFloat(inp.value) || 0;
  });
  const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));
  const el = document.getElementById('posCobroSuma');
  const cambioEl = document.getElementById('posCobroCambio');
  const cambioVal = document.getElementById('posCobroCambioValor');
  el.textContent = '$' + suma.toFixed(2);

  if (suma + 0.01 < total) {
    el.style.color = 'var(--danger)';
    cambioEl.classList.add('d-none');
  } else {
    el.style.color = 'var(--success)';
    if (suma > total + 0.01) {
      cambioVal.textContent = '$' + (suma - total).toFixed(2);
      cambioEl.classList.remove('d-none');
    } else {
      cambioEl.classList.add('d-none');
    }
  }
}

async function confirmarCobro() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }

  const total = parseFloat(document.getElementById('posCobroTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const tipoVenta = document.querySelector('input[name="tipoVenta"]:checked')?.value || 'CONTADO';
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const nota = document.getElementById('posCobroNota').value.trim() || null;

  const pagos = [];
  document.querySelectorAll('.payment-monto').forEach(inp => {
    const monto = parseFloat(inp.value) || 0;
    if (monto > 0) {
      const idTipoPago = parseInt(inp.dataset.id);
      const refInput = document.querySelector(`.payment-referencia[data-id="${idTipoPago}"]`);
      const referencia = refInput ? refInput.value.trim() || null : null;
      pagos.push({ idTipoPago, monto, referencia });
    }
  });

  if (pagos.length === 0) {
    Utils.showToast('Selecciona al menos una forma de pago', 'warning');
    return;
  }

  const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
  if (sumaPagos + 0.01 < total) {
    Utils.showToast('La suma de los pagos debe ser al menos igual al total', 'warning');
    return;
  }

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId || null,
    tipoVenta: tipoVenta,
    precioSeleccionado: precioIdx,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: nota,
    detalles: state.cart.map(d => ({
      idProducto: d.sku === 'ENVIO' ? null : d.idProducto,
      descripcion: d.sku === 'ENVIO' ? (d.descripcion || d.nombre) : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
      atributosText: d.sku === 'ENVIO' ? null : (d.atributos?.map(a => a.nombreAtributo + ': ' + a.nombreValor).join(', ') || null),
    })),
    pagos: pagos,
  };

  try {
    await finalizarEsperaActiva();
    const ventaCreada = await API.post('/ventas', request);
    Utils.showToast('Venta registrada exitosamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCobroModal'))?.hide();
    await limpiarCart();
    await refreshCaja();
    await cargarEsperas();
    imprimirTicketVenta(ventaCreada);
    if (state.idCotizacionActiva) {
      try {
        await API.post('/cotizaciones/' + state.idCotizacionActiva + '/convertir');
      } catch (_) {}
      state.idCotizacionActiva = null;
    }
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function actualizarMontoOriginalCredito() {
  const total = parseFloat(document.getElementById('posCreditoTotal').textContent.replace('$', ''));
  const interes = parseFloat(document.getElementById('posCreditoInteres').value) || 0;
  const plazo = parseInt(document.getElementById('posCreditoPlazo').value) || 1;
  const montoOriginal = total + (total * interes / 100);
  const pagoMensual = montoOriginal / plazo;
  document.getElementById('posCreditoMontoOriginal').textContent = '$' + montoOriginal.toFixed(2);
  document.getElementById('posCreditoPagoMensual').textContent = '$' + pagoMensual.toFixed(2) + ' x ' + plazo + ' meses';
}

async function confirmarCreditoPOS() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }

  const total = parseFloat(document.getElementById('posCreditoTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const nota = document.getElementById('posCobroNota').value.trim() || null;
  const plazoMeses = parseInt(document.getElementById('posCreditoPlazo').value);
  const porcentajeInteres = parseFloat(document.getElementById('posCreditoInteres').value) || 0;

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId,
    tipoVenta: 'CREDITO',
    precioSeleccionado: precioIdx,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: nota,
    plazoMeses: plazoMeses,
    porcentajeInteres: porcentajeInteres,
    detalles: state.cart.map(d => ({
      idProducto: d.sku === 'ENVIO' ? null : d.idProducto,
      descripcion: d.sku === 'ENVIO' ? (d.descripcion || d.nombre) : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
      atributosText: d.sku === 'ENVIO' ? null : (d.atributos?.map(a => a.nombreAtributo + ': ' + a.nombreValor).join(', ') || null),
    })),
    pagos: [],
  };

  try {
    await finalizarEsperaActiva();
    const ventaCreada = await API.post('/ventas', request);
    Utils.showToast('Venta a cr\u00e9dito registrada', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCreditoModal'))?.hide();
    const cInfo = state.clientes.find(c => c.idCliente === clienteId);
    await limpiarCart();
    await refreshCaja();
    await cargarEsperas();
    imprimirTicketVenta(ventaCreada, 2, true, plazoMeses, porcentajeInteres, cInfo);
    if (state.idCotizacionActiva) {
      try {
        await API.post('/cotizaciones/' + state.idCotizacionActiva + '/convertir');
      } catch (_) {}
      state.idCotizacionActiva = null;
    }
  } catch (err) { Utils.showToast(err.message, 'error'); }
}


function imprimirTicketVenta(venta, copies, esCredito, plazoMeses, porcentajeInteres, clienteInfo) {
  printRemisionVenta(venta, {
    esCredito,
    plazoMeses,
    porcentajeInteres,
    clienteInfo,
    copies,
    configs: state.configs,
  });
}

function imprimirTicketCorte(corte) {
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
  <table class="data-table" style="font-size:11px">
    <tr style="font-weight:bold;border-bottom:1px solid #000">
      <td style="width:40%">M\u00e9todo</td>
      <td style="width:20%;text-align:center">Sistema</td>
      <td style="width:20%;text-align:center">Real</td>
      <td style="width:20%;text-align:center">Diferencia</td>
    </tr>
    ${corte.detallePagos.map(d => {
      const diff = (d.montoReal != null) ? (d.montoReal - (d.monto || 0)) : null;
      const diffStr = diff != null ? ((diff >= 0 ? '+' : '') + '$' + diff.toFixed(2)) : 'Sin conteo';
      return `
    <tr>
      <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
      <td style="text-align:center">$${(d.monto || 0).toFixed(2)}</td>
      <td style="text-align:center">${d.montoReal != null ? '$' + d.montoReal.toFixed(2) : '-'}</td>
      <td style="text-align:center">${diffStr}</td>
    </tr>`;
    }).join('')}
    <tr style="font-weight:bold;border-top:2px solid #000;border-bottom:none">
      <td style="padding-top:6px">Total</td>
      <td style="text-align:center;padding-top:6px">$${corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0).toFixed(2)}</td>
      <td style="text-align:center;padding-top:6px">${corte.totalReal != null ? '$' + corte.totalReal.toFixed(2) : '-'}</td>
      <td style="text-align:center;padding-top:6px">${corte.diferencia != null ? ((corte.diferencia >= 0 ? '+' : '') + '$' + corte.diferencia.toFixed(2)) : '-'}</td>
    </tr>
  </table>` : ''}
  ${corte.saldoEsperado != null ? `
  <div class="divider"></div>
  <table class="data-table">
    <tr><td>Saldo Esperado en Caja</td><td>$${corte.saldoEsperado.toFixed(2)}</td></tr>
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

function construirDetallesEspera() {
  return state.cart
    .filter(d => d.idProducto != null && d.idProducto > 0)
    .map(d => ({
      idProducto: d.idProducto,
      descripcion: null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
      atributosText: d.atributos?.map(a => a.nombreAtributo + ': ' + a.nombreValor).join(', ') || null,
    }));
}

async function guardarEsperaActiva() {
  if (!state.activeEsperaId) return;

  if (state.cart.length === 0) {
    try {
      await API.post('/ventas/' + state.activeEsperaId + '/cancelar-espera', {});
    } catch (_) {}
    state.activeEsperaId = null;
    await cargarEsperas();
    return;
  }

  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const request = {
    idCliente: clienteId || null,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: null,
    detalles: construirDetallesEspera(),
  };
  await API.put('/ventas/' + state.activeEsperaId + '/espera', request);
}

async function finalizarEsperaActiva() {
  if (!state.activeEsperaId) return;
  await guardarEsperaActiva();
  await API.post('/ventas/' + state.activeEsperaId + '/cancelar-espera', {});
  state.activeEsperaId = null;
}

async function ponerEnEspera() {
  if (state.cart.length === 0 || !state.caja) return;

  if (state.activeEsperaId) {
    try {
      await guardarEsperaActiva();
      state.activeEsperaId = null;
      Utils.showToast('Venta en espera guardada', 'success');
      await limpiarCart();
      await cargarEsperas();
    } catch (err) { Utils.showToast(err.message, 'error'); }
    return;
  }

  const total = parseFloat(document.getElementById('posTotal').textContent.replace('$', ''));
  const subtotal = parseFloat(document.getElementById('posSubtotal').textContent.replace('$', ''));
  const precioIdx = parseInt(document.getElementById('precioSelector')?.value) || 1;
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
    nota: null,
    detalles: construirDetallesEspera(),
    pagos: null,
  };

  try {
    const venta = await API.post('/ventas', request);
    await API.post('/ventas/' + venta.idVenta + '/espera', {});
    Utils.showToast('Venta puesta en espera', 'success');
    await limpiarCart();
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
    await verificarGastosPendientes();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function previewCorte() {
  if (!state.caja) return;
  try {
    const corte = await API.get('/cajas/' + state.caja.idCaja + '/corte-preview');
    state.lastCortePreview = corte;
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
      ${corte.detallePagos && corte.detallePagos.length > 0 ? `
      <hr>
      <h6 class="fw-semibold">Desglose por Forma de Pago</h6>
      <p class="text-muted small mb-2">Ingresa el monto real contado para cada forma de pago</p>
      <div class="table-responsive">
        <table class="table table-sm table-custom mb-0">
          <thead>
            <tr>
              <th>Forma de Pago</th>
              <th class="text-end" style="width:180px">Monto Real</th>
            </tr>
          </thead>
          <tbody>
            ${corte.detallePagos.map((d, i) => `
            <tr>
              <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
              <td class="text-end">
                <input type="number" class="form-control form-control-sm corte-real-input text-end" data-id="${d.idTipoPago}" data-sistema="${(d.monto || 0)}" step="0.01" min="0" value="${(d.monto || 0).toFixed(2)}">
              </td>
            </tr>`).join('')}
            <tr class="border-top">
              <td class="fw-bold">Total</td>
              <td class="text-end fw-bold" id="posCorteTotalReal">$${corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <script>
        document.querySelectorAll('.corte-real-input').forEach(inp => {
          inp.addEventListener('input', function() {
            let totalReal = 0;
            document.querySelectorAll('.corte-real-input').forEach(i => totalReal += parseFloat(i.value) || 0);
            document.getElementById('posCorteTotalReal').textContent = '$' + totalReal.toFixed(2);
          });
        });
      </script>` : ''}
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
    const pendientes = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    if (pendientes > 0) {
      Utils.showToast('No se puede realizar el corte. Hay ' + pendientes + ' gasto(s) pendiente(s) por autorizar.', 'error');
      return;
    }
  } catch (_) {}
  try {
    const corteCreado = await API.post('/cajas/' + state.caja.idCaja + '/corte', {});
    const inputs = document.querySelectorAll('.corte-real-input');
    if (inputs.length > 0 && corteCreado?.idCorte) {
      const pagos = [];
      inputs.forEach(inp => {
        pagos.push({ idTipoPago: parseInt(inp.dataset.id), montoReal: parseFloat(inp.value) || 0 });
      });
      await API.put('/cortes/' + corteCreado.idCorte + '/detalle-pagos', { pagos });
    }
    Utils.showToast('Corte realizado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCorteModal'))?.hide();
    const cortePrint = corteCreado || state.lastCortePreview;
    if (cortePrint) imprimirTicketCorte(cortePrint);
    localStorage.removeItem('lastCajaId');
    localStorage.removeItem('lastSucursalId');
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
  if (state.activeEsperaId === idVenta) {
    document.getElementById('posProductSearch')?.focus();
    return;
  }
  try {
    if (!state.activeEsperaId && state.cart.length > 0) {
      await ponerEnEspera();
      if (state.cart.length > 0) {
        Utils.showToast('No se pudo guardar la venta actual en espera. Intenta de nuevo.', 'error');
        return;
      }
    }

    if (state.activeEsperaId) {
      await guardarEsperaActiva();
      state.activeEsperaId = null;
    }

    await limpiarCart();

    const venta = await API.get('/ventas/' + idVenta);
    if (!venta.detalles || venta.detalles.length === 0) {
      Utils.showToast('La venta no tiene productos', 'warning');
      return;
    }

    for (const d of venta.detalles) {
      await API.post('/carrito/agregar', {
        idCaja: state.caja.idCaja,
        idProducto: d.idProducto,
        cantidad: 1,
      });
      if (d.cantidad > 1) {
        await API.put('/carrito/actualizar', {
          idCaja: state.caja.idCaja,
          idProducto: d.idProducto,
          cantidad: d.cantidad,
        });
      }
    }

    state.activeEsperaId = idVenta;
    state.cart = venta.detalles.map(d => {
      const prod = state.productos.find(x => x.idProducto === d.idProducto);
      return {
        idProducto: d.idProducto,
        nombre: d.productoNombre || d.descripcion || 'Producto',
        sku: d.productoSku || '',
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        atributos: prod ? (prod.atributos || []) : [],
        stockActual: prod ? stockCajaDisponible(prod) : 0,
      };
    });
    actualizarPreciosCart();

    Utils.showToast('Venta en espera recuperada. Modifica y cobra.', 'success');
    await cargarEsperas();

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
  const venta = state.esperaVentas.find(v => v.idVenta === idVenta);
  const ok = await Utils.confirm('Cancelar Venta en Espera',
    'La venta #' + idVenta + (venta?.clienteNombre ? ' de ' + venta.clienteNombre : '') + ' est\u00e1 en espera. Se restaurar\u00e1 el stock. \u00bfCancelarla definitivamente?');
  if (!ok) return;
  try {
    await API.post('/ventas/' + idVenta + '/cancelar-espera', {});
    if (state.activeEsperaId === idVenta) {
      state.activeEsperaId = null;
      await limpiarCart();
    }
    Utils.showToast('Venta en espera cancelada, stock restaurado', 'success');
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function abrirCancelarVentaModal() {
  if (!state.caja) return;
  state.cancelarSelectedId = null;
  document.getElementById('btnConfirmarCancelarPOS').classList.add('d-none');
  document.getElementById('posCancelarEmpty').classList.add('d-none');

  try {
    state.cancelarVentas = await API.get('/ventas/sucursal/' + state.caja.idSucursal);
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
  const precioCompra = parseFloat(document.getElementById('posVrCompra').value) || null;
  const cantidad = parseInt(document.getElementById('posVrCantidad').value) || 1;

  if (!desc) { Utils.showToast('Descripci\u00f3n requerida', 'warning'); return; }
  if (!precioVenta || precioVenta <= 0) { Utils.showToast('Precio inv\u00e1lido', 'warning'); return; }

  try {
    const resp = await API.post('/carrito/rapidos', {
      idCaja: state.caja.idCaja,
      descripcion: desc,
      precioVenta: precioVenta,
      precioCompra: precioCompra,
      cantidad: cantidad,
    });

    state.cart.push({
      idProducto: -resp.idItemRapido,
      nombre: desc,
      sku: 'VR',
      cantidad: cantidad,
      precioUnitario: precioVenta,
      stockActual: 999999,
      _idRapido: resp.idItemRapido,
    });

    renderCart();
    bootstrap.Modal.getInstance(document.getElementById('posVentaRapidaModal'))?.hide();
    document.getElementById('posVrDescripcion').value = '';
    document.getElementById('posVrVenta').value = '';
    document.getElementById('posVrCantidad').value = '1';
    document.getElementById('posVrCompra').value = '';
    Utils.showToast('Item agregado al carrito', 'success');
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function abandonarCaja() {
  if (state.cart.length > 0) {
    const ok = await Utils.confirm('Carrito lleno',
      'Tienes productos en el carrito. \u00bfAbandonar de todas formas?');
    if (!ok) return;
  }
  try {
    const pendientes = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    if (pendientes > 0) {
      const ok = await Utils.confirm('Gastos Pendientes',
        'Hay ' + pendientes + ' gasto(s) pendiente(s) por autorizar. \u00bfAbandonar caja de todas formas?');
      if (!ok) return;
    }
  } catch (_) {}
  window.__cajaAbierta = false;
  detenerPollingCaja();
  localStorage.removeItem('lastCajaId');
  localStorage.removeItem('lastSucursalId');
  await limpiarCart();
  state.caja = null;
  state.reanudandoVentaId = null;
  state.esperaVentas = [];
  mostrarSelectorCaja();
}

function abrirClienteModal() {
  document.getElementById('formPosCliente').reset();
  document.getElementById('posClienteEstado').value = '';
  document.getElementById('posClienteMunicipio').value = '';
  document.getElementById('posClienteColonia').innerHTML = '<option value="">Seleccionar...</option>';
  const group = document.getElementById('posClienteLimiteCreditoGroup');
  if (group) group.style.display = 'none';
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  new bootstrap.Modal(document.getElementById('posClienteModal')).show();
}

async function guardarClienteDesdePOS() {
  function buildDireccionPOS() {
    const calle = document.getElementById('posClienteCalle')?.value?.trim() || '';
    const numExt = document.getElementById('posClienteNumExt')?.value?.trim() || '';
    const numInt = document.getElementById('posClienteNumInt')?.value?.trim() || '';
    const colonia = document.getElementById('posClienteColonia')?.value || '';
    const municipio = document.getElementById('posClienteMunicipio')?.value?.trim() || '';
    const estado = document.getElementById('posClienteEstado')?.value?.trim() || '';
    const cp = document.getElementById('posClienteCp')?.value?.trim() || '';
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

  const tieneCredito = document.getElementById('posClienteTieneCredito').checked;
  const data = {
    nombre: document.getElementById('posClienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('posClienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('posClienteAmaterno').value.trim(),
    telefono: document.getElementById('posClienteTelefono').value.trim(),
    codigoPais: document.getElementById('posClientePais').value,
    whatsapp: document.getElementById('posClienteWhatsapp').value.trim(),
    empresa: document.getElementById('posClienteEmpresa').value.trim(),
    regimenFiscal: document.getElementById('posClienteRegimen').value,
    cp: document.getElementById('posClienteCp')?.value?.trim() || null,
    direccion: buildDireccionPOS() || null,
    tieneCredito: tieneCredito,
    limiteCredito: tieneCredito ? (parseFloat(document.getElementById('posClienteLimiteCredito').value) || 0) : 0,
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

const cpCachePOS = {};

async function cargarColoniasPOS(cp, selectedColonia) {
  if (!cp || cp.length !== 5) return;
  if (cpCachePOS[cp]) {
    aplicarDatosCPPOS(cpCachePOS[cp], selectedColonia);
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
      cpCachePOS[cp] = result;
      aplicarDatosCPPOS(result, selectedColonia);
    }
  } catch (_) {
    document.getElementById('posClienteEstado').value = '';
    document.getElementById('posClienteColonia').innerHTML = '<option value="">No disponible</option>';
  }
}

function aplicarDatosCPPOS(result, selectedColonia) {
  const sel = document.getElementById('posClienteColonia');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      result.colonias.map(c => `<option value="${c}" ${c === selectedColonia ? 'selected' : ''}>${c}</option>`).join('');
    sel.disabled = false;
  }
  const estadoInput = document.getElementById('posClienteEstado');
  if (estadoInput) estadoInput.value = result.estado;
}

// --- Promociones y Combos POS Integration ---

async function abrirPromocionesModal() {
  new bootstrap.Modal(document.getElementById('posPromocionModal')).show();
  await Promise.all([cargarPromosActivas(), cargarCombosActivos()]);
}

async function cargarPromosActivas() {
  const container = document.getElementById('posPromosContainer');
  if (!container) return;
  try {
    const promos = await API.get('/promociones/activas');
    const filtered = promos.filter(p => p.tipo === 'PROMOCION');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-percent fa-2x mb-2"></i><p>No hay promociones activas</p></div>';
      return;
    }
    container.innerHTML = filtered.map(p => `
      <div class="col-md-6">
        <div class="card card-sm border-primary promo-card" data-id="${p.idPromocion}" data-tipo="PROMOCION" style="cursor:pointer">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
                <small class="text-muted">${p.productoNombre ? Utils.esc(p.productoNombre) : ''}</small>
              </div>
              <div class="text-end">
                <div class="badge bg-danger">-${p.descuentoPorcentaje}%</div>
                <div class="fw-bold mt-1" style="color:var(--primary)">$${(p.precioFinal || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.promo-card').forEach(card => {
      card.addEventListener('click', () => aplicarPromocion(parseInt(card.dataset.id)));
    });
  } catch (_) {
    container.innerHTML = '<div class="text-center py-4 text-danger">Error al cargar promociones</div>';
  }
}

async function cargarCombosActivos() {
  const container = document.getElementById('posCombosContainer');
  if (!container) return;
  try {
    const combos = await API.get('/promociones/activas');
    const filtered = combos.filter(c => c.tipo === 'COMBO');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-boxes fa-2x mb-2"></i><p>No hay combos activos</p></div>';
      return;
    }
    container.innerHTML = filtered.map(c => `
      <div class="col-md-6">
        <div class="card card-sm border-info combo-card" data-id="${c.idPromocion}" data-tipo="COMBO" style="cursor:pointer">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold small">${Utils.esc(c.nombre)}</div>
                <small class="text-muted">${(c.detalles || []).length} producto(s)</small>
              </div>
              <div class="text-end">
                <div class="badge bg-info">-${c.descuentoPorcentaje}%</div>
                <div class="fw-bold mt-1" style="color:var(--primary)">$${(c.precioFinal || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.combo-card').forEach(card => {
      card.addEventListener('click', () => aplicarCombo(parseInt(card.dataset.id)));
    });
  } catch (_) {
    container.innerHTML = '<div class="text-center py-4 text-danger">Error al cargar combos</div>';
  }
}

async function aplicarPromocion(promoId) {
  try {
    const promo = await API.get('/promociones/' + promoId);
    if (!promo.idProducto) {
      Utils.showToast('La promoci\u00f3n no tiene producto asignado', 'warning');
      return;
    }

    const productExists = state.productos.find(p => p.idProducto === promo.idProducto);
    if (!productExists) {
      const data = await API.get('/productos?search=&activo=true&page=0&size=500');
      state.productos = data.content || [];
    }

    const prod = state.productos.find(p => p.idProducto === promo.idProducto);
    if (!prod) {
      Utils.showToast('Producto no encontrado en el inventario', 'warning');
      return;
    }

    if (getStockSucursal(prod) <= 0) {
      Utils.showToast('Producto sin stock en esta sucursal', 'warning');
      return;
    }

    const idx = state.cart.findIndex(d => d.idProducto === promo.idProducto);
    if (idx >= 0) {
      const stockSuc = getStockSucursal(prod);
      if (state.cart[idx].cantidad >= stockSuc) {
        Utils.showToast('Stock insuficiente', 'warning');
        return;
      }
      state.cart[idx].cantidad++;
    } else {
      state.cart.push({
        idProducto: promo.idProducto,
        nombre: prod.nombre,
        sku: prod.sku,
        cantidad: 1,
        precioUnitario: promo.precioFinal || 0,
        stockActual: getStockSucursal(prod),
        _promoNombre: promo.nombre,
        _promoId: promoId,
      });
    }

    renderCart();
    Utils.showToast('Promoci\u00f3n aplicada: ' + promo.nombre, 'success');
    bootstrap.Modal.getInstance(document.getElementById('posPromocionModal'))?.hide();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function aplicarCombo(comboId) {
  try {
    const combo = await API.get('/promociones/' + comboId);
    const detalles = combo.detalles || [];
    if (detalles.length === 0) {
      Utils.showToast('El combo no tiene productos', 'warning');
      return;
    }

    const data = await API.get('/productos?activo=true&page=0&size=500');
    const allProductos = data.content || [];
    const desc = combo.descuentoPorcentaje || 0;

    let skipped = 0;
    for (const det of detalles) {
      const prod = allProductos.find(p => p.idProducto === det.idProducto);
      if (!prod) { skipped++; continue; }

      const unitPrice = (prod.precio1 || 0) * (1 - desc / 100);
      const stockSuc = state.caja?.idSucursal
        ? (prod.inventarioSucursales || []).find(i => i.idSucursal === state.caja.idSucursal)?.stock || 0
        : prod.stockActual || 0;

      if (stockSuc < det.cantidad) { skipped++; continue; }

      const existing = state.cart.find(d => d.idProducto === det.idProducto);
      if (existing) {
        existing.cantidad += det.cantidad;
      } else {
        state.cart.push({
          idProducto: det.idProducto,
          nombre: prod.nombre,
          sku: prod.sku,
          cantidad: det.cantidad,
          precioUnitario: unitPrice,
          stockActual: stockSuc,
          _comboNombre: combo.nombre,
          _comboId: comboId,
        });
      }
    }

    if (skipped === detalles.length) {
      Utils.showToast('No se pudo agregar ning\u00fan producto del combo (sin stock)', 'warning');
      return;
    }

    renderCart();
    Utils.showToast('Combo aplicado: ' + combo.nombre + (skipped > 0 ? ' (' + skipped + ' producto(s) sin stock omitidos)' : ''), 'success');
    bootstrap.Modal.getInstance(document.getElementById('posPromocionModal'))?.hide();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}
