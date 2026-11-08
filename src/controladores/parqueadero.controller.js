/**
 * ============================================================================
 * SISTEMA DE GESTIÓN OPERATIVA - PARQUEADERO AUTOS COLOMBIA
 * Controlador Principal: ControladorParqueadero
 * Paquete: com.autoscolombia.logica.controladores
 * 
 * Implementa la lógica de orquestación, validación y persistencia híbrida
 * inteligente (MySQL 8.0+ / Repositorio en Memoria reactivo).
 * ============================================================================
 */

require('dotenv').config();
const { Usuario, Vehiculo, Celda, Movimiento, Pago, Empleado } = require('../dominio/modelos');

// Intentar cargar mysql2 de forma segura
let mysql = null;
try {
    mysql = require('mysql2/promise');
} catch (e) {
    mysql = null;
}

class ControladorParqueadero {
    constructor() {
        this.operarioEnSesion = 'Carlos Ríos';
        this.rolActivo = 'Operario de Portería / Cajero';
        this.totalCeldasAutos = 20;
        this.totalCeldasMotos = 30;

        // Estado del motor de persistencia
        this.modoPersistencia = 'MEMORIA'; // 'MYSQL' o 'MEMORIA'
        this.poolMySQL = null;
        this.consecutivoTransaccion = 1044;

        // Repositorio en Memoria reactivo (Pre-cargado idéntico a index.html)
        this.padronClientes = [];
        this.padronEmpleados = [];
        this.inventarioCeldas = [];
        this.movimientosActivos = [];
        this.eventosAuditoria = [];
        this.ultimoComprobante = null;

        // Inicializar datos en memoria
        this.inicializarRepositorioMemoria();

        // Intentar autoconexión a MySQL sin bloquear la ejecución
        this.inicializarPersistenciaMySQL();
    }

    /**
     * Autentica la sesión de un operario (CU-01)
     * @param {string} usuario
     * @param {string} clave
     * @returns {boolean}
     */
    autenticarSesion(usuario, clave) {
        if (usuario && clave) {
            this.operarioEnSesion = usuario;
            return true;
        }
        return false;
    }

    /**
     * Helper para obtener la fecha y hora estándar formateada
     */
    obtenerFechaHoraActual() {
        const ahora = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = ahora.getFullYear();
        const mm = pad(ahora.getMonth() + 1);
        const dd = pad(ahora.getDate());
        const hh = pad(ahora.getHours());
        const min = pad(ahora.getMinutes());
        const ss = pad(ahora.getSeconds());
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    /**
     * Inicializa los datos en memoria reflejando el padrón, celdas y movimientos iniciales
     */
    inicializarRepositorioMemoria() {
        // 1. Padrón de clientes suscriptores
        this.padronClientes = [
            {
                placa: 'ENV-774',
                titular: 'Carlos Andrés Mejía',
                documento: 'CC 1037612890',
                tipo: 'Automóvil',
                estado: 'ACTIVA',
                vencimiento: '2026-11-15',
                tarifa: 180000,
                enPatio: true,
                celdaActual: 'A-01'
            },
            {
                placa: 'KLM-452',
                titular: 'Laura Sofía Gómez',
                documento: 'CC 1017234981',
                tipo: 'Automóvil',
                estado: 'ACTIVA',
                vencimiento: '2026-11-10',
                tarifa: 180000,
                enPatio: false,
                celdaActual: null
            },
            {
                placa: 'BGT-891',
                titular: 'Jorge Iván Restrepo',
                documento: 'CC 71345902',
                tipo: 'Automóvil',
                estado: 'EN MORA',
                vencimiento: '2026-10-05',
                tarifa: 180000,
                enPatio: false,
                celdaActual: null
            },
            {
                placa: 'XRT-94D',
                titular: 'Mateo Cano Valencia',
                documento: 'CC 1040751239',
                tipo: 'Motocicleta',
                estado: 'ACTIVA',
                vencimiento: '2026-11-20',
                tarifa: 95000,
                enPatio: true,
                celdaActual: 'M-01'
            },
            {
                placa: 'ZPL-12F',
                titular: 'Diana Marcela Ríos',
                documento: 'CC 43987123',
                tipo: 'Motocicleta',
                estado: 'ACTIVA',
                vencimiento: '2026-11-18',
                tarifa: 95000,
                enPatio: false,
                celdaActual: null
            },
            {
                placa: 'MDE-305',
                titular: 'Santiago Montoya',
                documento: 'CC 1036945112',
                tipo: 'Automóvil',
                estado: 'ACTIVA',
                vencimiento: '2026-11-12',
                tarifa: 180000,
                enPatio: true,
                celdaActual: 'A-02'
            },
            {
                placa: 'QWE-88A',
                titular: 'Andrés Felipe Duque',
                documento: 'CC 1020456789',
                tipo: 'Motocicleta',
                estado: 'EN MORA',
                vencimiento: '2026-10-12',
                tarifa: 95000,
                enPatio: false,
                celdaActual: null
            }
        ];

        // 2. 50 Celdas (20 Automóviles y 30 Motocicletas)
        this.inventarioCeldas = [];
        for (let i = 1; i <= 20; i++) {
            const codigo = `A-${String(i).padStart(2, '0')}`;
            let ocupante = null;
            let motivo = null;
            if (codigo === 'A-01') ocupante = 'ENV-774';
            if (codigo === 'A-02') ocupante = 'MDE-305';
            if (codigo === 'A-04') motivo = 'Demarcación de pintura epóxica y tope llanta.';
            this.inventarioCeldas.push(new Celda(
                codigo,
                'Automóvil',
                ocupante ? 'OCUPADA' : (motivo ? 'MANTENIMIENTO' : 'DISPONIBLE'),
                ocupante,
                motivo
            ));
        }
        for (let i = 1; i <= 30; i++) {
            const codigo = `M-${String(i).padStart(2, '0')}`;
            let ocupante = null;
            let motivo = null;
            if (codigo === 'M-01') ocupante = 'XRT-94D';
            if (codigo === 'M-05') motivo = 'Revisión de anclaje metálico y luminaria.';
            this.inventarioCeldas.push(new Celda(
                codigo,
                'Motocicleta',
                ocupante ? 'OCUPADA' : (motivo ? 'MANTENIMIENTO' : 'DISPONIBLE'),
                ocupante,
                motivo
            ));
        }

        // 3. Movimientos activos en patio
        this.movimientosActivos = [
            new Movimiento(
                'TRX-2026-1041',
                'ENV-774',
                'A-01',
                '2026-10-24 07:45:10',
                null,
                '2026-10-24 07:45 — Ingreso: Rayón superficial previo en puerta trasera derecha.',
                'EN_PATIO',
                this.operarioEnSesion,
                {
                    titular: 'Carlos Andrés Mejía',
                    documento: 'CC 1037612890',
                    tipo: 'Automóvil',
                    permanencia: '07h 50m',
                    novedades: ['2026-10-24 07:45 — Ingreso: Rayón superficial previo en puerta trasera derecha.']
                }
            ),
            new Movimiento(
                'TRX-2026-1042',
                'XRT-94D',
                'M-01',
                '2026-10-24 08:20:00',
                null,
                '2026-10-24 08:20 — Ingreso: Deja casco abatible negro asegurado en soporte.',
                'EN_PATIO',
                this.operarioEnSesion,
                {
                    titular: 'Mateo Cano Valencia',
                    documento: 'CC 1040751239',
                    tipo: 'Motocicleta',
                    permanencia: '07h 15m',
                    novedades: ['2026-10-24 08:20 — Ingreso: Deja casco abatible negro asegurado en soporte.']
                }
            ),
            new Movimiento(
                'TRX-2026-1043',
                'MDE-305',
                'A-02',
                '2026-10-24 09:10:25',
                null,
                '2026-10-24 09:10 — Ingreso: Vehículo ingresa sin novedades físicas.',
                'EN_PATIO',
                this.operarioEnSesion,
                {
                    titular: 'Santiago Montoya',
                    documento: 'CC 1036945112',
                    tipo: 'Automóvil',
                    permanencia: '06h 25m',
                    novedades: ['2026-10-24 09:10 — Ingreso: Vehículo ingresa sin novedades físicas.']
                }
            )
        ];

        this.ultimoComprobante = this.movimientosActivos[this.movimientosActivos.length - 1];

        // 4. Bitácora de auditoría inmutable (RNF-05)
        this.eventosAuditoria = [
            {
                codigo: 'TRX-2026-1043',
                fecha: '2026-10-24 09:10:25',
                tipo: 'INGRESO',
                modulo: 'Portería',
                placaCelda: 'MDE-305 • A-02',
                descripcion: 'Entrada vehicular registrada. Asignación de celda A-02 a Santiago Montoya.',
                operario: this.operarioEnSesion
            },
            {
                codigo: 'TRX-2026-1042',
                fecha: '2026-10-24 08:20:00',
                tipo: 'INGRESO',
                modulo: 'Portería',
                placaCelda: 'XRT-94D • M-01',
                descripcion: 'Entrada de motocicleta registrada en celda M-01. Observación: Casco en soporte.',
                operario: this.operarioEnSesion
            },
            {
                codigo: 'TRX-2026-1041',
                fecha: '2026-10-24 07:45:10',
                tipo: 'NOVEDAD',
                modulo: 'Portería',
                placaCelda: 'ENV-774 • A-01',
                descripcion: 'Acta de ingreso con novedad física: Rayón superficial previo en puerta trasera derecha.',
                operario: this.operarioEnSesion
            },
            {
                codigo: 'TRX-2026-1040',
                fecha: '2026-10-24 07:30:12',
                tipo: 'BLOQUEO',
                modulo: 'Portería',
                placaCelda: 'BGT-891 • N/A',
                descripcion: 'Bloqueo automático de ingreso por mensualidad vencida (Titular: Jorge Iván Restrepo).',
                operario: this.operarioEnSesion
            },
            {
                codigo: 'RC-2026-0891',
                fecha: '2026-10-24 07:15:00',
                tipo: 'PAGO',
                modulo: 'Caja',
                placaCelda: 'KLM-452 • Mensualidad',
                descripcion: 'Pago de mensualidad por $180.000 COP (Transferencia PSE). Vigencia hasta 2026-11-10.',
                operario: this.operarioEnSesion
            }
        ];

        // 5. Directorio General de Empleados y Cuentas de Acceso al Sistema
        this.padronEmpleados = [
            {
                id: 'EMP-001',
                nombre: 'Dra. Patricia Gómez',
                documento: 'CC 43210987',
                telefono: '310 456 7890',
                correo: 'admin@autoscolombia.com',
                clave: 'admin123',
                cargo: 'Administradora General',
                rol: 'ADMINISTRADOR',
                estado: 'ACTIVO',
                fechaCreacion: '2026-01-15'
            },
            {
                id: 'EMP-002',
                nombre: 'Carlos Ríos',
                documento: 'CC 1020456123',
                telefono: '312 876 5432',
                correo: 'operario@autoscolombia.com',
                clave: 'operario123',
                cargo: 'Operador de Portería Principal',
                rol: 'OPERADOR',
                estado: 'ACTIVO',
                fechaCreacion: '2026-02-01'
            },
            {
                id: 'EMP-003',
                nombre: 'Alejandra Morales',
                documento: 'CC 1037549812',
                telefono: '301 234 5678',
                correo: 'alejandra.caja@autoscolombia.com',
                clave: 'caja123',
                cargo: 'Cajera y Atención a Suscriptores',
                rol: 'OPERADOR',
                estado: 'ACTIVO',
                fechaCreacion: '2026-03-10'
            },
            {
                id: 'EMP-004',
                nombre: 'Ing. Fernando Ospina',
                documento: 'CC 71298456',
                telefono: '315 789 0123',
                correo: 'fernando.admin@autoscolombia.com',
                clave: 'admin456',
                cargo: 'Supervisor de Operaciones y Auditoría',
                rol: 'ADMINISTRADOR',
                estado: 'ACTIVO',
                fechaCreacion: '2026-04-05'
            },
            {
                id: 'EMP-005',
                nombre: 'Julián Torres',
                documento: 'CC 1040321654',
                telefono: '318 654 9870',
                correo: 'julian.seguridad@autoscolombia.com',
                clave: 'julian123',
                cargo: 'Auxiliar de Patio (Licencia)',
                rol: 'OPERADOR',
                estado: 'REVOCADO',
                fechaCreacion: '2026-05-20'
            }
        ].map((datos) => new Empleado(datos));
    }

    /**
     * Intenta establecer conexión con MySQL. Si no está disponible o falla,
     * conmuta silenciosamente al repositorio en memoria con cero fricción.
     */
    async inicializarPersistenciaMySQL() {
        if (!mysql) {
            this.modoPersistencia = 'MEMORIA';
            return;
        }

        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'autos_colombia_db',
            waitForConnections: true,
            connectionLimit: 5,
            connectTimeout: 2000
        };

        try {
            const pool = mysql.createPool(config);
            const connection = await pool.getConnection();
            connection.release();
            this.poolMySQL = pool;
            this.modoPersistencia = 'MYSQL';
            console.log(' [ControladorParqueadero] Conexión establecida con MySQL (autos_colombia_db).');
            await this.sincronizarSemillaMySQL();
        } catch (err) {
            this.modoPersistencia = 'MEMORIA';
            this.poolMySQL = null;
            console.log('ℹ️  [ControladorParqueadero] MySQL no disponible localmente (' + err.code + ').');
            console.log('⚡ [Persistencia Híbrida] Operando en Modo MEMORIA REACTIVA pre-cargada con Cero Fricción.');
        }
    }

