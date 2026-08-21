# Design Document — cotizador-backend

## Overview

El backend del cotizador de reparación de calzado es un servicio REST construido con Java 17 y Spring Boot que implementa arquitectura hexagonal (puertos y adaptadores). Su responsabilidad es exponer tres endpoints que permiten a los clientes consultar el catálogo de tipos de calzado y reparaciones, y generar cotizaciones estimadas de costo y tiempo de entrega.

El alcance está intencionalmente acotado: sin autenticación, sin pasarela de pago y con persistencia en memoria. Esto hace que el dominio sea el foco central y facilita la sustitución futura de la capa de infraestructura (p. ej., reemplazar los repositorios in-memory por JPA) sin tocar ninguna regla de negocio.

### Objetivos de diseño

- **Corrección matemática verificable**: los cálculos de subtotal, recargo y tiempo deben ser deterministas y probables con property-based testing.
- **Inversión de dependencias**: el dominio no importa nada de Spring ni de infraestructura.
- **Extensibilidad cerrada**: agregar un nuevo nivel de urgencia (p. ej., "súper urgente") no debe modificar código existente.
- **Contrato HTTP estable**: los controladores REST son adaptadores delgados; no contienen lógica de negocio.
- **Errores como contrato**: toda respuesta de error es un `ProblemDetails` (RFC 7807) con un `type` estable, de modo que el frontend pueda mostrar el mensaje del servidor sin reinterpretarlo (Requirement 5.1, UI-03).
- **Catálogo determinista desde el arranque**: el sistema queda operativo con el catálogo semilla ya cargado, o no arranca (Requirement 7).

---

## Architecture

La arquitectura hexagonal organiza el código en tres capas concéntricas. Las dependencias apuntan siempre hacia el dominio (hacia adentro):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  infrastructure                                                         │
│                                                                         │
│  ┌───────────────────────────┐     ┌───────────────────────────────┐   │
│  │  adapter.in.rest          │     │  adapter.out.persistence      │   │
│  │  CatalogoController       │     │  InMemoryCalzadoRepository    │   │
│  │  CotizacionController     │     │  InMemoryReparacionRepository │   │
│  │  ProblemDetailsExcHandler │     │  InMemoryCotizacionRepository │   │
│  │  dto/  CotizacionRequest  │     └──────────────┬────────────────┘   │
│  │        CotizacionResponse │                    │                    │
│  │        CalzadoResponse    │     ┌──────────────┴────────────────┐   │
│  │        TipoReparacionResp │     │  config                       │   │
│  │  mapper/ CotizacionMapper │     │  CatalogoSemillaConfig        │   │
│  │          CatalogoMapper   │     │  CorsConfig                   │   │
│  └──────────┬────────────────┘     └──────────────┬────────────────┘   │
│             │                                     │                    │
│ ┌───────────▼─────────────────────────────────────▼──────────────────┐ │
│ │  application                                                        │ │
│ │                                                                     │ │
│ │  ┌─────────────────────┐       ┌────────────────────────────────┐  │ │
│ │  │  port.in (casos uso)│       │  port.out (contratos repos)    │  │ │
│ │  │  GenerarCotizacion  │       │  CalzadoRepositoryPort         │  │ │
│ │  │    UseCase          │       │  ReparacionRepositoryPort      │  │ │
│ │  │  ConsultarCatalogo  │       │  CotizacionRepositoryPort      │  │ │
│ │  │    UseCase          │       └─────────────────────────────── ┘  │ │
│ │  └──────────┬──────────┘                                           │ │
│ │             │                                                       │ │
│ │  ┌──────────▼──────────────────────────────────────────────────┐   │ │
│ │  │  service                                                     │   │ │
│ │  │  GenerarCotizacionService   ConsultarCatalogoService          │   │ │
│ │  │  ComparadorPorNombre                                          │   │ │
│ │  └─────────────────────────────────────────────────────────────┘   │ │
│ │                                                                     │ │
│ │  ┌──────────────────────────────┐  ┌─────────────────────────────┐ │ │
│ │  │  strategy                     │  │  exception                  │ │ │
│ │  │  UrgencyPricingStrategy       │  │  ValidacionCotizacion       │ │ │
│ │  │  NormalPricingStrategy        │  │    Exception                │ │ │
│ │  │  RecargoUrgentePricingStrategy│  │  ViolacionCampo             │ │ │
│ │  └──────────────────────────────┘  └─────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │  domain                                                           │   │
│ │                                                                   │   │
│ │  model/  Calzado  TipoReparacion  Cotizacion  Dinero  NivelUrgencia│  │
│ │  exception/  SinReparacionesSeleccionadasException                │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Regla de dependencias

| Capa origen | Puede depender de |
|---|---|
| `infrastructure` | `application.port.in`, `application.port.out`, `application.exception`, `application.strategy` (solo `config`, para instanciar el mapa de estrategias), `domain` |
| `application.service` | `application.port.in`, `application.port.out`, `application.strategy`, `application.exception`, `domain` |
| `application.strategy` | `domain` + Java estándar — **sin Spring** (ni `@Component`): las instancia `CatalogoSemillaConfig` |
| `application.exception` | Java estándar — sin Spring |
| `domain` | Solo Java estándar — sin Spring, sin Jakarta, sin nada externo |

---

## Components and Interfaces

### Capa domain

#### `Calzado` (entidad)
Representa una categoría de calzado. Es inmutable después de su creación. El constructor valida sus invariantes y lanza `IllegalArgumentException` si no se cumplen, lo que hace que un catálogo semilla inválido rompa el arranque (Requirement 7.6).

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | `String` | No nulo, no vacío |
| `nombre` | `String` | No nulo, no vacío |
| `factorComplejidad` | `BigDecimal` | >= 0.5, máximo 2 decimales (Requirement 7.4) |

#### `TipoReparacion` (entidad)
Representa un servicio de reparación disponible. Mismo criterio de validación en constructor que `Calzado`.

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | `String` | No nulo, no vacío |
| `nombre` | `String` | No nulo, no vacío |
| `precioBase` | `BigDecimal` | >= 0.01, máximo 2 decimales (Requirement 7.5) |
| `tiempoEstimadoDias` | `int` | >= 1 (Requirement 7.5) |

#### `Cotizacion` (agregado raíz)
Resultado de calcular costo y tiempo para una combinación de calzado + reparaciones. Se crea únicamente a través del método de fábrica `crear(...)`, que garantiza invariantes.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String` | UUID versión 4 en representación canónica, asignado en `crear` (Requirement 3.6) |
| `calzado` | `Calzado` | Snapshot del calzado en el momento de la cotización |
| `reparaciones` | `List<TipoReparacion>` | Al menos 1 elemento. **Puede contener repetidos**: cada aparición se cobra (Requirement 3.2) |
| `urgencia` | `NivelUrgencia` | `NORMAL` o `URGENTE` |
| `subtotal` | `Dinero` | Calculado en `crear`, redondeado HALF_UP a 2 decimales |
| `recargoUrgencia` | `Dinero` | `0.00` si `NORMAL`; 30 % del subtotal si `URGENTE` |
| `total` | `Dinero` | subtotal + recargoUrgencia |
| `tiempoEstimadoDias` | `int` | max(reparaciones) o max(1, ceil(max/2)) |
| `fechaCreacion` | `Instant` | UTC truncado a segundos, asignado en `crear` (Requirement 3.7) |

Método de fábrica:
```java
// domain/model/Cotizacion.java
public static Cotizacion crear(
    Calzado calzado,
    List<TipoReparacion> reparaciones,   // preserva repetidos y orden de la solicitud
    NivelUrgencia urgencia,
    UrgencyPricingStrategy pricingStrategy,
    Clock clock
) { ... }
```

> La lista `reparaciones` se recibe ya resuelta y **con las repeticiones intactas**. El agregado no deduplica: recorre la lista y acumula un producto por elemento (Requirements 3.1, 3.2, 6.1).

#### `Dinero` (value object)
Encapsula un monto monetario y su moneda. Todas las operaciones devuelven nuevas instancias.

| Método | Descripción |
|---|---|
| `sumar(Dinero otro)` | Suma dos montos de la misma moneda |
| `multiplicarPor(BigDecimal factor)` | Multiplica sin redondear (para acumular productos intermedios) |
| `aplicarPorcentaje(BigDecimal porcentaje)` | Multiplica y redondea a 2 decimales HALF_UP |
| `redondear()` | Devuelve el monto con escala 2 y `RoundingMode.HALF_UP` |
| `getMonto()` | `BigDecimal` con escala 2 |

La moneda es siempre `"USD"` en esta versión (Requirement 3.5).

> **Regla de redondeo**: los productos individuales `precioBase × factorComplejidad` se acumulan **sin redondear**; el redondeo HALF_UP a 2 decimales se aplica una sola vez, a la suma final (Requirement 3.1). El recargo se calcula sobre el subtotal **ya redondeado** (Requirement 4.2).

#### `NivelUrgencia` (enum)
```java
public enum NivelUrgencia {
    NORMAL, URGENTE;

