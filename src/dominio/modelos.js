/**
 * ============================================================================
 * SISTEMA DE GESTIÓN OPERATIVA - PARQUEADERO AUTOS COLOMBIA
 * Módulo de Dominio: Entidades de Negocio (Modelos Orientados a Objetos ES6)
 * Basado estrictamente en el Diagrama de Clases UML (docs/Diagrama de Clases UML.drawio.xml)
 * Paquete: com.autoscolombia.dominio.entidades
 * ============================================================================
 */

/**
 * Entidad Usuario (Titular de Mensualidad)
 */
class Usuario {
    /**
     * @param {string} documentoId - Cédula o NIT del titular
     * @param {string} nombresApellidos - Nombre completo del titular
     * @param {string} telefonoContacto - Teléfono o móvil
     * @param {string} estadoMensualidad - 'ACTIVO' | 'ACTIVA' | 'MORA'
     * @param {string|Date} fechaVencimiento - Fecha de corte de la suscripción (YYYY-MM-DD)
     */
    constructor(documentoId, nombresApellidos, telefonoContacto, estadoMensualidad = 'ACTIVO', fechaVencimiento) {
        this.documentoId = documentoId;
        this.nombresApellidos = nombresApellidos;
        this.telefonoContacto = telefonoContacto;
        this.estadoMensualidad = estadoMensualidad;
        this.fechaVencimiento = fechaVencimiento;
    }

    /**
     * Valida si la suscripción del titular se encuentra vigente al día de hoy.
     * @param {string|Date} [fechaReferencia] - Opcional para pruebas o fecha del sistema
     * @returns {boolean}
     */
    validarVigencia(fechaReferencia) {
        const hoyStr = fechaReferencia ? new Date(fechaReferencia).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const vencStr = typeof this.fechaVencimiento === 'string' 
            ? this.fechaVencimiento.slice(0, 10) 
            : new Date(this.fechaVencimiento).toISOString().slice(0, 10);

        const estadoNormalizado = (this.estadoMensualidad || '').toUpperCase();
        const estaActivoPorEstado = estadoNormalizado === 'ACTIVO' || estadoNormalizado === 'ACTIVA';
        const vigenciaFecha = vencStr >= hoyStr;

        return estaActivoPorEstado && vigenciaFecha;
    }

    /**
     * Actualiza la fecha de vencimiento y coloca el estado en 'ACTIVO' (Paz y Salvo).
     * @param {string|Date} nuevaFecha
     */
    actualizarVigencia(nuevaFecha) {
        this.fechaVencimiento = typeof nuevaFecha === 'string'
            ? nuevaFecha.slice(0, 10)
            : new Date(nuevaFecha).toISOString().slice(0, 10);
        this.estadoMensualidad = 'ACTIVO';
    }

    /**
     * Retorna una cadena con el resumen del estado de cuenta del usuario.
     * @returns {string}
     */
    obtenerEstadoCuenta() {
        const esVigente = this.validarVigencia();
        const estadoDesc = esVigente ? 'PAZ Y SALVO (ACTIVO)' : 'EN MORA (SUSPENDIDO)';
        return `Titular: ${this.nombresApellidos} [Doc: ${this.documentoId}] - Estado: ${estadoDesc} - Vence: ${this.fechaVencimiento}`;
    }

    /**
     * Iteración 2 (RF-04 / HU-03): Actualiza los datos maestros del titular sin alterar
     * su documento (clave natural) ni su historial transaccional.
     * @param {Object} datos
     * @param {string} [datos.nombresApellidos]
     * @param {string} [datos.telefonoContacto]
     * @param {string} [datos.estadoMensualidad]
     * @param {string|Date} [datos.fechaVencimiento]
     * @returns {Usuario} this (encadenable)
     */
    actualizarDatosMaestros(datos = {}) {
        if (datos.nombresApellidos && String(datos.nombresApellidos).trim()) {
            this.nombresApellidos = String(datos.nombresApellidos).trim();
        }
        if (datos.telefonoContacto !== undefined && datos.telefonoContacto !== null) {
            this.telefonoContacto = String(datos.telefonoContacto).trim();
        }
        if (datos.estadoMensualidad) {
            this.estadoMensualidad = datos.estadoMensualidad;
        }
        if (datos.fechaVencimiento) {
            this.fechaVencimiento = typeof datos.fechaVencimiento === 'string'
                ? datos.fechaVencimiento.slice(0, 10)
                : new Date(datos.fechaVencimiento).toISOString().slice(0, 10);
        }
        return this;
    }

