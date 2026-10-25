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
 * @route   GET /api/historial
 * @desc    Retorna historial de auditoría y movimientos con filtros opcionales (RF-10 / HU-07)
 */
app.get('/api/historial', parqueaderoCtrl.obtenerHistorial);

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
        error: 'Ruta API no encontrada en el servidor'
    });
});

// Iniciar Servidor
const server = app.listen(PORT, () => {
    const persistenciaActual = parqueaderoCtrl.controlador.modoPersistencia;
    console.log('================================================================');
    console.log('   🅿️  PARQUEADERO AUTOS COLOMBIA - SISTEMA DE GESTIÓN OPERATIVA');
    console.log('       Iteración 1: Módulos de Entrada, Salida, Celdas y Caja   ');
    console.log('================================================================');
    console.log(` Servidor HTTP Express en línea: http://localhost:${PORT}`);
    console.log(` Modo de Persistencia Activo    : [${persistenciaActual}]`);
    console.log(` Capacidad Total Monitoreada   : 50 Celdas (20 Autos / 30 Motos)`);
    console.log(' Frontend SPA servido en raíz    : http://localhost:' + PORT + '/');
    console.log('================================================================\n');
});

module.exports = { app, server };