    public static NivelUrgencia desdeFlag(Boolean urgente) {
        return Boolean.TRUE.equals(urgente) ? URGENTE : NORMAL;
    }
}
```

`desdeFlag` implementa el mapeo del Glossary: `true` → `URGENTE`; `false`, ausente o `null` → `NORMAL` (Requirement 3.3).

#### `SinReparacionesSeleccionadasException` (excepción de dominio)
Lanzada por `Cotizacion.crear(...)` cuando la lista de reparaciones está vacía. Extiende `RuntimeException`. Es la última línea de defensa del invariante RN-04: en el flujo normal la validación ocurre antes, en la capa de aplicación, para poder acumular varias causas de error.

---

### Capa application

#### `GenerarCotizacionUseCase` (port.in)
```java
public interface GenerarCotizacionUseCase {
    Cotizacion generarCotizacion(GenerarCotizacionCommand command);
}
```

`GenerarCotizacionCommand` es un record inmutable con `tipoCalzadoId` (`String`), `tipoReparacionIds` (`List<String>`, preserva repetidos y orden) y `urgente` (`Boolean`, admite `null`).

#### `ConsultarCatalogoUseCase` (port.in)
```java
public interface ConsultarCatalogoUseCase {
    List<Calzado> consultarCalzados();          // ordenados por nombre ASC
    List<TipoReparacion> consultarReparaciones(); // ordenados por nombre ASC
}
```

#### `CalzadoRepositoryPort` (port.out)
```java
public interface CalzadoRepositoryPort {
    List<Calzado> findAll();
    Optional<Calzado> findById(String id);
}
```

#### `ReparacionRepositoryPort` (port.out)
```java
public interface ReparacionRepositoryPort {
    List<TipoReparacion> findAll();

    /** Devuelve un índice id → TipoReparacion con los ids encontrados.
     *  No deduplica ni reordena la petición: la multiplicidad la resuelve
     *  el servicio a partir de la lista original (Requirement 3.2). */
    Map<String, TipoReparacion> findAllById(Collection<String> ids);
}
```

> **Cambio deliberado respecto de un `findAllById` que devuelve `List`**: una lista de resultados pierde la multiplicidad de la petición (`["1","1"]` colapsaría a un solo elemento) y no permite saber qué ids faltaron. Devolver un índice `Map` deja al servicio reconstruir la lista con repeticiones y calcular exactamente el conjunto de ids no encontrados (Requirements 3.2, 5.4).

#### `CotizacionRepositoryPort` (port.out)
```java
public interface CotizacionRepositoryPort {
    Cotizacion save(Cotizacion cotizacion);
}
```

No expone operaciones de lectura: el almacenamiento exigido por el Requirement 3.8 no se publica en la API y se verifica únicamente por prueba de este puerto.

#### `GenerarCotizacionService` (service)
Implementa `GenerarCotizacionUseCase`. Orquesta:

1. **Validar acumulando todas las causas** (Requirement 5.7), en el orden canónico de los criterios:
   - `tipoReparacionIds` nulo o vacío → violación `reparaciones-requeridas` (5.2).
   - `tipoCalzadoId` nulo, vacío o no encontrado vía `CalzadoRepositoryPort.findById` → violación `tipo-calzado-no-encontrado` (5.3).
   - ids de `tipoReparacionIds` ausentes del índice devuelto por `ReparacionRepositoryPort.findAllById` → violación `tipo-reparacion-no-encontrado`, con los ids faltantes **deduplicados para el reporte** (5.4, 5.5).
   - Si hay al menos una violación, lanza `ValidacionCotizacionException` con la lista completa. No se ejecuta ningún cálculo.
2. **Resolver la lista de reparaciones preservando repeticiones**: para cada elemento de `command.tipoReparacionIds()` (en orden) se toma la entidad del índice, de modo que `["1","1"]` produzca dos elementos (Requirement 3.2).
3. **Seleccionar la estrategia** a partir de `NivelUrgencia.desdeFlag(command.urgente())`.
4. **Delegar la creación del agregado** → `Cotizacion.crear(...)`.
5. **Persistir** → `CotizacionRepositoryPort.save` (Requirement 3.8).

#### `ConsultarCatalogoService` (service)
Implementa `ConsultarCatalogoUseCase`. Recupera las listas del repositorio y **ordena ambos catálogos** por nombre antes de retornarlas, usando `ComparadorPorNombre` (Requirements 1.3, 2.3). Si el repositorio está vacío devuelve una lista vacía, sin excepción (Requirements 1.4, 2.4).

#### `ComparadorPorNombre` (service)
Implementa el término `OrdenPorNombre` del Glossary: orden lexicográfico ascendente, insensible a mayúsculas y a acentos, con reglas de colación del español.

```java
// application/service/ComparadorPorNombre.java
public final class ComparadorPorNombre {
    private static final Collator COLLATOR = crearCollator();

    private static Collator crearCollator() {
        Collator c = Collator.getInstance(Locale.forLanguageTag("es"));
        c.setStrength(Collator.PRIMARY);  // ignora mayúsculas y acentos
        return c;
    }

    public static Comparator<Calzado> porNombreCalzado() { ... }
    public static Comparator<TipoReparacion> porNombreReparacion() { ... }
}
```

> Se usa `java.text.Collator` en lugar de `String.compareTo` porque la comparación binaria de UTF-16 ordena mal los acentos (`"tacón"` quedaría después de `"tz"`), y el catálogo semilla contiene `"Cambio de tacón"`.

#### `UrgencyPricingStrategy` (strategy — interface en application)
```java
public interface UrgencyPricingStrategy {
    Dinero calcularRecargo(Dinero subtotal);
    int calcularTiempo(int tiempoMaxDias);
}
```

#### Implementaciones de la estrategia

| Clase | `calcularRecargo` | `calcularTiempo` |
|---|---|---|
| `NormalPricingStrategy` | `Dinero.cero("USD")` | `tiempoMaxDias` sin modificar (Requirement 3.4) |
| `RecargoUrgentePricingStrategy` | `subtotal.aplicarPorcentaje(RECARGO_URGENCIA_PORCENTAJE)` | `max(1, ceil(tiempoMaxDias / 2))` (Requirement 4.3) |

`RecargoUrgentePricingStrategy` declara el porcentaje como **única fuente del valor** (Requirement 4.4):

```java
public static final BigDecimal RECARGO_URGENCIA_PORCENTAJE = new BigDecimal("0.30");
```

Ninguna otra clase del proyecto repite el literal `0.30` ni `1.30`.

#### `ValidacionCotizacionException` y `ViolacionCampo` (exception)
```java
// application/exception/ViolacionCampo.java
public record ViolacionCampo(
    TipoErrorCotizacion tipo,     // determina el `type` y `title` del ProblemDetails
    String campo,                 // p. ej. "tipoReparacionIds"
    List<String> valoresInvalidos, // vacía cuando no aplica
    String detalle                // mensaje legible para el cliente
) {}

