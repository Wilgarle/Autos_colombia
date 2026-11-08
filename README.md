# 🅿️ Parqueadero Autos Colombia — Sistema de Gestión Operativa

Plataforma web integral para la administración operativa, financiera y de control de acceso del **Parqueadero Autos Colombia**. Gestiona en tiempo real el flujo de ingreso y salida vehicular, el inventario físico de **50 celdas**, la facturación de mensualidades, el padrón de suscriptores, las cuentas de personal y la bitácora inmutable de auditoría.

- **Arquitectura:** Modelo-Vista-Controlador (MVC) Cliente-Servidor en capas
- **Persistencia:** Motor Híbrido Tolerante a Fallos (MySQL 8.0+ / Repositorio Reactivo en Memoria)
- **Stack Principal:** Node.js, Express, MySQL2, JavaScript ES6+, HTML5, Tailwind CSS
- **Autor:** William Garcia Leonel

---

## 1. Descripción de la Aplicación y Módulos

El sistema centraliza la operación diaria de portería y la supervisión ejecutiva sobre una capacidad instalada fija de **50 celdas** (**20 para automóviles** `A-01` a `A-20` y **30 para motocicletas** `M-01` a `M-30`), estructurada en los siguientes módulos:

### Módulos de Supervisión y Administración (`ADMINISTRADOR`)
- **Panel Central y Métricas:** Tablero ejecutivo en tiempo real con indicadores de recaudo acumulado, desglose por medio de pago (Efectivo, PSE, Tarjeta), porcentaje de ocupación de patio, estado de cartera y trazabilidad de auditoría.
- **Directorio de Suscriptores:** Gestión completa (altas, consultas, filtros combinados, actualización de datos maestros y retiro seguro) de titulares y vehículos vinculados a contratos de mensualidad.
- **Directorio de Empleados:** Administración de cuentas de acceso institucionales, asignación de roles (`ADMINISTRADOR` / `OPERADOR`), activación o revocación inmediata de permisos y resguardo de la cuenta maestra (`EMP-001`).

### Módulos de Operación Diaria (`OPERADOR` y `ADMINISTRADOR`)
- **Ingreso y Portería:** Validación instantánea de placa y vigencia de mensualidad, filtrado automático de celdas disponibles según categoría vehicular, bloqueo preventivo de cuentas en mora y emisión de comprobantes térmicos POS descargables en `.TXT`.
- **Salidas y Novedades:** Registro inmutable de novedades e incidentes físicos durante la permanencia del vehículo, verificación de egreso y liberación automática de la celda en el inventario.
- **Monitor de Celdas y Patio (50 Cupos):** Mapa visual interactivo con diferenciación de tres estados operativos (`DISPONIBLE`, `OCUPADA` y `MANTENIMIENTO`), modal de inspección detallada, bloqueo/rehabilitación por obras y reubicación operativa de vehículos entre celdas compatibles conservando el ticket activo.
- **Mensualidades y Caja:** Liquidación y recaudo de mensualidades con renovación automática por 30 días, emisión de recibos de Paz y Salvo y vinculación rápida de nuevos suscriptores.
- **Bitácora de Auditoría:** Registro cronológico e inmutable de todas las transacciones operativas y administrativas, con filtros por tipo de evento, búsqueda libre y exportación a `.CSV`.

---

## 2. Arquitectura del Sistema

La aplicación implementa el patrón arquitectónico **Modelo-Vista-Controlador (MVC)** desacoplado en tres capas principales con un adaptador de persistencia híbrida:

