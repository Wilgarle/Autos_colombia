# 🅿️ Sistema de Gestión Operativa - Parqueadero Autos Colombia

> **Asignatura:** Ingeniería de Software  
> **Proyecto:** Autos Colombia (Iteración 1 + Iteración 2)  
> **Patrón Arquitectónico:** Modelo-Vista-Controlador (MVC) Cliente-Servidor  
> **Estrategia Operativa:** Sinergia Híbrida de Cero Fricción (Persistencia Dual MySQL / Memoria Reactiva)  
> **Autor:** William Garcia Leonel

---

## 1. Descripción del Sistema

El **Sistema de Gestión Operativa para el Parqueadero Autos Colombia** es una plataforma web integral diseñada para sistematizar, agilizar y auditar las operaciones de control de acceso vehicular, administración del inventario físico de celdas, gestión del padrón de suscriptores y talento humano, recaudo de mensualidades y bitácora inmutable de novedades.

El alcance evolutivo cubre dos iteraciones integradas al 100 %:
- **Iteración 1 (Operación Base):** Control de portería (validación de placa y vigencia), emisión de comprobantes térmicos POS / `.txt`, salidas con novedades físicas inmutables, recaudo en caja y autenticación multi-rol (`ADMINISTRADOR` / `OPERADOR`).
- **Iteración 2 (Gestión de Usuarios y Gestión de Celdas):** CRUD integral del padrón de suscriptores y del directorio de empleados con reglas de integridad (`RNF-01`), catálogo interactivo de las **50 celdas** con estados `DISPONIBLE`, `OCUPADA` y `MANTENIMIENTO`, bloqueo/rehabilitación operativa por obras y **reubicación en caliente** entre celdas compatibles conservando el ticket activo.

El sistema administra una capacidad instalada fija de **50 celdas**:
- **20 celdas para automóviles** (`A-01` a `A-20`).
- **30 celdas para motocicletas** (`M-01` a `M-30`).

### Estrategia Híbrida de Cero Fricción (Zero-Friction Architecture)
El sistema implementa un mecanismo inteligente de **tolerancia a fallos**:
1. **Modo Producción / Evaluador con Servidor (Node.js + Express):** Expone una API REST completa en `http://localhost:3000`. Al iniciar, intenta conectarse con el motor relacional **MySQL 8.0+** (`autos_colombia_db`). Si MySQL está activo, sincroniza y persiste los datos relacionalmente (con transacciones ACID en operaciones críticas como la reubicación de celdas). Si MySQL no está instalado o el servicio está detenido, conmuta **automáticamente y sin fallar** a un **Repositorio en Memoria reactivo** pre-cargado.
2. **Modo SPA Directa (Doble Clic / GitHub Pages):** Si se abre directamente `index.html` en el navegador (`file:///index.html`), el frontend detecta de forma transparente la ausencia del servidor y ejecuta todas las operaciones de las Iteraciones 1 y 2 sobre su motor local en memoria sin errores en consola ni bloqueos visuales.

---

## 2. Matriz de Requerimientos e Historias de Usuario

### 2.1 Requerimientos Funcionales — Iteración 1 (Portería, Salidas, Caja y Auditoría)

