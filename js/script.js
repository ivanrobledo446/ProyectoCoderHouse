let presupuesto = 0;
let gastos = [];

/* -------- Referencias DOM - Pantalla 1 -------- */
const sectionConfigPresupuesto = document.getElementById('config-presupuesto');
const inputPresupuesto = document.getElementById('input-presupuesto');
const btnGuardarPresupuesto = document.getElementById(
  'btn-guardar-presupuesto'
);
const mensajeErrorPresupuesto = document.getElementById('presupuesto-error');

/* -------- Referencias DOM - Pantalla 2 -------- */
const sectionPlanificador = document.getElementById('planificador');
const spanPresupuestoTotal = document.getElementById('presupuesto-total');
const spanTotalGastado = document.getElementById('total-gastado');
const spanTotalDisponible = document.getElementById('total-disponible');
const btnReset = document.getElementById('btn-reset');

/* -------- Referencias DOM - Formulario de gastos -------- */
const formGasto = document.getElementById('form-gasto');
const inputFechaGasto = document.getElementById('gasto-fecha');
const selectCategoriaGasto = document.getElementById('gasto-categoria');
const inputDescripcionGasto = document.getElementById('gasto-descripcion');
const inputCantidadGasto = document.getElementById('gasto-cantidad');
const mensajeErrorGasto = document.getElementById('gasto-error');

/* -------- Referencias DOM - Tabla de gastos -------- */
const tbodyGastos = document.getElementById('tbody-gastos');

function initApp() {
  cargarDatosDesdeStorage();
  configurarEventos();

  if (presupuesto > 0) {
    mostrarPlanificador();
    actualizarResumen();
    renderizarGastos();
  } else {
    mostrarConfigPresupuesto();
  }
}

document.addEventListener('DOMContentLoaded', initApp);

function configurarEventos() {
  btnGuardarPresupuesto.addEventListener('click', manejarSubmitPresupuesto);

  if (formGasto) {
    formGasto.addEventListener('submit', manejarSubmitNuevoGasto);
  }

  btnReset.addEventListener('click', resetearApp);
}

function mostrarConfigPresupuesto() {
  sectionConfigPresupuesto.hidden = false;
  sectionPlanificador.hidden = true;
}

function mostrarPlanificador() {
  sectionConfigPresupuesto.hidden = true;
  sectionPlanificador.hidden = false;
}

function cargarDatosDesdeStorage() {
  const presupuestoGuardado = localStorage.getItem('presupuesto');
  const gastosGuardados = localStorage.getItem('gastos');

  if (presupuestoGuardado) {
    presupuesto = Number(presupuestoGuardado);
  }

  if (gastosGuardados) {
    try {
      gastos = JSON.parse(gastosGuardados) || [];
    } catch (e) {
      gastos = [];
    }
  } else {
    gastos = [];
  }
}

/* -------- Pantalla 1: Presupuesto -------- */
function manejarSubmitPresupuesto() {
  const valorIngresado = inputPresupuesto.value.trim();

  let numero = Number(valorIngresado);

  if (isNaN(numero) || numero <= 0) {
    mostrarErrorPresupuesto('Presupuesto inválido');
    return;
  }

  numero = Number(numero.toFixed(2));

  presupuesto = numero;
  localStorage.setItem('presupuesto', presupuesto.toString());

  limpiarErrorPresupuesto();

  inputPresupuesto.value = presupuesto.toFixed(2);

  mostrarPlanificador();
  actualizarResumen();
  renderizarGastos();
}

function mostrarErrorPresupuesto(mensaje) {
  mensajeErrorPresupuesto.textContent = mensaje;
  mensajeErrorPresupuesto.style.display = 'block';
}

function limpiarErrorPresupuesto() {
  mensajeErrorPresupuesto.textContent = '';
  mensajeErrorPresupuesto.style.display = 'none';
}

/* -------- Pantalla 2: Gastos -------- */
function manejarSubmitNuevoGasto(event) {
  event.preventDefault();

  const fecha = inputFechaGasto.value;
  const categoria = selectCategoriaGasto.value;
  const descripcion = inputDescripcionGasto.value.trim();
  let cantidad = Number(inputCantidadGasto.value);

  if (
    !fecha ||
    !categoria ||
    descripcion === '' ||
    isNaN(cantidad) ||
    cantidad <= 0
  ) {
    mostrarErrorGasto('Completar todos los campos con valores válidos');
    return;
  }

  cantidad = Number(cantidad.toFixed(2));

  limpiarErrorGasto();

  const nuevoGasto = crearObjetoGasto(fecha, categoria, descripcion, cantidad);

  gastos.push(nuevoGasto);

  guardarGastosEnStorage();

  actualizarResumen();
  renderizarGastos();

  formGasto.reset();
}

function mostrarErrorGasto(mensaje) {
  mensajeErrorGasto.textContent = mensaje;
  mensajeErrorGasto.style.display = 'block';
}

function limpiarErrorGasto() {
  mensajeErrorGasto.textContent = '';
  mensajeErrorGasto.style.display = 'none';
}

function crearObjetoGasto(fecha, categoria, descripcion, cantidad) {
  return {
    id: Date.now(),
    fecha,
    categoria,
    descripcion,
    cantidad,
  };
}

function guardarGastosEnStorage() {
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

function renderizarGastos() {
  tbodyGastos.innerHTML = '';

  if (!Array.isArray(gastos) || gastos.length === 0) {
    return;
  }

  gastos.forEach((gasto) => {
    const tr = document.createElement('tr');

    const tdFecha = document.createElement('td');
    tdFecha.textContent = gasto.fecha;

    const tdCategoria = document.createElement('td');
    tdCategoria.textContent =
      gasto.categoria.charAt(0).toUpperCase() + gasto.categoria.slice(1);

    const tdDescripcion = document.createElement('td');
    tdDescripcion.textContent = gasto.descripcion;

    const tdCantidad = document.createElement('td');
    tdCantidad.textContent = `$${gasto.cantidad.toFixed(2)}`;

    const tdAcciones = document.createElement('td');
    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.addEventListener('click', () => eliminarGasto(gasto.id));

    tdAcciones.appendChild(btnEliminar);

    tr.appendChild(tdFecha);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdDescripcion);
    tr.appendChild(tdCantidad);
    tr.appendChild(tdAcciones);

    tbodyGastos.appendChild(tr);
  });
}

function eliminarGasto(id) {
  gastos = gastos.filter((gasto) => gasto.id !== id);
  guardarGastosEnStorage();
  actualizarResumen();
  renderizarGastos();
}

/* -------- Resumen -------- */
function actualizarResumen() {
  const totalGastado = calcularTotalGastado();
  const disponible = presupuesto - totalGastado;

  spanPresupuestoTotal.textContent = `$${presupuesto.toFixed(2)}`;
  spanTotalGastado.textContent = `$${totalGastado.toFixed(2)}`;
  spanTotalDisponible.textContent = `$${disponible.toFixed(2)}`;
}

function calcularTotalGastado() {
  if (!Array.isArray(gastos) || gastos.length === 0) return 0;

  return gastos.reduce((total, gasto) => total + gasto.cantidad, 0);
}

/* -------- Resetear APP -------- */
function resetearApp() {
  localStorage.removeItem('presupuesto');
  localStorage.removeItem('gastos');

  presupuesto = 0;
  gastos = [];

  inputPresupuesto.value = '0';
  actualizarResumen();
  tbodyGastos.innerHTML = '';
  limpiarErrorPresupuesto();
  limpiarErrorGasto();

  mostrarConfigPresupuesto();
}
