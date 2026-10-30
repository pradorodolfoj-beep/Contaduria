let transacciones = JSON.parse(localStorage.getItem('transacciones_v7')) || [];
let chartInstance = null;
let accionConfirmadaCallback = null;

const form = document.getElementById('finance-form');
const tipoSelect = document.getElementById('tipo');
const categoriaSelect = document.getElementById('categoria');
const conceptoGroup = document.getElementById('concepto-group');
const conceptoInput = document.getElementById('concepto');
const descripcionInput = document.getElementById('descripcion');
const tasaCambioSelect = document.getElementById('tasa-cambio');
const vencimientoContainer = document.getElementById('vencimiento-container');
const vencimientoInput = document.getElementById('fecha-vencimiento');
const horaAlertaInput = document.getElementById('hora-alerta');
const fechaRegistroInput = document.getElementById('fecha-registro');
const montoInput = document.getElementById('monto');

const totalIngresosEl = document.getElementById('total-ingresos');
const totalGastosEl = document.getElementById('total-gastos');
const totalDeudasEl = document.getElementById('total-deudas');
const balanceNetoEl = document.getElementById('balance-neto');
const listaTransaccionesEl = document.getElementById('lista-transacciones');
const alertasContainer = document.getElementById('alertas-container');
const btnLimpiar = document.getElementById('btn-limpiar');
const btnNotificaciones = document.getElementById('btn-notificaciones');

const filtroDesde = document.getElementById('filtro-desde');
const filtroHasta = document.getElementById('filtro-hasta');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnResetFiltro = document.getElementById('btn-reset-filtro');

const modalOverlay = document.getElementById('modal-overlay');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalBtnConfirm = document.getElementById('modal-btn-confirm');
const modalBtnCancel = document.getElementById('modal-btn-cancel');

fechaRegistroInput.value = new Date().toISOString().split('T')[0];

// Registrar Service Worker para permitir instalación PWA desde Chrome
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
  });
}

btnNotificaciones.addEventListener('click', () => {
    if (!("Notification" in window)) {
        mostrarModal("No soportado", "Tu navegador no soporta notificaciones nativas.", "❌", null, false);
        return;
    }

    Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
            btnNotificaciones.textContent = "🔔 Alertas Activas";
            btnNotificaciones.style.background = "#10b981";
            new Notification("Finanzas Pro", { body: "Las alertas de deudas individuales han sido activadas." });
        } else {
            btnNotificaciones.textContent = "🔕 Permiso Denegado";
        }
    });
});

categoriaSelect.addEventListener('change', () => {
    const val = categoriaSelect.value;
    
    if (val === 'Otros') {
        conceptoGroup.classList.remove('hidden');
        conceptoInput.required = true;
    } else {
        conceptoGroup.classList.add('hidden');
        conceptoInput.required = false;
    }

    if (val === 'Deuda') {
        vencimientoContainer.classList.remove('hidden');
        vencimientoInput.required = true;
        tipoSelect.value = 'gasto';
    } else {
        vencimientoContainer.classList.add('hidden');
        vencimientoInput.required = false;
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tipo = tipoSelect.value;
    let categoria = categoriaSelect.value;
    
    if (categoria === 'Otros') {
        categoria = conceptoInput.value.trim() || 'Otros';
    }

    const descripcion = descripcionInput.value.trim() || 'Sin descripción';
    const tasaCambio = tasaCambioSelect.value;
    const fechaRegistro = fechaRegistroInput.value;
    const esDeuda = categoriaSelect.value === 'Deuda';
    const fechaVencimiento = esDeuda ? vencimientoInput.value : null;
    const horaAlerta = esDeuda ? horaAlertaInput.value : null;
    const monto = parseFloat(montoInput.value);

    if (isNaN(monto) || monto <= 0) return;

    transacciones.push({
        id: Date.now(),
        tipo,
        categoria,
        descripcion,
        tasaCambio,
        fechaRegistro,
        fechaVencimiento,
        horaAlerta,
        monto
    });

    guardarYActualizar();

    form.reset();
    fechaRegistroInput.value = new Date().toISOString().split('T')[0];
    conceptoGroup.classList.add('hidden');
    vencimientoContainer.classList.add('hidden');
    tipoSelect.value = 'gasto';
});

function guardarYActualizar() {
    localStorage.setItem('transacciones_v7', JSON.stringify(transacciones));
    actualizarInterfaz();
}

function actualizarInterfaz() {
    let ingresos = 0;
    let gastos = 0;
    let deudasPendientes = 0;

    listaTransaccionesEl.innerHTML = '';
    alertasContainer.innerHTML = '';

    transacciones.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    verificarAlarmasIndividuales();

    if (transacciones.length === 0) {
        listaTransaccionesEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 15px;">Sin movimientos.</p>';
    }

    transacciones.forEach((t) => {
        if (t.tipo === 'ingreso') {
            ingresos += t.monto;
        } else {
            gastos += t.monto;
        }

        if (t.categoria === 'Deuda') {
            deudasPendientes += t.monto;

            if (t.fechaVencimiento) {
                const fechaVenc = new Date(t.fechaVencimiento + 'T00:00:00');
                const difDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

                if (difDias < 0) {
                    crearAlerta(`🚨 <strong>DEUDA VENCIDA:</strong> "${t.descripcion}" ($${t.monto.toFixed(2)}) venció el ${formatFecha(t.fechaVencimiento)}.`, 'danger');
                } else if (difDias <= 3) {
                    crearAlerta(`⚠️ <strong>AVISO:</strong> "${t.descripcion}" ($${t.monto.toFixed(2)}) vence ${difDias === 0 ? 'hoy' : 'en ' + difDias + ' día(s)'}.`, 'warning');
                }
            }
        }

        const li = document.createElement('li');
        li.className = t.categoria === 'Deuda' ? 'deuda' : t.tipo;
        
        let badgeVenc = t.fechaVencimiento ? `<br><span class="badge-deuda">Vence: ${formatFecha(t.fechaVencimiento)}</span>` : '';
        let badgeHora = t.horaAlerta ? `<span class="badge-deuda">⏰ ${t.horaAlerta}</span>` : '';
        let badgeTasa = `<span class="badge-info">Tasa: ${t.tasaCambio}</span>`;

        li.innerHTML = `
            <div>
                <strong>${t.categoria}</strong> <small style="color: #9ca3af;">(${formatFecha(t.fechaRegistro)})</small>
                <p style="font-size: 0.8rem; color: #d1d5db; margin-top: 2px;">${t.descripcion}</p>
                ${badgeTasa} ${badgeVenc} ${badgeHora}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; font-size: 0.95rem;">$${t.monto.toFixed(2)}</span>
                <button onclick="confirmarEliminar(${t.id})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:1.1rem;" title="Eliminar">×</button>
            </div>
        `;
        listaTransaccionesEl.appendChild(li);
    });

    totalIngresosEl.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosEl.textContent = `$${gastos.toFixed(2)}`;
    totalDeudasEl.textContent = `$${deudasPendientes.toFixed(2)}`;
    balanceNetoEl.textContent = `$${(ingresos - gastos).toFixed(2)}`;

    renderizarGrafica();
}

function verificarAlarmasIndividuales() {
    const ahora = new Date();
    const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const hoyStr = ahora.toISOString().split('T')[0];

    transacciones.forEach(t => {
        if (t.categoria === 'Deuda' && t.fechaVencimiento && t.horaAlerta === horaActualStr) {
            if (t.fechaVencimiento <= hoyStr) {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("⏰ Alerta de Deuda Pendiente", { body: `La deuda "${t.descripcion}" por $${t.monto.toFixed(2)} requiere atención.` });
                }
            }
        }
    });
}