// application/exception/ValidacionCotizacionException.java
public class ValidacionCotizacionException extends RuntimeException {
    private final List<ViolacionCampo> violaciones; // orden canónico, nunca vacía
}
```

`TipoErrorCotizacion` es un enum que asocia cada clase de error con su URI y su título (ver **Error Handling**).

---

### Capa infrastructure

#### `CatalogoController` (adapter.in.rest)
Maneja `GET /api/tipos-calzado` y `GET /api/tipos-reparacion`. Delega en `ConsultarCatalogoUseCase` y mapea las listas de dominio a `List<CalzadoResponse>` / `List<TipoReparacionResponse>` vía `CatalogoMapper`. No reordena: el orden ya viene resuelto por el servicio.

#### `CotizacionController` (adapter.in.rest)
Maneja `POST /api/cotizaciones`. Deserializa `CotizacionRequest`, construye `GenerarCotizacionCommand`, delega en `GenerarCotizacionUseCase`, mapea `Cotizacion` → `CotizacionResponse` y responde 201.

#### `CotizacionRequest` (DTO)
```java
public record CotizacionRequest(
    String tipoCalzadoId,
    List<String> tipoReparacionIds,
    Boolean urgente          // null admitido → NORMAL (Requirement 3.3)
) {}
```

> **Sin anotaciones de Bean Validation.** Ver la decisión de diseño 8: la validación semántica vive en `GenerarCotizacionService` para poder acumular varias causas en un solo `ProblemDetails` (Requirement 5.7). `urgente` es `Boolean` (envoltorio) y **no** lleva `@NotNull`, porque ausente y `null` son valores válidos que significan `false`.

#### `CotizacionResponse` (DTO)
```java
public record CotizacionResponse(
    String id,
    BigDecimal subtotal,
    BigDecimal recargoUrgencia,
    BigDecimal total,
    String moneda,           // siempre "USD"
    int tiempoEstimadoDias,
    String fechaCreacion     // ISO 8601 con offset UTC, p. ej. "2026-08-20T14:32:07Z"
) {}
```

#### `CalzadoResponse` y `TipoReparacionResponse` (DTO)
```java
public record CalzadoResponse(
    String id, String nombre, BigDecimal factorComplejidad
) {}

public record TipoReparacionResponse(
    String id, String nombre, BigDecimal precioBase, int tiempoEstimadoDias
) {}
```

Corresponden a los esquemas `TipoCalzado` y `TipoReparacion` del contrato OpenAPI. Contienen **exactamente** esos campos y ninguno más, tal como exigen los Requirements 1.1 y 2.1; por eso las entidades de dominio no se serializan directamente.

#### `CotizacionMapper` y `CatalogoMapper`
Convierten entre dominio y DTOs REST. Sin lógica de negocio. `CotizacionMapper` formatea `Instant → String` con `DateTimeFormatter.ISO_INSTANT` sobre el instante ya truncado a segundos.

#### `InMemoryCalzadoRepositoryAdapter`, `InMemoryReparacionRepositoryAdapter`, `InMemoryCotizacionRepositoryAdapter`
Implementan los puertos de salida sobre `Map<String, T>`.

- Los dos adaptadores de catálogo reciben su contenido **por constructor** desde `CatalogoSemillaConfig` y lo guardan en un mapa inmutable: no exponen `save`, `update` ni `delete` (Requirement 7.7).
- `InMemoryCotizacionRepositoryAdapter` arranca vacío (Requirement 7.3) y usa `ConcurrentHashMap` para soportar peticiones concurrentes.

#### `CatalogoSemillaConfig` (config)
Declara el catálogo semilla como beans, construyendo entidades de dominio. Como los constructores de `Calzado` y `TipoReparacion` validan sus invariantes, un dato semilla inválido aborta el arranque del contexto de Spring (Requirement 7.6).

```java
@Configuration
public class CatalogoSemillaConfig {

    @Bean
    List<Calzado> calzadosSemilla() {
        return List.of(
            new Calzado("1", "Zapato formal",       new BigDecimal("1.2")),
            new Calzado("2", "Bota de cuero",       new BigDecimal("1.5")),
            new Calzado("3", "Zapatilla deportiva", new BigDecimal("1.0"))
        );
    }

    @Bean
    List<TipoReparacion> reparacionesSemilla() {
        return List.of(
            new TipoReparacion("1", "Cambio de tacón",      new BigDecimal("12.00"), 2),
            new TipoReparacion("2", "Cambio de suela",      new BigDecimal("20.00"), 4),
            new TipoReparacion("3", "Cosido de costura",    new BigDecimal("8.00"),  1),
            new TipoReparacion("4", "Limpieza y tinturado", new BigDecimal("10.00"), 3)
        );
    }

    /** Determinista y reemplazable en tests con Clock.fixed(...) — Requirement 3.7. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Estrategias instanciadas aquí porque `application.strategy` no depende de Spring. */
    @Bean
    Map<NivelUrgencia, UrgencyPricingStrategy> estrategias() {
        return Map.of(
            NivelUrgencia.NORMAL,  new NormalPricingStrategy(),
            NivelUrgencia.URGENTE, new RecargoUrgentePricingStrategy()
        );
    }
}
```

Además valida la unicidad de `id` dentro de cada colección antes de registrarla (Requirements 7.4, 7.5).

Esta clase concentra también las dos dependencias no-repositorio de `GenerarCotizacionService`: el `Clock` y el mapa de estrategias.

#### `ProblemDetailsExceptionHandler` (@RestControllerAdvice)
Traduce excepciones a respuestas RFC 7807. Ver **Error Handling** para el detalle del mapeo.

---

## Data Models

### Diagrama de relaciones entre clases de dominio

```
┌─────────────────────────────────────────────────────────────┐
│                        Cotizacion                           │
│  id: String                (UUID v4)                        │
│  urgencia: NivelUrgencia                                    │
│  tiempoEstimadoDias: int                                    │
│  fechaCreacion: Instant    (UTC, truncado a segundos)       │
│──────────────────────────────────────────────────────────── │
│  calzado: Calzado ──────────────────────────────────────┐  │
│  reparaciones: List<TipoReparacion> ─────────────────┐  │  │
│      (admite repetidos; cada aparición se cobra)      │  │  │
│  subtotal: Dinero                                     │  │  │
│  recargoUrgencia: Dinero                              │  │  │
│  total: Dinero                                        │  │  │
└───────────────────────────────────────────────────────┼──┼──┘
                                                        │  │
          ┌─────────────────────────────────────────────┘  │
          │                                                  │
          ▼                                                  ▼
┌──────────────────────┐              ┌──────────────────────────────┐
│    TipoReparacion    │              │          Calzado             │
│  id: String          │              │  id: String                  │
│  nombre: String      │              │  nombre: String              │
│  precioBase: BigDec. │  (>= 0.01)   │  factorComplejidad: BigDec.  │  (>= 0.5)
│  tiempoEst..: int    │  (>= 1)      └──────────────────────────────┘
└──────────────────────┘

