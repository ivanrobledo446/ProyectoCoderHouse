let presupuesto = 0;
let gastos = [];
let gastoEditandoId = null;
let graficoGastos = null;

const CATEGORIAS = [];

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
const selectFiltroCategoria = document.getElementById('filtro-categoria');
const btnGuardarGasto = document.getElementById('btn-guardar-gasto');
const tituloFormGasto = document.getElementById('titulo-form-gasto');
const tabAgregarGasto = document.getElementById('tab-agregar-gasto');
const tabGraficos = document.getElementById('tab-graficos');
const vistaGastos = document.getElementById('vista-gastos');
const vistaGraficos = document.getElementById('vista-graficos');
const canvasGraficoGastos = document.getElementById('grafico-gastos');

/* -------- Referencias DOM - Formulario de gastos -------- */
const formGasto = document.getElementById('form-gasto');
const inputFechaGasto = document.getElementById('gasto-fecha');
const selectCategoriaGasto = document.getElementById('gasto-categoria');
const inputDescripcionGasto = document.getElementById('gasto-descripcion');
const inputCantidadGasto = document.getElementById('gasto-cantidad');

/* -------- Referencias DOM - Tabla de gastos -------- */
const tbodyGastos = document.getElementById('tbody-gastos');

async function initApp() {
  cargarDatosDesdeStorage();
  configurarEventos();
  await cargarCategoriasDesdeJSON();

  if (presupuesto > 0) {
    mostrarPlanificador();
    actualizarResumen();
    renderizarGastos();
    actualizarGraficoGastos();
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

  if (selectFiltroCategoria) {
    selectFiltroCategoria.addEventListener('change', () => {
      renderizarGastos();
    });
  }

  if (tabAgregarGasto && tabGraficos) {
    tabAgregarGasto.addEventListener('click', mostrarVistaGastos);
    tabGraficos.addEventListener('click', mostrarVistaGraficos);
  }

  btnReset.addEventListener('click', confirmarResetApp);
}

function confirmarResetApp() {
  Swal.fire({
    title: '¿Resetear la aplicación?',
    text: 'Se va a borrar el presupuesto y todos los gastos registrados.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, resetear',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
  }).then((result) => {
    if (result.isConfirmed) {
      resetearApp();
      mostrarToastSuccess('Aplicación reseteada correctamente');
    }
  });
}

function mostrarConfigPresupuesto() {
  sectionConfigPresupuesto.hidden = false;
  sectionPlanificador.hidden = true;
}

function mostrarPlanificador() {
  sectionConfigPresupuesto.hidden = true;
  sectionPlanificador.hidden = false;
  setFechaHoyPorDefecto();
  mostrarVistaGastos();
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
    mostrarToastError('Presupuesto inválido');
    return;
  }

  numero = Number(numero.toFixed(2));

  presupuesto = numero;
  localStorage.setItem('presupuesto', presupuesto.toString());

  limpiarErrorPresupuesto();

  inputPresupuesto.value = presupuesto.toFixed(2);

  mostrarToastSuccess('Presupuesto guardado correctamente');
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
    mostrarToastError('Completar todos los campos con valores válidos');
    return;
  }

  cantidad = Number(cantidad.toFixed(2));

  const estaEditando = gastoEditandoId !== null;
  let gastoOriginal = null;

  if (estaEditando) {
    gastoOriginal = gastos.find((g) => g.id === gastoEditandoId);
  }

  const disponibleBase = obtenerDisponibleActual();

  const maximoPermitido =
    estaEditando && gastoOriginal
      ? disponibleBase + gastoOriginal.cantidad
      : disponibleBase;

  if (cantidad > maximoPermitido) {
    mostrarToastError('No podés registrar un gasto mayor al disponible');
    return;
  }

  if (estaEditando && gastoOriginal) {
    gastoOriginal.fecha = fecha;
    gastoOriginal.categoria = categoria;
    gastoOriginal.descripcion = descripcion;
    gastoOriginal.cantidad = cantidad;
  } else {
    const nuevoGasto = crearObjetoGasto(
      fecha,
      categoria,
      descripcion,
      cantidad
    );
    gastos.push(nuevoGasto);
  }

  guardarGastosEnStorage();
  actualizarResumen();
  renderizarGastos();
  actualizarGraficoGastos();
  if (estaEditando && gastoOriginal) {
    mostrarToastSuccess('Gasto actualizado correctamente');
  } else {
    mostrarToastSuccess('Gasto agregado correctamente');
  }

  formGasto.reset();
  setFechaHoyPorDefecto();
  gastoEditandoId = null;
  if (btnGuardarGasto) {
    btnGuardarGasto.textContent = 'Agregar gasto';
  }
  if (tituloFormGasto) {
    tituloFormGasto.textContent = 'Registrar nuevo gasto';
  }
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

