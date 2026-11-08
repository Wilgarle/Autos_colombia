-- =========================================================================
-- SISTEMA DE GESTIÓN OPERATIVA - PARQUEADERO AUTOS COLOMBIA
-- Entregable 5.3: Script DDL del Modelo Físico e Inicialización de Datos
-- Iteración 1: Portería, Salidas, Celdas y Caja
-- Iteración 2: Gestión de Usuarios y Gestión de Celdas (MANTENIMIENTO, Empleados)
-- Motor: MySQL 8.0+ / MariaDB (InnoDB)
-- El script es idempotente: puede ejecutarse varias veces sin duplicar datos.
-- =========================================================================

CREATE DATABASE IF NOT EXISTS autos_colombia_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE autos_colombia_db;

-- 1. Tabla Física: USUARIOS (Titulares de Mensualidad)
CREATE TABLE IF NOT EXISTS usuarios (
    documento_id VARCHAR(20) NOT NULL,
    nombres_apellidos VARCHAR(100) NOT NULL,
    telefono_contacto VARCHAR(15) NOT NULL,
    estado_mensualidad ENUM('ACTIVO', 'MORA') NOT NULL DEFAULT 'ACTIVO',
    fecha_vencimiento DATE NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (documento_id),
    INDEX idx_estado_mensualidad (estado_mensualidad)
) ENGINE=InnoDB;