┌──────────────────────┐        ┌────────────────────────┐
│       Dinero         │        │     NivelUrgencia      │
│  monto: BigDecimal   │        │  NORMAL | URGENTE      │
│  moneda: String      │        │  + desdeFlag(Boolean)  │
│  + sumar(Dinero)     │        └────────────────────────┘
│  + multiplicarPor    │
│  + aplicarPorcentaje │
│  + redondear()       │
└──────────────────────┘
```

### Estructura de paquetes

```
src/main/java/com/tallerdae/cotizador/
├── domain/
│   ├── model/
│   │   ├── Calzado.java
│   │   ├── Cotizacion.java
│   │   ├── Dinero.java
│   │   ├── NivelUrgencia.java
│   │   └── TipoReparacion.java
│   └── exception/
│       └── SinReparacionesSeleccionadasException.java
├── application/
│   ├── port/
│   │   ├── in/
│   │   │   ├── ConsultarCatalogoUseCase.java
│   │   │   ├── GenerarCotizacionCommand.java
│   │   │   └── GenerarCotizacionUseCase.java
│   │   └── out/
│   │       ├── CalzadoRepositoryPort.java
│   │       ├── CotizacionRepositoryPort.java
│   │       └── ReparacionRepositoryPort.java
│   ├── service/
│   │   ├── ComparadorPorNombre.java
│   │   ├── ConsultarCatalogoService.java
│   │   └── GenerarCotizacionService.java
│   ├── strategy/
│   │   ├── NormalPricingStrategy.java
│   │   ├── RecargoUrgentePricingStrategy.java
│   │   └── UrgencyPricingStrategy.java
│   └── exception/
│       ├── TipoErrorCotizacion.java
│       ├── ValidacionCotizacionException.java
│       └── ViolacionCampo.java
└── infrastructure/
    ├── adapter/
    │   ├── in/rest/
    │   │   ├── CatalogoController.java
    │   │   ├── CotizacionController.java
    │   │   ├── ProblemDetailsExceptionHandler.java
    │   │   ├── dto/
    │   │   │   ├── CalzadoResponse.java
    │   │   │   ├── CotizacionRequest.java
    │   │   │   ├── CotizacionResponse.java
    │   │   │   └── TipoReparacionResponse.java
    │   │   └── mapper/
    │   │       ├── CatalogoMapper.java
    │   │       └── CotizacionMapper.java
    │   └── out/persistence/
    │       ├── InMemoryCalzadoRepositoryAdapter.java
    │       ├── InMemoryCotizacionRepositoryAdapter.java
    │       └── InMemoryReparacionRepositoryAdapter.java
    └── config/
        ├── CatalogoSemillaConfig.java
        └── CorsConfig.java
```

---

## Design Patterns

### 1. Strategy — `UrgencyPricingStrategy`

**Problema**: La lógica de recargo y reducción de tiempo varía según el nivel de urgencia. Si se añaden nuevos niveles (p. ej., "express") la clase principal crecería con condicionales.

**Solución**: `UrgencyPricingStrategy` es una interfaz en la capa `application.strategy` con dos métodos: `calcularRecargo(Dinero subtotal)` y `calcularTiempo(int tiempoMaxDias)`. Cada implementación encapsula un comportamiento:

| Clase | Comportamiento |
|---|---|
| `NormalPricingStrategy` | recargo = `0.00`; tiempo sin modificar |
| `RecargoUrgentePricingStrategy` | recargo = 30 % del subtotal; tiempo = `max(1, ceil(tiempo/2))` |

`GenerarCotizacionService` recibe un `Map<NivelUrgencia, UrgencyPricingStrategy>` inyectado por Spring, resuelve el nivel con `NivelUrgencia.desdeFlag(...)` y pasa la estrategia a `Cotizacion.crear(...)`. Agregar un nuevo nivel requiere solo una nueva implementación más su entrada en el mapa, sin modificar código existente (Abierto/Cerrado).

El mapa es un `@Bean` de `CatalogoSemillaConfig` que **instancia las estrategias con `new`**, no por descubrimiento de componentes: las implementaciones no llevan `@Component`, para que `application.strategy` siga sin depender de Spring (ver **Regla de dependencias**). Esa clase de configuración es el único punto donde el framework las conoce, y sin ese bean el contexto no arranca — un fallo que `mvn compile` no detecta.

**Punto de aplicación exacto**: `application/strategy/` + `Cotizacion.crear(... UrgencyPricingStrategy strategy ...)`

---

### 2. Factory Method — `Cotizacion.crear(...)`

**Problema**: `Cotizacion` tiene múltiples campos calculados (subtotal, recargo, total, tiempo) e invariantes que deben cumplirse en el momento de creación. Un constructor público no garantiza que estos invariantes se verifiquen.

**Solución**: Constructor privado + método estático de fábrica `Cotizacion.crear(...)` que:
1. Valida que la lista de reparaciones no esté vacía (lanza `SinReparacionesSeleccionadasException`).
2. Calcula el subtotal recorriendo la lista **una vez por elemento, repetidos incluidos**, acumulando `precioBase × factorComplejidad` sin redondear, y redondeando HALF_UP a 2 decimales solo la suma final.
3. Delega el recargo y el tiempo a la `UrgencyPricingStrategy` recibida, pasándole el subtotal ya redondeado.
4. Calcula `total = subtotal + recargoUrgencia`.
5. Asigna `UUID.randomUUID().toString()` y `Instant.now(clock).truncatedTo(ChronoUnit.SECONDS)`.
6. Devuelve la instancia completamente construida e inmutable.

No puede existir una `Cotizacion` en estado inválido: la lógica de construcción y validación es inseparable.

**Punto de aplicación exacto**: `domain/model/Cotizacion.java` — método `public static Cotizacion crear(...)`

---

### 3. Repository — Puertos de salida

**Problema**: Los servicios de aplicación necesitan leer y escribir entidades, pero no deben acoplarse a una tecnología concreta (HashMap, JPA, MongoDB).

**Solución**: Tres interfaces en `application/port/out/`:
- `CalzadoRepositoryPort` — consulta de calzados.
- `ReparacionRepositoryPort` — consulta de reparaciones, con `findAllById` que devuelve un índice `Map` para preservar la multiplicidad de la petición.
- `CotizacionRepositoryPort` — persistencia de cotizaciones, solo escritura.

Las implementaciones `InMemory*Adapter` en `infrastructure/adapter/out/persistence/` usan mapas y son inyectadas por Spring. Para migrar a JPA basta con crear `Jpa*Adapter` que implementen los mismos puertos; el dominio y la aplicación permanecen intactos.

**Punto de aplicación exacto**: interfaces en `application/port/out/`, implementaciones en `infrastructure/adapter/out/persistence/`

---

### 4. DTO + Mapper — `CotizacionRequest/Response`, `CalzadoResponse`, `TipoReparacionResponse`

**Problema**: Si el modelo de dominio se expone directamente en la API REST, cualquier cambio interno (renombrar un campo, agregar una anotación de Jackson) afecta al contrato público y/o contamina el dominio con anotaciones de serialización. Además, los Requirements 1.1 y 2.1 exigen que las respuestas de catálogo contengan **exactamente** los campos del contrato.

**Solución**: DTOs separados en `infrastructure/adapter/in/rest/dto/`. `CotizacionMapper` y `CatalogoMapper` traducen entre dominio y DTOs. Los controladores solo trabajan con DTOs; el dominio nunca ve Jackson.

Beneficios adicionales:
- `CotizacionResponse.fechaCreacion` es `String` (ISO 8601 UTC), mientras `Cotizacion.fechaCreacion` es `Instant`.
- El DTO expone `urgente` como booleano, mientras el dominio usa `NivelUrgencia`: el mapeo vive en el borde y el dominio no hereda la forma del transporte.

**Punto de aplicación exacto**: `infrastructure/adapter/in/rest/dto/` y `.../mapper/`

---

### 5. Dependency Injection — Construcción de servicios

**Problema**: `GenerarCotizacionService` necesita tres repositorios, el mapa de estrategias y un `Clock`. Si instanciara estas dependencias internamente quedaría acoplado a implementaciones concretas y sería difícil de testear.

**Solución**: Todas las dependencias se declaran como parámetros del constructor. Spring las inyecta en tiempo de arranque. En tests unitarios se pasan mocks/stubs directamente sin arrancar el contenedor.

```java
@Service
public class GenerarCotizacionService implements GenerarCotizacionUseCase {
    public GenerarCotizacionService(
        CalzadoRepositoryPort calzadoRepo,
        ReparacionRepositoryPort reparacionRepo,
        CotizacionRepositoryPort cotizacionRepo,
        Map<NivelUrgencia, UrgencyPricingStrategy> estrategias,
        Clock clock
    ) { ... }
}
```

El catálogo semilla también se inyecta: `CatalogoSemillaConfig` produce las listas y los adaptadores in-memory las reciben por constructor, en lugar de construirlas en un `@PostConstruct`.

**Punto de aplicación exacto**: `application/service/` y `infrastructure/adapter/out/persistence/`

---

## API Contract

| Método | Ruta | Código éxito | Body request | Body response |
|---|---|---|---|---|
| GET | `/api/tipos-calzado` | 200 | — | `CalzadoResponse[]` (orden: nombre ASC) |
| GET | `/api/tipos-reparacion` | 200 | — | `TipoReparacionResponse[]` (orden: nombre ASC) |
| POST | `/api/cotizaciones` | 201 | `CotizacionRequest` | `CotizacionResponse` |

No existe ningún otro endpoint. En particular, no hay `GET /api/cotizaciones/{id}`: la cotización se persiste internamente (Requirement 3.8) pero no se publica.

### Códigos de respuesta

| Código | Content-Type | Causa |
|---|---|---|
| 200 | `application/json` | Consulta de catálogo, incluso si está vacío |
| 201 | `application/json` | Cotización generada |
| 400 | `application/problem+json` | Cualquier solicitud inválida (ver tabla de `type` en **Error Handling**) |

No se define HTTP 503: el repositorio vive en memoria dentro del mismo proceso, por lo que un estado de "repositorio no disponible" no es alcanzable ni provocable en una prueba, y el contrato OpenAPI no lo declara.

### Esquemas de payload

```json
// CotizacionRequest (POST body) — `urgente` es opcional
{
  "tipoCalzadoId": "1",
  "tipoReparacionIds": ["1", "3"],
  "urgente": false
}

