# Implementation Plan: cotizador-backend

## Overview

Implementación del backend REST del cotizador de reparación de calzado usando Java 17, Spring Boot 3 y arquitectura hexagonal (puertos y adaptadores). Las tareas siguen el orden de dependencias: dominio → puertos de aplicación → estrategias → excepciones → servicios → infraestructura. Las tareas de test están marcadas con `*` y son opcionales en el flujo normal del taller.

---

## Tasks

- [x] 1. Scaffolding del proyecto
  - [x] 1.1 Crear `pom.xml` con dependencias base
    - Coordenadas: `groupId=com.tallerdae`, `artifactId=cotizador`, `version=0.0.1-SNAPSHOT`, `packaging=jar`
    - Java 17, Spring Boot 3 parent (`spring-boot-starter-parent`)
    - Dependencias: `spring-boot-starter-web`, `spring-boot-starter-test`
    - Dependencia de jqwik para property-based testing: `net.jqwik:jqwik:1.8.x` con `scope=test`
    - Plugin `spring-boot-maven-plugin`
    - _Requirements: —_

  - [x] 1.2 Crear la clase principal `CotizadorApplication.java`
    - Paquete `com.tallerdae.cotizador`
    - Anotada con `@SpringBootApplication`
    - Método `main` que invoca `SpringApplication.run`
    - _Requirements: —_

- [x] 2. Capa domain — value objects y enum
  - [x] 2.1 Crear `Dinero.java` (value object)
    - Paquete `com.tallerdae.cotizador.domain.model`
    - Campos: `monto` (`BigDecimal`, escala 2), `moneda` (`String`)
    - Constructor público que acepta `BigDecimal` y `String`; rechaza nulos
    - Método estático `cero(String moneda)` que devuelve `Dinero` con `monto = 0.00`
    - `sumar(Dinero otro)`: valida misma moneda; devuelve nueva instancia con la suma sin redondear
    - `multiplicarPor(BigDecimal factor)`: devuelve nueva instancia **sin** redondear (para acumular productos intermedios)
    - `aplicarPorcentaje(BigDecimal porcentaje)`: multiplica y redondea a escala 2 con `RoundingMode.HALF_UP`
    - `redondear()`: devuelve instancia con `setScale(2, HALF_UP)`
    - `getMonto()`: devuelve `BigDecimal` con escala 2
    - Sobreescribir `equals`, `hashCode` y `toString`
    - _Requirements: 3.1, 4.1, 4.2_

  - [x] 2.2 Crear `NivelUrgencia.java` (enum)
    - Paquete `com.tallerdae.cotizador.domain.model`
    - Valores: `NORMAL`, `URGENTE`
    - Método estático `desdeFlag(Boolean urgente)`: `true` → `URGENTE`; `false`, `null` o ausente → `NORMAL`
    - _Requirements: 3.3, 4.1_

- [x] 3. Capa domain — entidades
  - [x] 3.1 Crear `Calzado.java` (entidad)
    - Paquete `com.tallerdae.cotizador.domain.model`
    - Campos: `id` (`String`), `nombre` (`String`), `factorComplejidad` (`BigDecimal`)
    - Constructor valida: `id` no nulo/vacío, `nombre` no nulo/vacío, `factorComplejidad >= 0.5` con a lo sumo 2 decimales; lanza `IllegalArgumentException` si no se cumplen (Req 7.4)
    - Getters para todos los campos; clase sin setters (inmutable tras construcción)
    - Sin importaciones de Spring ni de Jakarta
    - _Requirements: 7.4, 7.6_

  - [x] 3.2 Crear `TipoReparacion.java` (entidad)
    - Paquete `com.tallerdae.cotizador.domain.model`
    - Campos: `id` (`String`), `nombre` (`String`), `precioBase` (`BigDecimal`), `tiempoEstimadoDias` (`int`)
    - Constructor valida: `id` no nulo/vacío, `nombre` no nulo/vacío, `precioBase >= 0.01` con a lo sumo 2 decimales, `tiempoEstimadoDias >= 1`; lanza `IllegalArgumentException` si no se cumplen (Req 7.5)
    - Getters para todos los campos; clase inmutable
    - Sin importaciones de Spring ni de Jakarta
    - _Requirements: 7.5, 7.6_

  - [x] 3.3 Crear `SinReparacionesSeleccionadasException.java`
    - Paquete `com.tallerdae.cotizador.domain.exception`
    - Extiende `RuntimeException`
    - Constructor que acepta un mensaje de texto
    - _Requirements: 3.9 (última línea de defensa del invariante RN-04)_

  - [x] 3.4 Crear `Cotizacion.java` (agregado raíz con factory method)
    - Paquete `com.tallerdae.cotizador.domain.model`
    - Campos: `id` (`String`), `calzado` (`Calzado`), `reparaciones` (`List<TipoReparacion>`, snapshot inmutable), `urgencia` (`NivelUrgencia`), `subtotal` (`Dinero`), `recargoUrgencia` (`Dinero`), `total` (`Dinero`), `tiempoEstimadoDias` (`int`), `fechaCreacion` (`Instant`)
    - Constructor privado; todos los cálculos ocurren en el factory method
    - **Método estático `crear(Calzado, List<TipoReparacion>, NivelUrgencia, UrgencyPricingStrategy, Clock)`**:
      1. Lanza `SinReparacionesSeleccionadasException` si la lista está vacía
      2. Calcula subtotal: acumula `precioBase_i × factorComplejidad` por cada elemento de la lista **sin redondear** productos individuales; aplica `Dinero.redondear()` **una sola vez** sobre la suma final (Req 3.1, 6.1)
      3. Delega `recargoUrgencia = strategy.calcularRecargo(subtotal)` (subtotal ya redondeado)
      4. Calcula `total = subtotal.sumar(recargoUrgencia)`
      5. Calcula `tiempoEstimadoDias = strategy.calcularTiempo(max(tiempoEstimadoDias_i))`
      6. Asigna `id = UUID.randomUUID().toString()`
      7. Asigna `fechaCreacion = Instant.now(clock).truncatedTo(ChronoUnit.SECONDS)`
    - Getters para todos los campos
    - Sin importaciones de Spring ni de Jakarta; la interfaz `UrgencyPricingStrategy` se pasa como parámetro
    - _Requirements: 3.1, 3.2, 3.4, 3.6, 3.7, 4.2, 4.3, 6.1–6.8_