| ID | Nombre del Requerimiento | Descripción Operativa | Caso de Uso | Historia de Usuario |
|---|---|---|---|---|
| **RF-I1-01** | Validación de Placa y Vigencia | Verifica que la placa ingresada pertenezca al padrón de suscriptores y cuente con estado `ACTIVA` (Paz y Salvo). Si está vencida, bloquea el acceso. | CU-03 | HU-I1-01 |
| **RF-I1-02** | Asignación de Celda Compatible | Filtra y asigna dinámicamente celdas en estado `DISPONIBLE` correspondientes a la categoría del vehículo (`Automóvil` o `Motocicleta`). | CU-04 | HU-I1-01, HU-I1-03 |
| **RF-I1-03** | Registro de Ingreso en Patio | Registra el ingreso vehicular capturando fecha y hora, celda seleccionada, titular y observaciones físicas de portería. | CU-02 | HU-I1-01 |
| **RF-I1-04** | Emisión de Comprobante / Ticket | Genera comprobante digital y térmico de ingreso con código de transacción único (`TRX-YYYY-####`) y descarga en `.txt`. | CU-05 | HU-I1-02 |
| **RF-I1-05** | Registro de Novedades Físicas | Permite anexar bitácoras inmutables sobre el estado del vehículo (rayones, accesorios, cascos) durante su permanencia. | CU-06 | HU-I1-05 |
| **RF-I1-06** | Gestión y Recaudo de Mensualidad | Registra el pago de mensualidad en caja, actualiza vigencia por +30 días, cambia estado a `ACTIVA` y emite recibo oficial (`RC-YYYY-####`). | CU-10 | HU-I1-04 |
| **RF-I1-07** | Validación de Salida e Inspección | Comprueba que el vehículo a egresar figure como activo en patio y expone su acta histórica de novedades físicas. | CU-07 | HU-I1-06 |
| **RF-I1-08** | Registro de Egreso Vehicular | Asigna fecha y hora de salida, consolida novedades finales y cierra el ciclo operativo del movimiento. | CU-07 | HU-I1-06 |
| **RF-I1-09** | Liberación Automática de Celda | Conmuta inmediatamente el estado de la celda ocupada a `DISPONIBLE`, restableciendo el cupo en el inventario de 50 celdas. | CU-08 | HU-I1-06, HU-I1-03 |
| **RF-I1-10** | Auditoría e Historial Operativo | Mantiene el registro inmutable de todos los eventos operativos y administrativos con filtros combinados y exportación a `.CSV`. | CU-11 | HU-I1-07 |

---

### 2.2 Requerimientos Funcionales — Iteración 2 (Gestión de Usuarios y Gestión de 50 Celdas)

| ID | Nombre del Requerimiento | Descripción Operativa | Caso de Uso (Iter. 2) | Historia de Usuario |
|---|---|---|---|---|
| **RF-01** | Alta de Titulares Suscriptores | Registra nuevos clientes de mensualidad validando documento único, nombre completo, teléfono, canon mensual, vencimiento y estado inicial (`ACTIVA` / `EN MORA`). | CU-I2-01 | HU-01 |
| **RF-02** | Vinculación de Vehículos | Asocia vehículo con placa única normalizada, categoría (`Automóvil` o `Motocicleta`) y marca/color validando compatibilidad física con las celdas. | CU-I2-01 | HU-01 |
| **RF-03** | Consulta y Filtrado del Padrón | Filtra suscriptores en tiempo real por placa, nombre, cédula, categoría o estado de cartera, y administra el directorio de empleados (`ADMINISTRADOR` / `OPERADOR`). | CU-I2-02 | HU-02 |
| **RF-04** | Actualización de Datos Maestros | Modifica titular, documento, teléfono, marca/color, categoría, canon, fecha de vencimiento o estado sin perder historial transaccional. | CU-I2-03 | HU-03 |
| **RF-05** | Baja o Retiro Seguro de Usuarios | Elimina suscriptores validando estrictamente que **no tengan vehículo en patio** (`enPatio === false`), y gestiona revocación/baja de empleados protegiendo `EMP-001` y la sesión activa. | CU-I2-04 | HU-04 |
| **RF-06** | Catálogo Fijo de 50 Celdas | Administra el inventario estructural de 50 celdas (`A-01`..`A-20` para Automóviles y `M-01`..`M-30` para Motocicletas). | CU-I2-05 | HU-05 |
| **RF-07** | Monitoreo en Tiempo Real (3 Estados) | Visualiza 4 KPIs superiores de capacidad y cuadrícula interactiva diferenciando `DISPONIBLE` (verde), `OCUPADA` (ámbar con placa) y `MANTENIMIENTO` (rojo bloqueado). | CU-I2-05 | HU-05 |
| **RF-08** | Bloqueo y Habilitación por Mantenimiento | Permite inhabilitar una celda libre pasándola a `MANTENIMIENTO` con motivo descriptivo (excluyéndola de portería) y rehabilitarla a `DISPONIBLE`. Prohibido bloquear celdas ocupadas. | CU-I2-06 | HU-06 |
| **RF-09** | Reubicación Operativa entre Celdas | Traslada un vehículo estacionado hacia otra celda `DISPONIBLE` del mismo tipo (`Automóvil` → `A-xx`, `Motocicleta` → `M-xx`), liberando origen y ocupando destino sin cerrar el ticket activo. | CU-I2-07 | HU-07 |
| **RF-10** | Inspección Detallada por Celda | Al seleccionar cualquiera de las 50 celdas, despliega modal de inspección con titular, placa, ticket activo, hora de ingreso, motivo de mantenimiento e historial asociado. | CU-I2-08 | HU-05, HU-07 |