```
                  ┌────────────────────────────────────────────────────────────┐
                  │            CAPA DE PRESENTACIÓN (CLIENTE WEB SPA)          │
                  │  index.html (HTML5 + Tailwind CSS + JavaScript ES6)        │
                  │  - Autenticación Multi-Rol     - Dashboard & Directorios   │
                  │  - Terminal de Portería        - Salidas y Novedades       │
                  │  - Mapa Interactivo 50 Celdas  - Recaudo en Caja y Bitácora│
                  └─────────────────────────────┬──────────────────────────────┘
                                                │ Fetch API (JSON) / Motor Local
                                                ▼
                  ┌────────────────────────────────────────────────────────────┐
                  │         CAPA DE CONTROL Y SERVICIOS (API REST NODE.JS)     │
                  │  server.js + src/controladores/parqueadero.controller.js   │
                  │  - Enrutador Express y Middlewares de Validación JSON      │
                  │  - ControladorParqueadero (Reglas de Negocio y Seguridad)  │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │ Instanciación POO ES6
                                                ▼
                  ┌────────────────────────────────────────────────────────────┐
                  │             CAPA DE DOMINIO (MODELOS POO ES6)              │
                  │  src/dominio/modelos.js                                    │
                  │  - Usuario     - Vehiculo    - Celda                       │
                  │  - Movimiento  - Pago        - Empleado                    │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
         ┌───────────────────────────────┐               ┌───────────────────────────────┐
         │ PERSISTENCIA PRIMARIA: MYSQL  │               │ PERSISTENCIA FALLBACK: RAM    │
         │ Base de Datos Relacional 8.0+ │  Conmutación  │ Repositorio Reactivo en       │
         │ database/schema_autos_colombia│  Automática   │ Memoria con semilla completa  │
         │ (6 Tablas y Transacciones)    │ ◄───────────► │ de 50 celdas, clientes y logs │
         └───────────────────────────────┘               └───────────────────────────────┘
```

### Aspectos Técnicos de la Interfaz y Persistencia Híbrida
1. **Conmutación Transparente Backend (MySQL $\leftrightarrow$ Memoria):** Al iniciar `server.js`, el controlador verifica la conexión con MySQL (`autos_colombia_db`) mediante `mysql2/promise`. Si el motor de base de datos no está disponible en el entorno local, el backend activa automáticamente su repositorio en memoria pre-cargado sin interrumpir el servicio.
2. **Sinergia Frontend-Backend y Modo Autónomo (`file:///`):** Cada operación en `index.html` consume de forma asíncrona los endpoints `/api/...`. Si la aplicación se abre directamente en el navegador sin servidor activo, el cliente conmuta de manera silenciosa a su motor local en memoria, manteniendo el 100 % de las funcionalidades operativas.
3. **Integridad Transaccional y de Dominio:**
   - **Unicidad:** Validación estricta de placas vehiculares y documentos de identidad normalizados.
   - **Protección de Activos en Patio:** Imposibilidad de dar de baja a un suscriptor o cambiar la categoría de su vehículo mientras registre ocupación activa en una celda (`enPatio === true`).
   - **Reglas de Patio:** Prohibición de bloquear por mantenimiento celdas ocupadas, exclusión automática de celdas en `MANTENIMIENTO` en el selector de portería y validación de compatibilidad de categoría (`Automóvil` $\leftrightarrow$ `A-xx`, `Motocicleta` $\leftrightarrow$ `M-xx`) en ingresos y reubicaciones.

---

## 3. Estructura de Paquetes y Directorios

```
Autos_colombia/
│
├── database/
│   └── schema_autos_colombia.sql          # Esquema relacional MySQL 8.0+ (6 tablas + semilla de 50 celdas)
│
├── docs/
│   ├── Iteracion_1/                       # Diagramas arquitectónicos, UML y modelo de datos base
│   └── Iteracion_2/                       # Diagramas de secuencia, componentes, casos de uso y mockups
│
├── src/
│   ├── dominio/
│   │   └── modelos.js                     # Clases de dominio ES6: Usuario, Vehiculo, Celda, Movimiento, Pago, Empleado
│   └── controladores/
│       ├── parqueadero.controller.js      # ControladorParqueadero, lógica de negocio y adaptador MySQL/Memoria
│       └── parqueadero.controllers.js     # Punto de exportación unificado del módulo controlador
│
├── .env.example                           # Plantilla de variables de entorno para conexión MySQL y puerto HTTP
├── index.html                             # Aplicación Web SPA (Tailwind CSS + FontAwesome + Cliente REST Híbrido)
├── package.json                           # Manifiesto de configuración, scripts y dependencias de Node.js
├── README.md                              # Documentación técnica del repositorio
└── server.js                              # Punto de entrada HTTP Express, rutas de la API REST y servidor estático
```

---

## 4. Sistema de Autenticación y Control de Acceso (RBAC)

El sistema cuenta con autenticación basada en roles (**Role-Based Access Control**) que segmenta las vistas y operaciones autorizadas según el perfil del colaborador, validando el estado de sus permisos (`ACTIVO` o `REVOCADO`) en cada inicio de sesión:

| ID | Colaborador | Rol | Usuario / Correo | Contraseña | Estado | Permisos y Alcance en la Aplicación |
|---|---|---|---|---|---|---|
| `EMP-001` | Dra. Patricia Gómez | `ADMINISTRADOR` | `admin@autoscolombia.com` | `admin123` | **ACTIVO** | **Cuenta Maestra Institucional:** Acceso total a métricas ejecutivas, directorios de suscriptores y empleados, y operación completa de patio y caja. Protegida contra baja o bloqueo. |
| `EMP-004` | Ing. Fernando Ospina | `ADMINISTRADOR` | `fernando.admin@autoscolombia.com` | `admin456` | **ACTIVO** | **Supervisor Operativo:** Acceso administrativo completo a métricas, gestión de padrón, mantenimiento de celdas y auditoría. |
| `EMP-002` | Carlos Ríos | `OPERADOR` | `operario@autoscolombia.com` | `operario123` | **ACTIVO** | **Operador en Turno:** Control de ingreso en portería, emisión de tickets, salidas, reporte de novedades, recaudo en caja y mapa de 50 celdas. |
| `EMP-003` | Alejandra Morales | `OPERADOR` | `alejandra.caja@autoscolombia.com` | `caja123` | **ACTIVO** | **Auxiliar de Caja y Portería:** Recaudo de mensualidades, generación de Paz y Salvo, alta en caja y consulta de celdas. |
| `EMP-005` | Julián Torres | `OPERADOR` | `julian.seguridad@autoscolombia.com` | `julian123` | **REVOCADO** | **Cuenta Suspendida:** Credenciales con acceso denegado (`HTTP 403`) hasta que un administrador restablezca sus permisos. |

> **Nota de Seguridad:** El endpoint `/api/estado` y los listados de personal sanitizan las credenciales mediante `sanitizarEmpleado()`, garantizando que las contraseñas nunca se expongan en las respuestas JSON del servidor.

---

## 5. Especificación de la API REST y Modelo de Datos

### 5.1 Endpoints Disponibles