// CotizacionResponse (201 body)
{
  "id": "3f2a7c18-9b4e-4d21-8a55-1c0e7b93da62",
  "subtotal": 14.40,
  "recargoUrgencia": 0.00,
  "total": 14.40,
  "moneda": "USD",
  "tiempoEstimadoDias": 2,
  "fechaCreacion": "2026-08-20T14:32:07Z"
}

// ProblemDetails (400 body) — RFC 7807
{
  "type": "https://api.cotizador/errors/tipo-reparacion-no-encontrado",
  "title": "Tipo de reparación no encontrado",
  "status": 400,
  "detail": "Identificadores de reparación no encontrados: 99, 100",
  "instance": "/api/cotizaciones",
  "errors": [
    { "field": "tipoReparacionIds", "valoresInvalidos": ["99", "100"] }
  ]
}
```

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe ser verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina.*

Las siguientes propiedades son adecuadas para property-based testing porque involucran lógica de cálculo pura del dominio (fórmulas matemáticas, ordenamiento, invariantes), cuya corrección debe mantenerse para cualquier combinación válida de entradas, no solo para ejemplos puntuales.

**Rango de los generadores.** Los generadores se derivan directamente de las invariantes del catálogo (Requirements 7.4, 7.5), sin acotaciones extra: `precioBase ∈ [0.01, 10000.00]` con 2 decimales, `factorComplejidad ∈ [0.5, 5.0]` con 2 decimales, `tiempoEstimadoDias ∈ [1, 365]`, y entre 1 y 10 reparaciones por cotización. Las cotas inferiores `0.01` y `0.5` garantizan un producto mínimo de `0.005`, que bajo redondeo HALF_UP asciende a `0.01`: por eso la Property 5 (`subtotal > 0`) se cumple para todo el espacio generado, sin necesidad de restringir los generadores por debajo de lo que permite la especificación.

---

### Property 1: Fórmula del subtotal, con repeticiones

*Para cualquier* `Calzado` con `factorComplejidad >= 0.5` y cualquier lista no vacía de identificadores de `TipoReparacion` (posiblemente con repetidos), el subtotal calculado debe ser igual a `redondear(Σ(precioBase_i × factorComplejidad), 2, HALF_UP)`, donde `i` recorre **cada aparición** de la lista. En particular, duplicar un identificador debe duplicar su aporte al subtotal.

**Validates: Requirements 3.1, 3.2, 6.1**

---

### Property 2: Invariantes de cotización no urgente

*Para cualquier* request válido con `urgente` en `false`, ausente o `null`, el sistema debe producir una cotización donde `recargoUrgencia == 0.00`, `total == subtotal`, y `tiempoEstimadoDias == max(tiempoEstimadoDias_i)` de las reparaciones seleccionadas.

**Validates: Requirements 3.3, 3.4, 6.4**

---

### Property 3: Fórmula del recargo urgente y total

*Para cualquier* request válido con `urgente = true`, el sistema debe producir una cotización donde `recargoUrgencia == redondear(subtotal × 0.30, 2, HALF_UP)` y `total == subtotal + recargoUrgencia`, tomando como base el subtotal ya redondeado.

**Validates: Requirements 4.1, 4.2, 6.2**

---

### Property 4: Fórmula del tiempo urgente y mínimo absoluto

*Para cualquier* request válido con `urgente = true`, el sistema debe producir una cotización donde `tiempoEstimadoDias == max(1, ceil(max(tiempoEstimadoDias_i) / 2))`. En particular, `tiempoEstimadoDias >= 1` para cualquier request, urgente o no.

**Validates: Requirements 4.3, 6.3, 6.6**

---

### Property 5: Invariante monetaria global

*Para cualquier* request válido (urgente o no), el sistema debe garantizar que `total >= subtotal` y `subtotal >= 0.01` en la cotización resultante. La cota es consecuencia directa de las invariantes del catálogo: el aporte mínimo de una reparación es `0.01 × 0.5 = 0.005`, que redondea HALF_UP a `0.01`.

**Validates: Requirements 6.5**

---

### Property 6: Propiedad metamórfica de urgencia

*Para cualquier* par de requests válidos que difieran **únicamente** en el valor de `urgente`, el `tiempoEstimadoDias` del urgente debe ser menor o igual al del no urgente, y su `total` debe ser mayor o igual al del no urgente.

**Validates: Requirements 6.7**

---

### Property 7: Independencia del orden de la solicitud

*Para cualquier* par de requests válidos que difieran **únicamente** en el orden de los elementos de `tipoReparacionIds`, el `subtotal`, `recargoUrgencia`, `total` y `tiempoEstimadoDias` resultantes deben ser idénticos.

**Validates: Requirements 6.8**

---

### Property 8: Shape e invariante de respuesta

*Para cualquier* request válido, la respuesta debe tener código 201 y contener siempre los campos `id`, `subtotal`, `recargoUrgencia`, `total`, `moneda`, `tiempoEstimadoDias` y `fechaCreacion`, con `moneda == "USD"` y `fechaCreacion` parseable como instante ISO 8601 con offset UTC.

**Validates: Requirements 3.5, 3.7**

---

### Property 9: Unicidad y formato de identificadores de cotización

*Para cualquier* secuencia de N requests válidos generados concurrentemente o en serie, todos los `id` retornados deben ser distintos entre sí y cada uno debe parsear como UUID versión 4 en representación canónica.

**Validates: Requirements 3.6**

---

### Property 10: Completitud y ordenamiento de ambos catálogos

*Para cualquier* conjunto de `Calzado` y `TipoReparacion` almacenados en el repositorio, `GET /api/tipos-calzado` y `GET /api/tipos-reparacion` deben retornar exactamente el mismo conjunto (sin omisiones ni adiciones) y en orden ascendente por `nombre` según `ComparadorPorNombre` (para todo par consecutivo `a[i], a[i+1]`, se cumple `comparar(a[i].nombre, a[i+1].nombre) <= 0`).

**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**

---

### Property 11: Catálogo vacío devuelve 200 y arreglo vacío

*Para cualquier* configuración de repositorio sin elementos, los dos endpoints de catálogo deben responder 200 con un arreglo vacío, nunca 404 ni 500.

**Validates: Requirements 1.4, 2.4**

---

### Property 12: Validación — lista de reparaciones vacía, ausente o nula

*Para cualquier* request donde `tipoReparacionIds` es lista vacía, está ausente o es `null`, el sistema debe responder siempre con HTTP 400 y `type == "https://api.cotizador/errors/reparaciones-requeridas"`, sin crear ninguna cotización, independientemente del valor de los demás campos.

**Validates: Requirements 5.2**

---

### Property 13: Validación — calzado desconocido

*Para cualquier* request cuyo `tipoCalzadoId` sea nulo, vacío o no esté registrado, el sistema debe responder HTTP 400 con `type == "https://api.cotizador/errors/tipo-calzado-no-encontrado"` y una entrada de `errors` con `field == "tipoCalzadoId"`, sin crear ninguna cotización.

**Validates: Requirements 5.3**

---

### Property 14: Validación — identificadores desconocidos reportados exhaustivamente

*Para cualquier* request que contenga uno o más `tipoReparacionIds` no registrados (en mezcla con válidos o todos inválidos), el sistema debe responder HTTP 400 y el `errors[].valoresInvalidos` correspondiente debe contener **todos** los identificadores inválidos recibidos, cada uno una sola vez, sin procesar parcialmente la solicitud.

**Validates: Requirements 5.4, 5.5**

---

### Property 15: Shape de ProblemDetails en toda respuesta de error

*Para cualquier* request rechazado — por validación semántica o por cuerpo malformado — la respuesta debe tener `Content-Type: application/problem+json`, `status == 400` coincidente con el código HTTP, un `type` no vacío, un `title` no vacío, un `detail` no vacío y un `instance` igual a la ruta de la petición. Cuando hay más de una causa, `errors` contiene una entrada por campo afectado y el `type` corresponde a la causa de mayor precedencia según el Requirement 5.7.

**Validates: Requirements 5.1, 5.6, 5.7, 5.9**

---

### Property 16: Toda cotización generada queda persistida

*Para cualquier* secuencia de N requests válidos, el `CotizacionRepositoryPort` debe haber recibido exactamente N invocaciones de `save`, una por cotización retornada y con el mismo `id`. Ningún request rechazado debe producir una invocación de `save`.

**Validates: Requirements 3.8, 3.9**

---

### Property 17: Invariantes del catálogo

*Para cualquier* catálogo aceptado por el sistema en el arranque, todo `Calzado` tiene `factorComplejidad >= 0.5` con a lo sumo 2 decimales e `id` único, y todo `TipoReparacion` tiene `precioBase >= 0.01` con a lo sumo 2 decimales, `tiempoEstimadoDias >= 1` e `id` único. Recíprocamente, para cualquier catálogo que viole alguna de esas condiciones, la construcción debe fallar en lugar de producir un catálogo operativo.

**Validates: Requirements 7.4, 7.5, 7.6**

---

## Error Handling

### Jerarquía de excepciones

```
RuntimeException
  ├─ domain/exception/
  │    └─ SinReparacionesSeleccionadasException     (invariante del agregado, RN-04)
  └─ application/exception/
       └─ ValidacionCotizacionException             (una o más ViolacionCampo)
