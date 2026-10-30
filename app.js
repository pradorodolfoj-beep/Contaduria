let transacciones = JSON.parse(localStorage.getItem('transacciones_v4')) || [];
let chartInstance = null;

const form = document.getElementById('finance-form');
const tipoSelect = document.getElementById('tipo');
const categoriaSelect = document.getElementById('categoria');
const conceptoGroup = document.getElementById('concepto-group');
const conceptoInput = document.getElementById('concepto');
const descripcionInput = document.getElementById('descripcion');
const tasaCambioSelect = document.getElementById('tasa-cambio');
const vencimientoGroup = document.getElementById('vencimiento-group');
const vencimientoInput = document.getElementById('fecha-vencimiento');
const fechaRegistroInput = document.getElementById('fecha-registro');
const montoInput = document.getElementById('monto');
const horaAvisoInput = document.getElementById('hora-aviso');

const totalIngresosEl = document.getElementById('total-ingresos');
const totalGastosEl = document.getElementById('total-gastos');
const totalDeudasEl = document.getElementById('total-deudas');
const balanceNetoEl = document.getElementById('balance-neto');
const listaTransaccionesEl = document.getElementById('lista-transacciones');
const alertasContainer = document.getElementById('alertas-container');
const btnLimpiar = document.getElementById('btn-limpiar');

const filtroDesde = document.getElementById('filtro-desde');
const filtroHasta = document.getElementById('filtro-hasta');
const btnFiltrar = document.getElementById('btn-filtrar');
const btnResetFiltro = document.getElementById('btn-reset-filtro');

fechaRegistroInput.value = new Date().toISOString().split('T')[0];

// Cargar hora de aviso guardada
const horaGuardada = localStorage.getItem('hora_aviso_deuda');
if (horaGuardada) horaAvisoInput.value = horaGuardada;

horaAvisoInput.addEventListener('change', () => {
    localStorage.setItem('hora_aviso_deuda', horaAvisoInput.value);
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
        vencimientoGroup.classList.remove('hidden');
        vencimientoInput.required = true;
        tipoSelect.value = 'gasto';
    } else {
        vencimientoGroup.classList.add('hidden');
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
    const fechaVencimiento = categoriaSelect.value === 'Deuda' ? vencimientoInput.value : null;
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
        monto
    });

    guardarYActualizar();

    form.reset();
    fechaRegistroInput.value = new Date().toISOString().split('T')[0];
    conceptoGroup.classList.add('hidden');
    vencimientoGroup.classList.add('hidden');
    tipoSelect.value = 'gasto';
});

function guardarYActualizar() {
    localStorage.setItem('transacciones_v4', JSON.stringify(transacciones));
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

    // Revisar alarma por hora configurada
    verificarAlarmaPorHora(hoy);

    if (transacciones.length === 0) {
        listaTransaccionesEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 15px;">Sin movimientos.</p>';
    }

    transacciones.forEach((t) => {
        if (t.tipo === 'ingreso') {
            ingresos += t.monto;
        } else {
            gastos += t.monto;
        }

        // Calcular deudas pendientes
        if (t.categoria === 'Deuda') {
            deudasPendientes += t.monto;

            if (t.fechaVencimiento) {
                const fechaVenc = new Date(t.fechaVencimiento + 'T00:00:00');
                const difDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));

                if (difDias < 0) {
                    crearAlerta(`🚨 <strong>DEUDA VENCIDA:</strong> "${t.descripcion}" ($${t.monto.toFixed(2)}) venció el ${formatFecha(t.fechaVencimiento)}.`, 'danger');
                } else if (difDias <= 3) {
                    crearAlerta(`⚠️ <strong>AVISO DE VENCIMIENTO:</strong> "${t.descripcion}" ($${t.monto.toFixed(2)}) vence ${difDias === 0 ? 'hoy' : 'en ' + difDias + ' día(s)'}.`, 'warning');
                }
            }
        }

        const li = document.createElement('li');
        li.className = t.categoria === 'Deuda' ? 'deuda' : t.tipo;
        
        let badgeVenc = t.fechaVencimiento ? `<br><span class="badge-deuda">Vence: ${formatFecha(t.fechaVencimiento)}</span>` : '';
        let badgeTasa = `<span class="badge-info">Tasa: ${t.tasaCambio}</span>`;

        li.innerHTML = `
            <div>
                <strong>${t.categoria}</strong> <small style="color: #9ca3af;">(${formatFecha(t.fechaRegistro)})</small>
                <p style="font-size: 0.8rem; color: #d1d5db; margin-top: 2px;">${t.descripcion}</p>
                ${badgeTasa} ${badgeVenc}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; font-size: 0.95rem;">$${t.monto.toFixed(2)}</span>
                <button onclick="eliminarTransaccion(${t.id})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:1.1rem;" title="Eliminar">×</button>
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

function verificarAlarmaPorHora(hoy) {
    const horaObjetivo = horaAvisoInput.value; // Formato "HH:MM"
    if (!horaObjetivo) return;

    const [hObj, mObj] = horaObjetivo.split(':').map(Number);
    const ahora = new Date();
    
    // Si la hora actual coincide con la hora configurada (con margen de 1 minuto)
    if (ahora.getHours() === hObj && ahora.getMinutes() === mObj) {
        // Verificar si hay deudas próximas o vencidas para mostrar banner extra
        const deudasActivas = transacciones.filter(t => t.categoria === 'Deuda' && t.fechaVencimiento);
        if (deudasActivas.length > 0) {
            crearAlerta(`🔔 <strong>Alarma programada (${horaObjetivo}):</strong> Tienes compromisos y deudas registradas activas pendientes por revisar.`, 'warning');
        }
    }
}

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

    if (chartInstance) {
        chartInstance.destroy();
    }

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

window.eliminarTransaccion = function(id) {
    transacciones = transacciones.filter(t => t.id !== id);
    guardarYActualizar();
};

btnLimpiar.addEventListener('click', () => {
    if (confirm('¿Deseas eliminar todas las transacciones?')) {
        transacciones = [];
        guardarYActualizar();
    }
});

actualizarInterfaz();