| Método | Endpoint | Descripción Técnica | Respuestas HTTP |
|---|---|---|---|
| `POST` | `/api/auth/login` | Autentica credenciales por correo, documento o ID de empleado, validando rol y estado activo. | `200`, `401`, `403` |
| `GET` | `/api/estado` | Retorna el estado consolidado del sistema (suscriptores, empleados sanitizados, 50 celdas, patio y bitácora). | `200`, `500` |
| `GET` | `/api/admin/metricas` | Calcula indicadores financieros, desglose por medio de pago, ocupación por tipología y estado de cartera. | `200`, `500` |
| `POST` | `/api/movimientos/entrada` | Valida vigencia de mensualidad y disponibilidad de celda, registra el ingreso y genera el ticket. | `201`, `400`, `403`, `404`, `409` |
| `POST` | `/api/movimientos/salida` | Cierra el movimiento activo, registra observaciones de salida y libera la celda a `DISPONIBLE`. | `200`, `404` |
| `POST` | `/api/movimientos/novedad` | Anexa un reporte inmutable de novedad física sobre un vehículo estacionado en patio. | `200`, `400`, `404` |
| `POST` | `/api/pagos` | Registra el pago de mensualidad, extiende la vigencia por 30 días y emite el comprobante de Paz y Salvo. | `200`, `404` |
| `POST` | `/api/clientes` | Registra un nuevo suscriptor desde el módulo de Caja con su pago inicial de mensualidad. | `201`, `400`, `409` |
| `POST` | `/api/pagos/vincular` | Alta administrativa de suscriptor y vehículo validando unicidad de placa y documento de identidad. | `201`, `400`, `409` |
| `PUT` | `/api/admin/usuarios/:placa` | Actualiza datos maestros del titular, teléfono, marca/color, canon, fecha de corte y estado de cartera. | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/admin/usuarios/:placa` | Retira un suscriptor del padrón verificando previamente que no tenga vehículo estacionado en patio. | `200`, `400`, `404` |
| `GET` | `/api/celdas` | Lista las 50 celdas con filtros opcionales por categoría (`Automóvil` / `Motocicleta`), estado o búsqueda. | `200`, `500` |
| `GET` | `/api/celdas/:codigo` | Consulta la ficha técnica de una celda: ocupante actual, ticket activo, motivo de bloqueo e historial. | `200`, `404` |
| `PATCH` | `/api/celdas/:codigo/mantenimiento` | Bloquea una celda libre (`MANTENIMIENTO`) con motivo operativo o la rehabilita (`DISPONIBLE`). | `200`, `400`, `404`, `409` |
| `POST` | `/api/celdas/reubicar` | Traslada un vehículo estacionado hacia otra celda disponible del mismo tipo conservando su ticket activo. | `200`, `400`, `404`, `409` |
| `GET` | `/api/admin/empleados` | Consulta el directorio de empleados con filtros por nombre, correo, documento, rol o estado. | `200`, `500` |
| `POST` | `/api/admin/empleados` | Registra un nuevo empleado validando unicidad de correo institucional y documento. | `201`, `400`, `409` |
| `PUT` | `/api/admin/empleados/:id` | Actualiza datos laborales, rol, estado de permisos o contraseña de un colaborador. | `200`, `400`, `404`, `409` |
| `PATCH` | `/api/admin/empleados/:id/permisos` | Alterna el estado de acceso (`ACTIVO` / `REVOCADO`) protegiendo la cuenta maestra `EMP-001`. | `200`, `400`, `403`, `404` |
| `DELETE` | `/api/admin/empleados/:id` | Elimina una cuenta de empleado resguardando la cuenta maestra `EMP-001`. | `200`, `403`, `404` |
| `GET` | `/api/historial` | Retorna la bitácora de auditoría con soporte de filtrado por tipo de evento y término de búsqueda. | `200`, `500` |

### 5.2 Esquema Relacional de Base de Datos (`autos_colombia_db`)

El script `database/schema_autos_colombia.sql` define **6 tablas relacionales** en motor `InnoDB` con codificación `utf8mb4`:
- **`usuarios`**: Datos maestros del suscriptor (`documento_id`, `nombres_apellidos`, `telefono_contacto`, `estado_mensualidad`, `fecha_vencimiento`, `canon_mensual`).
- **`vehiculos`**: Padrón vehicular (`placa`, `documento_id`, `tipo_vehiculo`, `marca_color`) vinculado mediante clave foránea a `usuarios`.
- **`celdas`**: Catálogo fijo de 50 espacios (`codigo_celda`, `tipo_espacio`, `estado_ocupacion` [`DISPONIBLE`, `OCUPADA`, `MANTENIMIENTO`], `placa_actual`, `motivo_mantenimiento`).
- **`movimientos`**: Registro transaccional de entradas, salidas, celdas asignadas y actas de novedades físicas (`id_ticket`, `placa`, `codigo_celda`, `fecha_hora_ingreso`, `fecha_hora_salida`, `novedad_operativa`, `estado_movimiento`, `operario_responsable`).
- **`pagos`**: Historial financiero de recaudos y renovaciones de mensualidad (`codigo_transaccion`, `documento_id`, `monto_total`, `medio_pago`, `fecha_emision`, `vigencia_hasta`, `operario_responsable`).
- **`empleados`**: Directorio de cuentas de acceso al sistema (`id_empleado`, `documento`, `nombre_completo`, `cargo`, `telefono`, `correo_login`, `clave_acceso`, `rol`, `estado`).

---

## 6. Guía de Instalación y Ejecución

### Requisitos Previos
- **Node.js** `v18.0.0` o superior (incluye `npm`).
- **MySQL Server** `v8.0+` *(Opcional: si no está presente, el servidor operará automáticamente con su motor en memoria)*.

### 1. Instalación de Dependencias
Clone el repositorio y ejecute en la raíz del proyecto:
```bash
npm install
```

### 2. Configuración de Variables de Entorno (Opcional para MySQL)
Si desea conectar una instancia local de MySQL, cree un archivo `.env` en la raíz basándose en `.env.example`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=autos_colombia_db
```
Para inicializar el esquema físico y la semilla de las 50 celdas en MySQL:
```bash
mysql -u root -p < database/schema_autos_colombia.sql
```

### 3. Ejecución del Servidor Web y API REST
Inicie el servidor en modo producción:
```bash
npm start
```
O en modo desarrollo con recarga automática:
```bash
npm run dev
```
Una vez iniciado, acceda desde cualquier navegador a:
👉 **`http://localhost:3000`**

### 4. Ejecución Autónoma del Cliente Web (Sin Servidor)
Para pruebas rápidas de interfaz sin entorno Node.js, abra directamente el archivo `index.html` con doble clic en su navegador. La aplicación activará de forma automática el almacenamiento reactivo local.