    /**
     * Iteración 2 (RF-05 / HU-04 / RNF-01): Un titular solo puede darse de baja si
     * ninguno de sus vehículos se encuentra estacionado en patio.
     * @param {Array<string>} [vehiculosEnPatio] - Placas del titular con movimiento EN_PATIO
     * @returns {boolean}
     */
    puedeDarseDeBaja(vehiculosEnPatio = []) {
        return !Array.isArray(vehiculosEnPatio) || vehiculosEnPatio.length === 0;
    }
}

/**
 * Entidad Vehiculo
 */
class Vehiculo {
    /**
     * @param {string} placa - Matrícula (6 caracteres)
     * @param {string} documentoId - Cédula del titular propietario
     * @param {string} tipoVehiculo - 'AUTO' | 'MOTO' | 'Automóvil' | 'Motocicleta'
     * @param {string} marcaColor - Marca, línea y color
     */
    constructor(placa, documentoId, tipoVehiculo, marcaColor = 'No especificado') {
        this.placa = (placa || '').toUpperCase().trim();
        this.documentoId = documentoId;
        this.tipoVehiculo = tipoVehiculo;
        this.marcaColor = marcaColor;
    }

    /**
     * Normaliza el tipo vehicular a las constantes estándar 'AUTO' o 'MOTO'.
     * @returns {'AUTO'|'MOTO'}
     */
    obtenerTipoNormalizado() {
        const t = (this.tipoVehiculo || '').toUpperCase();
        if (t.includes('AUTO') || t.includes('CARRO')) return 'AUTO';
        if (t.includes('MOTO')) return 'MOTO';
        return 'AUTO';
    }

    /**
     * Retorna la información completa del vehículo.
     * @returns {string}
     */
    consultarDatosPlaca() {
        return `Placa: ${this.placa} | Tipo: ${this.tipoVehiculo} | Titular Doc: ${this.documentoId} | Marca/Color: ${this.marcaColor}`;
    }

    /**
     * Valida compatibilidad entre el tipo de vehículo y el tipo de espacio de la celda.
     * @param {string} tipoCelda - 'AUTO' | 'MOTO' | 'Automóvil' | 'Motocicleta'
     * @returns {boolean}
     */
    validarCompatibilidad(tipoCelda) {
        const vTipo = this.obtenerTipoNormalizado();
        const cTipo = (tipoCelda || '').toUpperCase();
        if (vTipo === 'AUTO') {
            return cTipo.includes('AUTO') || cTipo.includes('CARRO');
        }
        if (vTipo === 'MOTO') {
            return cTipo.includes('MOTO');
        }
        return false;
    }
}

/**
 * Entidad Celda (Espacio en Patio)
 */
class Celda {
    /**
     * @param {string} codigoCelda - Código único (Ej: 'A-01' a 'A-20', 'M-01' a 'M-30')
     * @param {string} tipoEspacio - 'AUTO' | 'MOTO' | 'Automóvil' | 'Motocicleta'
     * @param {string} estadoOcupacion - 'DISPONIBLE' | 'OCUPADA' | 'MANTENIMIENTO' (Iteración 2)
     * @param {string|null} [placaActual] - Placa del vehículo actualmente aparcado
     * @param {string|null} [motivoMantenimiento] - Motivo del bloqueo (solo en MANTENIMIENTO)
     */
    constructor(codigoCelda, tipoEspacio, estadoOcupacion = 'DISPONIBLE', placaActual = null, motivoMantenimiento = null) {
        this.codigoCelda = codigoCelda;
        this.tipoEspacio = tipoEspacio;
        this.estadoOcupacion = estadoOcupacion;
        this.placaActual = placaActual;
        this.motivoMantenimiento = motivoMantenimiento;
    }

    /**
     * Verifica si la celda está libre para asignación.
     * Una celda en MANTENIMIENTO NO se considera disponible (RF-08).
     * @returns {boolean}
     */
    verificarDisponibilidad() {
        return (this.estadoOcupacion || '').toUpperCase() === 'DISPONIBLE';
    }

    /**
     * Ocupa la celda con la placa indicada.
     * @param {string} [placa]
     */
    ocuparCelda(placa = null) {
        this.estadoOcupacion = 'OCUPADA';
        this.placaActual = placa;
        this.motivoMantenimiento = null;
    }