- [x] 4. Capa application — puertos de entrada
  - [x] 4.1 Crear `GenerarCotizacionCommand.java` (record)
    - Paquete `com.tallerdae.cotizador.application.port.in`
    - Campos: `tipoCalzadoId` (`String`), `tipoReparacionIds` (`List<String>`), `urgente` (`Boolean`, admite `null`)
    - _Requirements: 3.3_

  - [x] 4.2 Crear `GenerarCotizacionUseCase.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.port.in`
    - Método: `Cotizacion generarCotizacion(GenerarCotizacionCommand command)`
    - _Requirements: 3_

  - [x] 4.3 Crear `ConsultarCatalogoUseCase.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.port.in`
    - Métodos: `List<Calzado> consultarCalzados()`, `List<TipoReparacion> consultarReparaciones()`
    - _Requirements: 1, 2_

- [x] 5. Capa application — puertos de salida
  - [x] 5.1 Crear `CalzadoRepositoryPort.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.port.out`
    - Métodos: `List<Calzado> findAll()`, `Optional<Calzado> findById(String id)`
    - _Requirements: 1.2, 5.3_

  - [x] 5.2 Crear `ReparacionRepositoryPort.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.port.out`
    - Métodos: `List<TipoReparacion> findAll()`, `Map<String, TipoReparacion> findAllById(Collection<String> ids)`
    - **`findAllById` devuelve un índice `Map` (no `List`)** para que el servicio pueda: (a) reconstruir la lista con repeticiones y (b) detectar exactamente qué ids faltaron (Req 3.2, 5.4)
    - _Requirements: 2.2, 3.2, 5.4, 5.5_

  - [x] 5.3 Crear `CotizacionRepositoryPort.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.port.out`
    - Método: `Cotizacion save(Cotizacion cotizacion)`
    - Solo escritura: no expone operaciones de lectura
    - _Requirements: 3.8_