-- 2. Tabla Física: VEHICULOS
-- (La placa se almacena con guion, p. ej. 'ENV-774', por lo que requiere hasta 10 caracteres)
CREATE TABLE IF NOT EXISTS vehiculos (
    placa VARCHAR(10) NOT NULL,
    documento_id VARCHAR(20) NOT NULL,
    tipo_vehiculo ENUM('AUTO', 'MOTO') NOT NULL,
    marca_color VARCHAR(60) NOT NULL,
    CONSTRAINT pk_vehiculos PRIMARY KEY (placa),
    CONSTRAINT fk_veh_usuario FOREIGN KEY (documento_id)
        REFERENCES usuarios (documento_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Tabla Física: CELDAS (Capacidad instalada: 20 Autos y 30 Motos = 50 Celdas)
-- Iteración 2: nuevo estado MANTENIMIENTO y columna motivo_mantenimiento
CREATE TABLE IF NOT EXISTS celdas (
    codigo_celda VARCHAR(5) NOT NULL,
    tipo_espacio ENUM('AUTO', 'MOTO') NOT NULL,
    estado_ocupacion ENUM('DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE',
    motivo_mantenimiento VARCHAR(150) NULL DEFAULT NULL,
    CONSTRAINT pk_celdas PRIMARY KEY (codigo_celda),
    INDEX idx_celda_disp (tipo_espacio, estado_ocupacion)
) ENGINE=InnoDB;

-- 4. Tabla Física: PAGOS (Historial de Caja y Mensualidades)
CREATE TABLE IF NOT EXISTS pagos (
    codigo_transaccion VARCHAR(20) NOT NULL,
    documento_id VARCHAR(20) NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL,
    medio_pago ENUM('EFECTIVO', 'TRANSFERENCIA', 'TARJETA') NOT NULL,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vigencia_hasta DATE NOT NULL,
    operario_responsable VARCHAR(50) NOT NULL,
    CONSTRAINT pk_pagos PRIMARY KEY (codigo_transaccion),
    CONSTRAINT chk_monto_positivo CHECK (monto_total > 0),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (documento_id)
        REFERENCES usuarios (documento_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. Tabla Física: MOVIMIENTOS (Entradas, Salidas y Novedades en Patio)
CREATE TABLE IF NOT EXISTS movimientos (
    id_ticket VARCHAR(20) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    codigo_celda VARCHAR(5) NOT NULL,
    fecha_hora_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_hora_salida DATETIME NULL DEFAULT NULL,
    novedad_operativa VARCHAR(255) NOT NULL DEFAULT 'Sin novedades reportadas',
    estado_movimiento ENUM('EN_PATIO', 'FINALIZADO') NOT NULL DEFAULT 'EN_PATIO',
    operario_responsable VARCHAR(50) NOT NULL,
    CONSTRAINT pk_movimientos PRIMARY KEY (id_ticket),
    CONSTRAINT fk_mov_vehiculo FOREIGN KEY (placa)
        REFERENCES vehiculos (placa)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_mov_celda FOREIGN KEY (codigo_celda)
        REFERENCES celdas (codigo_celda)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    INDEX idx_mov_activo (estado_movimiento, placa),
    INDEX idx_fecha_ingreso (fecha_hora_ingreso)
) ENGINE=InnoDB;

-- 6. Tabla Física: EMPLEADOS (Cuentas de acceso al sistema - Iteración 2)
-- NOTA ACADÉMICA: las claves de la semilla son de demostración. En un despliegue real
-- deben almacenarse como hash (p. ej. bcrypt) y nunca en texto plano.
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado VARCHAR(10) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    documento VARCHAR(20) NOT NULL,
    telefono VARCHAR(20) NOT NULL DEFAULT '',
    correo VARCHAR(100) NOT NULL,
    clave VARCHAR(100) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    rol ENUM('ADMINISTRADOR', 'OPERADOR') NOT NULL DEFAULT 'OPERADOR',
    estado ENUM('ACTIVO', 'REVOCADO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATE NOT NULL,
    CONSTRAINT pk_empleados PRIMARY KEY (id_empleado),
    CONSTRAINT uq_empleados_correo UNIQUE (correo),
    CONSTRAINT uq_empleados_documento UNIQUE (documento),
    INDEX idx_empleados_rol_estado (rol, estado)
) ENGINE=InnoDB;

-- =========================================================================
-- SEMILLA DE DATOS INICIAL (coherente con el motor en memoria de index.html)
-- =========================================================================

-- 6.1 Empleados semilla (EMP-001 es la cuenta maestra protegida)
INSERT IGNORE INTO empleados (id_empleado, nombre, documento, telefono, correo, clave, cargo, rol, estado, fecha_creacion) VALUES
('EMP-001', 'Dra. Patricia Gómez',    'CC 43210987',   '310 456 7890', 'admin@autoscolombia.com',            'admin123',    'Administradora General',               'ADMINISTRADOR', 'ACTIVO',   '2026-01-15'),
('EMP-002', 'Carlos Ríos',            'CC 1020456123', '312 876 5432', 'operario@autoscolombia.com',         'operario123', 'Operador de Portería Principal',       'OPERADOR',      'ACTIVO',   '2026-02-01'),
('EMP-003', 'Alejandra Morales',      'CC 1037549812', '301 234 5678', 'alejandra.caja@autoscolombia.com',   'caja123',     'Cajera y Atención a Suscriptores',     'OPERADOR',      'ACTIVO',   '2026-03-10'),
('EMP-004', 'Ing. Fernando Ospina',   'CC 71298456',   '315 789 0123', 'fernando.admin@autoscolombia.com',   'admin456',    'Supervisor de Operaciones y Auditoría', 'ADMINISTRADOR', 'ACTIVO',   '2026-04-05'),
('EMP-005', 'Julián Torres',          'CC 1040321654', '318 654 9870', 'julian.seguridad@autoscolombia.com', 'julian123',   'Auxiliar de Patio (Licencia)',         'OPERADOR',      'REVOCADO', '2026-05-20');

-- 6.2 Las 50 celdas: 20 Automóviles (A-01..A-20) y 30 Motocicletas (M-01..M-30)
--     Ocupadas: A-01, A-02, M-01  |  En MANTENIMIENTO: A-04, M-05
INSERT IGNORE INTO celdas (codigo_celda, tipo_espacio, estado_ocupacion) VALUES
-- 20 Celdas de Automóviles
('A-01','AUTO','OCUPADA'),     ('A-02','AUTO','OCUPADA'),     ('A-03','AUTO','DISPONIBLE'),  ('A-04','AUTO','MANTENIMIENTO'),
('A-05','AUTO','DISPONIBLE'),  ('A-06','AUTO','DISPONIBLE'),  ('A-07','AUTO','DISPONIBLE'),  ('A-08','AUTO','DISPONIBLE'),
('A-09','AUTO','DISPONIBLE'),  ('A-10','AUTO','DISPONIBLE'),  ('A-11','AUTO','DISPONIBLE'),  ('A-12','AUTO','DISPONIBLE'),
('A-13','AUTO','DISPONIBLE'),  ('A-14','AUTO','DISPONIBLE'),  ('A-15','AUTO','DISPONIBLE'),  ('A-16','AUTO','DISPONIBLE'),
('A-17','AUTO','DISPONIBLE'),  ('A-18','AUTO','DISPONIBLE'),  ('A-19','AUTO','DISPONIBLE'),  ('A-20','AUTO','DISPONIBLE'),
-- 30 Celdas de Motocicletas
('M-01','MOTO','OCUPADA'),     ('M-02','MOTO','DISPONIBLE'),  ('M-03','MOTO','DISPONIBLE'),  ('M-04','MOTO','DISPONIBLE'),
('M-05','MOTO','MANTENIMIENTO'),('M-06','MOTO','DISPONIBLE'), ('M-07','MOTO','DISPONIBLE'),  ('M-08','MOTO','DISPONIBLE'),
('M-09','MOTO','DISPONIBLE'),  ('M-10','MOTO','DISPONIBLE'),  ('M-11','MOTO','DISPONIBLE'),  ('M-12','MOTO','DISPONIBLE'),
('M-13','MOTO','DISPONIBLE'),  ('M-14','MOTO','DISPONIBLE'),  ('M-15','MOTO','DISPONIBLE'),  ('M-16','MOTO','DISPONIBLE'),
('M-17','MOTO','DISPONIBLE'),  ('M-18','MOTO','DISPONIBLE'),  ('M-19','MOTO','DISPONIBLE'),  ('M-20','MOTO','DISPONIBLE'),
('M-21','MOTO','DISPONIBLE'),  ('M-22','MOTO','DISPONIBLE'),  ('M-23','MOTO','DISPONIBLE'),  ('M-24','MOTO','DISPONIBLE'),
('M-25','MOTO','DISPONIBLE'),  ('M-26','MOTO','DISPONIBLE'),  ('M-27','MOTO','DISPONIBLE'),  ('M-28','MOTO','DISPONIBLE'),
('M-29','MOTO','DISPONIBLE'),  ('M-30','MOTO','DISPONIBLE');

-- Motivos de mantenimiento preconfigurados (no sobrescribe motivos ya editados)
UPDATE celdas SET motivo_mantenimiento = 'Demarcación de pintura epóxica y tope llanta.'
 WHERE codigo_celda = 'A-04' AND estado_ocupacion = 'MANTENIMIENTO' AND motivo_mantenimiento IS NULL;
UPDATE celdas SET motivo_mantenimiento = 'Revisión de anclaje metálico y luminaria.'
 WHERE codigo_celda = 'M-05' AND estado_ocupacion = 'MANTENIMIENTO' AND motivo_mantenimiento IS NULL;

-- 6.3 Titulares y vehículos del padrón semilla (documento_id = solo dígitos)
INSERT IGNORE INTO usuarios (documento_id, nombres_apellidos, telefono_contacto, estado_mensualidad, fecha_vencimiento) VALUES
('1037612890', 'Carlos Andrés Mejía',  'No registrado', 'ACTIVO', '2026-11-15'),
('1017234981', 'Laura Sofía Gómez',    'No registrado', 'ACTIVO', '2026-11-10'),
('71345902',   'Jorge Iván Restrepo',  'No registrado', 'MORA',   '2026-10-05'),
('1040751239', 'Mateo Cano Valencia',  'No registrado', 'ACTIVO', '2026-11-20'),
('43987123',   'Diana Marcela Ríos',   'No registrado', 'ACTIVO', '2026-11-18'),
('1036945112', 'Santiago Montoya',     'No registrado', 'ACTIVO', '2026-11-12'),
('1020456789', 'Andrés Felipe Duque',  'No registrado', 'MORA',   '2026-10-12');

INSERT IGNORE INTO vehiculos (placa, documento_id, tipo_vehiculo, marca_color) VALUES
('ENV-774', '1037612890', 'AUTO', 'No especificado'),
('KLM-452', '1017234981', 'AUTO', 'No especificado'),
('BGT-891', '71345902',   'AUTO', 'No especificado'),
('XRT-94D', '1040751239', 'MOTO', 'No especificado'),
('ZPL-12F', '43987123',   'MOTO', 'No especificado'),
('MDE-305', '1036945112', 'AUTO', 'No especificado'),
('QWE-88A', '1020456789', 'MOTO', 'No especificado');

-- 6.4 Movimientos activos en patio y recibo de caja de referencia
INSERT IGNORE INTO movimientos (id_ticket, placa, codigo_celda, fecha_hora_ingreso, fecha_hora_salida, novedad_operativa, estado_movimiento, operario_responsable) VALUES
('TRX-2026-1041', 'ENV-774', 'A-01', '2026-10-24 07:45:10', NULL, 'Ingreso: Rayón superficial previo en puerta trasera derecha.', 'EN_PATIO', 'Carlos Ríos'),
('TRX-2026-1042', 'XRT-94D', 'M-01', '2026-10-24 08:20:00', NULL, 'Ingreso: Deja casco abatible negro asegurado en soporte.',        'EN_PATIO', 'Carlos Ríos'),
('TRX-2026-1043', 'MDE-305', 'A-02', '2026-10-24 09:10:25', NULL, 'Ingreso: Vehículo ingresa sin novedades físicas.',                  'EN_PATIO', 'Carlos Ríos');

INSERT IGNORE INTO pagos (codigo_transaccion, documento_id, monto_total, medio_pago, fecha_emision, vigencia_hasta, operario_responsable) VALUES
('RC-2026-0891', '1017234981', 180000.00, 'TRANSFERENCIA', '2026-10-24 07:15:00', '2026-11-10', 'Carlos Ríos');

-- =========================================================================
-- MIGRACIÓN (solo si ya tenía instalada la base de la Iteración 1)
-- =========================================================================
-- Opción recomendada: DROP DATABASE autos_colombia_db; y volver a ejecutar este script
-- (la Iteración 1 usaba placa CHAR(6), insuficiente para placas con guion).
-- Opción manual mínima para las celdas:
--   ALTER TABLE celdas MODIFY estado_ocupacion ENUM('DISPONIBLE','OCUPADA','MANTENIMIENTO') NOT NULL DEFAULT 'DISPONIBLE';
--   ALTER TABLE celdas ADD COLUMN motivo_mantenimiento VARCHAR(150) NULL DEFAULT NULL;