setInterval(verificarAlarmasIndividuales, 30000);

function mostrarModal(titulo, mensaje, icono = "⚠️", callback = null, mostrarCancelar = true) {
    modalTitle.textContent = titulo;
    modalMessage.textContent = mensaje;
    modalIcon.textContent = icono;
    accionConfirmadaCallback = callback;

    if (mostrarCancelar) {
        modalBtnCancel.classList.remove('hidden');
    } else {
        modalBtnCancel.classList.add('hidden');
    }

    modalOverlay.classList.remove('hidden');
}

modalBtnCancel.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    accionConfirmadaCallback = null;
});

modalBtnConfirm.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    if (accionConfirmadaCallback) accionConfirmadaCallback();
});

window.confirmarEliminar = function(id) {
    mostrarModal("Eliminar Registro", "¿Deseas eliminar este movimiento?", "🗑️", () => {
        transacciones = transacciones.filter(t => t.id !== id);
        guardarYActualizar();
    });
};

btnLimpiar.addEventListener('click', () => {
    mostrarModal("Borrar Todo", "¿Estás seguro de que deseas eliminar todo el historial?", "⚠️", () => {
        transacciones = [];
        guardarYActualizar();
    });
});

btnFiltrar.addEventListener('click', () => renderizarGrafica());
btnResetFiltro.addEventListener('click', () => {
    filtroDesde.value = '';
    filtroHasta.value = '';
    renderizarGrafica();
});

function renderizarGrafica() {
    const desde = filtroDesde.value ? new Date(filtroDesde.value + 'T00:00:00') : null;
    const hasta = filtroHasta.value ? new Date(filtroHasta.value + 'T23:59:59') : null;

    const transaccionesFiltradas = transacciones.filter(t => {
        const fecha = new Date(t.fechaRegistro + 'T00:00:00');
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
    });

    const fechasMap = {};

    transaccionesFiltradas.forEach(t => {
        if (!fechasMap[t.fechaRegistro]) {
            fechasMap[t.fechaRegistro] = { ingresos: 0, gastos: 0 };
        }
        if (t.tipo === 'ingreso') {
            fechasMap[t.fechaRegistro].ingresos += t.monto;
        } else {
            fechasMap[t.fechaRegistro].gastos += t.monto;
        }
    });

    const fechasOrdenadas = Object.keys(fechasMap).sort((a, b) => new Date(a) - new Date(b));
    const dataIngresos = fechasOrdenadas.map(f => fechasMap[f].ingresos);
    const dataGastos = fechasOrdenadas.map(f => fechasMap[f].gastos);
    const labelsFormatted = fechasOrdenadas.map(f => formatFecha(f));

    const canvas = document.getElementById('graficaComparativa');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstance) chartInstance.destroy();
    if (typeof Chart === 'undefined') return;

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsFormatted.length ? labelsFormatted : ['Sin datos'],
            datasets: [
                { label: 'Ingresos ($)', data: dataIngresos.length ? dataIngresos : [0], backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Gastos ($)', data: dataGastos.length ? dataGastos : [0], backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#f9fafb', font: { size: 11 } } }
            },
            scales: {
                x: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#9ca3af', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });
}

function crearAlerta(msj, tipo) {
    const div = document.createElement('div');
    div.className = `alert-box ${tipo === 'danger' ? 'danger' : ''}`;
    div.innerHTML = msj;
    alertasContainer.appendChild(div);
}

function formatFecha(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
}

actualizarInterfaz();