```

No existe `RepositorioNoDisponibleException`: se eliminó junto con el código 503, porque el repositorio in-memory no tiene un modo de fallo por indisponibilidad.

### Catálogo de errores

`TipoErrorCotizacion` asocia cada clase de error con su URI estable y su título. El `title` es invariante por `type`; el `detail` es específico de cada ocurrencia.

| `TipoErrorCotizacion` | `type` | `title` | Requirement |
|---|---|---|---|
| `REPARACIONES_REQUERIDAS` | `https://api.cotizador/errors/reparaciones-requeridas` | Se requiere al menos una reparación | 5.2 |
| `TIPO_CALZADO_NO_ENCONTRADO` | `https://api.cotizador/errors/tipo-calzado-no-encontrado` | Tipo de calzado no encontrado | 5.3 |
| `TIPO_REPARACION_NO_ENCONTRADO` | `https://api.cotizador/errors/tipo-reparacion-no-encontrado` | Tipo de reparación no encontrado | 5.4, 5.5 |
| `SOLICITUD_MALFORMADA` | `https://api.cotizador/errors/solicitud-malformada` | Solicitud malformada | 5.6 |

El orden de esta tabla es también el **orden de precedencia** para elegir el `type` cuando concurren varias causas (Requirement 5.7).

### Mapeo de excepciones a respuestas

| Excepción capturada | Código | `type` resultante | Contenido de `errors` |
|---|---|---|---|
| `ValidacionCotizacionException` | 400 | El de la primera `ViolacionCampo` en orden canónico | Una entrada por violación |
| `HttpMessageNotReadableException` (JSON inválido, tipo incorrecto en un campo) | 400 | `solicitud-malformada` | Los campos de `JsonMappingException.getPath()`; ausente si no hay ruta (Requirement 5.6) |
| `MethodArgumentTypeMismatchException` | 400 | `solicitud-malformada` | Una entrada con `field = ex.getName()` y `valoresInvalidos = [ex.getValue()]` |
| `SinReparacionesSeleccionadasException` | 400 | `reparaciones-requeridas` | Una entrada con `field = "tipoReparacionIds"` |

### Flujo de manejo

1. Jackson deserializa `CotizacionRequest`. Si el cuerpo no es JSON válido o un campo trae un tipo incompatible (p. ej. `"urgente": "quizá"`), lanza `HttpMessageNotReadableException` antes de llegar al servicio → `solicitud-malformada` (Requirement 5.6).
2. `GenerarCotizacionService` valida la semántica **acumulando** todas las violaciones y lanza una única `ValidacionCotizacionException` (Requirements 5.2 a 5.5, 5.7).
3. `SinReparacionesSeleccionadasException` solo puede surgir si se invoca el dominio directamente; el handler la mapea igual para no dejar un 500 posible.
4. `ProblemDetailsExceptionHandler` construye el `org.springframework.http.ProblemDetail` (soporte nativo de RFC 7807 en Spring Framework 6), le fija `type`, `title`, `status` y `detail`, y agrega la propiedad de extensión `errors` con una entrada `{ field, valoresInvalidos }` por violación.

   Dos precisiones sobre `errors`:
   - `valoresInvalidos` se **omite** cuando la lista está vacía, en lugar de emitir `[]`: en `reparaciones-requeridas` no hay valores que reportar y el Requirement 5.2 solo exige `field`.
   - La propiedad `errors` completa se omite cuando no hay ningún campo que señalar — el único caso es un cuerpo tan malformado que Jackson no aporta ruta (p. ej. `{"a":,,}`).

   Spring añade además `instance` con la ruta de la petición. Está declarado en el contrato OpenAPI y exigido por el Requirement 5.9, así que el handler no debe suprimirlo.