- [x] 6. Capa application — estrategias de pricing
  - [x] 6.1 Crear `UrgencyPricingStrategy.java` (interfaz)
    - Paquete `com.tallerdae.cotizador.application.strategy`
    - Métodos: `Dinero calcularRecargo(Dinero subtotal)`, `int calcularTiempo(int tiempoMaxDias)`
    - _Requirements: 3.4, 4.1, 4.3_

  - [x] 6.2 Crear `NormalPricingStrategy.java`
    - Paquete `com.tallerdae.cotizador.application.strategy`
    - Implementa `UrgencyPricingStrategy`
    - `calcularRecargo`: devuelve `Dinero.cero("USD")`
    - `calcularTiempo`: devuelve `tiempoMaxDias` sin modificar
    - **Sin anotaciones ni importaciones de Spring** (`@Component` incluido): la capa `application.strategy` no depende del framework; la instancia se crea en `CatalogoSemillaConfig` (tarea 12.4). El checkpoint 15 verifica esta regla
    - _Requirements: 3.3, 3.4_

  - [x] 6.3 Crear `RecargoUrgentePricingStrategy.java`
    - Paquete `com.tallerdae.cotizador.application.strategy`
    - Implementa `UrgencyPricingStrategy`
    - Declara constante `public static final BigDecimal RECARGO_URGENCIA_PORCENTAJE = new BigDecimal("0.30")` — única fuente del valor en todo el proyecto (Req 4.4)
    - `calcularRecargo`: `subtotal.aplicarPorcentaje(RECARGO_URGENCIA_PORCENTAJE)`
    - `calcularTiempo`: `Math.max(1, (int) Math.ceil(tiempoMaxDias / 2.0))`
    - **Sin anotaciones ni importaciones de Spring** (`@Component` incluido): igual que 6.2
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 7. Capa application — excepciones de aplicación
  - [x] 7.1 Crear `TipoErrorCotizacion.java` (enum)
    - Paquete `com.tallerdae.cotizador.application.exception`
    - Valores con sus atributos `uri` y `title`:
      - `REPARACIONES_REQUERIDAS` → uri `https://api.cotizador/errors/reparaciones-requeridas`, title `Se requiere al menos una reparación`
      - `TIPO_CALZADO_NO_ENCONTRADO` → uri `https://api.cotizador/errors/tipo-calzado-no-encontrado`, title `Tipo de calzado no encontrado`
      - `TIPO_REPARACION_NO_ENCONTRADO` → uri `https://api.cotizador/errors/tipo-reparacion-no-encontrado`, title `Tipo de reparación no encontrado`
      - `SOLICITUD_MALFORMADA` → uri `https://api.cotizador/errors/solicitud-malformada`, title `Solicitud malformada`
    - El orden de los valores define la precedencia para elegir el `type` cuando concurren varias causas (Req 5.7)
    - Getters `getUri()` y `getTitle()`
    - _Requirements: 5.2, 5.3, 5.4, 5.6, 5.7_

  - [x] 7.2 Crear `ViolacionCampo.java` (record)
    - Paquete `com.tallerdae.cotizador.application.exception`
    - Campos: `tipo` (`TipoErrorCotizacion`), `campo` (`String`), `valoresInvalidos` (`List<String>`), `detalle` (`String`)
    - _Requirements: 5.1–5.5_

  - [x] 7.3 Crear `ValidacionCotizacionException.java`
    - Paquete `com.tallerdae.cotizador.application.exception`
    - Extiende `RuntimeException`
    - Campo `violaciones` (`List<ViolacionCampo>`, nunca vacía, en orden canónico)
    - Getter `violaciones()`
    - _Requirements: 5.7_

- [x] 8. Capa application — servicios
  - [x] 8.1 Crear `ComparadorPorNombre.java`
    - Paquete `com.tallerdae.cotizador.application.service`
    - Clase final con constructor privado (solo métodos estáticos)
    - Crea un `java.text.Collator` con `Locale.forLanguageTag("es")` y `Collator.PRIMARY` (insensible a mayúsculas y acentos)
    - `public static Comparator<Calzado> porNombreCalzado()`: comparador por `nombre` usando el Collator
    - `public static Comparator<TipoReparacion> porNombreReparacion()`: comparador por `nombre` usando el Collator
    - _Requirements: 1.3, 2.3_

  - [x] 8.2 Crear `ConsultarCatalogoService.java`
    - Paquete `com.tallerdae.cotizador.application.service`
    - Implementa `ConsultarCatalogoUseCase`; anotada con `@Service`
    - Constructor inyecta `CalzadoRepositoryPort` y `ReparacionRepositoryPort`
    - `consultarCalzados()`: llama `findAll()`, ordena con `ComparadorPorNombre.porNombreCalzado()`, devuelve lista; lista vacía → lista vacía (no excepción)
    - `consultarReparaciones()`: llama `findAll()`, ordena con `ComparadorPorNombre.porNombreReparacion()`, devuelve lista; lista vacía → lista vacía
    - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4_

  - [x] 8.3 Crear `GenerarCotizacionService.java`
    - Paquete `com.tallerdae.cotizador.application.service`
    - Implementa `GenerarCotizacionUseCase`; anotada con `@Service`
    - Constructor inyecta: `CalzadoRepositoryPort`, `ReparacionRepositoryPort`, `CotizacionRepositoryPort`, `Map<NivelUrgencia, UrgencyPricingStrategy> estrategias`, `Clock clock`
    - **Validación acumulativa** (Req 5.7) en el orden canónico — si hay violaciones lanza `ValidacionCotizacionException` sin ejecutar ningún cálculo:
      1. `tipoReparacionIds` nulo o vacío → `ViolacionCampo` de tipo `REPARACIONES_REQUERIDAS`
      2. `tipoCalzadoId` nulo, vacío o no encontrado → `ViolacionCampo` de tipo `TIPO_CALZADO_NO_ENCONTRADO`
      3. ids de reparaciones ausentes del índice → `ViolacionCampo` de tipo `TIPO_REPARACION_NO_ENCONTRADO` con ids faltantes deduplicados
    - **Resolución de reparaciones con repeticiones**: recorre `command.tipoReparacionIds()` en orden; obtiene la entidad del índice por cada aparición → `["1","1"]` produce lista de dos elementos (Req 3.2)
    - Selecciona la estrategia: `estrategias.get(NivelUrgencia.desdeFlag(command.urgente()))` — el bean del mapa lo declara `CatalogoSemillaConfig` (tarea 12.4)
    - Delega a `Cotizacion.crear(...)`
    - Persiste con `CotizacionRepositoryPort.save`
    - **No se llama a `save` si la validación falla** (Req 3.9)
    - _Requirements: 3.1–3.9, 4.1–4.4, 5.2–5.5, 5.7_

