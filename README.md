# 🅿️ Sistema de Gestión Operativa - Parqueadero Autos Colombia 

> **Asignatura:** Arquitectura y Diseño de Software / Ingeniería de Software  
> **Institución Universitaria / Proyecto:** Autos Colombia  
> **Patrón Arquitectónico:** Modelo-Vista-Controlador (MVC) Cliente-Servidor  
> **Estrategia Operativa:** Sinergia Híbrida de Cero Fricción (Persistencia Dual MySQL / Memoria Reactiva)

---

## 1. Descripción del Sistema

El **Sistema de Gestión Operativa para el Parqueadero Autos Colombia ** es una solución integral diseñada para sistematizar, agilizar y auditar las operaciones de acceso vehicular, asignación de espacios, control de mensualidades y novedades físicas en portería y caja.

El sistema administra una capacidad instalada de **50 celdas fijas**:
- **20 celdas para automóviles** (`A-01` a `A-20`).
- **30 celdas para motocicletas** (`M-01` a `M-30`).

### Estrategia Híbrida de Cero Fricción (Zero-Friction Architecture)
El sistema implementa un mecanismo inteligente de **tolerancia a fallos**:
1. **Modo Producción / Evaluador con Servidor (Node.js + Express):** Expone una API REST moderna en `http://localhost:3000`. Al iniciar, intenta comunicarse con el motor relacional **MySQL 8.0+** (`autos_colombia_db`). Si MySQL está activo, sincroniza y persiste los datos relacionalmente. Si MySQL no está presente o el servicio está detenido, conmuta **automáticamente y sin fallar** a un **Repositorio en Memoria reactivo** que garantiza operatividad al 100 %.
2. **Modo SPA Directa (Doble Clic / GitHub Pages):** Si el docente o usuario abre directamente el archivo `index.html` en el navegador (o bajo protocolo `file:///`), el bloque de script detecta la ausencia del backend e invoca transparentemente su motor local en memoria, permitiendo evaluar la interfaz visual y la lógica operativa sin requerir configuración previa de servidores.

---

## 2. Matriz de Requerimientos e Historias de Usuario

### 2.1 Requerimientos Funcionales (RF)

| ID | Nombre del Requerimiento | Descripción Operativa | Caso de Uso | Historia de Usuario |
|---|---|---|---|---|
| **RF-01** | Validación de Placa y Vigencia | Verifica que la placa ingresada pertenezca al padrón de suscriptores y cuente con estado **ACTIVO** (Paz y Salvo). Si está vencida, bloquea el acceso. | CU-03 | HU-01 |
| **RF-02** | Asignación de Celda Compatible | Filtra y asigna dinámicamente celdas en estado `DISPONIBLE` correspondientes a la categoría del vehículo (`Automóvil` o `Motocicleta`). | CU-04 | HU-01, HU-03 |
| **RF-03** | Registro de Ingreso en Patio | Registra el ingreso vehicular capturando fecha y hora, celda seleccionada, titular y observaciones físicas de portería. | CU-02 | HU-01 |
| **RF-04** | Emisión de Comprobante / Ticket | Genera comprobante digital y térmico de ingreso con código de transacción único (`TRX-YYYY-####`) para soporte del usuario. | CU-05 | HU-02 |
| **RF-05** | Registro de Novedades Físicas | Permite anexar bitácoras inmutables sobre el estado del vehículo (rayones, accesorios, cascos) para protección de responsabilidad. | CU-06 | HU-05 |
| **RF-06** | Gestión y Recaudo de Mensualidad | Permite registrar el pago de mensualidad en caja, actualizar vigencia por +30 días, cambiar estado a **PAZ Y SALVO** y emitir recibo. | CU-10 | HU-04 |
| **RF-07** | Validación de Salida e Inspección | Comprueba que el vehículo a egresar figure como activo en patio y permite consultar el acta de novedades físicas registradas. | CU-07 | HU-06 |
| **RF-08** | Registro de Egreso Vehicular | Asigna fecha y hora de salida, calcula el tiempo total de permanencia en patio y finaliza el ciclo operativo del movimiento. | CU-07 | HU-06 |
| **RF-09** | Liberación Automática de Celda | Conmuta inmediatamente el estado de la celda ocupada a `DISPONIBLE`, restableciendo el cupo en el inventario de las 50 celdas. | CU-08 | HU-06, HU-03 |
| **RF-10** | Auditoría e Historial de Operaciones | Mantiene el registro inmutable de todos los eventos (ingresos, salidas, bloqueos, novedades, pagos) con opción de exportación a CSV. | CU-11 | HU-07 |

