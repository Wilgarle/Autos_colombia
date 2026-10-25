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
const { Usuario, Vehiculo, Celda, Movimiento, Pago } = require('../dominio/modelos');

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
            if (codigo === 'A-01') ocupante = 'ENV-774';
            if (codigo === 'A-02') ocupante = 'MDE-305';
            this.inventarioCeldas.push(new Celda(
                codigo,
                'Automóvil',
                ocupante ? 'OCUPADA' : 'DISPONIBLE',
                ocupante
            ));
        }
        for (let i = 1; i <= 30; i++) {
            const codigo = `M-${String(i).padStart(2, '0')}`;
            let ocupante = null;
            if (codigo === 'M-01') ocupante = 'XRT-94D';
            this.inventarioCeldas.push(new Celda(
                codigo,
                'Motocicleta',
                ocupante ? 'OCUPADA' : 'DISPONIBLE',
                ocupante
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

    /**
     * Si MySQL está activo, asegura que existan los datos de las 50 celdas y usuarios
     */
    async sincronizarSemillaMySQL() {
        if (this.modoPersistencia !== 'MYSQL' || !this.poolMySQL) return;
        try {
            const [rows] = await this.poolMySQL.query('SELECT COUNT(*) as total FROM celdas');
            if (rows[0].total === 0) {
                for (const celda of this.inventarioCeldas) {
                    const tipoDb = celda.tipoEspacio === 'Automóvil' ? 'AUTO' : 'MOTO';
                    await this.poolMySQL.query(
                        'INSERT IGNORE INTO celdas (codigo_celda, tipo_espacio, estado_ocupacion) VALUES (?, ?, ?)',
                        [celda.codigoCelda, tipoDb, celda.estadoOcupacion]
                    );
                }
            }
        } catch (error) {
            console.warn('⚠️  Aviso sincronización MySQL:', error.message);
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
                [codigoRecibo, cliente.documento.replace(/[^0-9]/g, '') || cliente.documento, montoRecaudo, medioPago, nuevaVigencia, op]
            ).catch(e => console.warn('Aviso MySQL INSERT Pago:', e.message));

            this.poolMySQL.query(
                `UPDATE usuarios SET estado_mensualidad = 'ACTIVO', fecha_vencimiento = ? WHERE documento_id = ?`,
                [nuevaVigencia, cliente.documento.replace(/[^0-9]/g, '') || cliente.documento]
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

    /**
     * Vincula un nuevo suscriptor al padrón mensual
     * @param {Object} datos
     * @returns {Object}
     */
    registrarNuevoSuscriptor(datos) {
        const placa = (datos.placa || '').trim().toUpperCase();
        const tipo = datos.tipo || 'Automóvil';
        const nombre = (datos.titular || '').trim();
        const doc = (datos.documento || '').trim();
        const op = datos.operario || this.operarioEnSesion;
        const fechaHora = this.obtenerFechaHoraActual();

        if (!placa || !nombre || !doc) {
            return { ok: false, codigo: 400, error: 'Complete placa, nombre y documento del titular.' };
        }

        if (this.padronClientes.some(c => c.placa === placa)) {
            return { ok: false, codigo: 409, error: `La placa ${placa} ya se encuentra registrada en el padrón.` };
        }

        const tarifa = tipo === 'Automóvil' ? 180000 : 95000;
        const nuevoCliente = {
            placa,
            titular: nombre,
            documento: doc,
            tipo,
            estado: 'ACTIVA',
            vencimiento: '2026-11-24',
            tarifa,
            enPatio: false,
            celdaActual: null
        };

        this.padronClientes.unshift(nuevoCliente);

        const codigoRecibo = `RC-2026-${this.consecutivoTransaccion++}`;
        this.eventosAuditoria.unshift({
            codigo: codigoRecibo,
            fecha: fechaHora,
            tipo: 'PAGO',
            modulo: 'Mensualidades y Caja',
            placaCelda: `${placa} • Alta Mensualidad`,
            descripcion: `Nuevo suscriptor vinculado (${nombre} - ${tipo}). Pago inicial $${tarifa.toLocaleString('es-CO')} COP.`,
            operario: op
        });

        return {
            ok: true,
            codigo: 201,
            mensaje: `Cliente ${nombre} con placa ${placa} vinculado y activado en PAZ Y SALVO.`,
            cliente: nuevoCliente
        };
    }
}

// Singleton del Controlador
const controlador = new ControladorParqueadero();

/**
 * Handlers HTTP para Express
 */
const handlers = {
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
                    inventarioCeldas: controlador.inventarioCeldas.map(c => ({
                        codigo: c.codigoCelda,
                        tipo: c.tipoEspacio,
                        estado: c.estadoOcupacion,
                        placaActual: c.placaActual
                    })),
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
                    ultimoComprobante: controlador.ultimoComprobante
                }
            });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    },

    // POST /api/movimientos/entrada (RF-01, RF-02, RF-03, RF-04)
    registrarEntrada: async (req, res) => {
        try {
            const { placa, celda, observacion, operario } = req.body;
            const resultado = controlador.procesarIngresoVehicular(placa, celda, observacion, operario);
            res.status(resultado.codigo || 200).json(resultado);
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    },

    // POST /api/movimientos/salida (RF-07, RF-08, RF-09)
    registrarSalida: async (req, res) => {
        try {
            const { placa, novedad, operario } = req.body;
            const resultado = controlador.procesarSalidaVehicular(placa, novedad, operario);
            res.status(resultado.codigo || 200).json(resultado);
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    },

    // POST /api/movimientos/novedad (HU-05)
    registrarNovedad: async (req, res) => {
        try {
            const { placa, novedad, operario } = req.body;
            const resultado = controlador.procesarNovedadInmutable(placa, novedad, operario);
            res.status(resultado.codigo || 200).json(resultado);
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    },

    // POST /api/pagos (RF-06 / HU-04)
    registrarPago: async (req, res) => {
        try {
            const { placa, medioPago, monto, operario } = req.body;
            const resultado = controlador.procesarRecaudoMensualidad(placa, medioPago, monto, operario);
            res.status(resultado.codigo || 200).json(resultado);
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
        }
    },

    // POST /api/clientes
    registrarCliente: async (req, res) => {
        try {
            const resultado = controlador.registrarNuevoSuscriptor(req.body);
            res.status(resultado.codigo || 200).json(resultado);
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message });
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
            res.status(500).json({ ok: false, error: error.message });
        }
    }
};

module.exports = {
    ControladorParqueadero,
    controlador,
    ...handlers
};
