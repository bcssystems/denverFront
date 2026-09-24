const TICKET_CSS = `
    @page {
      size: letter;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #222;
      line-height: 1.35;
    }
    .print-copy {
      page-break-after: always;
      min-height: 100vh;
      position: relative;
      box-sizing: border-box;
      padding: 0.25in;
    }
    .print-copy:last-child { page-break-after: avoid; }
    .copy-label {
      text-align: center;
      font-size: 7.5pt;
      color: #999;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 3px solid #2563EB;
      margin-bottom: 10px;
    }
    .header h1 {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: 4px;
      color: #2563EB;
      text-transform: uppercase;
    }
    .header .sub {
      font-size: 8pt;
      color: #888;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header .folio {
      font-size: 13pt;
      color: #2563EB;
      font-weight: 700;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .info-grid {
      width: 100%;
      margin-bottom: 8px;
      border-collapse: collapse;
    }
    .info-grid td {
      padding: 2px 6px;
      font-size: 9pt;
      vertical-align: top;
    }
    .info-grid .label {
      font-weight: 600;
      color: #555;
      width: 90px;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.5px;
    }
    .info-grid td:last-child { text-align: left; }
    .divider { border-top: 1px solid #ccc; margin: 6px 0; }
    table.detalles {
      width: 100%;
      border-collapse: collapse;
    }
    table.detalles thead { background: #2563EB; color: #fff; }
    table.detalles th {
      font-size: 7.5pt;
      text-align: left;
      padding: 5px 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.detalles th.right { text-align: right; }
    table.detalles th.center { text-align: center; }
    table.detalles td {
      padding: 4px 6px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 9pt;
      vertical-align: top;
    }
    table.detalles td.right { text-align: right; }
    table.detalles td.center { text-align: center; }
    table.detalles .detalle-attrs {
      font-size: 7.5pt;
      color: #666;
      font-style: italic;
    }
    .totals {
      width: 100%;
      border-collapse: collapse;
    }
    .totals td {
      padding: 2px 6px;
      font-size: 9.5pt;
    }
    .totals td.right { text-align: right; }
    .totals .total-row td {
      font-size: 13pt;
      font-weight: 700;
      border-top: 2px solid #222;
      padding-top: 6px;
      color: #2563EB;
    }
    .section { margin-top: 8px; }
    .section-title {
      font-weight: 600;
      font-size: 8pt;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .nota {
      margin-top: 6px;
      padding: 6px 8px;
      background: #f0f4f8;
      font-size: 8.5pt;
      border-left: 3px solid #2563EB;
    }
    .footer {
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 7.5pt;
      color: #999;
      line-height: 1.5;
    }
    .footer strong { color: #666; }
    .bottom-section {
      position: absolute;
      bottom: 0.25in;
      left: 0.25in;
      right: 0.25in;
    }
    .firmas {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .firma-espacio { width: 45%; text-align: center; }
    .firma-linea { border-top: 1px solid #222; height: 26px; }
  `;

const STATE_CUENTA_CSS = `
    @page { size: letter; margin: 0.35in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9.5pt;
      color: #222;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 3px solid #2563EB;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: 4px;
      color: #2563EB;
      text-transform: uppercase;
    }
    .header .sub {
      font-size: 7.5pt;
      color: #555;
      letter-spacing: 0.5px;
    }
    .header .title {
      font-size: 12pt;
      color: #1e3a5f;
      font-weight: 700;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 9pt;
      padding: 1px 0;
    }
    .line { border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 3px 6px; border: 1px solid #c9c9c9; font-size: 8.5pt; }
    th { background: #2563EB; color: #fff; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    th.right, td.right { text-align: right; }
    h3.sub-title {
      font-size: 9pt;
      margin: 8px 0 3px;
      color: #1e3a5f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total { font-size: 12pt; font-weight: 800; color: #2563EB; }
    .notas-box { font-size: 8.5pt; }
    .firma { margin-top: 56px; text-align: center; font-size: 8.5pt; }
    .firma-linea { border-top: 1px solid #222; width: 55%; margin: 0 auto 4px; }
  `;