- [x] 9. Capa infrastructure — DTOs
  - [x] 9.1 Crear DTOs de catálogo: `CalzadoResponse.java` y `TipoReparacionResponse.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto`
    - `CalzadoResponse`: record con campos `id` (`String`), `nombre` (`String`), `factorComplejidad` (`BigDecimal`)
    - `TipoReparacionResponse`: record con campos `id` (`String`), `nombre` (`String`), `precioBase` (`BigDecimal`), `tiempoEstimadoDias` (`int`)
    - Exactamente esos campos y ninguno más (Req 1.1, 2.1)
    - _Requirements: 1.1, 2.1_

  - [x] 9.2 Crear `CotizacionRequest.java` y `CotizacionResponse.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto`
    - `CotizacionRequest`: record con `tipoCalzadoId` (`String`), `tipoReparacionIds` (`List<String>`), `urgente` (`Boolean`) — **sin `@NotNull` ni Bean Validation** (Req 5.7, decisión de diseño 8)
    - `CotizacionResponse`: record con `id` (`String`), `subtotal` (`BigDecimal`), `recargoUrgencia` (`BigDecimal`), `total` (`BigDecimal`), `moneda` (`String`), `tiempoEstimadoDias` (`int`), `fechaCreacion` (`String` en ISO 8601 UTC)
    - _Requirements: 3.5, 3.6, 3.7_

- [x] 10. Capa infrastructure — mappers
  - [x] 10.1 Crear `CatalogoMapper.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper`
    - Métodos estáticos sin lógica de negocio:
      - `CalzadoResponse toResponse(Calzado calzado)`
      - `TipoReparacionResponse toResponse(TipoReparacion reparacion)`
    - _Requirements: 1.1, 2.1_

  - [x] 10.2 Crear `CotizacionMapper.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper`
    - Método estático sin lógica de negocio:
      - `CotizacionResponse toResponse(Cotizacion cotizacion)`
    - Formatea `Instant` → `String` con `DateTimeFormatter.ISO_INSTANT` sobre el instante ya truncado a segundos
    - _Requirements: 3.5, 3.7_

- [x] 11. Capa infrastructure — adaptadores de persistencia in-memory
  - [x] 11.1 Crear `InMemoryCalzadoRepositoryAdapter.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.out.persistence`
    - Implementa `CalzadoRepositoryPort`; anotada con `@Component`
    - Recibe `List<Calzado> calzadosSemilla` por constructor e inicializa un `Map<String, Calzado>` **inmutable** (sin `save`, `update` ni `delete`)
    - `findAll()`: devuelve `new ArrayList<>(mapa.values())`
    - `findById(String id)`: devuelve `Optional.ofNullable(mapa.get(id))`
    - _Requirements: 7.1, 7.7_

  - [x] 11.2 Crear `InMemoryReparacionRepositoryAdapter.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.out.persistence`
    - Implementa `ReparacionRepositoryPort`; anotada con `@Component`
    - Recibe `List<TipoReparacion> reparacionesSemilla` por constructor e inicializa un `Map<String, TipoReparacion>` **inmutable**
    - `findAll()`: devuelve `new ArrayList<>(mapa.values())`
    - `findAllById(Collection<String> ids)`: copia solo las entradas existentes en el mapa; no lanza excepción si algún id falta (eso lo maneja el servicio)
    - _Requirements: 2.2, 7.2, 7.7_

  - [x] 11.3 Crear `InMemoryCotizacionRepositoryAdapter.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.out.persistence`
    - Implementa `CotizacionRepositoryPort`; anotada con `@Component`
    - Usa `ConcurrentHashMap<String, Cotizacion>` para soportar peticiones concurrentes; **arranca vacío** (Req 7.3)
    - `save(Cotizacion cotizacion)`: almacena por `cotizacion.getId()` y devuelve la misma instancia
    - _Requirements: 3.8, 7.3_