---

### 2.3 Requerimientos No Funcionales (Modelo FURPS)

| ID | Categoría FURPS | Especificación Técnica y Reglas de Calidad |
|---|---|---|
| **RNF-01** | **Funcionalidad / Integridad Operativa** | Unicidad estricta de placas y documentos; prohibición de eliminar suscriptores con vehículo en patio (`HTTP 400`); prohibición de bloquear en `MANTENIMIENTO` una celda `OCUPADA` (`HTTP 400`); compatibilidad estricta de categoría en ingresos y reubicaciones; sanitización de contraseñas en API (`sanitizarEmpleado`). |
| **RNF-02** | **Usabilidad y Responsividad** | Conservación íntegra de la identidad corporativa en Modo Día (*Light Mode*), insignias tipo placa colombiana (`placa-badge`), tablas con `overflow-x-auto` y ventanas modales adaptables (`max-h-[92vh] overflow-y-auto`). |
| **RNF-03** | **Confiabilidad (Reliability)** | Arquitectura Híbrida de **Cero Fricción**: conmutación transparente entre MySQL 8.0+ (`autos_colombia_db`), Repositorio en Memoria del servidor Express y motor local del navegador (`file:///`). |
| **RNF-04** | **Rendimiento (Performance)** | Tiempo de respuesta inferior a **200 ms** en validaciones de portería, filtros reactivos del padrón, cálculo de KPIs y operaciones sobre el mapa de 50 celdas. |
| **RNF-05** | **Soportabilidad y Trazabilidad** | Arquitectura modular desacoplada en capas MVC y bitácora inmutable de auditoría (`SUSCRIPTOR_*`, `CELDA_*`, `EMPLEADO_*`, `INGRESO`, `SALIDA`, `PAGO`, `NOVEDAD`, `BLOQUEO`) exportable a CSV. |

---

### 2.4 Historias de Usuario — Iteración 2 (Gestión de Usuarios y 50 Celdas)

