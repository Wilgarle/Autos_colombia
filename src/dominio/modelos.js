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
     * @param {string} estadoOcupacion - 'DISPONIBLE' | 'OCUPADA'
     * @param {string|null} [placaActual] - Placa del vehículo actualmente aparcado
     */
    constructor(codigoCelda, tipoEspacio, estadoOcupacion = 'DISPONIBLE', placaActual = null) {
        this.codigoCelda = codigoCelda;
        this.tipoEspacio = tipoEspacio;
        this.estadoOcupacion = estadoOcupacion;
        this.placaActual = placaActual;
    }

    /**
     * Verifica si la celda está libre para asignación.
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
    }

    /**
     * Libera la celda volviéndola disponible.
     */
    liberarCelda() {
        this.estadoOcupacion = 'DISPONIBLE';
        this.placaActual = null;
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

module.exports = {
    Usuario,
    Vehiculo,
    Celda,
    Movimiento,
    Pago
};