- [x] 12. Capa infrastructure — configuración
  - [x] 12.1 Crear `CatalogoSemillaConfig.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.config`
    - Anotada con `@Configuration`
    - Bean `List<Calzado> calzadosSemilla()`: instancia los 3 calzados del Req 7.1 usando constructores de dominio; valida unicidad de `id` antes de retornar (falla el arranque si hay duplicado, Req 7.6)
    - Bean `List<TipoReparacion> reparacionesSemilla()`: instancia las 4 reparaciones del Req 7.2; valida unicidad de `id` (Req 7.6)
    - Los constructores de dominio ya validan `factorComplejidad >= 0.5` y `precioBase >= 0.01`; cualquier valor inválido aborta el contexto de Spring (Req 7.6)
    - Datos semilla exactos:
      - Calzados: `("1","Zapato formal",1.2)`, `("2","Bota de cuero",1.5)`, `("3","Zapatilla deportiva",1.0)`
      - Reparaciones: `("1","Cambio de tacón",12.00,2)`, `("2","Cambio de suela",20.00,4)`, `("3","Cosido de costura",8.00,1)`, `("4","Limpieza y tinturado",10.00,3)`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.2 Crear `CorsConfig.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.config`
    - Anotada con `@Configuration`
    - Implementa `WebMvcConfigurer`; sobreescribe `addCorsMappings` para permitir cualquier origen en `/api/**` (configuración mínima para el taller)
    - _Requirements: — (infraestructura del taller)_

  - [x] 12.3 Registrar el bean `Clock` en la configuración de la aplicación
    - Añadir en `CatalogoSemillaConfig` (o en una clase `@Configuration` nueva) un bean `@Bean Clock clock() { return Clock.systemUTC(); }`
    - Asegura que `GenerarCotizacionService` reciba un `Clock` inyectable en producción y reemplazable en tests con `Clock.fixed(...)`
    - _Requirements: 3.7 (fechaCreacion determinista y testeable)_

  - [x] 12.4 Registrar el bean del mapa de estrategias de pricing
    - Añadir en `CatalogoSemillaConfig` un bean `@Bean Map<NivelUrgencia, UrgencyPricingStrategy> estrategias()`
    - Devuelve `Map.of(NivelUrgencia.NORMAL, new NormalPricingStrategy(), NivelUrgencia.URGENTE, new RecargoUrgentePricingStrategy())`
    - **Instancia las estrategias con `new`, no las inyecta como beans**: `application.strategy` no lleva `@Component` (tareas 6.2 y 6.3), así que el mapa es el único punto donde el framework las conoce
    - Es la dependencia que `GenerarCotizacionService` recibe por constructor (tarea 8.3); sin este bean el contexto no arranca
    - Añadir un nivel de urgencia nuevo requiere solo una implementación más y su entrada aquí (Abierto/Cerrado)
    - _Requirements: 3.3, 3.4, 4.1, 4.3_

- [x] 13. Capa infrastructure — controladores REST
  - [x] 13.1 Crear `CatalogoController.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest`
    - Anotada con `@RestController`, `@RequestMapping("/api")`
    - Inyecta `ConsultarCatalogoUseCase` por constructor
    - `GET /api/tipos-calzado` → 200 + `List<CalzadoResponse>` mapeada con `CatalogoMapper`
    - `GET /api/tipos-reparacion` → 200 + `List<TipoReparacionResponse>` mapeada con `CatalogoMapper`
    - No reordena: el servicio ya entrega el orden correcto
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

  - [x] 13.2 Crear `CotizacionController.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest`
    - Anotada con `@RestController`, `@RequestMapping("/api")`
    - Inyecta `GenerarCotizacionUseCase` por constructor
    - `POST /api/cotizaciones`: deserializa `CotizacionRequest`, construye `GenerarCotizacionCommand`, delega en el caso de uso, mapea `Cotizacion` → `CotizacionResponse` con `CotizacionMapper`, responde **201**
    - _Requirements: 3.5, 3.6, 3.7_

- [x] 14. Capa infrastructure — manejo de errores
  - [x] 14.1 Crear `ProblemDetailsExceptionHandler.java`
    - Paquete `com.tallerdae.cotizador.infrastructure.adapter.in.rest`
    - Anotada con `@RestControllerAdvice`
    - Handler para `ValidacionCotizacionException`:
      - Toma la primera `ViolacionCampo` (orden canónico) como `type` y `title`
      - Fija `status = 400`, `detail = primera.detalle()`
      - Agrega extensión `errors` con una entrada `{field, valoresInvalidos}` por cada `ViolacionCampo`
      - `valoresInvalidos` se **omite** cuando la lista viene vacía (caso `reparaciones-requeridas`), en lugar de emitir `[]`: el Req 5.2 solo exige `field`
      - Usa `org.springframework.http.ProblemDetail` (soporte nativo RFC 7807 de Spring Framework 6)
    - Handler para `HttpMessageNotReadableException` → `SOLICITUD_MALFORMADA`, 400 (Req 5.6)
      - El Req 5.6 exige que `errors` **identifique los campos afectados**: extraer los nombres de campo de la ruta de Jackson (`JsonMappingException.getPath()`) cuando la causa la aporta, y omitir `errors` cuando el JSON está tan roto que no hay ruta (p. ej. `{"a":,,}`)
    - Handler para `MethodArgumentTypeMismatchException` → `SOLICITUD_MALFORMADA`, 400
      - `errors`: una entrada con `field = ex.getName()` y `valoresInvalidos = [ex.getValue()]`
    - Handler para `SinReparacionesSeleccionadasException` → `REPARACIONES_REQUERIDAS`, 400
    - Todas las respuestas: `Content-Type: application/problem+json`; sin stack traces en el body
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