| ID | Historia de Usuario | Criterios de Aceptación Principales |
|---|---|---|
| **HU-01** | *Como administrador, quiero dar de alta nuevos suscriptores con su vehículo asociado para habilitar su acceso mediante mensualidad.* | Valida unicidad de placa y documento; asigna tarifa sugerida (`$180.000` Auto / `$95.000` Moto); registra evento `SUSCRIPTOR_CREADO`. |
| **HU-02** | *Como administrador, quiero buscar y filtrar el padrón de suscriptores y empleados en tiempo real para auditar estados de cartera y permisos.* | Búsqueda instantánea por placa, titular o documento y filtros combinados por categoría (`Automóvil`/`Motocicleta`) y estado (`ACTIVA`/`EN MORA`). |
| **HU-03** | *Como administrador, quiero actualizar los datos maestros, canon y fecha de vencimiento de un suscriptor para mantener al día su contrato.* | Impide cambio de categoría si el vehículo está actualmente en patio; sincroniza vistas y registra evento `SUSCRIPTOR_MODIFICADO`. |
| **HU-04** | *Como administrador, quiero retirar de forma segura a un suscriptor que finaliza contrato sin comprometer los vehículos estacionados.* | Rechaza la baja con alerta y `HTTP 400` si `enPatio === true`; permite eliminar cuando está fuera de patio registrando `SUSCRIPTOR_ELIMINADO`. |
| **HU-05** | *Como administrador u operador, quiero visualizar en tiempo real las 50 celdas y sus KPIs para conocer la disponibilidad exacta del patio.* | Cuadrícula de 50 celdas + barra inferior persistente con diferenciación cromática de 3 estados (`DISPONIBLE`, `OCUPADA`, `MANTENIMIENTO`) y filtros combinados. |
| **HU-06** | *Como administrador, quiero bloquear celdas libres por mantenimiento y rehabilitarlas al finalizar obras para evitar asignaciones erróneas en portería.* | Impide bloquear celdas `OCUPADA`; exige/registra motivo de bloqueo; excluye la celda del selector de portería; audita `CELDA_MANTENIMIENTO` / `CELDA_HABILITADA`. |
| **HU-07** | *Como administrador u operador, quiero inspeccionar una celda ocupada y reubicar el vehículo en otra celda libre del mismo tipo sin cerrar su ticket.* | Muestra ficha de ocupación activa; filtra únicamente celdas libres de igual categoría; libera origen y ocupa destino conservando `idTicket`; audita `CELDA_REUBICADA`. |

---

## 3. Arquitectura del Sistema (MVC Cliente-Servidor)

El sistema implementa el patrón **Modelo-Vista-Controlador (MVC)** alineado con los diagramas de Arquitectura, Clases, Paquetes, Secuencia y Componentes ubicados en `/docs`:

```
                  ┌────────────────────────────────────────────────────────────┐
                  │            CAPA DE PRESENTACIÓN (CLIENTE WEB SPA)          │
                  │  index.html (Tailwind CSS + Vanilla JS + Fetch Híbrido)    │
                  │  - VistaLoginMultiRol        - VistaAdminDashboard & CRUDs │
                  │  - VistaIngresoPorteria      - VistaSalidasNovedades       │
                  │  - VistaMonitor50Celdas      - VistaMensualidadesCaja      │
                  │  - ModalGestionCelda         - VistaBitacoraAuditoria      │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │ HTTP JSON (fetch) / Fallback Local
                                                ▼
                  ┌────────────────────────────────────────────────────────────┐
                  │         CAPA DE LÓGICA DE NEGOCIO (BACKEND NODE.JS)        │
                  │  server.js (Express API REST + Enrutador + Estáticos)      │
                  │  src/controladores/parqueadero.controller.js               │
                  │  - ControladorParqueadero (Orquestador Iteraciones 1 y 2)  │
                  │  - Reglas RNF-01: Unicidad, Baja Segura, Mantenimiento y   │
                  │    Reubicación Transaccional entre Celdas                  │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │ ES6 Class Imports
                                                ▼
                  ┌────────────────────────────────────────────────────────────┐
                  │             CAPA DE DOMINIO (ENTIDADES POO ES6)            │
                  │  src/dominio/modelos.js                                    │
                  │  - Usuario     - Vehiculo    - Celda                       │
                  │  - Movimiento  - Pago        - Empleado                    │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼                                               ▼
         ┌───────────────────────────────┐               ┌───────────────────────────────┐
         │ PERSISTENCIA 1: MYSQL 8.0+    │               │ PERSISTENCIA 2: MEMORIA RAM   │
         │ Base de Datos Relacional      │               │ Repositorio Reactivo          │
         │ database/schema_autos_colombia│  (Fallback)   │ Pre-cargado con 50 celdas,    │
         │ (6 Tablas e Integridad ACID)  │ ◄───────────► │ suscriptores, empleados y log │
         └───────────────────────────────┘               └───────────────────────────────┘
```

### Estructura de Paquetes del Repositorio

