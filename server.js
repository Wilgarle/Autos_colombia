/**
 * ============================================================================
 * SISTEMA DE GESTIÓN OPERATIVA - PARQUEADERO AUTOS COLOMBIA (Iteración 1)
 * Servidor Web Principal (Express API REST + SPA)
 * Arquitectura: MVC Cliente-Servidor (Presentación, Controladores, Dominio)
 * ============================================================================
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

// Importar controlador y handlers de parqueadero
const parqueaderoCtrl = require('./src/controladores/parqueadero.controller');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del proyecto (index.html, assets, docs)
app.use(express.static(__dirname));

// ============================================================================
// RUTAS API REST (Endpoints Operativos del Sistema)
// ============================================================================

/**
 * @route   GET /api/estado
 * @desc    Obtiene el estado unificado del sistema (clientes, 50 celdas, movimientos en patio y bitácora)
 */
app.get('/api/estado', parqueaderoCtrl.obtenerEstado);

/**
 * @route   POST /api/movimientos/entrada
 * @desc    Valida placa y vigencia (RF-01), asigna celda (RF-02), registra ingreso (RF-03) y emite ticket (RF-04)
 */
app.post('/api/movimientos/entrada', parqueaderoCtrl.registrarEntrada);

/**
 * @route   POST /api/movimientos/salida
 * @desc    Valida vehículo en patio (RF-07), registra salida (RF-08), libera celda a DISPONIBLE (RF-09)
 */
app.post('/api/movimientos/salida', parqueaderoCtrl.registrarSalida);

/**
 * @route   POST /api/movimientos/novedad
 * @desc    Anexa novedad física inmutable a un vehículo estacionado en patio (HU-05)
 */
app.post('/api/movimientos/novedad', parqueaderoCtrl.registrarNovedad);

/**
 * @route   POST /api/pagos
 * @desc    Registra pago de mensualidad (RF-06), actualiza vigencia a PAZ Y SALVO y emite comprobante (HU-04)
 */
app.post('/api/pagos', parqueaderoCtrl.registrarPago);

/**
 * @route   POST /api/clientes
 * @desc    Vincula un nuevo suscriptor al padrón de mensualidades
 */
app.post('/api/clientes', parqueaderoCtrl.registrarCliente);

/**
 * @route   POST /api/pagos/vincular
 * @desc    Alta de suscriptor desde Administración con validación de placa/documento únicos (Iteración 2: RF-01, RF-02)
 */
app.post('/api/pagos/vincular', parqueaderoCtrl.vincularCliente);

/**
 * @route   GET /api/historial
 * @desc    Retorna historial de auditoría y movimientos con filtros opcionales (RF-10 / HU-07)
 */
app.get('/api/historial', parqueaderoCtrl.obtenerHistorial);

// ============================================================================
// RUTAS DE AUTENTICACIÓN Y ADMINISTRACIÓN (Control Multi-Rol)
// ============================================================================

/**
 * @route   POST /api/auth/login
 * @desc    Autentica usuario bajo rol Administrador u Operador
 */
app.post('/api/auth/login', parqueaderoCtrl.login);

/**
 * @route   GET /api/admin/metricas
 * @desc    Obtiene KPIs financieros y operativos para el Dashboard de Administrador
 */
app.get('/api/admin/metricas', parqueaderoCtrl.obtenerMetricasAdmin);

/**
 * @route   PUT /api/admin/usuarios/:placa
 * @desc    Actualiza los datos de un suscriptor existente (CRUD Administrador)
 */
app.put('/api/admin/usuarios/:placa', parqueaderoCtrl.editarCliente);

/**
 * @route   DELETE /api/admin/usuarios/:placa
 * @desc    Remueve un suscriptor del sistema si no está en patio (CRUD Administrador)
 */
app.delete('/api/admin/usuarios/:placa', parqueaderoCtrl.eliminarCliente);

// ============================================================================
// RUTAS DE GESTIÓN DE EMPLEADOS Y USUARIOS (CRUD ADMINISTRADOR)
// ============================================================================

/**
 * @route   GET /api/admin/empleados
 * @desc    Obtiene el directorio de empleados con filtros por rol y estado
 */
app.get('/api/admin/empleados', parqueaderoCtrl.obtenerEmpleados);