    // ========================================================================
    // PERSISTENCIA MYSQL (write-through opcional)
    // ========================================================================

    /**
     * Ejecuta una tarea de persistencia MySQL sin bloquear la respuesta HTTP.
     * Si el modo activo es MEMORIA no hace nada; si MySQL falla solo registra un aviso.
     * @param {function(Object): Promise<void>} tarea - Recibe el pool de conexiones
     */
    persistir(tarea) {
        if (this.modoPersistencia !== 'MYSQL' || !this.poolMySQL) return;
        Promise.resolve()
            .then(() => tarea(this.poolMySQL))
            .catch((e) => console.warn('⚠️  Aviso persistencia MySQL:', e.message));
    }

    /** Clave de documento en BD: solo dígitos (ej. 'CC 1037612890' -> '1037612890'). */
    _docDb(doc) {
        const digitos = String(doc || '').replace(/[^0-9]/g, '');
        return (digitos || String(doc || '').trim()).slice(0, 20);
    }

    _tipoDb(tipo) {
        return String(tipo || '').toUpperCase().includes('MOTO') ? 'MOTO' : 'AUTO';
    }

    _medioPagoDb(medio) {
        const m = String(medio || '').toUpperCase();
        if (m.includes('EFECTIVO')) return 'EFECTIVO';
        if (m.includes('TARJETA')) return 'TARJETA';
        return 'TRANSFERENCIA';
    }

    async _dbUpsertSuscriptor(pool, cliente) {
        const doc = this._docDb(cliente.documento);
        await pool.query(
            `INSERT INTO usuarios (documento_id, nombres_apellidos, telefono_contacto, estado_mensualidad, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nombres_apellidos = VALUES(nombres_apellidos),
                 telefono_contacto = VALUES(telefono_contacto),
                 estado_mensualidad = VALUES(estado_mensualidad),
                 fecha_vencimiento = VALUES(fecha_vencimiento)`,
            [
                doc,
                cliente.titular,
                String(cliente.telefono || 'N/A').slice(0, 15),
                cliente.estado === 'ACTIVA' ? 'ACTIVO' : 'MORA',
                cliente.vencimiento
            ]
        );
        await pool.query(
            `INSERT INTO vehiculos (placa, documento_id, tipo_vehiculo, marca_color)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE documento_id = VALUES(documento_id),
                 tipo_vehiculo = VALUES(tipo_vehiculo),
                 marca_color = VALUES(marca_color)`,
            [cliente.placa, doc, this._tipoDb(cliente.tipo), String(cliente.marcaColor || 'No especificado').slice(0, 60)]
        );
    }

    async _dbEliminarSuscriptor(pool, cliente) {
        try {
            await pool.query('DELETE FROM vehiculos WHERE placa = ?', [cliente.placa]);
            const doc = this._docDb(cliente.documento);
            await pool.query(
                `DELETE FROM usuarios WHERE documento_id = ?
                   AND NOT EXISTS (SELECT 1 FROM vehiculos WHERE documento_id = ?)
                   AND NOT EXISTS (SELECT 1 FROM pagos WHERE documento_id = ?)`,
                [doc, doc, doc]
            );
        } catch (e) {
            // La integridad referencial (RESTRICT) conserva el historial transaccional del titular
            console.warn(`⚠️  Suscriptor ${cliente.placa} conservado en MySQL por historial transaccional: ${e.message}`);
        }
    }

    async _dbActualizarCelda(pool, celda) {
        await pool.query(
            'UPDATE celdas SET estado_ocupacion = ?, motivo_mantenimiento = ? WHERE codigo_celda = ?',
            [celda.estadoOcupacion, celda.motivoMantenimiento || null, celda.codigoCelda]
        );
    }

    /** Reubicación en una sola transacción ACID (RF-09). */
    async _dbReubicar(pool, origen, destino, mov) {
        const conexion = await pool.getConnection();
        try {
            await conexion.beginTransaction();
            await conexion.query(
                `UPDATE movimientos SET codigo_celda = ?, novedad_operativa = ?
                 WHERE id_ticket = ? AND estado_movimiento = 'EN_PATIO'`,
                [destino.codigoCelda, String(mov.novedadOperativa || '').slice(0, 255), mov.idTicket]
            );
            await conexion.query(
                `UPDATE celdas SET estado_ocupacion = 'DISPONIBLE', motivo_mantenimiento = NULL WHERE codigo_celda = ?`,
                [origen.codigoCelda]
            );
            await conexion.query(
                `UPDATE celdas SET estado_ocupacion = 'OCUPADA', motivo_mantenimiento = NULL WHERE codigo_celda = ?`,
                [destino.codigoCelda]
            );
            await conexion.commit();
        } catch (e) {
            await conexion.rollback();
            throw e;
        } finally {
            conexion.release();
        }
    }

    async _dbUpsertEmpleado(pool, e) {
        await pool.query(
            `INSERT INTO empleados (id_empleado, nombre, documento, telefono, correo, clave, cargo, rol, estado, fecha_creacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), documento = VALUES(documento),
                 telefono = VALUES(telefono), correo = VALUES(correo), clave = VALUES(clave),
                 cargo = VALUES(cargo), rol = VALUES(rol), estado = VALUES(estado)`,
            [e.id, e.nombre, e.documento, e.telefono || '', e.correo, e.clave, e.cargo, e.rol, e.estado, e.fechaCreacion]
        );
    }

    async _dbEliminarEmpleado(pool, e) {
        await pool.query('DELETE FROM empleados WHERE id_empleado = ?', [e.id]);
    }