---

### 2.2 Requerimientos No Funcionales (RNF)

| ID | Nombre | Especificación Técnica |
|---|---|---|
| **RNF-01** | **Rendimiento y Latencia** | Las consultas y mutaciones de estado en memoria y API REST se completan en un tiempo inferior a **200 ms**, garantizando fluidez en portería. |
| **RNF-02** | **Disponibilidad y Tolerancia a Fallos** | Resiliencia de **cero fricción**: Si el motor MySQL no está disponible, el sistema conmuta automáticamente al repositorio en memoria sin generar excepciones. |
| **RNF-03** | **Integridad Referencial de Datos** | El modelo físico relacional implementa llaves primarias, foráneas, restricciones `CHECK` e índices B-Tree bajo el motor **InnoDB** de MySQL. |
| **RNF-04** | **Usabilidad y Compatibilidad Visual** | Interfaz SPA responsiva basada en Tailwind CSS, optimizada para terminales táctiles de portería, lectores de código y resoluciones estándar de escritorio. |
| **RNF-05** | **Trazabilidad e Inmutabilidad** | Toda transacción genera un registro de auditoría con identificador único, marca temporal, módulo de origen y operario responsable. |

---

### 2.3 Historias de Usuario (HU)

| ID | Historia de Usuario | Criterios de Aceptación Principales |
|---|---|---|
| **HU-01** | *Como operario de portería, quiero validar la placa de un vehículo para autorizar su ingreso si cuenta con mensualidad activa.* | Valida formato de placa; bloquea vehículos en mora; no permite doble ingreso si ya está en patio; habilita celdas libres compatibles. |
| **HU-02** | *Como operario de portería, quiero emitir un comprobante de ingreso para entregarlo al suscriptor.* | Muestra ticket con datos del vehículo, fecha, hora, celda, operario y observaciones; permite previsualización, impresión POS y descarga en `.txt`. |
| **HU-03** | *Como administrador, quiero monitorear el estado de las 50 celdas para conocer la ocupación en tiempo real.* | Matriz interactiva de 50 celdas (20 autos, 30 motos); diferenciación cromática (Verde = Libre, Ámbar = Ocupada); filtros por categoría y búsqueda rápida. |
| **HU-04** | *Como cajero, quiero registrar el recaudo de mensualidad de un cliente para ponerlo a Paz y Salvo.* | Selección de suscriptor; cálculo de tarifa oficial ($180.000 auto / $95.000 moto); actualización de vigencia a +30 días; generación de certificado de Paz y Salvo. |
| **HU-05** | *Como operario, quiero anexar novedades físicas a un vehículo estacionado para evitar reclamaciones injustificadas.* | Anexa texto con timestamp inmutable; se refleja en la ficha de salida y en la bitácora general de auditoría. |
| **HU-06** | *Como operario, quiero registrar la salida de un vehículo para liberar la celda y actualizar el cupo disponible.* | Lista de vehículos activos en patio; validación de novedades; cálculo de permanencia; liberación de celda a estado `DISPONIBLE`. |
| **HU-07** | *Como auditor o gerente, quiero consultar la bitácora de eventos para supervisar las operaciones y exportar reportes.* | Tabla de auditoría con filtros por tipo de evento y texto; visualización de operario responsable; exportación de bitácora completa en formato `.csv`. |

---

## 3. Arquitectura del Sistema (MVC Cliente-Servidor)

El sistema adopta el patrón arquitectónico **Modelo-Vista-Controlador (MVC)** desacoplado en capas de presentación, lógica de negocio y persistencia, como se especifica en los diagramas UML de la carpeta `/docs`.