```
Autos_colombia/
│
├── database/
│   └── schema_autos_colombia.sql          # DDL/DML MySQL 8.0+ (usuarios, vehiculos, celdas, pagos, movimientos, empleados + 50 celdas)
│
├── docs/
│   ├── Iteracion_1/                       # Artefactos UML y Modelos de Datos — Iteración 1
│   │   ├── Arquitectura del Sistema - Autos Colombia.drawio.xml
│   │   ├── Diagrama de Casos de Uso UML.drawio.xml
│   │   ├── Diagrama de Clases UML.drawio.xml
│   │   ├── Diagrama de Paquetes UML.drawio.xml
│   │   ├── Modelo Entidad-Relación (MER.drawio.xml
│   │   ├── Modelo Relacional (MR).drawio.xml
│   │   └── Modelo Físico de Base de Datos.drawio.xml
│   └── Iteracion_2/                       # Artefactos UML y Mockups — Iteración 2
│       ├── Entregable 2_ Diagrama de Casos de Uso UML (Iteración 2_ Gestión de Usuarios y Celdas).drawio.xml
│       ├── Entregable 3_ Tablero de Historias de Usuario (Iteración 2_ Gestión de Usuarios y 50 Celdas).drawio.xml
│       ├── Entregable 5.1_ Diagrama de Secuencia UML — Ingreso Vehicular, Validación y Emisión de Ticket (Iteración 1).drawio.xml
│       ├── Entregable 5.2_ Diagrama de Secuencia UML — Gestión de Usuarios y Control de 50 Celdas (Iteración 2).drawio.xml
│       ├── Entregable 6_ Diagrama de Componentes UML — Sistema Parqueadero Autos Colombia (Iteraciones 1 y 2).drawio.xml
│       └── index_iteracion2_mockups.html
│
├── src/
│   ├── dominio/
│   │   └── modelos.js                     # Entidades ES6: Usuario, Vehiculo, Celda, Movimiento, Pago, Empleado
│   └── controladores/
│       ├── parqueadero.controller.js      # ControladorParqueadero, lógica Iteraciones 1 y 2 y persistencia híbrida
│       └── parqueadero.controllers.js     # Re-exportador compatible con convenciones plural/singular
│
├── .env.example                           # Plantilla de variables de entorno (MySQL y Puerto)
├── index.html                             # Interfaz SPA corporativa (Sinergia Fetch + Fallback Cero Fricción)
├── package.json                           # Manifiesto de dependencias y scripts de Node.js
├── README.md                              # Documentación técnica, guía de ejecución y plan de pruebas
└── server.js                              # Servidor Express, endpoints REST e inicialización controlada
```

---

## 4. Endpoints de la API REST (Iteración 1 + Iteración 2)