    /**
     * Si MySQL está activo, garantiza que existan las 50 celdas, los empleados y el padrón
     * semilla (cada bloque se evalúa de forma independiente y tolerante a esquemas antiguos).
     */
    async sincronizarSemillaMySQL() {
        if (this.modoPersistencia !== 'MYSQL' || !this.poolMySQL) return;
        const pool = this.poolMySQL;

        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total FROM celdas');
            if (rows[0].total === 0) {
                for (const celda of this.inventarioCeldas) {
                    await pool.query(
                        'INSERT IGNORE INTO celdas (codigo_celda, tipo_espacio, estado_ocupacion, motivo_mantenimiento) VALUES (?, ?, ?, ?)',
                        [celda.codigoCelda, this._tipoDb(celda.tipoEspacio), celda.estadoOcupacion, celda.motivoMantenimiento || null]
                    );
                }
            }
        } catch (error) {
            console.warn('⚠️  Aviso sincronización MySQL (celdas):', error.message);
        }

        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total FROM empleados');
            if (rows[0].total === 0) {
                for (const emp of this.padronEmpleados) {
                    await this._dbUpsertEmpleado(pool, emp);
                }
            }
        } catch (error) {
            console.warn('⚠️  Aviso sincronización MySQL (empleados): ejecute database/schema_autos_colombia.sql.', error.message);
        }

        try {
            const [rows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
            if (rows[0].total === 0) {
                for (const cliente of this.padronClientes) {
                    await this._dbUpsertSuscriptor(pool, cliente);
                }
            }
        } catch (error) {
            console.warn('⚠️  Aviso sincronización MySQL (usuarios):', error.message);
        }
    }

    /**
     * Consulta la ocupación actual del patio (HU-03 / CU-09)
     * @returns {Array<Celda>}
     */
    consultarOcupacionPatio() {
        return this.inventarioCeldas;
    }

    /**
     * Consulta la bitácora de auditoría histórica (HU-07 / CU-11)
     * @param {string} [filtro]
     * @returns {Array<Object>}
     */
    consultarBitacoraAuditoria(filtro = '') {
        if (!filtro) return this.eventosAuditoria;
        const f = filtro.toUpperCase();
        return this.eventosAuditoria.filter(e => 
            e.codigo.toUpperCase().includes(f) ||
            e.placaCelda.toUpperCase().includes(f) ||
            e.descripcion.toUpperCase().includes(f) ||
            e.tipo.toUpperCase().includes(f)
        );
    }

    /**
     * Procesa y valida el ingreso de un vehículo a patio (RF-01, RF-02, RF-03, RF-04)
     * @param {string} placaInput
     * @param {string} celdaSeleccionada
     * @param {string} observacion
     * @param {string} [operario]
     * @returns {Object}
     */
    procesarIngresoVehicular(placaInput, celdaSeleccionada, observacion = '', operario = null) {
        const placa = (placaInput || '').trim().toUpperCase();
        const celdaCodigo = (celdaSeleccionada || '').trim().toUpperCase();
        const op = operario || this.operarioEnSesion;
        const fechaHora = this.obtenerFechaHoraActual();
        const obsFinal = observacion.trim() || 'Vehículo ingresa sin novedades físicas.';

        // RF-01: Validar placa registrada
        const cliente = this.padronClientes.find(c => c.placa === placa);
        if (!cliente) {
            return {
                ok: false,
                codigo: 404,
                error: `La placa ${placa} no está vinculada al padrón de mensualidades. Vincúlela en Caja.`
            };
        }

        // Validar si ya está en patio
        if (cliente.enPatio) {
            return {
                ok: false,
                codigo: 409,
                error: `El vehículo ${placa} ya se encuentra dentro del patio ocupando la celda ${cliente.celdaActual}.`
            };
        }

        // RF-01: Validar vigencia de mensualidad
        const usuarioModelo = new Usuario(cliente.documento, cliente.titular, 'N/A', cliente.estado, cliente.vencimiento);
        if (!usuarioModelo.validarVigencia()) {
            const codigoBloqueo = `TRX-2026-${this.consecutivoTransaccion++}`;
            this.eventosAuditoria.unshift({
                codigo: codigoBloqueo,
                fecha: fechaHora,
                tipo: 'BLOQUEO',
                modulo: 'Portería',
                placaCelda: `${placa} • N/A`,
                descripcion: `Intento de ingreso rechazado por mensualidad en mora (Venció: ${cliente.vencimiento}).`,
                operario: op
            });

            return {
                ok: false,
                codigo: 403,
                error: `Ingreso bloqueado: La mensualidad de la placa ${placa} se encuentra EN MORA (Venció: ${cliente.vencimiento}).`
            };
        }

        // RF-02: Validar celda disponible y compatible
        const celdaObj = this.inventarioCeldas.find(c => c.codigoCelda === celdaCodigo);
        if (!celdaObj) {
            return {
                ok: false,
                codigo: 400,
                error: `La celda ${celdaCodigo} no existe en el patio.`
            };
        }
        if (celdaObj.estadoOcupacion === 'MANTENIMIENTO') {
            return {
                ok: false,
                codigo: 409,
                error: `La celda ${celdaCodigo} se encuentra en MANTENIMIENTO (${celdaObj.motivoMantenimiento || 'fuera de servicio'}) y no puede asignarse.`
            };
        }
        if (!celdaObj.verificarDisponibilidad()) {
            return {
                ok: false,
                codigo: 409,
                error: `La celda ${celdaCodigo} ya está ocupada por otro vehículo.`
            };
        }

        const vehiculoModelo = new Vehiculo(cliente.placa, cliente.documento, cliente.tipo);
        if (!vehiculoModelo.validarCompatibilidad(celdaObj.tipoEspacio)) {
            return {
                ok: false,
                codigo: 400,
                error: `Incompatibilidad física: Vehículo tipo ${cliente.tipo} no puede ocupar celda de ${celdaObj.tipoEspacio}.`
            };
        }

        // RF-03: Asignar celda y registrar entrada
        celdaObj.ocuparCelda(cliente.placa);
        cliente.enPatio = true;
        cliente.celdaActual = celdaCodigo;

        const codigoTrx = `TRX-2026-${this.consecutivoTransaccion++}`;

        // Instanciar Movimiento (Entidad Dominio)
        const nuevoMovimiento = new Movimiento(
            codigoTrx,
            cliente.placa,
            celdaCodigo,
            fechaHora,
            null,
            `${fechaHora.slice(0, 16)} — Ingreso: ${obsFinal}`,
            'EN_PATIO',
            op,
            {
                titular: cliente.titular,
                documento: cliente.documento,
                tipo: cliente.tipo,
                permanencia: '00h 01m',
                novedades: [`${fechaHora.slice(0, 16)} — Ingreso: ${obsFinal}`]
            }
        );

        this.movimientosActivos.unshift(nuevoMovimiento);
        this.ultimoComprobante = nuevoMovimiento;

        // Bitácora de auditoría
        this.eventosAuditoria.unshift({
            codigo: codigoTrx,
            fecha: fechaHora,
            tipo: 'INGRESO',
            modulo: 'Portería',
            placaCelda: `${cliente.placa} • ${celdaCodigo}`,
            descripcion: `Entrada autorizada en celda ${celdaCodigo}. Estado físico: ${obsFinal}`,
            operario: op
        });

        // RF-04: Emisión de Comprobante / Ticket
        const comprobanteTexto = nuevoMovimiento.emitirComprobanteIngreso();

        // Si MySQL está activo, persistir de forma asíncrona
        if (this.modoPersistencia === 'MYSQL' && this.poolMySQL) {
            this.poolMySQL.query(
                `INSERT INTO movimientos (id_ticket, placa, codigo_celda, fecha_hora_ingreso, novedad_operativa, estado_movimiento, operario_responsable)
                 VALUES (?, ?, ?, NOW(), ?, 'EN_PATIO', ?)`,
                [codigoTrx, cliente.placa, celdaCodigo, obsFinal, op]
            ).catch(e => console.warn('Aviso MySQL INSERT Movimiento:', e.message));

            this.poolMySQL.query(
                `UPDATE celdas SET estado_ocupacion = 'OCUPADA' WHERE codigo_celda = ?`,
                [celdaCodigo]
            ).catch(e => console.warn('Aviso MySQL UPDATE Celda:', e.message));
        }

        return {
            ok: true,
            codigo: 201,
            mensaje: `Ingreso registrado exitosamente. Vehículo ${cliente.placa} asignado a celda ${celdaCodigo}.`,
            movimiento: nuevoMovimiento,
            comprobante: comprobanteTexto,
            transaccion: codigoTrx
        };
    }

    /**
     * Procesa la salida de un vehículo y libera la celda (RF-07, RF-08, RF-09)
     * @param {string} placaInput
     * @param {string} novedadSalida
     * @param {string} [operario]
     * @returns {Object}
     */
    procesarSalidaVehicular(placaInput, novedadSalida = '', operario = null) {
        const placa = (placaInput || '').trim().toUpperCase();
        const op = operario || this.operarioEnSesion;
        const fechaHora = this.obtenerFechaHoraActual();

        // RF-07: Validar que el vehículo esté en patio
        const idx = this.movimientosActivos.findIndex(m => m.placa === placa);
        if (idx === -1) {
            return {
                ok: false,
                codigo: 404,
                error: `El vehículo con placa ${placa} no figura actualmente estacionado en patio.`
            };
        }

        const mov = this.movimientosActivos[idx];

        // Anexar novedad física si se suministró
        if (novedadSalida.trim()) {
            mov.anexarNovedad(`Salida: ${novedadSalida.trim()}`);
        }

        // RF-08: Registrar salida en el objeto Movimiento
        mov.registrarSalida(fechaHora);

        // RF-09: Liberación automática de celda a DISPONIBLE
        const celdaObj = this.inventarioCeldas.find(c => c.codigoCelda === mov.codigoCelda);
        if (celdaObj) {
            celdaObj.liberarCelda();
        }

        // Actualizar estado en padrón de clientes
        const cliente = this.padronClientes.find(c => c.placa === placa);
        if (cliente) {
            cliente.enPatio = false;
            cliente.celdaActual = null;
        }

        // Remover de movimientos activos
        this.movimientosActivos.splice(idx, 1);

        const codigoSalida = `TRX-2026-${this.consecutivoTransaccion++}`;
        this.eventosAuditoria.unshift({
            codigo: codigoSalida,
            fecha: fechaHora,
            tipo: 'SALIDA',
            modulo: 'Salidas y Novedades',
            placaCelda: `${mov.placa} • ${mov.codigoCelda}`,
            descripcion: `Salida autorizada para ${mov.titular || placa}. Celda ${mov.codigoCelda} liberada a estado DISPONIBLE.`,
            operario: op
        });

        // Persistir en MySQL si está activo
        if (this.modoPersistencia === 'MYSQL' && this.poolMySQL) {
            this.poolMySQL.query(
                `UPDATE movimientos SET fecha_hora_salida = NOW(), estado_movimiento = 'FINALIZADO', novedad_operativa = ?
                 WHERE id_ticket = ?`,
                [mov.novedadOperativa, mov.idTicket]
            ).catch(e => console.warn('Aviso MySQL UPDATE Movimiento Salida:', e.message));

            this.poolMySQL.query(
                `UPDATE celdas SET estado_ocupacion = 'DISPONIBLE' WHERE codigo_celda = ?`,
                [mov.codigoCelda]
            ).catch(e => console.warn('Aviso MySQL UPDATE Celda Libre:', e.message));
        }

        return {
            ok: true,
            codigo: 200,
            mensaje: `Salida registrada para ${mov.placa}. La celda ${mov.codigoCelda} ha quedado DISPONIBLE.`,
            celdaLiberada: mov.codigoCelda,
            movimientoFinalizado: mov
        };
    }

    /**
     * Anexa una novedad física inmutable a un vehículo en patio (HU-05 / CU-06)
     * @param {string} placaInput
     * @param {string} novedadTexto
     * @param {string} [operario]
     * @returns {Object}
     */
    procesarNovedadInmutable(placaInput, novedadTexto, operario = null) {
        const placa = (placaInput || '').trim().toUpperCase();
        const texto = (novedadTexto || '').trim();
        const op = operario || this.operarioEnSesion;
        const fechaHora = this.obtenerFechaHoraActual();

        if (!texto) {
            return { ok: false, codigo: 400, error: 'Debe ingresar una descripción de la novedad física.' };
        }

        const mov = this.movimientosActivos.find(m => m.placa === placa);
        if (!mov) {
            return { ok: false, codigo: 404, error: `No hay un vehículo activo en patio con la placa ${placa}.` };
        }

        mov.anexarNovedad(`Reporte Patio: ${texto}`);

        const codigoNovedad = `TRX-2026-${this.consecutivoTransaccion++}`;
        this.eventosAuditoria.unshift({
            codigo: codigoNovedad,
            fecha: fechaHora,
            tipo: 'NOVEDAD',
            modulo: 'Salidas y Novedades',
            placaCelda: `${mov.placa} • ${mov.codigoCelda}`,
            descripcion: `Novedad física anexada al vehículo: ${texto}`,
            operario: op
        });

        return {
            ok: true,
            codigo: 200,
            mensaje: `Novedad física registrada y sellada para el vehículo ${mov.placa}.`,
            movimiento: mov
        };
    }

    /**
     * Procesa el recaudo de mensualidad y emite Paz y Salvo (RF-06 / HU-04 / CU-10)
     * @param {string} placaInput
     * @param {string} medioPago
     * @param {number} [monto]
     * @param {string} [operario]
     * @returns {Object}
     */
    procesarRecaudoMensualidad(placaInput, medioPago = 'TRANSFERENCIA', monto = null, operario = null) {
        const placa = (placaInput || '').trim().toUpperCase();
        const op = operario || this.operarioEnSesion;
        const fechaHora = this.obtenerFechaHoraActual();

        const cliente = this.padronClientes.find(c => c.placa === placa);
        if (!cliente) {
            return { ok: false, codigo: 404, error: `La placa ${placa} no está registrada en el padrón de clientes.` };
        }

        const montoRecaudo = monto || cliente.tarifa || (cliente.tipo === 'Automóvil' ? 180000 : 95000);
        const nuevaVigencia = '2026-11-24'; // +30 días según reglas del negocio

        // Actualizar cliente a PAZ Y SALVO (ACTIVO)
        cliente.estado = 'ACTIVA';
        cliente.vencimiento = nuevaVigencia;

        const codigoRecibo = `RC-2026-${this.consecutivoTransaccion++}`;

        // Instanciar Pago (Entidad Dominio)
        const pagoObj = new Pago(
            codigoRecibo,
            cliente.documento,
            montoRecaudo,
            medioPago,
            fechaHora,
            nuevaVigencia,
            op
        );
        pagoObj.procesarRecaudo();

        const pazYSalvoTexto = pagoObj.generarPazYSalvo(cliente.titular);

        // Bitácora de auditoría
        this.eventosAuditoria.unshift({
            codigo: codigoRecibo,
            fecha: fechaHora,
            tipo: 'PAGO',
            modulo: 'Mensualidades y Caja',
            placaCelda: `${cliente.placa} • Mensualidad`,
            descripcion: `Pago registrado por $${montoRecaudo.toLocaleString('es-CO')} COP (${medioPago}). Estado actualizado a PAZ Y SALVO hasta ${nuevaVigencia}.`,
            operario: op
        });

        // Persistir en MySQL si está activo
        if (this.modoPersistencia === 'MYSQL' && this.poolMySQL) {
            this.poolMySQL.query(
                `INSERT INTO pagos (codigo_transaccion, documento_id, monto_total, medio_pago, fecha_emision, vigencia_hasta, operario_responsable)
                 VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
                [codigoRecibo, this._docDb(cliente.documento), montoRecaudo, this._medioPagoDb(medioPago), nuevaVigencia, op]
            ).catch(e => console.warn('Aviso MySQL INSERT Pago:', e.message));

            this.poolMySQL.query(
                `UPDATE usuarios SET estado_mensualidad = 'ACTIVO', fecha_vencimiento = ? WHERE documento_id = ?`,
                [nuevaVigencia, this._docDb(cliente.documento)]
            ).catch(e => console.warn('Aviso MySQL UPDATE Usuario Pago:', e.message));
        }

        return {
            ok: true,
            codigo: 200,
            mensaje: `Recibo ${codigoRecibo} emitido: El vehículo ${cliente.placa} (${cliente.titular}) se encuentra ahora en PAZ Y SALVO.`,
            recibo: codigoRecibo,
            pazYSalvo: pazYSalvoTexto,
            clienteActualizado: cliente
        };
    }

    // ========================================================================
    // ITERACIÓN 2 — UTILIDADES DE NORMALIZACIÓN Y TRAZABILIDAD
    // ========================================================================

    /** Normaliza la categoría vehicular a 'Automóvil' | 'Motocicleta'. */
    normalizarTipoVehiculo(tipo) {
        return String(tipo || '').toUpperCase().includes('MOTO') ? 'Motocicleta' : 'Automóvil';
    }

    /** Canon mensual oficial según categoría (HU-04 Iteración 1). */
    tarifaPorTipo(tipo) {
        return tipo === 'Automóvil' ? 180000 : 95000;
    }

    /** @returns {boolean} true si el estado de cartera recibido es reconocido. */
    esEstadoCarteraValido(estado) {
        return ['ACTIVA', 'ACTIVO', 'EN MORA', 'MORA'].includes(String(estado || '').trim().toUpperCase());
    }

    /** Normaliza el estado de cartera a 'ACTIVA' | 'EN MORA'. */
    normalizarEstadoCartera(estado) {
        return String(estado || '').toUpperCase().includes('MORA') ? 'EN MORA' : 'ACTIVA';
    }

    /** Compara documentos ignorando prefijos y separadores ('CC 1037612890' == '1037612890'). */
    documentosIguales(a, b) {
        const da = String(a || '').replace(/\D/g, '');
        const db = String(b || '').replace(/\D/g, '');
        if (da && db) return da === db;
        return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
    }

    /** @returns {boolean} true si la fecha tiene formato YYYY-MM-DD y es calendario válido. */
    esFechaIsoValida(fecha) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) && !Number.isNaN(Date.parse(fecha));
    }

    /**
     * Registra un evento inmutable en la Bitácora de Auditoría (RNF-04).
     * @param {string} prefijo - 'ADM' (usuarios/empleados) | 'CEL' (celdas)
     * @returns {Object} evento creado
     */
    registrarEventoAuditoria(prefijo, tipo, modulo, placaCelda, descripcion, operario) {
        const evento = {
            codigo: `${prefijo}-2026-${this.consecutivoTransaccion++}`,
            fecha: this.obtenerFechaHoraActual(),
            tipo,
            modulo,
            placaCelda,
            descripcion,
            operario: operario || this.operarioEnSesion
        };
        this.eventosAuditoria.unshift(evento);
        return evento;
    }

    /** Proyección JSON de una celda para la API. */
    serializarCelda(celda) {
        return {
            codigo: celda.codigoCelda,
            tipo: celda.tipoEspacio,
            estado: celda.estadoOcupacion,
            placaActual: celda.placaActual,
            motivoMantenimiento: celda.motivoMantenimiento || null
        };
    }

    /** Busca una celda por código (insensible a mayúsculas). */
    buscarCelda(codigo) {
        const cod = String(codigo || '').trim().toUpperCase();
        return this.inventarioCeldas.find(c => c.codigoCelda === cod);
    }

    // ========================================================================
    // ITERACIÓN 2 — GESTIÓN DE USUARIOS TITULARES Y VEHÍCULOS (RF-01 a RF-05)
    // ========================================================================

    /**
     * Da de alta un suscriptor (titular + vehículo) en el padrón mensual
     * (RF-01, RF-02, HU-01). Valida unicidad de placa y de documento (RNF-01).
     * @param {Object} datos - { placa, titular, documento, tipo, telefono, marcaColor,
     *                           tarifa, vencimiento, estado, operario, origen }
     * @returns {Object}
     */
    registrarNuevoSuscriptor(datos = {}) {
        const placa = String(datos.placa || '').trim().toUpperCase();
        const nombre = String(datos.titular || '').trim();
        const doc = String(datos.documento || '').trim();
        const tipo = this.normalizarTipoVehiculo(datos.tipo);
        const op = datos.operario || this.operarioEnSesion;
        const origen = datos.origen === 'ADMIN' ? 'ADMIN' : 'CAJA';

        if (!placa || !nombre || !doc) {
            return { ok: false, codigo: 400, error: 'Complete placa, nombre y documento del titular.' };
        }
        if (!/^[A-Z0-9][A-Z0-9-]{3,8}[A-Z0-9]$/.test(placa)) {
            return { ok: false, codigo: 400, error: `El formato de la placa ${placa} no es válido (use letras, números y guion; ej. RTY-901).` };
        }

        const placaExistente = this.padronClientes.find(c => c.placa === placa);
        if (placaExistente) {
            return {
                ok: false,
                codigo: 409,
                error: `La placa ${placa} ya se encuentra registrada en el padrón (titular ${placaExistente.titular}).`
            };
        }
        const docExistente = this.padronClientes.find(c => this.documentosIguales(c.documento, doc));
        if (docExistente) {
            return {
                ok: false,
                codigo: 409,
                error: `El documento ${doc} ya se encuentra registrado para el titular ${docExistente.titular} (placa ${docExistente.placa}).`
            };
        }

        if (datos.estado && !this.esEstadoCarteraValido(datos.estado)) {
            return { ok: false, codigo: 400, error: 'El estado inicial debe ser ACTIVA o EN MORA.' };
        }
        if (datos.vencimiento && !this.esFechaIsoValida(datos.vencimiento)) {
            return { ok: false, codigo: 400, error: 'La fecha de vencimiento debe tener formato AAAA-MM-DD.' };
        }
        const tarifa = datos.tarifa !== undefined && datos.tarifa !== null && datos.tarifa !== ''
            ? Number(datos.tarifa)
            : this.tarifaPorTipo(tipo);
        if (!Number.isFinite(tarifa) || tarifa <= 0) {
            return { ok: false, codigo: 400, error: 'El canon mensual debe ser un valor numérico mayor a cero.' };
        }

        const nuevoCliente = {
            placa,
            titular: nombre,
            documento: doc,
            tipo,
            estado: this.normalizarEstadoCartera(datos.estado),
            vencimiento: datos.vencimiento || '2026-11-24',
            tarifa,
            enPatio: false,
            celdaActual: null,
            telefono: String(datos.telefono || '').trim(),
            marcaColor: String(datos.marcaColor || '').trim()
        };

        this.padronClientes.unshift(nuevoCliente);

        // Pago inicial: solo cuando el alta se origina en Caja (comportamiento Iteración 1)
        if (origen === 'CAJA' && nuevoCliente.estado === 'ACTIVA') {
            this.eventosAuditoria.unshift({
                codigo: `RC-2026-${this.consecutivoTransaccion++}`,
                fecha: this.obtenerFechaHoraActual(),
                tipo: 'PAGO',
                modulo: 'Mensualidades y Caja',
                placaCelda: `${placa} • Alta Mensualidad`,
                descripcion: `Nuevo suscriptor vinculado (${nombre} - ${tipo}). Pago inicial $${tarifa.toLocaleString('es-CO')} COP.`,
                operario: op
            });
        }

        this.registrarEventoAuditoria(
            'ADM',
            'SUSCRIPTOR_CREADO',
            'Administración CRUD',
            `${placa} • Padrón`,
            `Alta de nuevo suscriptor: ${nombre} (${doc}), Vehículo: ${tipo}, Canon: $${tarifa.toLocaleString('es-CO')}. Estado: ${nuevoCliente.estado}.`,
            op
        );

        this.persistir((pool) => this._dbUpsertSuscriptor(pool, nuevoCliente));

        return {
            ok: true,
            codigo: 201,
            mensaje: `Suscriptor ${nombre} con placa ${placa} vinculado al padrón (${nuevoCliente.estado === 'ACTIVA' ? 'PAZ Y SALVO' : 'EN MORA'}).`,
            cliente: nuevoCliente
        };
    }

    /**
     * Actualiza los datos maestros de un suscriptor sin perder su historial (RF-04, HU-03).
     * @param {string} placaInput
     * @param {Object} datos
     * @param {string} [operario]
     * @returns {Object}
     */
    editarSuscriptor(placaInput, datos = {}, operario = null) {
        const placa = String(placaInput || '').trim().toUpperCase();
        const op = operario || this.operarioEnSesion;

        const cliente = this.padronClientes.find(c => c.placa === placa);
        if (!cliente) {
            return { ok: false, codigo: 404, error: `No se encontró el suscriptor con placa ${placa}.` };
        }

        // Validaciones previas (no se modifica nada si alguna falla)
        if (datos.titular !== undefined && !String(datos.titular).trim()) {
            return { ok: false, codigo: 400, error: 'El nombre del titular no puede estar vacío.' };
        }
        if (datos.documento) {
            const otro = this.padronClientes.find(c => c.placa !== placa && this.documentosIguales(c.documento, datos.documento));
            if (otro) {
                return { ok: false, codigo: 409, error: `El documento ${datos.documento} ya pertenece al titular ${otro.titular} (placa ${otro.placa}).` };
            }
        }
        if (datos.estado && !this.esEstadoCarteraValido(datos.estado)) {
            return { ok: false, codigo: 400, error: 'El estado debe ser ACTIVA o EN MORA.' };
        }
        if (datos.vencimiento && !this.esFechaIsoValida(datos.vencimiento)) {
            return { ok: false, codigo: 400, error: 'La fecha de vencimiento debe tener formato AAAA-MM-DD.' };
        }
        let tarifaNueva = cliente.tarifa;
        if (datos.tarifa !== undefined && datos.tarifa !== null && datos.tarifa !== '') {
            tarifaNueva = Number(datos.tarifa);
            if (!Number.isFinite(tarifaNueva) || tarifaNueva <= 0) {
                return { ok: false, codigo: 400, error: 'El canon mensual debe ser un valor numérico mayor a cero.' };
            }
        }
        const tipoNuevo = datos.tipo ? this.normalizarTipoVehiculo(datos.tipo) : cliente.tipo;
        if (cliente.enPatio && tipoNuevo !== cliente.tipo) {
            return {
                ok: false,
                codigo: 400,
                error: `No se puede cambiar la categoría de ${placa} mientras ocupa la celda ${cliente.celdaActual}. Registre primero su salida.`
            };
        }

        // Aplicación mediante la entidad de dominio Usuario
        const usuario = new Usuario(cliente.documento, cliente.titular, cliente.telefono || '', cliente.estado, cliente.vencimiento);
        usuario.actualizarDatosMaestros({
            nombresApellidos: datos.titular,
            telefonoContacto: datos.telefono,
            estadoMensualidad: datos.estado ? this.normalizarEstadoCartera(datos.estado) : undefined,
            fechaVencimiento: datos.vencimiento
        });

        cliente.titular = usuario.nombresApellidos;
        if (datos.documento) cliente.documento = String(datos.documento).trim();
        cliente.telefono = usuario.telefonoContacto;
        cliente.estado = usuario.estadoMensualidad;
        cliente.vencimiento = usuario.fechaVencimiento;
        cliente.tipo = tipoNuevo;
        cliente.tarifa = tarifaNueva;
        if (datos.marcaColor !== undefined) cliente.marcaColor = String(datos.marcaColor || '').trim();

        // Mantener coherente el ticket activo (historial transaccional intacto)
        const movActivo = this.movimientosActivos.find(m => m.placa === placa);
        if (movActivo) {
            movActivo.titular = cliente.titular;
            movActivo.documento = cliente.documento;
            movActivo.tipo = cliente.tipo;
        }

        this.registrarEventoAuditoria(
            'ADM',
            'SUSCRIPTOR_MODIFICADO',
            'Administración CRUD',
            `${placa} • Padrón`,
            `Modificación de suscriptor: Titular ${cliente.titular}, Vigencia: ${cliente.vencimiento}, Estado: ${cliente.estado}, Canon: $${cliente.tarifa.toLocaleString('es-CO')}.`,
            op
        );

        this.persistir((pool) => this._dbUpsertSuscriptor(pool, cliente));

        return {
            ok: true,
            codigo: 200,
            mensaje: `Suscriptor ${cliente.titular} (${placa}) actualizado correctamente.`,
            cliente
        };
    }

    /**
     * Da de baja un suscriptor del padrón (RF-05, HU-04, RNF-01).
     * Se rechaza con HTTP 400 si alguno de sus vehículos está estacionado en patio.
     * @param {string} placaInput
     * @param {string} [operario]
     * @returns {Object}
     */
    eliminarSuscriptor(placaInput, operario = null) {
        const placa = String(placaInput || '').trim().toUpperCase();
        const op = operario || this.operarioEnSesion;

        const idx = this.padronClientes.findIndex(c => c.placa === placa);
        if (idx === -1) {
            return { ok: false, codigo: 404, error: `No se encontró el suscriptor con placa ${placa}.` };
        }

        const cliente = this.padronClientes[idx];
        const usuario = new Usuario(cliente.documento, cliente.titular, cliente.telefono || '', cliente.estado, cliente.vencimiento);
        const enPatio = this.padronClientes
            .filter(c => this.documentosIguales(c.documento, cliente.documento) && c.enPatio)
            .map(c => c.placa);

        if (!usuario.puedeDarseDeBaja(enPatio)) {
            return {
                ok: false,
                codigo: 400,
                error: `No se puede eliminar el vehículo ${placa} porque actualmente se encuentra en patio (Celda ${cliente.celdaActual}). Registre primero su salida.`
            };
        }

        this.padronClientes.splice(idx, 1);

        this.registrarEventoAuditoria(
            'ADM',
            'SUSCRIPTOR_ELIMINADO',
            'Administración CRUD',
            `${placa} • Padrón`,
            `Baja de suscriptor: ${cliente.titular} (${cliente.documento}) retirado del padrón.`,
            op
        );

        this.persistir((pool) => this._dbEliminarSuscriptor(pool, cliente));

        return {
            ok: true,
            codigo: 200,
            mensaje: `Suscriptor con placa ${placa} eliminado exitosamente del sistema.`
        };
    }

    // ========================================================================
    // ITERACIÓN 2 — GESTIÓN DE LAS 50 CELDAS (RF-06 a RF-10)
    // ========================================================================

    /**
     * Inhabilita (MANTENIMIENTO) o rehabilita (DISPONIBLE) una celda (RF-08, HU-06).
     * Prohibido bloquear una celda OCUPADA (RNF-01).
     * @param {string} codigoInput - 'A-05'
     * @param {string} nuevoEstado - 'MANTENIMIENTO' | 'DISPONIBLE'
     * @param {string} [motivo]
     * @param {string} [operario]
     * @returns {Object}
     */
    cambiarEstadoMantenimientoCelda(codigoInput, nuevoEstado, motivo = '', operario = null) {
        const op = operario || this.operarioEnSesion;
        const celda = this.buscarCelda(codigoInput);
        if (!celda) {
            return { ok: false, codigo: 404, error: `La celda ${String(codigoInput || '').toUpperCase()} no existe en el patio.` };
        }

        const destino = String(nuevoEstado || '').trim().toUpperCase();
        if (destino !== 'MANTENIMIENTO' && destino !== 'DISPONIBLE') {
            return { ok: false, codigo: 400, error: "El estado solicitado debe ser 'MANTENIMIENTO' o 'DISPONIBLE'." };
        }

        if (destino === 'MANTENIMIENTO') {
            if (celda.estadoOcupacion === 'OCUPADA') {
                return {
                    ok: false,
                    codigo: 400,
                    error: `No se puede bloquear la celda ${celda.codigoCelda} porque está ocupada por el vehículo ${celda.placaActual}. Registre su salida o reubíquelo primero.`
                };
            }
            if (celda.estadoOcupacion === 'MANTENIMIENTO') {
                return { ok: false, codigo: 409, error: `La celda ${celda.codigoCelda} ya se encuentra en MANTENIMIENTO.` };
            }
            celda.ponerEnMantenimiento(motivo);
            this.registrarEventoAuditoria(
                'CEL',
                'CELDA_MANTENIMIENTO',
                'Gestión de Celdas',
                `Celda ${celda.codigoCelda} (${celda.tipoEspacio})`,
                `Celda ${celda.codigoCelda} inhabilitada por mantenimiento: ${celda.motivoMantenimiento}`,
                op
            );
        } else {
            if (celda.estadoOcupacion === 'OCUPADA') {
                return { ok: false, codigo: 400, error: `La celda ${celda.codigoCelda} está ocupada; no requiere rehabilitación.` };
            }
            if (!celda.habilitarCelda()) {
                return { ok: false, codigo: 409, error: `La celda ${celda.codigoCelda} ya se encuentra DISPONIBLE.` };
            }
            this.registrarEventoAuditoria(
                'CEL',
                'CELDA_HABILITADA',
                'Gestión de Celdas',
                `Celda ${celda.codigoCelda} (${celda.tipoEspacio})`,
                `Celda ${celda.codigoCelda} rehabilitada a estado DISPONIBLE.`,
                op
            );
        }

        this.persistir((pool) => this._dbActualizarCelda(pool, celda));

        return {
            ok: true,
            codigo: 200,
            mensaje: destino === 'MANTENIMIENTO'
                ? `Celda ${celda.codigoCelda} puesta en MANTENIMIENTO y excluida de portería.`
                : `Celda ${celda.codigoCelda} rehabilitada y DISPONIBLE para asignación.`,
            celda: this.serializarCelda(celda)
        };
    }

    /**
     * Reubica un vehículo estacionado hacia otra celda DISPONIBLE del mismo tipo,
     * conservando el ticket activo (RF-09, HU-07, RNF-01).
     * @param {string} codigoOrigenInput
     * @param {string} codigoDestinoInput
     * @param {string} [operario]
     * @returns {Object}
     */
    reubicarVehiculo(codigoOrigenInput, codigoDestinoInput, operario = null) {
        const op = operario || this.operarioEnSesion;
        const origen = this.buscarCelda(codigoOrigenInput);
        const destino = this.buscarCelda(codigoDestinoInput);

        if (!origen) {
            return { ok: false, codigo: 404, error: `La celda de origen ${String(codigoOrigenInput || '').toUpperCase()} no existe en el patio.` };
        }
        if (!destino) {
            return { ok: false, codigo: 404, error: `La celda de destino ${String(codigoDestinoInput || '').toUpperCase()} no existe en el patio.` };
        }

        const validacion = Celda.validarReubicacion(origen, destino);
        if (!validacion.ok) {
            return { ok: false, codigo: 400, error: validacion.error };
        }

        const placa = origen.placaActual;
        const mov = this.movimientosActivos.find(m => m.placa === placa);
        if (!mov) {
            return { ok: false, codigo: 409, error: `No existe un ticket activo asociado al vehículo ${placa}; no es posible reubicarlo.` };
        }

        // Transacción en memoria: liberar origen + ocupar destino + actualizar ticket y padrón
        origen.liberarCelda();
        destino.ocuparCelda(placa);
        mov.codigoCelda = destino.codigoCelda;
        mov.anexarNovedad(`Reubicación Patio: Trasladado de ${origen.codigoCelda} a ${destino.codigoCelda}.`);

        const cliente = this.padronClientes.find(c => c.placa === placa);
        if (cliente) cliente.celdaActual = destino.codigoCelda;

        this.registrarEventoAuditoria(
            'CEL',
            'CELDA_REUBICADA',
            'Gestión de Celdas',
            `${placa} • ${origen.codigoCelda} -> ${destino.codigoCelda}`,
            `Reubicación operativa de vehículo ${placa}: liberada celda ${origen.codigoCelda} y asignada celda ${destino.codigoCelda}. Ticket ${mov.idTicket} conservado.`,
            op
        );

        this.persistir((pool) => this._dbReubicar(pool, origen, destino, mov));

        return {
            ok: true,
            codigo: 200,
            mensaje: `Vehículo ${placa} reubicado de la celda ${origen.codigoCelda} a la celda ${destino.codigoCelda}. Ticket ${mov.idTicket} conservado.`,
            placa,
            ticket: mov.idTicket,
            origen: this.serializarCelda(origen),
            destino: this.serializarCelda(destino),
            movimiento: mov
        };
    }

    /**
     * Consulta el detalle de una celda: ocupante, ticket activo, motivo de mantenimiento
     * e historial de auditoría asociado (RF-10, CU-09).
     * @param {string} codigoInput
     * @returns {Object}
     */
    consultarDetalleCelda(codigoInput) {
        const celda = this.buscarCelda(codigoInput);
        if (!celda) {
            return { ok: false, codigo: 404, error: `La celda ${String(codigoInput || '').toUpperCase()} no existe en el patio.` };
        }
        const mov = this.movimientosActivos.find(m => m.codigoCelda === celda.codigoCelda) || null;
        const historial = this.eventosAuditoria.filter(e =>
            String(e.placaCelda || '').includes(celda.codigoCelda) ||
            String(e.descripcion || '').includes(`celda ${celda.codigoCelda}`) ||
            String(e.descripcion || '').includes(`Celda ${celda.codigoCelda}`)
        );
        return {
            ok: true,
            codigo: 200,
            celda: this.serializarCelda(celda),
            movimientoActivo: mov,
            historial
        };
    }

    /**
     * Retorna métricas analíticas y financieras para el panel de administración.
     * El contrato JSON coincide con el que consume index.html (`/api/admin/metricas`).
     * @returns {Object}
     */
    obtenerMetricasAdmin() {
        const totalClientes = this.padronClientes.length;
        const clientesAlDia = this.padronClientes.filter(c => c.estado === 'ACTIVA').length;
        const clientesEnMora = totalClientes - clientesAlDia;

        const ocupadas = this.inventarioCeldas.filter(c => c.estadoOcupacion === 'OCUPADA').length;
        const mantenimiento = this.inventarioCeldas.filter(c => c.estadoOcupacion === 'MANTENIMIENTO').length;
        const autosOcupados = this.inventarioCeldas.filter(c => c.tipoEspacio === 'Automóvil' && c.estadoOcupacion === 'OCUPADA').length;
        const motosOcupadas = this.inventarioCeldas.filter(c => c.tipoEspacio === 'Motocicleta' && c.estadoOcupacion === 'OCUPADA').length;
        const totalCeldas = this.inventarioCeldas.length;

        // Recaudo: base histórica del corte (RC-2026-0891 ya incluido) + pagos posteriores de la bitácora
        let efectivo = 180000;
        let pse = 440000;
        let tarjeta = 95000;
        let totalRecaudado = efectivo + pse + tarjeta;

        this.eventosAuditoria
            .filter(e => e.tipo === 'PAGO' && e.codigo !== 'RC-2026-0891')
            .forEach(p => {
                const match = String(p.descripcion || '').match(/\$([\d.]+)/);
                if (!match) return;
                const valor = Number(match[1].replace(/\./g, '')) || 0;
                const desc = String(p.descripcion || '').toUpperCase();
                totalRecaudado += valor;
                if (desc.includes('EFECTIVO')) efectivo += valor;
                else if (desc.includes('TARJETA')) tarjeta += valor;
                else pse += valor;
            });

        const ingresoPotencial = this.padronClientes.reduce((acc, c) => acc + (c.tarifa || 0), 0);
        const carteraMora = this.padronClientes.filter(c => c.estado !== 'ACTIVA').reduce((acc, c) => acc + (c.tarifa || 0), 0);

        return {
            totalRecaudado,
            desgloseMedios: { efectivo, pse, tarjeta },
            celdas: {
                total: totalCeldas,
                ocupadas,
                libres: totalCeldas - ocupadas - mantenimiento,
                mantenimiento,
                porcentaje: Math.round((ocupadas / totalCeldas) * 100),
                autosOcupados,
                motosOcupadas
            },
            clientes: {
                total: totalClientes,
                alDia: clientesAlDia,
                enMora: clientesEnMora,
                porcentajeAlDia: totalClientes > 0 ? Math.round((clientesAlDia / totalClientes) * 100) : 0
            },
            cartera: {
                ingresoPotencial,
                carteraMora,
                efectividadCobro: ingresoPotencial > 0 ? Math.round(((ingresoPotencial - carteraMora) / ingresoPotencial) * 100) : 0
            },
            empleados: {
                total: this.padronEmpleados.length,
                administradores: this.padronEmpleados.filter(e => e.rol === 'ADMINISTRADOR').length,
                revocados: this.padronEmpleados.filter(e => e.estado === 'REVOCADO').length
            },
            eventosAuditoriaTotal: this.eventosAuditoria.length
        };
    }

    /**
     * Autenticación multi-rol (Administrador u Operador) contra el padrón de empleados
     * @param {string} usuario - Correo institucional, ID de empleado o cédula
     * @param {string} clave - Contraseña de acceso
     * @param {string} rolSolicitado - 'ADMIN' | 'OPERADOR'
     * @returns {Object}
     */
    autenticarUsuario(usuario, clave, rolSolicitado = 'OPERADOR') {
        const u = (usuario || '').trim().toLowerCase();
        const digitosUsuario = u.replace(/\D/g, '');
        const p = (clave || '').trim();
        const rolSol = (rolSolicitado || 'OPERADOR').toUpperCase();

        // Buscar coincidencia en el padrón de empleados
        const empleado = this.padronEmpleados.find(e =>
            e.correo.toLowerCase() === u ||
            e.id.toLowerCase() === u ||
            e.documento.toLowerCase() === u ||
            (digitosUsuario.length >= 5 && String(e.documento || '').replace(/\D/g, '') === digitosUsuario) ||
            (u === 'admin' && e.rol === 'ADMINISTRADOR') ||
            (u === 'operario' && e.rol === 'OPERADOR')
        );

        if (!empleado) {
            return {
                ok: false,
                codigo: 401,
                error: 'Usuario o correo institucional no registrado en el sistema.'
            };
        }

        if (empleado.clave !== p) {
            return {
                ok: false,
                codigo: 401,
                error: 'Contraseña de acceso incorrecta.'
            };
        }

        if (empleado.estado === 'REVOCADO') {
            return {
                ok: false,
                codigo: 403,
                error: 'Acceso denegado: Los permisos de esta cuenta han sido REVOCADOS por la administración.'
            };
        }

        const rolNormalizado = empleado.rol === 'ADMINISTRADOR' ? 'ADMIN' : 'OPERADOR';
        const rolSolNormalizado = rolSol.includes('ADMIN') ? 'ADMIN' : 'OPERADOR';

        if (rolNormalizado !== rolSolNormalizado) {
            return {
                ok: false,
                codigo: 403,
                error: `El usuario ${empleado.nombre} tiene asignado el rol ${empleado.rol}. Seleccione el perfil correspondiente en el login.`
            };
        }

        this.operarioEnSesion = empleado.nombre;
        this.rolActivo = empleado.cargo;

        return {
            ok: true,
            codigo: 200,
            datos: {
                autenticado: true,
                id: empleado.id,
                empleadoId: empleado.id,
                rol: rolNormalizado,
                nombre: empleado.nombre,
                cargo: empleado.cargo,
                correo: empleado.correo,
                documento: empleado.documento
            }
        };
    }

    /**
     * Proyección segura de un empleado: nunca expone la contraseña por la API.
     * @param {Empleado} empleado
     * @returns {Object}
     */
    sanitizarEmpleado(empleado) {
        const { clave, ...publico } = empleado;
        return publico;
    }

    /**
     * Consulta el directorio de empleados con filtros (RF-03)
     */
    obtenerEmpleados(filtro = '', rol = 'TODOS', estado = 'TODOS') {
        const q = (filtro || '').trim().toUpperCase();
        const rolFiltro = (rol || 'TODOS').toUpperCase();
        const estadoFiltro = (estado || 'TODOS').toUpperCase();
        const filtrados = this.padronEmpleados.filter(e => {
            const matchTexto = !q ||
                e.nombre.toUpperCase().includes(q) ||
                e.documento.toUpperCase().includes(q) ||
                e.correo.toUpperCase().includes(q) ||
                e.cargo.toUpperCase().includes(q);
            const matchRol = rolFiltro === 'TODOS' || e.rol === rolFiltro;
            const matchEstado = estadoFiltro === 'TODOS' || e.estado === estadoFiltro;
            return matchTexto && matchRol && matchEstado;
        });

        return {
            ok: true,
            total: filtrados.length,
            empleados: filtrados.map(e => this.sanitizarEmpleado(e))
        };
    }

    /**
     * Da de alta a un nuevo empleado / usuario del sistema
     */
    crearEmpleado(datos = {}, operario = null) {
        const op = operario || this.operarioEnSesion;
        const { nombre, documento, telefono, correo, clave, cargo, rol, estado } = datos;

        if (!nombre || !documento || !correo || !clave || !cargo || !rol) {
            return { ok: false, codigo: 400, error: 'Todos los campos obligatorios deben ser diligenciados.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim())) {
            return { ok: false, codigo: 400, error: `El correo institucional ${correo} no tiene un formato válido.` };
        }
        if (!['ADMINISTRADOR', 'OPERADOR'].includes(String(rol).toUpperCase())) {
            return { ok: false, codigo: 400, error: "El rol debe ser 'ADMINISTRADOR' u 'OPERADOR'." };
        }

        const correoNorm = String(correo).trim().toLowerCase();
        const docNorm = String(documento).trim().toUpperCase();

        const existe = this.padronEmpleados.find(e =>
            e.correo.toLowerCase() === correoNorm || this.documentosIguales(e.documento, docNorm)
        );
        if (existe) {
            return { ok: false, codigo: 409, error: `Ya existe un empleado con el correo ${correo} o documento ${documento}.` };
        }

        const maxId = this.padronEmpleados.reduce((max, e) => Math.max(max, parseInt(String(e.id).replace(/\D/g, ''), 10) || 0), 0);
        const nuevoId = `EMP-${String(maxId + 1).padStart(3, '0')}`;

        const nuevoEmpleado = new Empleado({
            id: nuevoId,
            nombre: String(nombre).trim(),
            documento: docNorm,
            telefono: String(telefono || '').trim(),
            correo: correoNorm,
            clave: String(clave).trim(),
            cargo: String(cargo).trim(),
            rol: String(rol).toUpperCase(),
            estado: String(estado || 'ACTIVO').toUpperCase(),
            fechaCreacion: this.obtenerFechaHoraActual().slice(0, 10)
        });

        this.padronEmpleados.push(nuevoEmpleado);

        this.registrarEventoAuditoria(
            'ADM',
            'EMPLEADO_CREADO',
            'Administración Empleados',
            `${nuevoId} • Personal`,
            `Alta de nuevo empleado: ${nuevoEmpleado.nombre} (${nuevoEmpleado.cargo}) con rol ${nuevoEmpleado.rol}.`,
            op
        );

        this.persistir((pool) => this._dbUpsertEmpleado(pool, nuevoEmpleado));

        return {
            ok: true,
            codigo: 201,
            mensaje: `Empleado ${nuevoEmpleado.nombre} registrado exitosamente con credenciales de acceso.`,
            empleado: this.sanitizarEmpleado(nuevoEmpleado)
        };
    }

    /**
     * Modifica los datos de un empleado existente
     */
    editarEmpleado(idEmpleado, datos = {}, operario = null) {
        const op = operario || this.operarioEnSesion;
        const id = (idEmpleado || '').trim();
        const empleado = this.padronEmpleados.find(e => e.id === id);

        if (!empleado) {
            return { ok: false, codigo: 404, error: `No se encontró el empleado con código ${id}.` };
        }

        const { nombre, documento, telefono, correo, clave, cargo, rol, estado } = datos;

        if (correo) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim())) {
                return { ok: false, codigo: 400, error: `El correo institucional ${correo} no tiene un formato válido.` };
            }
            const dupCorreo = this.padronEmpleados.find(e => e.id !== id && e.correo.toLowerCase() === String(correo).trim().toLowerCase());
            if (dupCorreo) {
                return { ok: false, codigo: 409, error: `El correo ${correo} ya está asignado a ${dupCorreo.nombre}.` };
            }
        }
        if (documento) {
            const dupDoc = this.padronEmpleados.find(e => e.id !== id && this.documentosIguales(e.documento, documento));
            if (dupDoc) {
                return { ok: false, codigo: 409, error: `El documento ${documento} ya está registrado para ${dupDoc.nombre}.` };
            }
        }
        if (rol && !['ADMINISTRADOR', 'OPERADOR'].includes(String(rol).toUpperCase())) {
            return { ok: false, codigo: 400, error: "El rol debe ser 'ADMINISTRADOR' u 'OPERADOR'." };
        }
        if (empleado.esCuentaMaestra()) {
            if (rol && String(rol).toUpperCase() !== 'ADMINISTRADOR') {
                return { ok: false, codigo: 400, error: 'La cuenta maestra de Administración General debe conservar el rol ADMINISTRADOR.' };
            }
            if (estado && String(estado).toUpperCase() === 'REVOCADO') {
                return { ok: false, codigo: 400, error: 'No es posible revocar permisos a la cuenta raíz de Administración General.' };
            }
        }

        if (nombre) empleado.nombre = String(nombre).trim();
        if (documento) empleado.documento = String(documento).trim().toUpperCase();
        if (telefono !== undefined && telefono !== null) empleado.telefono = String(telefono).trim();
        if (correo) empleado.correo = String(correo).trim().toLowerCase();
        if (clave && String(clave).trim().length > 0) empleado.clave = String(clave).trim();
        if (cargo) empleado.cargo = String(cargo).trim();
        if (rol) empleado.rol = String(rol).toUpperCase() === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'OPERADOR';
        if (estado) empleado.estado = String(estado).toUpperCase() === 'REVOCADO' ? 'REVOCADO' : 'ACTIVO';

        this.registrarEventoAuditoria(
            'ADM',
            'EMPLEADO_MODIFICADO',
            'Administración Empleados',
            `${id} • Personal`,
            `Modificación de empleado ${empleado.nombre}: Cargo: ${empleado.cargo}, Rol: ${empleado.rol}, Estado: ${empleado.estado}.`,
            op
        );

        this.persistir((pool) => this._dbUpsertEmpleado(pool, empleado));

        return {
            ok: true,
            codigo: 200,
            mensaje: `Datos del empleado ${empleado.nombre} actualizados correctamente.`,
            empleado: this.sanitizarEmpleado(empleado)
        };
    }

    /**
     * Revoca o restablece los permisos de acceso de un empleado.
     * @param {string} idEmpleado
     * @param {string} [operario]
     * @param {string} [estadoDeseado] - 'ACTIVO' | 'REVOCADO'; si se omite se conmuta
     */
    cambiarPermisosEmpleado(idEmpleado, operario = null, estadoDeseado = null) {
        const op = operario || this.operarioEnSesion;
        const id = (idEmpleado || '').trim();
        const empleado = this.padronEmpleados.find(e => e.id === id);

        if (!empleado) {
            return { ok: false, codigo: 404, error: `No se encontró el empleado con código ${id}.` };
        }
        if (empleado.esCuentaMaestra()) {
            return { ok: false, codigo: 403, error: 'No es posible revocar permisos a la cuenta raíz de Administración General.' };
        }
        if (operario && operario === empleado.nombre) {
            return { ok: false, codigo: 400, error: 'No puede modificar los permisos de la cuenta con la que tiene la sesión activa.' };
        }

        const solicitado = estadoDeseado ? String(estadoDeseado).toUpperCase() : null;
        if (solicitado && solicitado !== 'ACTIVO' && solicitado !== 'REVOCADO') {
            return { ok: false, codigo: 400, error: "El estado de permisos debe ser 'ACTIVO' o 'REVOCADO'." };
        }
        if (solicitado && solicitado !== empleado.estado) {
            empleado.estado = solicitado;
        } else if (!solicitado) {
            empleado.alternarPermisos();
        }

        const revocado = empleado.estado === 'REVOCADO';
        const tipoEvento = revocado ? 'PERMISOS_REVOCADOS' : 'PERMISOS_RESTABLECIDOS';
        const descripcion = revocado
            ? `Revocación de credenciales y suspensión de acceso para ${empleado.nombre} (${empleado.cargo}).`
            : `Restablecimiento de credenciales y activación de acceso para ${empleado.nombre} (${empleado.cargo}).`;

        this.registrarEventoAuditoria('ADM', tipoEvento, 'Administración Empleados', `${id} • Seguridad`, descripcion, op);

        this.persistir((pool) => this._dbUpsertEmpleado(pool, empleado));

        return {
            ok: true,
            codigo: 200,
            nuevoEstado: empleado.estado,
            mensaje: descripcion,
            empleado: this.sanitizarEmpleado(empleado)
        };
    }

    /**
     * Elimina la cuenta de un empleado del sistema
     */
    eliminarEmpleado(idEmpleado, operario = null) {
        const op = operario || this.operarioEnSesion;
        const id = (idEmpleado || '').trim();
        const idx = this.padronEmpleados.findIndex(e => e.id === id);

        if (idx === -1) {
            return { ok: false, codigo: 404, error: `No se encontró el empleado con código ${id}.` };
        }

        const empleado = this.padronEmpleados[idx];
        if (empleado.esCuentaMaestra()) {
            return { ok: false, codigo: 403, error: 'No está permitido eliminar la cuenta raíz de Administración General.' };
        }
        if (operario && operario === empleado.nombre) {
            return { ok: false, codigo: 400, error: 'No puede eliminar la cuenta con la que tiene la sesión activa.' };
        }

        this.padronEmpleados.splice(idx, 1);

        this.registrarEventoAuditoria(
            'ADM',
            'EMPLEADO_ELIMINADO',
            'Administración Empleados',
            `${id} • Baja Personal`,
            `Cuenta de empleado ${empleado.nombre} (${empleado.correo}) dada de baja permanentemente.`,
            op
        );

        this.persistir((pool) => this._dbEliminarEmpleado(pool, empleado));

        return {
            ok: true,
            codigo: 200,
            mensaje: `La cuenta del empleado ${empleado.nombre} ha sido eliminada del sistema.`
        };
    }
}

// Singleton del Controlador
const controlador = new ControladorParqueadero();

/**
 * Envía el resultado de un método del controlador como respuesta HTTP.
 * Normaliza el contrato JSON: toda respuesta de error incluye `error` (Iteración 1) y
 * `mensaje` (Iteración 2), de modo que el frontend pueda mostrar el texto sin ambigüedad.
 */
function responder(res, resultado, codigoPorDefecto = 200) {
    const cuerpo = { ...resultado };
    if (!cuerpo.ok) {
        if (!cuerpo.mensaje) cuerpo.mensaje = cuerpo.error;
        if (!cuerpo.error) cuerpo.error = cuerpo.mensaje;
    }
    res.status(resultado.codigo || codigoPorDefecto).json(cuerpo);
}

function falloInterno(res, error) {
    res.status(500).json({ ok: false, error: error.message, mensaje: error.message });
}

/**
 * Handlers HTTP para Express
 */
const handlers = {
    // POST /api/auth/login
    login: async (req, res) => {
        try {
            const { usuario, clave, password, rol } = req.body || {};
            const resultado = controlador.autenticarUsuario(usuario, clave !== undefined ? clave : password, rol);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/admin/metricas
    obtenerMetricasAdmin: async (req, res) => {
        try {
            res.json({ ok: true, datos: controlador.obtenerMetricasAdmin() });
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // PUT /api/admin/usuarios/:placa
    editarCliente: async (req, res) => {
        try {
            const resultado = controlador.editarSuscriptor(req.params.placa, req.body || {}, (req.body || {}).operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // DELETE /api/admin/usuarios/:placa
    eliminarCliente: async (req, res) => {
        try {
            const operario = (req.body && req.body.operario) || req.query.operario;
            const resultado = controlador.eliminarSuscriptor(req.params.placa, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/admin/empleados
    obtenerEmpleados: async (req, res) => {
        try {
            const { filtro, rol, estado } = req.query;
            res.json(controlador.obtenerEmpleados(filtro, rol, estado));
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/admin/empleados
    crearEmpleado: async (req, res) => {
        try {
            const resultado = controlador.crearEmpleado(req.body || {}, (req.body || {}).operario);
            responder(res, resultado, 201);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // PUT /api/admin/empleados/:id
    editarEmpleado: async (req, res) => {
        try {
            const resultado = controlador.editarEmpleado(req.params.id, req.body || {}, (req.body || {}).operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // PATCH /api/admin/empleados/:id/permisos
    cambiarPermisosEmpleado: async (req, res) => {
        try {
            const body = req.body || {};
            const resultado = controlador.cambiarPermisosEmpleado(req.params.id, body.operario, body.estado);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // DELETE /api/admin/empleados/:id
    eliminarEmpleado: async (req, res) => {
        try {
            const operario = (req.body && req.body.operario) || req.query.operario;
            const resultado = controlador.eliminarEmpleado(req.params.id, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/estado
    obtenerEstado: async (req, res) => {
        try {
            res.json({
                ok: true,
                persistencia: controlador.modoPersistencia,
                operario: controlador.operarioEnSesion,
                rol: controlador.rolActivo,
                datos: {
                    padronClientes: controlador.padronClientes,
                    // Nunca se expone la contraseña de las cuentas por la API
                    padronEmpleados: controlador.padronEmpleados.map(e => controlador.sanitizarEmpleado(e)),
                    inventarioCeldas: controlador.inventarioCeldas.map(c => controlador.serializarCelda(c)),
                    movimientosActivos: controlador.movimientosActivos.map(m => ({
                        transaccion: m.idTicket,
                        placa: m.placa,
                        titular: m.titular,
                        documento: m.documento,
                        tipo: m.tipo,
                        celda: m.codigoCelda,
                        fechaEntrada: m.fechaHoraIngreso,
                        permanencia: m.permanencia,
                        operario: m.operarioResponsable,
                        novedades: m.novedades
                    })),
                    eventosAuditoria: controlador.eventosAuditoria,
                    ultimoComprobante: controlador.ultimoComprobante ? {
                        transaccion: controlador.ultimoComprobante.idTicket,
                        placa: controlador.ultimoComprobante.placa,
                        titular: controlador.ultimoComprobante.titular,
                        documento: controlador.ultimoComprobante.documento,
                        tipo: controlador.ultimoComprobante.tipo,
                        celda: controlador.ultimoComprobante.codigoCelda,
                        fechaEntrada: controlador.ultimoComprobante.fechaHoraIngreso,
                        permanencia: controlador.ultimoComprobante.permanencia,
                        operario: controlador.ultimoComprobante.operarioResponsable,
                        novedades: controlador.ultimoComprobante.novedades
                    } : null
                }
            });
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/movimientos/entrada (RF-01, RF-02, RF-03, RF-04)
    registrarEntrada: async (req, res) => {
        try {
            const { placa, celda, observacion, operario } = req.body || {};
            const resultado = controlador.procesarIngresoVehicular(placa, celda, observacion, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/movimientos/salida (RF-07, RF-08, RF-09)
    registrarSalida: async (req, res) => {
        try {
            const { placa, novedad, operario } = req.body || {};
            const resultado = controlador.procesarSalidaVehicular(placa, novedad, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/movimientos/novedad (HU-05)
    registrarNovedad: async (req, res) => {
        try {
            const { placa, novedad, operario } = req.body || {};
            const resultado = controlador.procesarNovedadInmutable(placa, novedad, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/pagos (RF-06 / HU-04)
    registrarPago: async (req, res) => {
        try {
            const { placa, medioPago, monto, operario } = req.body || {};
            const resultado = controlador.procesarRecaudoMensualidad(placa, medioPago, monto, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/clientes (alta desde Caja - Iteración 1 / Iteración 2)
    registrarCliente: async (req, res) => {
        try {
            const resultado = controlador.registrarNuevoSuscriptor({ ...(req.body || {}), origen: (req.body || {}).origen || 'CAJA' });
            responder(res, resultado, 201);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/pagos/vincular (alta desde Administración - Iteración 2: CP-USU-01 / CP-USU-02)
    vincularCliente: async (req, res) => {
        try {
            const resultado = controlador.registrarNuevoSuscriptor({ ...(req.body || {}), origen: 'ADMIN' });
            responder(res, resultado, 201);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/celdas
    listarCeldas: async (req, res) => {
        try {
            const celdas = controlador.inventarioCeldas.map(c => controlador.serializarCelda(c));
            res.json({ ok: true, total: celdas.length, celdas });
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/celdas/:codigo (RF-10)
    detalleCelda: async (req, res) => {
        try {
            responder(res, controlador.consultarDetalleCelda(req.params.codigo));
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // PATCH /api/celdas/:codigo/mantenimiento (RF-08: CP-CEL-02 / CP-CEL-03 / CP-CEL-04)
    cambiarMantenimientoCelda: async (req, res) => {
        try {
            const { estado, motivo, operario } = req.body || {};
            const resultado = controlador.cambiarEstadoMantenimientoCelda(req.params.codigo, estado, motivo, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // POST /api/celdas/reubicar (RF-09: CP-CEL-05 / CP-CEL-06)
    reubicarVehiculo: async (req, res) => {
        try {
            const { codigoOrigen, codigoDestino, operario } = req.body || {};
            const resultado = controlador.reubicarVehiculo(codigoOrigen, codigoDestino, operario);
            responder(res, resultado);
        } catch (error) {
            falloInterno(res, error);
        }
    },

    // GET /api/historial (RF-10 / HU-07)
    obtenerHistorial: async (req, res) => {
        try {
            const { filtro, tipo } = req.query;
            let auditoria = controlador.consultarBitacoraAuditoria(filtro);
            if (tipo && tipo !== 'TODOS') {
                auditoria = auditoria.filter(e => e.tipo === tipo);
            }
            res.json({
                ok: true,
                total: auditoria.length,
                eventos: auditoria
            });
        } catch (error) {
            falloInterno(res, error);
        }
    }
};

module.exports = {
    ControladorParqueadero,
    controlador,
    ...handlers
};