function setFechaHoyPorDefecto() {
  if (!inputFechaGasto) return;

  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');

  inputFechaGasto.value = `${year}-${month}-${day}`;
}

function renderizarGastos() {
  tbodyGastos.innerHTML = '';

  if (!Array.isArray(gastos) || gastos.length === 0) {
    return;
  }

  let gastosAMostrar = gastos;
  if (selectFiltroCategoria && selectFiltroCategoria.value) {
    const categoriaSeleccionada = selectFiltroCategoria.value;
    gastosAMostrar = gastos.filter(
      (gasto) => gasto.categoria === categoriaSeleccionada
    );
  }

  gastosAMostrar.forEach((gasto) => {
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

    const btnEditar = document.createElement('button');
    btnEditar.textContent = 'Editar';
    btnEditar.classList.add('btn-editar');
    btnEditar.addEventListener('click', () => iniciarEdicionGasto(gasto.id));

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = 'Eliminar';
    btnEliminar.classList.add('btn-eliminar');
    btnEliminar.addEventListener('click', () => eliminarGasto(gasto.id));

    tdAcciones.appendChild(btnEditar);
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
  if (gastoEditandoId === id) {
    gastoEditandoId = null;
    formGasto.reset();
    setFechaHoyPorDefecto();
    if (btnGuardarGasto) {
      btnGuardarGasto.textContent = 'Agregar gasto';
    }
    if (tituloFormGasto) {
      tituloFormGasto.textContent = 'Registrar nuevo gasto';
    }
  }

  gastos = gastos.filter((gasto) => gasto.id !== id);
  guardarGastosEnStorage();
  actualizarResumen();
  renderizarGastos();
  actualizarGraficoGastos();
  mostrarToastSuccess('Gasto eliminado correctamente');
}

function cargarCategorias() {
  if (!selectCategoriaGasto) return;

  selectCategoriaGasto.innerHTML =
    '<option value="">Selecciona una categoría</option>';

  CATEGORIAS.forEach((categoria) => {
    const option = document.createElement('option');
    option.value = categoria.value;
    option.textContent = categoria.label;
    selectCategoriaGasto.appendChild(option);
  });
}

function cargarCategoriasFiltro() {
  if (!selectFiltroCategoria) return;

  selectFiltroCategoria.innerHTML =
    '<option value="">Todas las categorías</option>';

  CATEGORIAS.forEach((categoria) => {
    const option = document.createElement('option');
    option.value = categoria.value;
    option.textContent = categoria.label;
    selectFiltroCategoria.appendChild(option);
  });
}

async function cargarCategoriasDesdeJSON() {
  try {
    const response = await fetch('data/categorias.json');

    if (!response.ok) {
      throw new Error('Error al cargar categorías');
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      data.forEach((categoria) => {
        CATEGORIAS.push(categoria);
      });
    }
  } catch (error) {
    mostrarToastError('No se pudieron cargar las categorías.');
  } finally {
    cargarCategorias();
    cargarCategoriasFiltro();
  }
}

function iniciarEdicionGasto(id) {
  const gasto = gastos.find((g) => g.id === id);
  if (!gasto) return;

  gastoEditandoId = id;

  inputFechaGasto.value = gasto.fecha;
  selectCategoriaGasto.value = gasto.categoria;
  inputDescripcionGasto.value = gasto.descripcion;
  inputCantidadGasto.value = gasto.cantidad.toFixed(2);

  if (btnGuardarGasto) {
    btnGuardarGasto.textContent = 'Guardar cambios';
  }
  if (tituloFormGasto) {
    tituloFormGasto.textContent = 'Editar gasto';
  }

  inputDescripcionGasto.focus();
}

function mostrarVistaGastos() {
  if (vistaGastos) vistaGastos.hidden = false;
  if (vistaGraficos) vistaGraficos.hidden = true;

  if (tabAgregarGasto) tabAgregarGasto.classList.add('tab-button--active');
  if (tabGraficos) tabGraficos.classList.remove('tab-button--active');
}

function mostrarVistaGraficos() {
  if (vistaGastos) vistaGastos.hidden = true;
  if (vistaGraficos) vistaGraficos.hidden = false;

  if (tabAgregarGasto) tabAgregarGasto.classList.remove('tab-button--active');
  if (tabGraficos) tabGraficos.classList.add('tab-button--active');

  actualizarGraficoGastos();
}


/* -------- Gráficos (Chart.js) -------- */

function obtenerTotalesPorCategoria() {
  const totales = {};

  gastos.forEach((gasto) => {
    if (!totales[gasto.categoria]) {
      totales[gasto.categoria] = 0;
    }
    totales[gasto.categoria] += gasto.cantidad;
  });

  return totales;
}

function actualizarGraficoGastos() {
  if (!canvasGraficoGastos || typeof Chart === 'undefined') {
    return;
  }

  const totales = obtenerTotalesPorCategoria();

  const labels = [];
  const data = [];

  // Usamos las categorías cargadas desde el JSON
  CATEGORIAS.forEach((categoria) => {
    const totalCat = totales[categoria.value] || 0;
    if (totalCat > 0) {
      labels.push(categoria.label);
      data.push(totalCat);
    }
  });

  // Si no hay datos, destruimos el gráfico existente y salimos
  if (labels.length === 0) {
    if (graficoGastos) {
      graficoGastos.destroy();
      graficoGastos = null;
    }
    return;
  }

  const ctx = canvasGraficoGastos.getContext('2d');

  if (graficoGastos) {
    graficoGastos.destroy();
  }

  graficoGastos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#3b82f6',
            '#f97316',
            '#10b981',
            '#eab308',
            '#6366f1',
            '#ec4899'
          ]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
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

function obtenerDisponibleActual() {
  const totalGastado = calcularTotalGastado();
  return presupuesto - totalGastado;
}

/* -------- Resetear APP -------- */
function resetearApp() {
  localStorage.removeItem('presupuesto');
  localStorage.removeItem('gastos');

  presupuesto = 0;
  gastos = [];
  gastoEditandoId = null;

  inputPresupuesto.value = '0';
  actualizarResumen();
  tbodyGastos.innerHTML = '';
  actualizarGraficoGastos();
  limpiarErrorPresupuesto();

  if (btnGuardarGasto) {
    btnGuardarGasto.textContent = 'Agregar gasto';
  }
  if (tituloFormGasto) {
    tituloFormGasto.textContent = 'Registrar nuevo gasto';
  }

  mostrarConfigPresupuesto();
}

/* -------- Librerias -------- */

function mostrarToast(mensaje, tipo = 'info') {
  let background = '#2563eb'; // azul por defecto

  if (tipo === 'error') {
    background = '#ef4444'; // rojo
  } else if (tipo === 'success') {
    background = '#16a34a'; // verde
  } else if (tipo === 'warning') {
    background = '#f59e0b'; // naranja
  }

  Toastify({
    text: mensaje,
    duration: 3000,
    close: true,
    gravity: 'top', // top o bottom
    position: 'right', // left, center o right
    stopOnFocus: true,
    style: {
      background,
    },
  }).showToast();
}

function mostrarToastError(mensaje) {
  mostrarToast(mensaje, 'error');
}

function mostrarToastSuccess(mensaje) {
  mostrarToast(mensaje, 'success');
}