/**
 * @route   POST /api/admin/empleados
 * @desc    Crea una nueva cuenta de empleado con rol Administrador u Operador
 */
app.post('/api/admin/empleados', parqueaderoCtrl.crearEmpleado);

/**
 * @route   PUT /api/admin/empleados/:id
 * @desc    Actualiza información, cargo, rol o credenciales de un empleado
 */
app.put('/api/admin/empleados/:id', parqueaderoCtrl.editarEmpleado);

/**
 * @route   PATCH /api/admin/empleados/:id/permisos
 * @desc    Revoca o restablece permisos de acceso al sistema para un empleado
 */
app.patch('/api/admin/empleados/:id/permisos', parqueaderoCtrl.cambiarPermisosEmpleado);

/**
 * @route   DELETE /api/admin/empleados/:id
 * @desc    Elimina la cuenta de un empleado del sistema
 */
app.delete('/api/admin/empleados/:id', parqueaderoCtrl.eliminarEmpleado);

// ============================================================================
// RUTAS DE GESTIÓN DE LAS 50 CELDAS (ITERACIÓN 2: RF-06 a RF-10)
// ============================================================================

/**
 * @route   GET /api/celdas
 * @desc    Catálogo de las 50 celdas con su estado (DISPONIBLE / OCUPADA / MANTENIMIENTO)
 */
app.get('/api/celdas', parqueaderoCtrl.listarCeldas);

/**
 * @route   POST /api/celdas/reubicar
 * @desc    Traslada un vehículo a otra celda DISPONIBLE del mismo tipo conservando el ticket (RF-09)
 */
app.post('/api/celdas/reubicar', parqueaderoCtrl.reubicarVehiculo);

/**
 * @route   GET /api/celdas/:codigo
 * @desc    Detalle de una celda: ocupante, ticket activo, motivo de mantenimiento e historial (RF-10)
 */
app.get('/api/celdas/:codigo', parqueaderoCtrl.detalleCelda);

/**
 * @route   PATCH /api/celdas/:codigo/mantenimiento
 * @desc    Bloquea (MANTENIMIENTO) o rehabilita (DISPONIBLE) una celda libre (RF-08)
 */
app.patch('/api/celdas/:codigo/mantenimiento', parqueaderoCtrl.cambiarMantenimientoCelda);

// ============================================================================
// RUTA RAÍZ SPA
// ============================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejador 404 para endpoints API desconocidos
app.use('/api/*', (req, res) => {
    res.status(404).json({
        ok: false,
        error: 'Ruta API no encontrada en el servidor',
        mensaje: 'Ruta API no encontrada en el servidor'
    });
});

// Manejador de errores (p. ej. JSON malformado) con contrato JSON uniforme
app.use((err, req, res, next) => {
    const codigo = err.status || err.statusCode || 500;
    const mensaje = codigo === 400 ? 'Solicitud con formato JSON no válido.' : (err.message || 'Error interno del servidor');
    res.status(codigo).json({ ok: false, error: mensaje, mensaje });
});

// Iniciar Servidor (solo cuando se ejecuta directamente: `node server.js` / `npm start`)
function iniciarServidor(puerto = PORT) {
    const instancia = app.listen(puerto, () => {
        const addr = instancia.address();
        const puertoActivo = (addr && typeof addr === 'object' && addr.port) ? addr.port : puerto;
        const persistenciaActual = parqueaderoCtrl.controlador.modoPersistencia;
        console.log('================================================================');
        console.log('   🅿️  PARQUEADERO AUTOS COLOMBIA - SISTEMA DE GESTIÓN OPERATIVA');
        console.log('       Control de Portería, Patio, Caja, Usuarios y Auditoría   ');
        console.log('================================================================');
        console.log(` Servidor HTTP Express en línea: http://localhost:${puertoActivo}`);
        console.log(` Modo de Persistencia Activo    : [${persistenciaActual}]`);
        console.log(` Capacidad Total Monitoreada   : 50 Celdas (20 Autos / 30 Motos)`);
        console.log(' Frontend SPA servido en raíz    : http://localhost:' + puertoActivo + '/');
        console.log('================================================================\n');
    });
    return instancia;
}

let server = null;
if (require.main === module) {
    server = iniciarServidor();
}

module.exports = { app, server, iniciarServidor };