| Método | Ruta | Iteración | Descripción Operativa | Códigos HTTP |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Iter. 1 / 2 | Autentica usuarios por correo/cédula/ID, clave y rol (`ADMIN` / `OPERADOR`), bloqueando cuentas `REVOCADO`. | `200`, `401`, `403` |
| `GET` | `/api/estado` | Iter. 1 / 2 | Retorna estado global sincronizado (suscriptores, empleados sanitizados, 50 celdas, patio activo y auditoría). | `200`, `500` |
| `GET` | `/api/admin/metricas` | Iter. 1 / 2 | Calcula KPIs ejecutivos: recaudo total, desglose por medio, ocupación/mantenimiento de 50 celdas y cartera. | `200`, `500` |
| `POST` | `/api/pagos/vincular` | **Iter. 2** | Alta administrativa de suscriptor y vehículo validando unicidad de placa y documento (`SUSCRIPTOR_CREADO`). | `201`, `400`, `409` |
| `PUT` | `/api/admin/usuarios/:placa` | **Iter. 2** | Actualiza datos maestros, teléfono, marca/color, canon, vencimiento y estado (`SUSCRIPTOR_MODIFICADO`). | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/admin/usuarios/:placa` | **Iter. 2** | Da de baja un suscriptor validando que no tenga vehículo estacionado en patio (`SUSCRIPTOR_ELIMINADO`). | `200`, `400`, `404` |
| `GET` | `/api/celdas` | **Iter. 2** | Lista el catálogo completo de las 50 celdas con su estado (`DISPONIBLE`, `OCUPADA`, `MANTENIMIENTO`). | `200`, `500` |
| `GET` | `/api/celdas/:codigo` | **Iter. 2** | Inspecciona una celda específica retornando ocupante, ticket activo, motivo de bloqueo e historial. | `200`, `404` |
| `PATCH` | `/api/celdas/:codigo/mantenimiento` | **Iter. 2** | Inhabilita (`MANTENIMIENTO`) una celda libre con motivo o la rehabilita (`DISPONIBLE`); rechaza celdas `OCUPADA`. | `200`, `400`, `404`, `409` |
| `POST` | `/api/celdas/reubicar` | **Iter. 2** | Reubica un vehículo entre celdas compatibles liberando origen y ocupando destino sin cerrar el ticket activo. | `200`, `400`, `404`, `409` |
| `GET` | `/api/admin/empleados` | Iter. 1 / 2 | Consulta el directorio de empleados con filtros por texto, rol y estado de acceso. | `200`, `500` |
| `POST` | `/api/admin/empleados` | Iter. 1 / 2 | Crea una nueva cuenta de colaborador validando correo y documento únicos (`EMPLEADO_CREADO`). | `201`, `400`, `409` |
| `PUT` | `/api/admin/empleados/:id` | Iter. 1 / 2 | Modifica cargo, teléfono, correo, rol, estado o contraseña de un colaborador (`EMPLEADO_MODIFICADO`). | `200`, `400`, `404`, `409` |
| `PATCH` | `/api/admin/empleados/:id/permisos` | Iter. 1 / 2 | Revoca o restaura permisos de acceso (`ACTIVO` / `REVOCADO`) protegiendo `EMP-001`. | `200`, `400`, `403`, `404` |
| `DELETE` | `/api/admin/empleados/:id` | Iter. 1 / 2 | Elimina definitivamente una cuenta de empleado protegiendo la cuenta maestra `EMP-001`. | `200`, `403`, `404` |
| `POST` | `/api/movimientos/entrada` | Iter. 1 / 2 | Valida placa y vigencia, rechaza celdas ocupadas o en `MANTENIMIENTO`, registra ingreso y emite ticket. | `201`, `400`, `403`, `404`, `409` |
| `POST` | `/api/movimientos/salida` | Iter. 1 | Registra egreso vehicular, consolida novedades finales y libera la celda a `DISPONIBLE`. | `200`, `404` |
| `POST` | `/api/movimientos/novedad` | Iter. 1 | Anexa una novedad física inmutable al movimiento activo en patio. | `200`, `400`, `404` |
| `POST` | `/api/pagos` | Iter. 1 | Procesa recaudo de mensualidad (+30 días), actualiza estado a `ACTIVA` y emite Paz y Salvo. | `200`, `404` |
| `POST` | `/api/clientes` | Iter. 1 / 2 | Vincula un nuevo suscriptor desde el módulo de Mensualidades y Caja con pago inicial. | `201`, `400`, `409` |
| `GET` | `/api/historial` | Iter. 1 / 2 | Consulta la bitácora general de auditoría filtrable por texto libre y tipo de evento. | `200`, `500` |

---

## 5. Sistema de Autenticación, Roles (RBAC) y Credenciales Demo

| ID | Nombre | Rol Asignado | Usuario / Correo | Contraseña | Estado | Alcance Operativo |
|---|---|---|---|---|---|---|
| `EMP-001` | Dra. Patricia Gómez | `ADMINISTRADOR` | `admin@autoscolombia.com` | `admin123` | **ACTIVO** | **Cuenta Maestra Protegida:** Dashboard ejecutivo, CRUD de suscriptores, CRUD de empleados y gestión total de 50 celdas. |
| `EMP-004` | Ing. Fernando Ospina | `ADMINISTRADOR` | `fernando.admin@autoscolombia.com` | `admin456` | **ACTIVO** | **Supervisor:** Segundo perfil administrador habilitado para auditoría y control operativo. |
| `EMP-002` | Carlos Ríos | `OPERADOR` | `operario@autoscolombia.com` | `operario123` | **ACTIVO** | **Operador Principal:** Portería, tickets de ingreso, salidas, novedades, caja y monitor de patio. |
| `EMP-003` | Alejandra Morales | `OPERADOR` | `alejandra.caja@autoscolombia.com` | `caja123` | **ACTIVO** | **Cajera:** Recaudo de mensualidades, Paz y Salvo y vinculación en caja. |
| `EMP-005` | Julián Torres | `OPERADOR` | `julian.seguridad@autoscolombia.com` | `julian123` | **REVOCADO** | **Caso de Prueba RBAC:** Verifica el rechazo automático (`HTTP 403`) de cuentas con permisos revocados. |

---

## 6. Guía de Ejecución del Proyecto

### Modo 1: Servidor Node.js + API REST (Recomendado)

1. **Instalar dependencias** (requiere Node.js 18+ LTS):
   ```bash
   npm install
   ```
2. **Iniciar el servidor Express:**
   ```bash
   npm start
   ```
   *(O en modo desarrollo con recarga automática: `npm run dev`).*
3. **Abrir en el navegador:**
   👉 **`http://localhost:3000`**