function abrirVentana(titulo, alto, ancho) {
  const win = window.open('', '_blank', 'width=' + (ancho || 800) + ',height=' + (alto || 900));
  if (!win) {
    Utils.showToast('Bloqueador de popups activo. Permite las ventanas emergentes.', 'warning');
    return null;
  }
  return win;
}

export function printRemisionVenta(venta, opts) {
  const options = opts || {};
  const esCredito = options.esCredito || venta.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (venta.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : venta.plazoMeses;
  const numCopies = Math.max(1, options.copies || 1);
  const autoPrint = options.autoPrint !== false;
  const configs = options.configs || {};
  const clienteInfo = options.clienteInfo || null;

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const totalConInteres = esCredito
    ? (venta.total || 0) + ((venta.total || 0) * porcentajeInteres / 100)
    : (venta.total || 0);

  const detalleRows = (venta.detalles || []).map(d => {
    const dSubtotal = d.subtotal || (d.cantidad * d.precioUnitario) || 0;
    const nombre = Utils.esc(d.productoNombre || d.descripcion || 'Producto');
    const unidad = (d.unidadMedida || 'UNIDAD').toLowerCase();
    const attrs = d.atributosText ? '<br><span class="detalle-attrs">' + Utils.esc(d.atributosText) + '</span>' : '';
    return `
    <tr class="detalle-row">
      <td>${nombre}${attrs}</td>
      <td class="center">${d.cantidad}</td>
      <td class="center small">${Utils.esc(unidad)}</td>
      <td class="right">$${(d.precioUnitario || 0).toFixed(2)}</td>
      <td class="right">$${dSubtotal.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const pagoRows = esCredito
    ? `<tr><td>Cr\u00e9dito &mdash; Venta #${venta.idVenta}</td><td class="right">$${totalConInteres.toFixed(2)}</td></tr>
       <tr><td class="small">Inter\u00e9s ${(porcentajeInteres || 0)}% / Plazo: ${plazoMeses != null ? plazoMeses + ' meses' : '—'}</td><td class="right">$${((venta.total || 0) * porcentajeInteres / 100).toFixed(2)}</td></tr>`
    : (venta.pagos || []).map(p => `
    <tr>
      <td>${Utils.esc(p.tipoPagoNombre || '')}${p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : ''}</td>
      <td class="right">$${(p.monto || 0).toFixed(2)}</td>
    </tr>`).join('');

  function buildBodyHtml(copyIndex) {
    const pieHtml = `<div class="bottom-section">
      ${esCredito ? '<div class="firmas"><div class="firma-espacio"><div class="firma-linea"></div>Entreg\u00f3</div><div class="firma-espacio"><div class="firma-linea"></div>Recibi\u00f3</div></div>' : ''}
      <div class="divider"></div>
      <table class="totals">
        <tr><td>Subtotal</td><td class="right">$${(venta.subtotal || 0).toFixed(2)}</td></tr>
        <tr><td>Descuento</td><td class="right">-$${(venta.descuento || 0).toFixed(2)}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td class="right">$${(esCredito ? totalConInteres : venta.total || 0).toFixed(2)}</td></tr>
      </table>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Forma de Pago</div>
        <table class="totals">
          ${pagoRows}
        </table>
      </div>
      ${venta.nota ? `<div class="nota"><strong>Nota:</strong> ${Utils.esc(venta.nota)}</div>` : ''}
      <div class="footer">
        <strong>BONDS</strong> &mdash; Sistema de Administraci\u00f3n<br>
        Este documento es un comprobante interno de venta<br>
        ${fechaStr} ${horaStr}
      </div>
    </div>`;

    return `
  ${numCopies > 1 ? '<div class="copy-label">--- COPIA ' + (copyIndex + 1) + ' DE ' + numCopies + ' ---</div>' : ''}
  <div class="header">
    <h1>BONDS</h1>
    <div class="sub">Sistema de Administraci\u00f3n</div>
    <div class="folio">REMISI\u00d3N #${venta.idVenta}</div>
  </div>
  <table class="info-grid">
    <tr><td class="label">Fecha</td><td class="value">${fechaStr}</td><td class="label">Caja</td><td class="value">${Utils.esc(venta.cajaNombre || '')}</td></tr>
    <tr><td class="label">Hora</td><td class="value">${horaStr}</td><td class="label">Sucursal</td><td class="value">${Utils.esc(venta.sucursalNombre || '')}</td></tr>
    <tr><td class="label">Cliente</td><td class="value">${Utils.esc(venta.clienteNombre || 'Mostrador')}</td><td class="label">Atendi\u00f3</td><td class="value">${Utils.esc(venta.usuario || '')}</td></tr>
    <tr><td class="label">Tipo</td><td class="value">${venta.tipoVenta || 'CONTADO'}</td><td class="label">Folio</td><td class="value">#${venta.idVenta}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="detalles">
    <thead>
      <tr>
        <th style="width:38%">Descripci\u00f3n</th>
        <th class="center" style="width:9%">Cant</th>
        <th class="center" style="width:12%">Unidad</th>
        <th class="right" style="width:18%">Precio</th>
        <th class="right" style="width:23%">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows}
    </tbody>
  </table>
  ${pieHtml}`;
  }

  const win = abrirVentana('Remisi\u00f3n - Venta #' + venta.idVenta, 600, 800);
  if (!win) return;

  let fullHtml = '<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <title>Remisi\u00f3n - Venta #' + venta.idVenta + '</title>\n  <style>' + TICKET_CSS + '</style>\n</head>\n<body>';
  for (let i = 0; i < numCopies; i++) {
    fullHtml += '<div class="print-copy">' + buildBodyHtml(i) + '</div>';
  }
  fullHtml += '\n</body>\n</html>';
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  if (autoPrint) {
    setTimeout(() => { win.print(); }, 300);
  }
}

export function printCotizacion(cotizacion, opts) {
  const options = opts || {};
  const esCredito = options.esCredito != null ? options.esCredito : cotizacion.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (cotizacion.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : cotizacion.plazoMeses;
  const configs = options.configs || {};

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const subtotal = (cotizacion.detalles || []).reduce((s, d) =>
    s + (d.subtotal != null ? d.subtotal : ((d.cantidad || 0) * (d.precioUnitario || 0))), 0);
  const montoEnvio = (cotizacion.cobraEnvio && cotizacion.montoEnvio) ? cotizacion.montoEnvio : 0;
  const total = cotizacion.total != null ? cotizacion.total : (subtotal + montoEnvio);
  const totalConInteres = esCredito ? total + (total * porcentajeInteres / 100) : total;

  const detalleRows = (cotizacion.detalles || []).map(d => {
    const dSubtotal = d.subtotal != null ? d.subtotal : ((d.cantidad || 0) * (d.precioUnitario || 0));
    const nombre = Utils.esc(d.productoNombre || 'Producto');
    const sku = d.productoSku ? '<br><span class="detalle-attrs">SKU: ' + Utils.esc(d.productoSku) + '</span>' : '';
    return `
    <tr class="detalle-row">
      <td>${nombre}${sku}</td>
      <td class="center">${d.cantidad || 0}</td>
      <td class="center small">—</td>
      <td class="right">$${(d.precioUnitario || 0).toFixed(2)}</td>
      <td class="right">$${dSubtotal.toFixed(2)}</td>
    </tr>`;
  }).join('');

  const pagoHtml = esCredito
    ? `<tr><td>Cr\u00e9dito &mdash; Plazo ${plazoMeses != null ? plazoMeses + ' meses' : '—'}</td><td class="right">$${totalConInteres.toFixed(2)}</td></tr>
       <tr><td class="small">Inter\u00e9s ${(porcentajeInteres || 0)}%</td><td class="right">$${(total * porcentajeInteres / 100).toFixed(2)}</td></tr>`
    : `<tr><td>Contado</td><td class="right">$${total.toFixed(2)}</td></tr>`;

  const expiraStr = cotizacion.fechaExpiracion
    ? new Date(cotizacion.fechaExpiracion).toLocaleDateString('es-MX')
    : (cotizacion.diasVigencia != null ? (cotizacion.diasVigencia + ' d\u00edas') : '-');

  const ganchoEmpresa = configs['direccionEmpresa'] || 'San Luis Potos\u00ed, S.L.P.';
  const telefonoEmpresa = configs['telefonoEmpresa'] || '';

  const totalesHtml = `
  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">$${subtotal.toFixed(2)}</td></tr>
    <tr><td>Env\u00edo</td><td class="right">$${montoEnvio.toFixed(2)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">$${(esCredito ? totalConInteres : total).toFixed(2)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Forma de Pago</div>
    <table class="totals">
      ${pagoHtml}
    </table>
  </div>
  ${cotizacion.nota ? `<div class="nota"><strong>Nota:</strong> ${Utils.esc(cotizacion.nota)}</div>` : ''}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotizaci\u00f3n #${cotizacion.idCotizacion}</title>
  <style>${TICKET_CSS}</style>
</head>
<body>
<div class="print-copy">
  <div class="header">
    <h1>BONDS</h1>
    <div class="sub">Sistema de Administraci\u00f3n</div>
    <div class="folio">COTIZACI\u00d3N #${cotizacion.idCotizacion}</div>
  </div>
  <table class="info-grid">
    <tr><td class="label">Fecha</td><td class="value">${fechaStr}</td><td class="label">Atendi\u00f3</td><td class="value">${Utils.esc(cotizacion.usuarioNombre || '')}</td></tr>
    <tr><td class="label">Hora</td><td class="value">${horaStr}</td><td class="label">Paqueter\u00eda</td><td class="value">${Utils.esc(cotizacion.paqueteria || '—')}</td></tr>
    <tr><td class="label">Cliente</td><td class="value">${Utils.esc(cotizacion.clienteNombre || '')}</td><td class="label">Tipo</td><td class="value">${esCredito ? 'CR\u00c9DITO' : 'CONTADO'}</td></tr>
    <tr><td class="label">Vigencia</td><td class="value">V\u00e1lida hasta ${expiraStr}</td><td class="label">Folio</td><td class="value">#${cotizacion.idCotizacion}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="detalles">
    <thead>
      <tr>
        <th style="width:38%">Descripci\u00f3n</th>
        <th class="center" style="width:9%">Cant</th>
        <th class="center" style="width:12%">Unidad</th>
        <th class="right" style="width:18%">Precio</th>
        <th class="right" style="width:23%">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows}
    </tbody>
  </table>
  ${totalesHtml}
  <div class="bottom-section">
    <div class="footer">
      <strong>BONDS</strong> &mdash; ${Utils.esc(ganchoEmpresa)}${telefonoEmpresa ? ' &mdash; ' + Utils.esc(telefonoEmpresa) : ''}<br>
      Este documento es una cotizaci\u00f3n y no constituye venta ni factura<br>
      ${fechaStr} ${horaStr}
    </div>
  </div>
</div>
</body>
</html>`;

  const win = abrirVentana('Cotizaci\u00f3n #' + cotizacion.idCotizacion, 600, 800);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  if (options.autoPrint !== false) {
    setTimeout(() => { win.print(); }, 300);
  }
}

export function printEstadoCuenta(payload) {
  const configs = payload.configs || {};
  const cliente = payload.cliente || {};
  const totalPendiente = payload.totalPendiente || 0;

  const creditosRows = (payload.creditos || []).map(c => `<tr>
    <td>${c.idCredito}</td>
    <td>#${Utils.esc(c.folio || '')}</td>
    <td class="right">$${(c.montoOriginal || 0).toFixed(2)}</td>
    <td class="right">$${(c.saldoPendiente || 0).toFixed(2)}</td>
  </tr>`).join('');

  const creditosById = {};
  (payload.creditos || []).forEach(c => { creditosById[c.idCredito] = c; });

  const movimientos = (payload.movimientos || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const movRows = movimientos.map(m => {
    const c = creditosById[m.idCredito];
    const folio = c ? (c.folio || ('#' + c.idCredito)) : '&mdash;';
    const venta = c ? ('#' + (c.idVenta || '')) : '&mdash;';
    const tipo = m.tipo === 'CARGO' ? 'Cargo'
      : m.tipo === 'ABONO' ? 'Abono'
      : m.tipo === 'LIQUIDACION' ? 'Liquidaci\u00f3n' : (m.tipo || '');
    return `<tr>
      <td>${Utils.esc(folio)}</td>
      <td>${Utils.esc(venta)}</td>
      <td>${m.fecha ? new Date(m.fecha).toLocaleString() : '-'}</td>
      <td>${tipo}${m.tipoPagoNombre ? ' (' + Utils.esc(m.tipoPagoNombre) + ')' : ''}</td>
      <td class="right">$${(m.monto || 0).toFixed(2)}</td>
      <td class="right">$${(m.saldoNuevo || 0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const notas = (payload.notas || [])
    .filter(n => n.nota)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const notasHtml = notas.length
    ? '<ol>' + notas.map(n => '<li>' + Utils.esc(n.nota) + '</li>').join('') + '</ol>'
    : '<div style="text-align:center;font-size:8.5pt">Sin notas de ventas</div>';

  const nombreCliente = [cliente.nombre || '', cliente.apellidoPaterno || '', cliente.apellidoMaterno || ''].filter(Boolean).join(' ');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Estado de Cuenta</title>
  <style>${STATE_CUENTA_CSS}</style></head><body>
    <div class="header">
      <h1>BONDS</h1>
      <div class="sub">${Utils.esc(configs['descripcionEmpresa'] || '')} &mdash; ${Utils.esc(configs['direccionEmpresa'] || '')}</div>
      <div class="title">Estado de Cuenta</div>
    </div>
    <div class="info-row"><span><strong>Cliente:</strong> ${Utils.esc(nombreCliente)}</span><span><strong>Tel\u00e9fono:</strong> ${Utils.esc(cliente.telefono || '-')}</span></div>
    <div class="info-row"><span><strong>L\u00edmite de cr\u00e9dito:</strong> $${(cliente.limiteCredito || 0).toFixed(2)}</span><span><strong>Deuda total:</strong> <span class="total">$${totalPendiente.toFixed(2)}</span></span></div>
    <div class="info-row"><span><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</span></div>
    <div class="line"></div>
    <h3 class="sub-title">Cr\u00e9ditos</h3>
    <table>
      <thead><tr><th>#</th><th>Folio</th><th class="right">Original</th><th class="right">Pendiente</th></tr></thead>
      <tbody>${creditosRows || '<tr><td colspan="4" style="text-align:center">Sin cr\u00e9ditos</td></tr>'}</tbody>
    </table>
    <div class="line"></div>
    <h3 class="sub-title">Movimientos</h3>
    <table>
      <thead><tr><th>Folio</th><th>Venta</th><th>Fecha</th><th>Movimiento</th><th class="right">Cantidad</th><th class="right">Saldo</th></tr></thead>
      <tbody>${movRows || '<tr><td colspan="6" style="text-align:center">Sin movimientos</td></tr>'}</tbody>
    </table>
    <div class="line"></div>
    <h3 class="sub-title">Notas de ventas</h3>
    <div class="notas-box">${notasHtml}</div>
    <div class="firma"><div class="firma-linea"></div>Firma del cliente</div>
  </body></html>`;

  const win = abrirVentana('Estado de Cuenta', 700, 680);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}