    /**
     * Libera la celda volviéndola disponible.
     */
    liberarCelda() {
        this.estadoOcupacion = 'DISPONIBLE';
        this.placaActual = null;
    }

    /**
     * Normaliza el tipo de espacio a 'AUTO' | 'MOTO'.
     * @returns {'AUTO'|'MOTO'}
     */
    obtenerTipoNormalizado() {
        const t = (this.tipoEspacio || '').toUpperCase();
        return t.includes('MOTO') ? 'MOTO' : 'AUTO';
    }

    /**
     * Iteración 2 (RF-08 / HU-06 / RNF-01): Inhabilita la celda por mantenimiento.
     * Está prohibido bloquear una celda OCUPADA.
     * @param {string} [motivo] - Descripción del motivo del bloqueo
     * @returns {boolean} true si el bloqueo fue aplicado; false si la celda está ocupada
     */
    ponerEnMantenimiento(motivo = '') {
        if ((this.estadoOcupacion || '').toUpperCase() === 'OCUPADA') {
            return false;
        }
        this.estadoOcupacion = 'MANTENIMIENTO';
        this.placaActual = null;
        this.motivoMantenimiento = (motivo || '').trim() || 'Mantenimiento operativo de patio.';
        return true;
    }

    /**
     * Iteración 2 (RF-08 / HU-06): Rehabilita una celda en MANTENIMIENTO a DISPONIBLE.
     * @returns {boolean} true si estaba en mantenimiento y fue rehabilitada
     */
    habilitarCelda() {
        if ((this.estadoOcupacion || '').toUpperCase() !== 'MANTENIMIENTO') {
            return false;
        }
        this.estadoOcupacion = 'DISPONIBLE';
        this.motivoMantenimiento = null;
        return true;
    }

    /**
     * Iteración 2 (RF-09 / HU-07 / RNF-01): Valida que un vehículo pueda trasladarse de
     * la celda origen a la celda destino (origen OCUPADA, destino DISPONIBLE, mismo tipo).
     * @param {Celda} origen
     * @param {Celda} destino
     * @returns {{ok: boolean, error?: string}}
     */
    static validarReubicacion(origen, destino) {
        if (!origen || !destino) {
            return { ok: false, error: 'La celda de origen o destino no existe en el patio.' };
        }
        if (origen.codigoCelda === destino.codigoCelda) {
            return { ok: false, error: 'La celda de destino debe ser diferente a la celda de origen.' };
        }
        if ((origen.estadoOcupacion || '').toUpperCase() !== 'OCUPADA') {
            return { ok: false, error: `La celda de origen ${origen.codigoCelda} no tiene un vehículo estacionado para reubicar.` };
        }
        if ((destino.estadoOcupacion || '').toUpperCase() === 'MANTENIMIENTO') {
            return { ok: false, error: `La celda de destino ${destino.codigoCelda} se encuentra en MANTENIMIENTO y no admite vehículos.` };
        }
        if (!destino.verificarDisponibilidad()) {
            return { ok: false, error: `La celda de destino ${destino.codigoCelda} no está DISPONIBLE (ya está ocupada).` };
        }
        if (origen.obtenerTipoNormalizado() !== destino.obtenerTipoNormalizado()) {
            return {
                ok: false,
                error: `Incompatibilidad de categoría: un vehículo de ${origen.tipoEspacio} solo puede reubicarse en celdas de ${origen.tipoEspacio} (destino ${destino.codigoCelda} es de ${destino.tipoEspacio}).`
            };
        }
        return { ok: true };
    }
}

/**
 * Entidad Movimiento (Entrada, Salida y Novedad Operativa)
 */
