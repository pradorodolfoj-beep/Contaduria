// Cargar transacciones guardadas previamente en el navegador
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];

const form = document.getElementById('finance-form');
const tipoSelect = document.getElementById('tipo');
const categoriaSelect = document.getElementById('categoria');
const conceptoGroup = document.getElementById('concepto-group');
const conceptoInput = document.getElementById('concepto');
const montoInput = document.getElementById('monto');

const totalIngresosEl = document.getElementById('total-ingresos');
const totalGastosEl = document.getElementById('total-gastos');
const balanceNetoEl = document.getElementById('balance-neto');
const listaTransaccionesEl = document.getElementById('lista-transacciones');
const btnLimpiar = document.getElementById('btn-limpiar');

// Mostrar u ocultar el campo de texto cuando seleccionan "Otros"
categoriaSelect.addEventListener('change', () => {
    if (categoriaSelect.value === 'otro') {
        conceptoGroup.classList.remove('hidden');
        conceptoInput.required = true;
    } else {
        conceptoGroup.classList.add('hidden');
        conceptoInput.required = false;
    }
});

// Registrar transacción
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tipo = tipoSelect.value;
    const categoria = categoriaSelect.value;
    
    // Definir el nombre del concepto según la categoría seleccionada
    let concepto = '';
    if (categoria === 'sueldo') concepto = 'Sueldo';
    else if (categoria === 'ingreso_extra') concepto = 'Ingreso Extra';
    else if (categoria === 'alquiler') concepto = 'Alquiler';
    else if (categoria === 'comida') concepto = 'Comida';
    else if (categoria === 'salidas') concepto = 'Salidas / Entretenimiento';
    else if (categoria === 'otro') concepto = conceptoInput.value.trim();

    const monto = parseFloat(montoInput.value);

    if (isNaN(monto) || monto <= 0) return;

    const nuevaTransaccion = {
        id: Date.now(),
        tipo,
        categoria,
        concepto,
        monto
    };

    transacciones.push(nuevaTransaccion);
    guardarYActualizar();
    
    form.reset();
    conceptoGroup.classList.add('hidden');
    tipoSelect.value = 'gasto';
});

// Guardar en almacenamiento local del navegador y refrescar pantalla
function guardarYActualizar() {
    localStorage.setItem('transacciones', JSON.stringify(transacciones));
    actualizarInterfaz();
}

// Renderizar datos en pantalla
function actualizarInterfaz() {
    let ingresos = 0;
    let gastos = 0;

    listaTransaccionesEl.innerHTML = '';

    if (transacciones.length === 0) {
        listaTransaccionesEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No hay registros aún.</p>';
    }

    transacciones.forEach((t) => {
        if (t.tipo === 'ingreso') {
            ingresos += t.monto;
        } else {
            gastos += t.monto;
        }

        const li = document.createElement('li');
        li.className = t.tipo;
        li.innerHTML = `
            <div>
                <strong>${t.concepto}</strong>
                <br>
                <small style="color: #64748b; text-transform: uppercase;">${t.tipo}</small>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">$${t.monto.toFixed(2)}</span>
                <button onclick="eliminarTransaccion(${t.id})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:1rem;" title="Eliminar">×</button>
            </div>
        `;
        listaTransaccionesEl.appendChild(li);
    });

    const balance = ingresos - gastos;

    totalIngresosEl.textContent = `$${ingresos.toFixed(2)}`;
    totalGastosEl.textContent = `$${gastos.Downloads || gastos.toFixed(2)}`; // Corregido formato
    totalGastosEl.textContent = `$${gastos.toFixed(2)}`;
    balanceNetoEl.textContent = `$${balance.toFixed(2)}`;
}

// Eliminar un registro individual
window.eliminarTransaccion = function(id) {
    transacciones = transacciones.filter(t => t.id !== id);
    guardarYActualizar();
};

// Borrar todo el historial
btnLimpiar.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas borrar todo el historial?')) {
        transacciones = [];
        guardarYActualizar();
    }
});

// Cargar la interfaz al iniciar la página
actualizarInterfaz();