```
                  ┌────────────────────────────────────────────────────────┐
                  │          CAPA DE PRESENTACIÓN (CLIENTE WEB)            │
                  │  index.html (SPA con Tailwind CSS y Vanilla JS)        │
                  │  - VistaIngresoPorteria        - VistaSalidasNovedades │
                  │  - VistaMonitorCeldasPatio     - VistaMensualidadesCaja│
                  │  - VistaBitacoraAuditoria                              │
                  └───────────────────────────┬────────────────────────────┘
                                              │ HTTP JSON (fetch) / Fallback
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │       CAPA DE LÓGICA DE NEGOCIO (BACKEND NODE.JS)      │
                  │  server.js (Servidor Express y Enrutador REST)         │
                  │  src/controladores/parqueadero.controller.js           │
                  │  - ControladorParqueadero (Orquestador principal)      │
                  │  - Validador de Vigencia y Compatibilidad              │
                  └───────────────────────────┬────────────────────────────┘
                                              │ ES6 Class Imports
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │           CAPA DE DOMINIO (ENTIDADES ES6)              │
                  │  src/dominio/modelos.js                                │
                  │  - Usuario    - Vehiculo   - Celda                     │
                  │  - Movimiento - Pago                                   │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌───────────────────────────────┐               ┌───────────────────────────────┐
         │ PERSISTENCIA 1: MYSQL 8.0+    │               │ PERSISTENCIA 2: MEMORIA RAM   │
         │ Base de Datos Relacional      │               │ Repositorio Reactivo          │
         │ database/schema_autos_colombia│  (Fallback)   │ Pre-cargado con 50 celdas     │
         │ (5 Tablas e Integridad DDL)   │ ◄───────────► │ Tolerancia a fallos inmediata │
         └───────────────────────────────┘               └───────────────────────────────┘
```

### Estructura de Paquetes del Repositorio

```
Autos_colombia/
│
├── database/
│   └── schema_autos_colombia.sql          # Script DDL Físico (MySQL: 5 tablas y semilla de 50 celdas)
│
├── docs/                                  # Diagramas de Arquitectura y Diseño de Software (Draw.io XML)
│   ├── Arquitectura del Sistema - Autos Colombia.drawio.xml
│   ├── Diagrama de Casos de Uso UML.drawio.xml
│   ├── Diagrama de Clases UML.drawio.xml
│   ├── Diagrama de Paquetes UML.drawio.xml
│   ├── Modelo Entidad-Relación (MER.drawio.xml
│   ├── Modelo Relacional (MR).drawio.xml
│   └── Modelo Físico de Base de Datos.drawio.xml
│
├── src/
│   ├── dominio/
│   │   └── modelos.js                     # Entidades ES6: Usuario, Vehiculo, Celda, Movimiento, Pago
│   └── controladores/
│       ├── parqueadero.controller.js      # ControladorParqueadero y persistencia híbrida
│       └── parqueadero.controllers.js     # Alias de importación compatible
│
├── .env.example                           # Plantilla de variables de entorno (MySQL y Puerto)
├── index.html                             # Interfaz SPA de alta fidelidad (Frontend Cero Fricción)
├── package.json                           # Manifiesto de dependencias y scripts de Node.js
├── README.md                              # Documentación técnica y académica completa
└── server.js                              # Servidor Express, endpoints REST y servidor de estáticos
```

---

## 4. Endpoints de la API REST

| Método | Ruta | Descripción | Códigos HTTP |
|---|---|---|---|
| `GET` | `/api/estado` | Retorna el estado global del parqueadero (suscriptores, 50 celdas, vehículos en patio y bitácora). | `200`, `500` |
| `POST` | `/api/movimientos/entrada` | Valida titularidad y cupo, asigna celda, registra ingreso vehicular y genera comprobante. | `201`, `400`, `403`, `404`, `409` |
| `POST` | `/api/movimientos/salida` | Valida permanencia en patio, registra egreso, libera celda a `DISPONIBLE` y sella auditoría. | `200`, `400`, `404` |
| `POST` | `/api/movimientos/novedad` | Anexa novedad física inmutable a un vehículo estacionado en patio. | `200`, `400`, `404` |
| `POST` | `/api/pagos` | Registra el pago mensual, renueva vigencia por 30 días, emite Paz y Salvo y actualiza cliente. | `200`, `400`, `404` |
| `POST` | `/api/clientes` | Vincula un nuevo suscriptor al padrón mensual de vehículos. | `201`, `400`, `409` |
| `GET` | `/api/historial` | Consulta la bitácora de auditoría histórica con filtros por tipo de evento o búsqueda de texto. | `200`, `500` |

---

## 5. Guía de Ejecución del Proyecto

El sistema ofrece **2 modalidades de ejecución**, asegurando que el evaluador pueda probar el sistema de inmediato independientemente del entorno disponible:

### Modo 1: Servidor Node.js + API REST (Recomendado)

Requiere tener instalado **Node.js** (versión 16+ o 18+ LTS).

1. **Abrir la terminal** en la carpeta raíz del proyecto:
   ```bash
   cd "c:\Users\Autos_colombia"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```
   *(Instala `express`, `cors`, `mysql2` y `dotenv`).*

3. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   *(O en modo desarrollo con auto-recarga: `npm run dev`).*

4. **Acceder en el navegador:**
   Abra cualquier navegador moderno en la URL:
   👉 **`http://localhost:3000`**

   *Nota:* En la consola verá el mensaje confirmando si el servidor se conectó a MySQL o si activó el **Modo de Memoria Reactiva con Cero Fricción**. Ambos modos garantizan el 100 % de las operaciones funcionales.

---

### Modo 2: Ejecución Directa en Navegador / Base de Datos MySQL Opcional

#### Opción A: Ejecución Directa (Sin Servidor)
- Haga doble clic sobre el archivo **`index.html`** para abrirlo directamente en Google Chrome, Microsoft Edge o Firefox (o ejecútelo con la extensión *Live Server* de Visual Studio Code).
- El sistema detectará que no hay backend activo y operará al 100 % con su motor en memoria reactivo pre-cargado, sin presentar pantallas de error ni bloquear la interfaz.

#### Opción B: Conexión con Base de Datos MySQL (Opcional)
Si desea evaluar la persistencia física en motor relacional:
1. Abra **MySQL Workbench**, **phpMyAdmin** o su cliente MySQL preferido en `localhost:3306`.
2. Abra y ejecute el script ubicado en:
   ```
   database/schema_autos_colombia.sql
   ```
   Este script creará la base de datos `autos_colombia_db`, las 5 tablas físicas (`usuarios`, `vehiculos`, `celdas`, `pagos`, `movimientos`) y poblará la semilla inicial de las **50 celdas**.
3. (Opcional) Si su usuario o contraseña de MySQL son diferentes a `root` y clave vacía, configure un archivo `.env` en la raíz:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=su_contraseña
   DB_NAME=autos_colombia_db
   ```
4. Reinicie el servidor con `npm start`. El sistema mostrará:
   `[ControladorParqueadero] Conexión establecida con MySQL (autos_colombia_db).`

---

## 6. Trazabilidad con Diagramas de Arquitectura (/docs)

| Diagrama en `/docs` | Elementos de Modelado Validados en Código |
|---|---|
| **Arquitectura del Sistema** | Estructura en 3 capas: Presentación Web (SPA), Lógica de Negocio (Controlador REST Express) y Persistencia (MySQL / Memoria). |
| **Diagrama de Clases UML** | Entidades ES6 implementadas en `src/dominio/modelos.js` con exactamente los mismos atributos y métodos: `Usuario`, `Vehiculo`, `Celda`, `Movimiento`, `Pago` y `ControladorParqueadero`. |
| **Diagrama de Paquetes UML** | Correspondencia con los módulos `com.autoscolombia.presentacion`, `com.autoscolombia.logica.controladores`, `com.autoscolombia.dominio.entidades` y `com.autoscolombia.infraestructura.persistencia`. |
| **Diagrama de Casos de Uso UML** | Cobertura de los 11 casos de uso (`CU-01` a `CU-11`) y roles de `Operario de Portería` y `Administrador/Cajero`. |
| **MER / Modelo Relacional / Físico** | Tabla `usuarios`, `vehiculos`, `celdas`, `pagos` y `movimientos` con restricciones de integridad DDL implementadas en `database/schema_autos_colombia.sql`. |

---

## 7. Conclusión y Logros de la Iteración 1

La implementación de esta **Iteración 1** consolida una arquitectura modular, extensible y de grado profesional:
1. **Separación de Responsabilidades:** El modelo de dominio encapsula la lógica de negocio sin acoplarse al framework web.
2. **Cero Fricción en Evaluación:** La arquitectura híbrida elimina los típicos inconvenientes de configuración de bases de datos para evaluadores docentes, funcionando tanto en entornos full-stack conectados como en modo portable cliente.
3. **Fidelidad Visual Absoluta:** La interfaz de usuario conserva el 100 % de sus estilos corporativos y experiencia interactiva original.