### Modo 2: Ejecución Directa (Cero Fricción) o Persistencia MySQL Opcional

- **Opción A — Apertura Directa (`file:///`):** Abra `index.html` con doble clic en cualquier navegador moderno. El motor reactivo local ejecutará el 100 % de las funciones de las Iteraciones 1 y 2 sin requerir servidor activo.
- **Opción B — Base de Datos Relacional MySQL 8.0+:**
  1. Ejecute el script `database/schema_autos_colombia.sql` en su instancia local de MySQL (`localhost:3306`). Si tenía una versión previa de la Iteración 1, recree el esquema o aplique las sentencias `ALTER TABLE` documentadas al final del script.
  2. Configure opcionalmente un archivo `.env` a partir de `.env.example` y ejecute `npm start`.

---

## 7. Plan de Pruebas Funcionales — Iteración 2 (12 Casos de Validación)

| Código | Módulo / HU | Escenario de Prueba | Entrada de Prueba | Resultado Esperado |
|---|---|---|---|---|
| **CP-USU-01** | Usuarios (`HU-01`) | Alta exitosa de nuevo suscriptor y vehículo | Placa `RTY-901`, `Automóvil`, Doc `CC 1098765432`, Canon `$180.000` | `HTTP 201`, alta en padrón `ACTIVA` y registro `SUSCRIPTOR_CREADO` en auditoría. |
| **CP-USU-02** | Usuarios (`HU-01` / `RNF-01`) | Rechazo por placa duplicada o documento duplicado | Placa existente `ENV-774` o documento ya registrado | `HTTP 409`, bloqueo del registro sin duplicar filas en el padrón. |
| **CP-USU-03** | Usuarios (`HU-02`) | Consulta y filtrado combinado en tiempo real | Búsqueda por texto/cédula + filtro `Automóvil`/`Motocicleta` + `ACTIVA`/`EN MORA` | Renderizado instantáneo de coincidencias exactas en tabla responsiva. |
| **CP-USU-04** | Usuarios (`HU-03`) | Modificación de datos maestros y estado de cartera | Actualizar titular, canon, fecha de vencimiento y estado de suscriptor | `HTTP 200`, cambios reflejados en caja/portería y evento `SUSCRIPTOR_MODIFICADO`. |
| **CP-USU-05** | Usuarios (`HU-04` / `RNF-01`) | Bloqueo estricto de baja con vehículo en patio | Intentar eliminar `ENV-774` (estacionado en celda `A-01`) | `HTTP 400`, botón deshabilitado en UI y rechazo de seguridad conservando el registro. |
| **CP-USU-06** | Usuarios (`HU-04`) | Baja exitosa de suscriptor fuera de patio | Eliminar `KLM-452` (`enPatio === false`) | `HTTP 200`, retiro del padrón y evento `SUSCRIPTOR_ELIMINADO` en bitácora. |
| **CP-CEL-01** | Celdas (`HU-05`) | Monitoreo de 50 celdas, 3 estados y 4 KPIs | Inspección de `20 Autos` (`A-01`..`A-20`) y `30 Motos` (`M-01`..`M-30`) | Conteo exacto (`45 Libres`, `3 Ocupadas`, `2 Mantenimiento`) y filtrado por estado. |
| **CP-CEL-02** | Celdas (`HU-06`) | Bloqueo de celda disponible por mantenimiento | Pasar celda libre `A-05` a `MANTENIMIENTO` con motivo de obra | `HTTP 200`, tarjeta roja bloqueada, exclusión de portería y evento `CELDA_MANTENIMIENTO`. |
| **CP-CEL-03** | Celdas (`HU-06` / `RNF-01`) | Prohibición de bloquear una celda ocupada | Intentar pasar celda `A-01` (`OCUPADA` por `ENV-774`) a `MANTENIMIENTO` | `HTTP 400`, conservación de ocupación activa sin alterar el vehículo estacionado. |
| **CP-CEL-04** | Celdas (`HU-06`) | Rehabilitación de celda en mantenimiento | Pasar celda `A-04` o `M-05` de `MANTENIMIENTO` a `DISPONIBLE` | `HTTP 200`, retorno inmediato al selector de portería y evento `CELDA_HABILITADA`. |
| **CP-CEL-05** | Celdas (`HU-07`) | Inspección y reubicación operativa exitosa | Reubicar `ENV-774` desde `A-01` hacia `A-03` (`DISPONIBLE`) | `HTTP 200`, `A-01` pasa a `DISPONIBLE`, `A-03` a `OCUPADA`, ticket `TRX-2026-1041` intacto y `CELDA_REUBICADA`. |
| **CP-CEL-06** | Celdas (`HU-07` / `RNF-01`) | Compatibilidad estricta en reubicación entre sectores | Intentar reubicar `Automóvil` a celda `M-02` o `Motocicleta` a celda `A-06` | `HTTP 400` en API y selector restringido exclusivamente a celdas libres del mismo tipo. |