class Movimiento {
    /**
     * @param {string} idTicket - Identificador de transacción (Ej: 'TRX-2026-1041')
     * @param {string} placa - Placa del vehículo
     * @param {string} codigoCelda - Código de celda asignada
     * @param {string|Date} fechaHoraIngreso - Momento de entrada
     * @param {string|Date|null} fechaHoraSalida - Momento de salida (null mientras esté en patio)
     * @param {string} novedadOperativa - Bitácora de observaciones del estado físico
     * @param {string} estadoMovimiento - 'EN_PATIO' | 'FINALIZADO'
     * @param {string} operarioResponsable - Nombre del operario en turno
     * @param {Object} [datosAdicionales] - Titular, documento, tipo, permanencia para UI
     */
    constructor(
        idTicket,
        placa,
        codigoCelda,
        fechaHoraIngreso,
        fechaHoraSalida = null,
        novedadOperativa = 'Sin novedades reportadas',
        estadoMovimiento = 'EN_PATIO',
        operarioResponsable = 'Carlos Ríos',
        datosAdicionales = {}
    ) {
        this.idTicket = idTicket;
        this.placa = (placa || '').toUpperCase().trim();
        this.codigoCelda = codigoCelda;
        this.fechaHoraIngreso = fechaHoraIngreso;
        this.fechaHoraSalida = fechaHoraSalida;
        this.novedadOperativa = novedadOperativa;
        this.estadoMovimiento = estadoMovimiento;
        this.operarioResponsable = operarioResponsable;

        // Metadatos auxiliares para compatibilidad directa con UI
        this.titular = datosAdicionales.titular || '';
        this.documento = datosAdicionales.documento || '';
        this.tipo = datosAdicionales.tipo || '';
        this.permanencia = datosAdicionales.permanencia || '00h 01m';
        this.novedades = Array.isArray(datosAdicionales.novedades)
            ? datosAdicionales.novedades
            : [novedadOperativa];
    }

    /**
     * Registra la entrada marcando estado EN_PATIO.
     * @returns {boolean}
     */
    registrarEntrada() {
        this.estadoMovimiento = 'EN_PATIO';
        if (!this.fechaHoraIngreso) {
            this.fechaHoraIngreso = new Date().toISOString().replace('T', ' ').slice(0, 19);
        }
        return true;
    }

    /**
     * Registra la salida marcando estado FINALIZADO y asignando timestamp de salida.
     * @param {string|Date} [fechaHoraSalida]
     * @returns {boolean}
     */
    registrarSalida(fechaHoraSalida) {
        this.estadoMovimiento = 'FINALIZADO';
        this.fechaHoraSalida = fechaHoraSalida || new Date().toISOString().replace('T', ' ').slice(0, 19);
        return true;
    }

    /**
     * Anexa una novedad operativa física al vehículo.
     * @param {string} detalle
     */
    anexarNovedad(detalle) {
        if (!detalle) return;
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
        const entrada = `${timestamp} — ${detalle}`;
        if (!this.novedadOperativa || this.novedadOperativa === 'Sin novedades reportadas') {
            this.novedadOperativa = entrada;
        } else {
            this.novedadOperativa += ` | ${entrada}`;
        }
        if (!this.novedades) this.novedades = [];
        this.novedades.push(entrada);
    }

    /**
     * Genera el texto del comprobante oficial de ingreso (Ticket térmico).
     * @returns {string}
     */
    emitirComprobanteIngreso() {
        return [
            '==========================================',
            '        PARQUEADERO AUTOS COLOMBIA        ',
            '     COMPROBANTE DE INGRESO VEHICULAR     ',
            '==========================================',
            `Transaccion : ${this.idTicket}`,
            `Placa       : ${this.placa}`,
            `Titular     : ${this.titular || 'Suscriptor Registrado'}`,
            `Celda       : ${this.codigoCelda}`,
            `Entrada     : ${this.fechaHoraIngreso}`,
            `Operario    : ${this.operarioResponsable}`,
            '------------------------------------------',
            `Novedad     : ${this.novedadOperativa}`,
            '=========================================='
        ].join('\n');
    }
}

/**
 * Entidad Pago (Recaudo de Mensualidad y Emisión de Paz y Salvo)
 */
class Pago {
    /**
     * @param {string} codigoTransaccion - Identificador de recibo (Ej: 'RC-2026-0891')
     * @param {string} documentoId - Documento del suscriptor
     * @param {number} montoTotal - Monto recaudado en COP
     * @param {string} medioPago - 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'
     * @param {string|Date} fechaEmision - Momento de pago
     * @param {string|Date} vigenciaHasta - Nueva fecha de vencimiento otorgada
     * @param {string} operarioResponsable - Operario de caja
     */
    constructor(
        codigoTransaccion,
        documentoId,
        montoTotal,
        medioPago = 'EFECTIVO',
        fechaEmision,
        vigenciaHasta,
        operarioResponsable = 'Carlos Ríos'
    ) {
        this.codigoTransaccion = codigoTransaccion;
        this.documentoId = documentoId;
        this.montoTotal = Number(montoTotal);
        this.medioPago = medioPago;
        this.fechaEmision = fechaEmision || new Date().toISOString().replace('T', ' ').slice(0, 19);
        this.vigenciaHasta = typeof vigenciaHasta === 'string'
            ? vigenciaHasta.slice(0, 10)
            : new Date(vigenciaHasta).toISOString().slice(0, 10);
        this.operarioResponsable = operarioResponsable;
    }