```java
@RestControllerAdvice
public class ProblemDetailsExceptionHandler {

    private static final MediaType PROBLEM_JSON =
        MediaType.parseMediaType("application/problem+json");

    @ExceptionHandler(ValidacionCotizacionException.class)
    ResponseEntity<ProblemDetail> handleValidacionCotizacion(ValidacionCotizacionException ex) {
        ViolacionCampo principal = ex.violaciones().get(0);   // orden canónico
        List<Map<String, Object>> errors = ex.violaciones().stream()
            .map(v -> entradaError(v.campo(), v.valoresInvalidos()))
            .toList();
        return build(principal.tipo(), principal.detalle(), errors);
    }

    private ResponseEntity<ProblemDetail> build(
            TipoErrorCotizacion tipo, String detalle, List<Map<String, Object>> errors) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detalle);
        pd.setType(URI.create(tipo.getUri()));
        pd.setTitle(tipo.getTitle());
        if (errors != null && !errors.isEmpty()) {
            pd.setProperty("errors", errors);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .contentType(PROBLEM_JSON)
            .body(pd);
    }

    /** `valoresInvalidos` se omite si está vacío; `Map.of` no sirve aquí porque no admite valores nulos. */
    private static Map<String, Object> entradaError(String campo, List<String> valoresInvalidos) {
        Map<String, Object> entrada = new LinkedHashMap<>();
        entrada.put("field", campo);
        if (valoresInvalidos != null && !valoresInvalidos.isEmpty()) {
            entrada.put("valoresInvalidos", valoresInvalidos);
        }
        return entrada;
    }
}
```