- [x] 15. Checkpoint — verificación de la aplicación completa
  - Asegúrate de que `mvn compile` no produce errores
  - Verifica que no hay importaciones de Spring en `domain/` ni en `application/strategy/` ni en `application/exception/`
  - Verifica que `CotizacionRequest` no tiene anotaciones de Bean Validation
  - Verifica que los literales `0.30` y `1.30` no aparecen **como código** en ninguna clase salvo `RecargoUrgentePricingStrategy.RECARGO_URGENCIA_PORCENTAJE` (las menciones en Javadoc no cuentan; buscar `new BigDecimal("0.30")`, no la cadena suelta)
  - Arranca la aplicación (`mvn spring-boot:run`) y comprueba que el contexto sube sin errores de wiring: es el único chequeo que detecta un `Map<NivelUrgencia, UrgencyPricingStrategy>` ausente o incompleto (tarea 12.4), porque `mvn compile` no lo ve
  - Consulta al usuario si surge alguna duda antes de continuar con los tests

- [ ] 16. Tests de unidad — dominio (opcionales)
  - [ ]* 16.1 Tests de `Dinero`
    - `sumar`, `multiplicarPor`, `aplicarPorcentaje`, `redondear`; límite de redondeo HALF_UP (`2.505 → 2.51`)
    - _Requirements: 3.1, 4.2_

  - [ ]* 16.2 Tests de `NivelUrgencia.desdeFlag`
    - `true → URGENTE`; `false → NORMAL`; `null → NORMAL`
    - _Requirements: 3.3_

  - [ ]* 16.3 Tests de constructores de `Calzado` y `TipoReparacion`
    - Rechazan `factorComplejidad < 0.5`, `precioBase < 0.01`, más de 2 decimales, `tiempoEstimadoDias < 1`, `id` nulo/vacío
    - Casos límite que SÍ deben aceptarse: `factorComplejidad == 0.5`, `precioBase == 0.01`, `tiempoEstimadoDias == 1`
    - _Requirements: 7.4, 7.5, 7.6_

  - [ ]* 16.4 Tests de `Cotizacion.crear`
    - Los tres golden values del Req 6.9 (tabla de valores exactos)
    - Identificador repetido `["1","1"]` cobra doble
    - Lista vacía lanza `SinReparacionesSeleccionadasException`
    - _Requirements: 3.1, 3.2, 6.9_

  - [ ]* 16.5 Tests de `RecargoUrgentePricingStrategy` y `NormalPricingStrategy`
    - Recargo y reducción de tiempo para cada implementación
    - Mínimo de 1 día con urgente
    - _Requirements: 4.1, 4.3_

- [ ] 17. Tests de unidad — servicios (opcionales)
  - [ ]* 17.1 Tests de `ComparadorPorNombre`
    - Insensibilidad a mayúsculas: `"zapato"` antes de `"Zapato"` es equivalente
    - Insensibilidad a acentos: `"Cambio de suela"` antes de `"Cambio de tacón"` antes de `"tz"`
    - Zapatilla antes de Zapato (prefijo más corto)
    - _Requirements: 1.3, 2.3_

  - [ ]* 17.2 Tests de `ConsultarCatalogoService`
    - Catálogo vacío → lista vacía
    - Catálogo desordenado → salida ordenada
    - Orden correcto: `"Cambio de suela"` antes de `"Cambio de tacón"`; `"Zapatilla deportiva"` antes de `"Zapato formal"`
    - _Requirements: 1.3, 1.4, 2.3, 2.4_

  - [ ]* 17.3 Tests de `GenerarCotizacionService` (con mocks de repositorios y `Clock.fixed`)
    - Calzado no encontrado → 400 `tipo-calzado-no-encontrado`
    - Reparaciones no encontradas → 400 con lista de ids inválidos
    - Mezcla de ids válidos e inválidos → rechaza completo
    - Varias causas simultáneas → único `ProblemDetails` con `errors` de dos entradas y `type` de mayor precedencia (Req 5.7)
    - Request válido urgente → cotización correcta
    - Request válido no urgente → cotización correcta
    - `save` NO se invoca cuando la validación falla (Req 3.9)
    - _Requirements: 3.1–3.9, 5.2–5.5, 5.7_

- [ ] 18. Tests de unidad — infraestructura (opcionales)
  - [ ]* 18.1 Tests de `CotizacionController` (`@WebMvcTest`)
    - Deserialización con `urgente` ausente → `NORMAL`
    - Serialización correcta de `CotizacionResponse`
    - Código 201 en éxito
    - _Requirements: 3.3, 3.5_

  - [ ]* 18.2 Tests de `ProblemDetailsExceptionHandler`
    - Cada fila de la tabla de mapeo produce el `type`, `title`, `status` y `Content-Type: application/problem+json` correctos
    - _Requirements: 5.1, 5.6_

  - [ ]* 18.3 Tests de `CatalogoSemillaConfig`
    - El catálogo semilla contiene exactamente 3 calzados y 4 reparaciones con sus valores del Req 7
    - Un dato inválido (p. ej. `factorComplejidad = -1`) aborta la construcción
    - _Requirements: 7.1, 7.2, 7.6_

  - [ ]* 18.4 Tests de `InMemoryCotizacionRepositoryAdapter`
    - Arranca vacío
    - `save` almacena y devuelve la misma instancia
    - _Requirements: 3.8, 7.3_

