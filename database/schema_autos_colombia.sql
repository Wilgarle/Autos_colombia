-- =========================================================================
-- SISTEMA DE GESTIÓN OPERATIVA - PARQUEADERO AUTOS COLOMBIA
-- Entregable 5.3: Script DDL del Modelo Físico e Inicialización de Datos
-- Motor: MySQL 8.0+ / MariaDB (InnoDB)
-- =========================================================================

CREATE DATABASE IF NOT EXISTS autos_colombia_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE autos_colombia_db;

-- 1. Tabla Física: USUARIOS (Titulares de Mensualidad)
CREATE TABLE usuarios (
    documento_id VARCHAR(20) NOT NULL,
    nombres_apellidos VARCHAR(100) NOT NULL,
    telefono_contacto VARCHAR(15) NOT NULL,
    estado_mensualidad ENUM('ACTIVO', 'MORA') NOT NULL DEFAULT 'ACTIVO',
    fecha_vencimiento DATE NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (documento_id),
    INDEX idx_estado_mensualidad (estado_mensualidad)
) ENGINE=InnoDB;

-- 2. Tabla Física: VEHICULOS
CREATE TABLE vehiculos (
    placa CHAR(6) NOT NULL,
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
CREATE TABLE celdas (
    codigo_celda VARCHAR(5) NOT NULL,
    tipo_espacio ENUM('AUTO', 'MOTO') NOT NULL,
    estado_ocupacion ENUM('DISPONIBLE', 'OCUPADA') NOT NULL DEFAULT 'DISPONIBLE',
    CONSTRAINT pk_celdas PRIMARY KEY (codigo_celda),
    INDEX idx_celda_disp (tipo_espacio, estado_ocupacion)
) ENGINE=InnoDB;

-- 4. Tabla Física: PAGOS (Historial de Caja y Mensualidades)
CREATE TABLE pagos (
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
CREATE TABLE movimientos (
    id_ticket VARCHAR(20) NOT NULL,
    placa CHAR(6) NOT NULL,
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

-- =========================================================================
-- SEMILLA DE DATOS INICIAL: 50 CELDAS (20 AUTOMÓVILES Y 30 MOTOCICLETAS)
-- =========================================================================

INSERT INTO celdas (codigo_celda, tipo_espacio, estado_ocupacion) VALUES
-- 20 Celdas de Automóviles
('A-01','AUTO','OCUPADA'), ('A-02','AUTO','DISPONIBLE'), ('A-03','AUTO','OCUPADA'), ('A-04','AUTO','DISPONIBLE'),
('A-05','AUTO','DISPONIBLE'), ('A-06','AUTO','OCUPADA'), ('A-07','AUTO','DISPONIBLE'), ('A-08','AUTO','DISPONIBLE'),
('A-09','AUTO','DISPONIBLE'), ('A-10','AUTO','DISPONIBLE'), ('A-11','AUTO','DISPONIBLE'), ('A-12','AUTO','DISPONIBLE'),
('A-13','AUTO','DISPONIBLE'), ('A-14','AUTO','DISPONIBLE'), ('A-15','AUTO','DISPONIBLE'), ('A-16','AUTO','DISPONIBLE'),
('A-17','AUTO','DISPONIBLE'), ('A-18','AUTO','DISPONIBLE'), ('A-19','AUTO','DISPONIBLE'), ('A-20','AUTO','DISPONIBLE'),
-- 30 Celdas de Motocicletas
('M-01','MOTO','OCUPADA'), ('M-02','MOTO','DISPONIBLE'), ('M-03','MOTO','OCUPADA'), ('M-04','MOTO','DISPONIBLE'),
('M-05','MOTO','DISPONIBLE'), ('M-06','MOTO','DISPONIBLE'), ('M-07','MOTO','DISPONIBLE'), ('M-08','MOTO','DISPONIBLE'),
('M-09','MOTO','DISPONIBLE'), ('M-10','MOTO','DISPONIBLE'), ('M-11','MOTO','DISPONIBLE'), ('M-12','MOTO','DISPONIBLE'),
('M-13','MOTO','DISPONIBLE'), ('M-14','MOTO','DISPONIBLE'), ('M-15','MOTO','DISPONIBLE'), ('M-16','MOTO','DISPONIBLE'),
('M-17','MOTO','DISPONIBLE'), ('M-18','MOTO','DISPONIBLE'), ('M-19','MOTO','DISPONIBLE'), ('M-20','MOTO','DISPONIBLE'),
('M-21','MOTO','DISPONIBLE'), ('M-22','MOTO','DISPONIBLE'), ('M-23','MOTO','DISPONIBLE'), ('M-24','MOTO','DISPONIBLE'),
('M-25','MOTO','DISPONIBLE'), ('M-26','MOTO','DISPONIBLE'), ('M-27','MOTO','DISPONIBLE'), ('M-28','MOTO','DISPONIBLE'),
('M-29','MOTO','DISPONIBLE'), ('M-30','MOTO','DISPONIBLE');