Los demás handlers (`HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `SinReparacionesSeleccionadasException`) reutilizan `build(...)` con el `TipoErrorCotizacion` de la tabla anterior.

### Regla: no exponer stack traces

Todas las respuestas de error devuelven mensajes legibles por el cliente en `detail`. Los stack traces van solo al log del servidor.

---

## Testing Strategy

### Enfoque dual: unit tests + property-based tests

Los tests de unidad cubren casos concretos y condiciones de error. Los tests de propiedad verifican que las invariantes matemáticas y de comportamiento se cumplan para cualquier combinación de entradas.

### Librería de PBT

Se usará **[jqwik](https://jqwik.net/)** (Java, integración nativa con JUnit 5) para los property-based tests. Mínimo **100 iteraciones** por propiedad (configuración por defecto de jqwik).

Cada property test debe llevar un comentario de tag en la forma:
```java
// Feature: cotizador-backend, Property N: <texto de la propiedad>
```

### Tests de valores exactos (golden values)

El Requirement 6.9 fija tres combinaciones del catálogo semilla con resultados exactos. Son casos de ejemplo, no propiedades, y se prueban con `@ParameterizedTest` sobre el catálogo semilla real:

| Calzado | Reparaciones | urgente | Subtotal | Recargo | Total | Días |
|---|---|---|---|---|---|---|
| Zapato formal | Cambio de tacón | `false` | 14.40 | 0.00 | 14.40 | 2 |
| Bota de cuero | Cambio de suela | `true` | 30.00 | 9.00 | 39.00 | 2 |
| Zapatilla deportiva | Cosido de costura, Limpieza y tinturado | `false` | 18.00 | 0.00 | 18.00 | 3 |

Estos tres casos son los escenarios Gherkin del Anexo C y la base del guion de validación manual en el navegador.

### Unit tests (JUnit 5 + Mockito)

**Dominio (`domain/`):**
- `Cotizacion.crear(...)`: golden values de la tabla anterior; caso con identificador repetido (`["1","1"]` cobra doble); lista vacía → `SinReparacionesSeleccionadasException`.
- `Dinero`: `sumar`, `multiplicarPor`, `aplicarPorcentaje`, redondeo HALF_UP en el límite (`2.505 → 2.51`).
- `NivelUrgencia.desdeFlag`: `true → URGENTE`; `false`, `null` → `NORMAL`.
- Constructores de `Calzado` y `TipoReparacion`: rechazan `factorComplejidad < 0.5`, `precioBase < 0.01`, más de 2 decimales, y `tiempoEstimadoDias < 1`. Casos límite aceptados: `factorComplejidad == 0.5`, `precioBase == 0.01`, `tiempoEstimadoDias == 1`.

**Aplicación (`application/`):**
- `GenerarCotizacionService`: mocks de los tres puertos + `Clock.fixed`. Casos: calzado no encontrado; reparaciones no encontradas con lista de inválidos; mezcla de válidos e inválidos; **varias causas simultáneas → un solo ProblemDetails con `errors` de dos entradas y el `type` de mayor precedencia** (Requirement 5.7); request válido urgente; request válido no urgente; verificación de que `save` no se invoca en ningún caso rechazado.
- `ConsultarCatalogoService`: catálogo vacío; catálogo con elementos desordenados → salida ordenada; orden correcto de `"Cambio de suela"` antes de `"Cambio de tacón"` y de `"Zapatilla deportiva"` antes de `"Zapato formal"`.
- `ComparadorPorNombre`: insensibilidad a mayúsculas y a acentos.
- `RecargoUrgentePricingStrategy` / `NormalPricingStrategy`: recargo y tiempo por separado.

**Infrastructure (`infrastructure/`):**
- `CotizacionController` (`@WebMvcTest`): deserialización con `urgente` ausente; serialización de `CotizacionResponse`; código 201.
- `ProblemDetailsExceptionHandler`: cada fila de la tabla de mapeo produce el `type`, `title`, `status`, `instance` y `Content-Type: application/problem+json` correctos.
- `CotizacionController` con propiedades desconocidas en el cuerpo (p. ej. `{"tipoCalzadoId":"1","tipoReparacionIds":["1"],"colorFavorito":"azul"}`): se ignoran y la respuesta es 201, no 400 (Requirement 5.8). Depende de que `FAIL_ON_UNKNOWN_PROPERTIES` quede deshabilitado — es el default de Spring Boot, pero conviene fijarlo explícitamente para que no dependa de una versión.
- `CatalogoSemillaConfig`: el catálogo semilla contiene exactamente los 3 calzados y 4 reparaciones del Requirement 7, con sus valores; un dato inválido aborta la construcción.
- `InMemoryCotizacionRepositoryAdapter`: arranca vacío; `save` almacena y devuelve la instancia.
- Los adaptadores de catálogo no exponen operaciones de escritura (verificable por reflexión o por revisión de la interfaz).

### Property-based tests (jqwik)

| Property | Clase de test sugerida |
|---|---|
| Property 1 — Fórmula subtotal con repeticiones | `CotizacionSubtotalPropertyTest` |
| Property 2 — Invariantes no urgente | `CotizacionNormalPropertyTest` |
| Property 3 — Recargo urgente y total | `CotizacionUrgentePropertyTest` |
| Property 4 — Tiempo urgente y mínimo | `CotizacionTiempoPropertyTest` |
| Property 5 — Invariante monetaria | `CotizacionMonetariaPropertyTest` |
| Property 6 — Metamórfica urgencia | `CotizacionMetamorficoPropertyTest` |
| Property 7 — Independencia del orden | `CotizacionOrdenIndependientePropertyTest` |
| Property 8 — Shape de respuesta | `CotizacionResponseShapePropertyTest` |
| Property 9 — Unicidad y formato de IDs | `CotizacionIdUniquenessPropertyTest` |
| Property 10 — Catálogos completos y ordenados | `CatalogoOrdenPropertyTest` |
| Property 11 — Catálogo vacío | `CatalogoVacioPropertyTest` |
| Property 12 — Validación lista vacía | `CotizacionValidacionVaciaPropertyTest` |
| Property 13 — Validación calzado desconocido | `CotizacionValidacionCalzadoPropertyTest` |
| Property 14 — IDs inválidos exhaustivos | `CotizacionIdsInvalidosPropertyTest` |
| Property 15 — Shape de ProblemDetails | `ProblemDetailsShapePropertyTest` |
| Property 16 — Persistencia de cotizaciones | `CotizacionPersistenciaPropertyTest` |
| Property 17 — Invariantes del catálogo | `CatalogoInvariantesPropertyTest` |

Las Properties 1–7, 16 y 17 se testean directamente sobre clases de dominio/servicio (sin levantar Spring). Las Properties 8–15 usan `@SpringBootTest` con contexto completo o `@WebMvcTest` con mocks de servicios.

### Integration tests

- Smoke test: arranca el contexto completo y verifica que los tres endpoints responden.
- Catálogo semilla: `GET /api/tipos-calzado` devuelve 3 elementos y `GET /api/tipos-reparacion` devuelve 4, ambos ordenados por nombre (Requirements 7.1, 7.2).
- Flujo completo: los tres golden values de la tabla anterior, ejecutados end-to-end contra la API real.
- Error end-to-end: `POST /api/cotizaciones` con `tipoReparacionIds: []` devuelve 400 con `application/problem+json` y el `type` esperado.

---

## Key Design Decisions

### 1. Repositorios in-memory como adaptadores de salida, no como singleton global
**Decisión**: Cada `InMemory*Adapter` implementa un puerto de salida y es inyectado por Spring como `@Component`. No hay estado global estático.
**Razón**: Permite reemplazarlos por implementaciones JPA sin tocar el dominio ni la aplicación. También facilita los tests: se puede inyectar un mock o una implementación distinta por test.

### 2. `Dinero` como value object con `BigDecimal`
**Decisión**: No se usa `double` ni `float` para montos monetarios.
**Razón**: Los tipos de punto flotante IEEE 754 acumulan errores incompatibles con la regla de "redondeo HALF_UP a 2 decimales". `BigDecimal` con `RoundingMode.HALF_UP` garantiza resultados exactos y reproducibles.

### 3. Cálculo de subtotal en `Cotizacion.crear(...)`, no en el servicio
**Decisión**: La fórmula `Σ(precioBase_i × factorComplejidad)` se ejecuta dentro del método de fábrica del agregado.
**Razón**: Es lógica de negocio pura, sin dependencias externas. Colocarla en el servicio filtraría lógica de dominio hacia la capa de aplicación.

### 4. `UrgencyPricingStrategy` en `application.strategy`, no en `domain`
**Decisión**: La interfaz de estrategia vive en la capa de aplicación, aunque el dominio la usa a través del método de fábrica (pasada como parámetro).
**Razón**: El porcentaje de recargo es un parámetro de negocio que puede cambiar. Mantenerlo fuera del dominio evita que un cambio de tarifa modifique el núcleo. El dominio recibe la estrategia y la delega, agnóstico a los valores concretos.

### 5. `fechaCreacion` como `Instant` truncado a segundos en dominio y `String` en DTO
**Decisión**: El dominio usa `java.time.Instant` truncado a segundos; el DTO usa `String` formateado con `DateTimeFormatter.ISO_INSTANT`.
**Razón**: El Requirement 3.7 exige ISO 8601 con offset UTC explícito y precisión de al menos segundos. `Instant` es el único tipo de `java.time` que representa un punto en la línea temporal sin ambigüedad de zona — `LocalDateTime` no la tiene y no puede serializarse con `Z`. Truncar a segundos hace la salida estable y comparable en tests.

### 6. `Clock` inyectado en el servicio (no `Instant.now()` directo)
**Decisión**: Se inyecta un `java.time.Clock` en `GenerarCotizacionService` y se pasa a `Cotizacion.crear(...)`.
**Razón**: Hace `fechaCreacion` determinista y testeable con `Clock.fixed(...)`.

### 7. Ordenamiento por nombre en `ConsultarCatalogoService`, no en el repositorio
**Decisión**: El servicio ordena **ambas** listas antes de devolverlas al controlador, usando un `Collator` de español con `Collator.PRIMARY`.
**Razón**: El ordenamiento es un requisito del contrato (Requirements 1.3, 2.3), no una regla de persistencia. Un repositorio JPA podría usar `ORDER BY nombre`, pero el in-memory no tiene SQL; dejarlo en el servicio hace el comportamiento consistente entre adaptadores. Se usa `Collator` en lugar de `String.compareTo` porque la comparación binaria de UTF-16 ordena mal los acentos, y el catálogo semilla incluye `"Cambio de tacón"`.

### 8. Validación semántica en el servicio, no con Bean Validation en el DTO
**Decisión**: `CotizacionRequest` no lleva anotaciones `@NotNull` / `@NotEmpty`. Toda la validación de negocio ocurre en `GenerarCotizacionService`, que acumula violaciones y lanza una única `ValidacionCotizacionException`. Bean Validation queda fuera del flujo; solo los errores de deserialización de Jackson producen `solicitud-malformada`.
**Razón**: El Requirement 5.7 exige agrupar en un solo `ProblemDetails` todas las causas de rechazo de una misma solicitud. Bean Validation se ejecuta **antes** de entrar al controlador y corta el flujo: si `tipoReparacionIds` viniera vacío y además `tipoCalzadoId` fuera desconocido, la respuesta solo mencionaría el primer problema, porque el servicio nunca se ejecutaría. Además, "que el id exista en el catálogo" no es una restricción estructural del DTO sino una regla de negocio: pertenece a la capa de aplicación.
**Consecuencia**: `urgente` se declara como `Boolean` sin `@NotNull`, coherente con que ausente y `null` signifiquen `false` (Requirement 3.3).

### 9. `findAllById` devuelve un índice `Map`, no una `List`
**Decisión**: `ReparacionRepositoryPort.findAllById(Collection<String>)` devuelve `Map<String, TipoReparacion>`; el servicio reconstruye la lista recorriendo la petición original.
**Razón**: Una `List` de resultados pierde dos informaciones necesarias: la multiplicidad de la petición (`["1","1"]` colapsaría a un elemento, incumpliendo el Requirement 3.2) y qué ids concretos faltaron (necesario para `errors[].valoresInvalidos` del Requirement 5.4). El índice preserva ambas sin que el puerto conozca las reglas de cobro.

### 10. RFC 7807 como formato único de error
**Decisión**: Todo error se devuelve como `ProblemDetail` de Spring con `Content-Type: application/problem+json`, un `type` URI estable por clase de error y la extensión `errors`.
**Razón**: El Requirement 5.1 y la regla UI-03 exigen que el frontend muestre el mensaje del servidor sin reinterpretarlo. Un `type` estable permite que el cliente distinga clases de error sin parsear texto, y `detail` da el mensaje legible listo para pintar. Spring Framework 6 lo soporta de forma nativa, sin librerías extra.

### 11. Catálogo semilla como beans de configuración, no como `@PostConstruct` en los adaptadores
**Decisión**: `CatalogoSemillaConfig` construye las entidades y las inyecta por constructor en los adaptadores in-memory, que las guardan en mapas inmutables.
**Razón**: El Requirement 7.6 exige que un catálogo inválido impida el arranque. Construir las entidades en un `@Bean` hace que la validación de los constructores de dominio se ejecute durante el refresco del contexto, y Spring falla el arranque de inmediato. Un `@PostConstruct` que capture la excepción podría dejar el sistema operativo con un catálogo incompleto. Los mapas inmutables cubren además el Requirement 7.7 (catálogo de solo lectura).

### 12. Sin HTTP 503 ni excepción de repositorio no disponible
**Decisión**: Se elimina `RepositorioNoDisponibleException` y el código 503 del contrato.
**Razón**: El repositorio vive en memoria dentro del mismo proceso: no existe un modo de fallo por indisponibilidad que se pueda alcanzar ni provocar en una prueba, por lo que el criterio sería inverificable. El contrato OpenAPI del taller declara solo 200, 201 y 400. Si en el futuro se migra a MySQL, el 503 se agregará al contrato **antes** de implementarlo, siguiendo la regla de que ningún comportamiento HTTP existe sin aparecer primero en la especificación.