- [ ] 19. Tests de propiedad con jqwik (opcionales)
  - [ ]* 19.1 `CotizacionSubtotalPropertyTest` — Property 1: Fórmula subtotal con repeticiones
    - Para cualquier lista no vacía de reparaciones (con posibles repetidos) y cualquier calzado válido, `subtotal == redondear(Σ(precioBase_i × factorComplejidad), 2, HALF_UP)`
    - **Property 1: Fórmula del subtotal, con repeticiones**
    - **Validates: Requirements 3.1, 3.2, 6.1**

  - [ ]* 19.2 `CotizacionNormalPropertyTest` — Property 2: Invariantes de cotización no urgente
    - Para cualquier request válido con `urgente = false/null`, `recargoUrgencia == 0.00`, `total == subtotal`, `tiempoEstimadoDias == max(ti)`
    - **Property 2: Invariantes de cotización no urgente**
    - **Validates: Requirements 3.3, 3.4, 6.4**

  - [ ]* 19.3 `CotizacionUrgentePropertyTest` — Property 3: Fórmula del recargo urgente y total
    - Para cualquier request válido con `urgente = true`, `recargoUrgencia == redondear(subtotal × 0.30, 2, HALF_UP)` y `total == subtotal + recargoUrgencia`
    - **Property 3: Fórmula del recargo urgente y total**
    - **Validates: Requirements 4.1, 4.2, 6.2**

  - [ ]* 19.4 `CotizacionTiempoPropertyTest` — Property 4: Fórmula del tiempo urgente y mínimo absoluto
    - Para cualquier request válido con `urgente = true`, `tiempoEstimadoDias == max(1, ceil(max(ti)/2))`; además `tiempoEstimadoDias >= 1` para cualquier request
    - **Property 4: Fórmula del tiempo urgente y mínimo absoluto**
    - **Validates: Requirements 4.3, 6.3, 6.6**

  - [ ]* 19.5 `CotizacionMonetariaPropertyTest` — Property 5: Invariante monetaria global
    - Para cualquier request válido, `total >= subtotal` y `subtotal > 0.00`
    - **Property 5: Invariante monetaria global**
    - **Validates: Requirements 6.5**

  - [ ]* 19.6 `CotizacionMetamorficoPropertyTest` — Property 6: Propiedad metamórfica de urgencia
    - Para cualquier par de requests que difieran solo en `urgente`, `tiempo_urgente <= tiempo_normal` y `total_urgente >= total_normal`
    - **Property 6: Propiedad metamórfica de urgencia**
    - **Validates: Requirements 6.7**

  - [ ]* 19.7 `CotizacionOrdenIndependientePropertyTest` — Property 7: Independencia del orden de la solicitud
    - Para cualquier par de requests que difieran solo en el orden de `tipoReparacionIds`, todos los montos y el tiempo son idénticos
    - **Property 7: Independencia del orden de la solicitud**
    - **Validates: Requirements 6.8**

  - [ ]* 19.8 `CotizacionResponseShapePropertyTest` — Property 8: Shape e invariante de respuesta
    - Para cualquier request válido, la respuesta tiene código 201 y todos los campos requeridos con `moneda == "USD"` y `fechaCreacion` parseable como ISO 8601 UTC
    - **Property 8: Shape e invariante de respuesta**
    - **Validates: Requirements 3.5, 3.7**

  - [ ]* 19.9 `CotizacionIdUniquenessPropertyTest` — Property 9: Unicidad y formato de identificadores
    - Para una secuencia de N requests válidos, todos los `id` son distintos y parsean como UUID versión 4
    - **Property 9: Unicidad y formato de identificadores de cotización**
    - **Validates: Requirements 3.6**

  - [ ]* 19.10 `CatalogoOrdenPropertyTest` — Property 10: Completitud y ordenamiento de catálogos
    - Los dos endpoints devuelven exactamente los elementos del repositorio en orden ascendente por nombre según `ComparadorPorNombre`
    - **Property 10: Completitud y ordenamiento de ambos catálogos**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**

  - [ ]* 19.11 `CatalogoVacioPropertyTest` — Property 11: Catálogo vacío devuelve 200 y arreglo vacío
    - Con repositorio sin elementos, los dos endpoints responden 200 con `[]`, nunca 404 ni 500
    - **Property 11: Catálogo vacío devuelve 200 y arreglo vacío**
    - **Validates: Requirements 1.4, 2.4**

  - [ ]* 19.12 `CotizacionValidacionVaciaPropertyTest` — Property 12: Validación lista de reparaciones vacía
    - Para cualquier request con `tipoReparacionIds` vacío/ausente/nulo, responde 400 con `type == reparaciones-requeridas` sin crear cotización
    - **Property 12: Validación — lista de reparaciones vacía, ausente o nula**
    - **Validates: Requirements 5.2**

  - [ ]* 19.13 `CotizacionValidacionCalzadoPropertyTest` — Property 13: Validación calzado desconocido
    - Para cualquier request con `tipoCalzadoId` desconocido, responde 400 con `type == tipo-calzado-no-encontrado`
    - **Property 13: Validación — calzado desconocido**
    - **Validates: Requirements 5.3**

  - [ ]* 19.14 `CotizacionIdsInvalidosPropertyTest` — Property 14: IDs inválidos reportados exhaustivamente
    - Para cualquier request con ids no registrados, `errors[].valoresInvalidos` contiene todos los ids inválidos, cada uno una sola vez, sin procesamiento parcial
    - **Property 14: Validación — identificadores desconocidos reportados exhaustivamente**
    - **Validates: Requirements 5.4, 5.5**

  - [ ]* 19.15 `ProblemDetailsShapePropertyTest` — Property 15: Shape de ProblemDetails en toda respuesta de error
    - Para cualquier request rechazado, la respuesta tiene `Content-Type: application/problem+json`, `status == 400`, `type`, `title` y `detail` no vacíos
    - **Property 15: Shape de ProblemDetails en toda respuesta de error**
    - **Validates: Requirements 5.1, 5.6, 5.7**

  - [ ]* 19.16 `CotizacionPersistenciaPropertyTest` — Property 16: Toda cotización generada queda persistida
    - Para N requests válidos, `CotizacionRepositoryPort.save` recibe exactamente N invocaciones; ningún request rechazado produce invocación a `save`
    - **Property 16: Toda cotización generada queda persistida**
    - **Validates: Requirements 3.8, 3.9**

  - [ ]* 19.17 `CatalogoInvariantesPropertyTest` — Property 17: Invariantes del catálogo
    - Todo catálogo aceptado tiene `factorComplejidad >= 0.5`, `precioBase >= 0.01`, ambos con a lo sumo 2 decimales, e `id` único por tipo; todo catálogo inválido falla la construcción
    - **Property 17: Invariantes del catálogo**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [ ] 20. Tests de integración end-to-end (opcionales)
  - [ ]* 20.1 Smoke test: arranca el contexto completo y los tres endpoints responden
    - _Requirements: 1, 2, 3_

  - [ ]* 20.2 Catálogo semilla: `GET /api/tipos-calzado` devuelve 3 elementos y `GET /api/tipos-reparacion` devuelve 4, ambos ordenados por nombre
    - _Requirements: 7.1, 7.2, 1.3, 2.3_

  - [ ]* 20.3 Flujo completo: los tres golden values del Req 6.9 ejecutados end-to-end contra la API real
    - _Requirements: 6.9_

  - [ ]* 20.4 Error end-to-end: `POST /api/cotizaciones` con `tipoReparacionIds: []` devuelve 400 con `application/problem+json` y `type == reparaciones-requeridas`
    - _Requirements: 5.1, 5.2_