    /**
     * Procesa y valida el recaudo financiero (debe ser mayor a 0).
     * @returns {boolean}
     */
    procesarRecaudo() {
        return !isNaN(this.montoTotal) && this.montoTotal > 0;
    }

    /**
     * Genera la certificación oficial de Paz y Salvo.
     * @param {string} [nombresTitular]
     * @returns {string}
     */
    generarPazYSalvo(nombresTitular = '') {
        return [
            '====================================================',
            '            PARQUEADERO AUTOS COLOMBIA              ',
            '         CERTIFICADO OFICIAL DE PAZ Y SALVO         ',
            '====================================================',
            `Recibo de Caja : ${this.codigoTransaccion}`,
            `Fecha de Pago  : ${this.fechaEmision}`,
            `Documento ID   : ${this.documentoId}`,
            `Titular        : ${nombresTitular || 'Suscriptor Registrado'}`,
            `Monto Pagado   : $${this.montoTotal.toLocaleString('es-CO')} COP`,
            `Medio de Pago  : ${this.medioPago}`,
            `Vigencia Hasta : ${this.vigenciaHasta}`,
            `Cajero / Op.   : ${this.operarioResponsable}`,
            '----------------------------------------------------',
            'Estado: AL DÍA (ACCESO AUTORIZADO A PARQUEADERO)     ',
            '===================================================='
        ].join('\n');
    }
}

/**
 * Entidad Empleado (Cuenta de acceso al sistema - Iteración 2)
 * Rol 'ADMINISTRADOR' u 'OPERADOR'; estado de permisos 'ACTIVO' | 'REVOCADO'.
 */
class Empleado {
    /**
     * @param {Object} datos
     * @param {string} datos.id - Código 'EMP-###'
     * @param {string} datos.nombre
     * @param {string} datos.documento
     * @param {string} datos.cargo
     * @param {string} [datos.telefono]
     * @param {string} datos.correo - Usuario de inicio de sesión
     * @param {string} datos.clave
     * @param {string} [datos.rol] - 'ADMINISTRADOR' | 'OPERADOR'
     * @param {string} [datos.estado] - 'ACTIVO' | 'REVOCADO'
     * @param {string} [datos.fechaCreacion] - YYYY-MM-DD
     */
    constructor({ id, nombre, documento, cargo, telefono = '', correo, clave, rol = 'OPERADOR', estado = 'ACTIVO', fechaCreacion = null }) {
        this.id = id;
        this.nombre = nombre;
        this.documento = documento;
        this.cargo = cargo;
        this.telefono = telefono;
        this.correo = correo;
        this.clave = clave;
        this.rol = rol === 'ADMINISTRADOR' ? 'ADMINISTRADOR' : 'OPERADOR';
        this.estado = estado === 'REVOCADO' ? 'REVOCADO' : 'ACTIVO';
        this.fechaCreacion = fechaCreacion || new Date().toISOString().slice(0, 10);
    }

    /**
     * @returns {boolean} true si el empleado tiene rol de Administrador
     */
    esAdministrador() {
        return this.rol === 'ADMINISTRADOR';
    }

    /**
     * @returns {boolean} true si el acceso al sistema está habilitado
     */
    tieneAccesoHabilitado() {
        return this.estado === 'ACTIVO';
    }

    /**
     * La cuenta maestra institucional (EMP-001) está protegida contra revocación y eliminación.
     * @returns {boolean}
     */
    esCuentaMaestra() {
        return this.id === 'EMP-001';
    }

    /**
     * Conmuta el estado de permisos entre ACTIVO y REVOCADO.
     * @returns {string} Nuevo estado
     */
    alternarPermisos() {
        this.estado = this.estado === 'ACTIVO' ? 'REVOCADO' : 'ACTIVO';
        return this.estado;
    }
}

module.exports = {
    Usuario,
    Vehiculo,
    Celda,
    Movimiento,
    Pago,
    Empleado
};