---

## 8. Trazabilidad con Artefactos de Ingeniería de Software (`/docs`)

| Carpeta / Entregable | Artefacto de Modelado | Implementación Trazable en el Proyecto |
|---|---|---|
| `docs/Iteracion_1/` | Arquitectura MVC, Casos de Uso, Clases, Paquetes, MER, MR y Modelo Físico | Capas `index.html`, `server.js`, `src/controladores/parqueadero.controller.js`, `src/dominio/modelos.js` y `database/schema_autos_colombia.sql`. |
| `docs/Iteracion_2/` — Entregable 2 | Diagrama de Casos de Uso UML (Gestión de Usuarios y Celdas) | Casos de uso de alta, consulta, edición, baja segura, monitoreo, mantenimiento y reubicación implementados en API y SPA. |
| `docs/Iteracion_2/` — Entregable 3 | Tablero de Historias de Usuario (`HU-01` a `HU-07`) | Validaciones de negocio, KPIs, modales responsivos y eventos de auditoría correspondientes a los 12 casos `CP-USU` / `CP-CEL`. |
| `docs/Iteracion_2/` — Entregables 5.1 y 5.2 | Diagramas de Secuencia UML (Ingreso Iter. 1 y Usuarios/Celdas Iter. 2) | Flujo exacto `SPA -> Express Router -> ControladorParqueadero -> Entidades Dominio -> MySQL / Memoria`. |
| `docs/Iteracion_2/` — Entregable 6 | Diagrama de Componentes UML (Iteraciones 1 y 2) | Interconexión de componentes de presentación, controladores REST, entidades ES6 y adaptador híbrido de persistencia. |