- [~] 21. Checkpoint final — todos los tests pasan
  - Ejecuta `mvn test` (o `mvn verify` para incluir tests de integración)
  - Asegúrate de que no quedan `TODO` ni `throw new UnsupportedOperationException()`
  - Verifica los tres golden values manualmente contra la API arrancada con `mvn spring-boot:run`
  - Consulta al usuario si surge alguna duda

---

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido; el taller recomienda no ejecutarlas para no consumir tokens en cada ciclo
- Cada tarea hace referencia a los requirements específicos que implementa para facilitar la trazabilidad
- Los checkpoints (tareas 15 y 21) aseguran validación incremental
- El orden de las tareas respeta estrictamente las dependencias de la arquitectura hexagonal: ninguna tarea de infraestructura puede empezar antes de que su puerto de aplicación correspondiente exista
- Los property tests con jqwik (tareas 19.x) se ejecutan directamente sobre clases de dominio/servicio (Properties 1–7, 16, 17) o con `@SpringBootTest`/`@WebMvcTest` (Properties 8–15)
- Para ejecutar solo los tests de unidad sin jqwik: `mvn test -Dgroups=!jqwik`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["7.1"] },
    { "id": 9, "tasks": ["7.2"] },
    { "id": 10, "tasks": ["7.3"] },
    { "id": 11, "tasks": ["8.1"] },
    { "id": 12, "tasks": ["8.2", "8.3"] },
    { "id": 13, "tasks": ["9.1", "9.2"] },
    { "id": 14, "tasks": ["10.1", "10.2"] },
    { "id": 15, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 16, "tasks": ["12.1", "12.2", "12.3", "12.4"] },
    { "id": 17, "tasks": ["13.1", "13.2"] },
    { "id": 18, "tasks": ["14.1"] },
    { "id": 19, "tasks": ["16.1", "16.2", "16.3"] },
    { "id": 20, "tasks": ["16.4", "16.5", "17.1", "17.2"] },
    { "id": 21, "tasks": ["17.3", "18.1", "18.2", "18.3", "18.4"] },
    { "id": 22, "tasks": ["19.1", "19.2", "19.3", "19.4", "19.5", "19.6", "19.7", "19.16", "19.17"] },
    { "id": 23, "tasks": ["19.8", "19.9", "19.10", "19.11", "19.12", "19.13", "19.14", "19.15"] },
    { "id": 24, "tasks": ["20.1", "20.2", "20.3", "20.4"] }
  ]
}
```
