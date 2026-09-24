let state = {
  data: [],
  filterTipo: '',
  filterEstado: '',
};

export function init() {
  bindEvents();
  cargar();
}

function bindEvents() {
  document.getElementById('filterAutorizacionesTipo')?.addEventListener('change', e => {
    state.filterTipo = e.target.value;
    cargar();
  });
  document.getElementById('filterAutorizacionesEstado')?.addEventListener('change', e => {
    state.filterEstado = e.target.value;
    cargar();
  });
  document.getElementById('tableAutorizacionesBody')?.addEventListener('click', handleTableClick);
}

async function cargar() {
  const tbody = document.getElementById('tableAutorizacionesBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div></td></tr>';

  const qs = state.filterEstado ? '?estado=' + state.filterEstado : '';

  try {
    let list = [];
    if (state.filterTipo === 'PRECIO') {
      list = (await API.get('/solicitudes-cambio-precio' + qs)).map(normalizarPrecio);
    } else if (state.filterTipo === 'CANCELACION') {
      list = (await API.get('/solicitudes-cancelacion' + qs)).map(normalizarCancelacion);
    } else {
      const [canc, prec] = await Promise.all([
        API.get('/solicitudes-cancelacion' + qs),
        API.get('/solicitudes-cambio-precio' + qs),
      ]);
      list = [
        ...(Array.isArray(canc) ? canc : []).map(normalizarCancelacion),
        ...(Array.isArray(prec) ? prec : []).map(normalizarPrecio),
      ];
      list.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    }
    state.data = list;
    render();
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>' + Utils.esc(err.message) + '</p></div></td></tr>';
  }
}

function normalizarCancelacion(c) {
  return {
    tipo: 'CANCELACION',
    tipoLabel: 'Cancelaci\u00f3n',
    idSolicitud: c.idSolicitud,
    referencia: 'Venta #' + c.idVenta,
    sucursal: c.sucursalNombre || '-',
    cliente: c.clienteNombre || 'Mostrador',
    cajero: c.cajero || '-',
    monto: c.total != null ? '$' + c.total.toFixed(2) : '-',
    motivo: c.motivo || '',
    fecha: c.fechaSolicitud,
    estado: c.estado,
    autorizador: c.autorizador,
    adminPerm: 'VENTAS_CANCELAR',
  };
}

function normalizarPrecio(p) {
  return {
    tipo: 'PRECIO',
    tipoLabel: 'Precio',
    idSolicitud: p.idSolicitud,
    referencia: Utils.esc(p.productoNombre) + (p.productoSku ? ' <small class="text-muted">(' + Utils.esc(p.productoSku) + ')</small>' : ''),
    sucursal: p.sucursalNombre || '-',
    cliente: '-',
    cajero: p.solicitante || '-',
    monto: '$' + (p.precioActual != null ? p.precioActual.toFixed(2) : '-') + ' \u2192 $' + (p.nuevoPrecio != null ? p.nuevoPrecio.toFixed(2) : '-'),
    motivo: p.motivo || '',
    fecha: p.fechaSolicitud,
    estado: p.estado,
    autorizador: p.autorizador,
    adminPerm: 'VENTAS_EDITAR_PRECIO',
  };
}

function render() {
  const tbody = document.getElementById('tableAutorizacionesBody');
  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11"><div class="empty-state"><i class="fas fa-shield-alt"></i><p>No hay solicitudes</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(s => {
    const badge = s.estado === 'PENDIENTE' ? 'bg-warning text-dark'
      : s.estado === 'AUTORIZADO' ? 'bg-success'
        : s.estado === 'RECHAZADO' ? 'bg-danger'
          : 'bg-secondary text-white';
    const tipoBadge = s.tipo === 'PRECIO' ? 'bg-info' : 'bg-primary';

    let acciones = '<span class="text-muted small">-</span>';
    if (s.estado === 'PENDIENTE' && Utils.hasPermiso(s.adminPerm)) {
      acciones = '<button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + s.idSolicitud + '" data-tipo="' + s.tipo + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>';
    } else if (s.estado === 'AUTORIZADO' || s.estado === 'RECHAZADO') {
      acciones = '<span class="text-muted small">' + Utils.esc(s.autorizador || '-') + '</span>';
    }

    return '<tr>' +
      '<td><span class="badge ' + tipoBadge + '" style="padding:4px 8px;border-radius:10px;font-size:0.65rem">' + s.tipoLabel + '</span></td>' +
      '<td>' + s.idSolicitud + '</td>' +
      '<td class="fw-semibold">' + s.referencia + '</td>' +
      '<td>' + Utils.esc(s.sucursal) + '</td>' +
      '<td>' + Utils.esc(s.cliente) + '</td>' +
      '<td>' + Utils.esc(s.cajero) + '</td>' +
      '<td>' + s.monto + '</td>' +
      '<td style="max-width:200px"><span class="d-inline-block text-truncate" style="max-width:190px" title="' + Utils.esc(s.motivo) + '">' + Utils.esc(s.motivo || '-') + '</span></td>' +
      '<td class="text-nowrap small">' + Utils.formatDateTime(s.fecha) + '</td>' +
      '<td><span class="badge ' + badge + '" style="padding:4px 8px;border-radius:10px;font-size:0.65rem">' + s.estado + '</span></td>' +
      '<td class="text-nowrap">' + acciones + '</td>' +
      '</tr>';
  }).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const tipo = kebab.dataset.tipo;
    const items = [
      { icon: 'fa-key', text: 'Generar C\u00f3digo', color: 'var(--primary)', onClick: () => generarCodigo(id, tipo) },
      { danger: true, icon: 'fa-times', text: 'Rechazar', onClick: () => rechazar(id, tipo) },
    ];
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
}

async function generarCodigo(idSolicitud, tipo) {
  try {
    const endpoint = tipo === 'PRECIO'
      ? '/solicitudes-cambio-precio/' + idSolicitud + '/generar-codigo'
      : '/solicitudes-cancelacion/' + idSolicitud + '/generar-codigo';
    const resp = await API.post(endpoint);
    const titulo = resp.idVenta != null
      ? 'Venta #' + resp.idVenta
      : resp.idProducto != null ? 'Producto #' + resp.idProducto : 'Solicitud #' + idSolicitud;
    document.getElementById('modalCodigoVenta').textContent = titulo;
    document.getElementById('modalCodigoValor').textContent = resp.codigo;
    document.getElementById('modalCodigoExpira').textContent = 'Expira a las ' + new Date(resp.expiraEn).toLocaleTimeString();
    new bootstrap.Modal(document.getElementById('modalCodigoAutorizacion')).show();
    await cargar();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function rechazar(idSolicitud, tipo) {
  const ok = await Utils.confirm('Rechazar Solicitud', '\u00bfRechazar la solicitud #' + idSolicitud + '?');
  if (!ok) return;
  try {
    const endpoint = tipo === 'PRECIO'
      ? '/solicitudes-cambio-precio/' + idSolicitud + '/rechazar'
      : '/solicitudes-cancelacion/' + idSolicitud + '/rechazar';
    await API.post(endpoint);
    Utils.showToast('Solicitud rechazada', 'success');
    await cargar();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}