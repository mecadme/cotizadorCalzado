# Requirements Document

## Introduction

Backend REST para el cotizador en línea de un taller artesanal de reparación de calzado.
Permite a los clientes consultar los tipos de calzado y reparaciones disponibles, y generar una cotización estimada de costo y tiempo de entrega antes de llevar físicamente el calzado al taller.

Alcance acotado:
- Sin autenticación ni autorización.
- Sin pasarela de pago.
- Persistencia en memoria (repositorio in-memory); no se requiere base de datos real.
- Stack: Java 17 + Spring Boot con arquitectura hexagonal.
- El Sistema expone exactamente tres endpoints: `GET /api/tipos-calzado`, `GET /api/tipos-reparacion` y `POST /api/cotizaciones`. Ningún endpoint adicional forma parte de este alcance.

Fuentes de verdad de esta especificación, en orden de precedencia ante cualquier discrepancia:
1. El contrato OpenAPI (Anexo B del taller): define las rutas, los esquemas y los códigos de respuesta.
2. Las reglas de negocio RN-01 a RN-05 y las historias de usuario HU-01 a HU-03 (sección 3.3).
3. Los escenarios Gherkin (Anexo C): definen el comportamiento observable y los datos del catálogo semilla.
4. La especificación técnica (secciones 3.4.2 a 3.4.4): nomenclatura y modelo de dominio.

Los fragmentos de código del Anexo D son ilustrativos y no normativos; cuando difieren de las fuentes anteriores, prevalecen estas últimas.

---

## Glossary

- **Sistema**: El backend REST del cotizador de reparación de calzado.
- **Calzado**: Entidad de dominio que representa una categoría de calzado (ej. "Zapato formal", "Bota de cuero"), con un identificador único, un nombre y un factor de complejidad numérico mayor o igual a 0.5 que pondera el precio de las reparaciones. Se expone en la API como el recurso `tipos-calzado` y se referencia en las solicitudes mediante el campo `tipoCalzadoId`.
- **TipoReparacion**: Entidad de dominio que representa un servicio de reparación disponible (ej. "Cambio de tacón"), con un identificador único, un nombre, un precio base mayor o igual a 0.01 y un tiempo estimado expresado en días enteros mayores o iguales a 1.
- **NivelUrgencia**: Enumeración de dominio con los valores `NORMAL` y `URGENTE`. El campo booleano `urgente` del CotizacionRequest se corresponde con `URGENTE` cuando es `true` y con `NORMAL` cuando es `false`.
- **CotizacionRequest**: Cuerpo de la petición para generar una cotización, compuesto por `tipoCalzadoId` (cadena, requerido), `tipoReparacionIds` (arreglo de cadenas, requerido, con al menos un elemento) y `urgente` (booleano, opcional, por defecto `false`).
- **CotizacionResponse**: Cuerpo de la respuesta de una cotización generada, compuesto por `id`, `subtotal`, `recargoUrgencia`, `total`, `moneda`, `tiempoEstimadoDias` y `fechaCreacion`.
- **ProblemDetails**: Cuerpo de toda respuesta de error del Sistema, conforme a RFC 7807, servido con `Content-Type: application/problem+json` y compuesto por `type` (URI que identifica la clase de error), `title` (resumen legible e invariante para ese `type`), `status` (entero igual al código HTTP de la respuesta), `detail` (mensaje legible y específico de esta ocurrencia, apto para mostrarse directamente al cliente), `instance` (referencia URI de la ruta que originó el error) y `errors` (arreglo, opcional, de objetos con `field` y, cuando corresponda, `valoresInvalidos` como arreglo de cadenas).
- **Subtotal**: Suma de (precioBase de cada TipoReparacion referida en `tipoReparacionIds` × factorComplejidad del Calzado elegido), redondeada a 2 decimales.
- **RecargoUrgencia**: 30 % del Subtotal, aplicado únicamente cuando `urgente` es `true`; en caso contrario vale `0.00`.
- **Total**: Subtotal + RecargoUrgencia.
- **TiempoEstimadoDias**: Máximo de los tiempos estimados de las reparaciones referidas; si `urgente` es `true`, ese máximo se divide entre dos redondeado hacia arriba, con un mínimo de 1 día.
- **RedondeoMonetario**: Redondeo a 2 decimales con modo half-up (la mitad se redondea alejándose de cero). Es el único modo de redondeo aplicable a importes monetarios.
- **Repositorio**: Componente de persistencia en memoria que almacena y recupera Calzados, TiposReparacion y Cotizaciones durante la vida del proceso. Su contenido se pierde al reiniciar el proceso.
- **CatalogoSemilla**: Conjunto fijo de Calzados y TiposReparacion con el que el Repositorio se inicializa al arrancar el Sistema, definido en el Requirement 7.
- **OrdenPorNombre**: Orden lexicográfico ascendente por el campo `nombre`, insensible a mayúsculas y minúsculas, usando las reglas de colación del idioma español (de modo que las letras acentuadas se ordenan junto a sus equivalentes sin acento).

---

## Requirements

### Requirement 1: Consultar tipos de calzado disponibles

**User Story:** Como cliente, quiero consultar los tipos de calzado disponibles, para saber qué opciones puedo seleccionar al generar mi cotización.

_Trazabilidad: HU-03._

#### Acceptance Criteria

1. WHEN el cliente realiza una petición GET a `/api/tipos-calzado`, THE Sistema SHALL responder con código HTTP 200 y un arreglo de objetos Calzado, donde cada objeto contiene exactamente los campos `id` (cadena), `nombre` (cadena) y `factorComplejidad` (numérico mayor o igual a 0.5).
2. WHEN el cliente realiza una petición GET a `/api/tipos-calzado`, THE Sistema SHALL incluir en el arreglo de respuesta todos los Calzado registrados en el Repositorio, sin omitir ninguno y sin incluir elementos que no estén registrados.
3. WHEN el cliente realiza una petición GET a `/api/tipos-calzado`, THE Sistema SHALL devolver los elementos del arreglo aplicando OrdenPorNombre.
4. IF el Repositorio no contiene ningún Calzado, THEN THE Sistema SHALL responder con código HTTP 200 y un arreglo vacío.

---

### Requirement 2: Consultar tipos de reparación disponibles

**User Story:** Como cliente, quiero consultar los tipos de reparación disponibles, para saber qué servicios puedo incluir en mi cotización.

_Trazabilidad: HU-03._

#### Acceptance Criteria

1. WHEN el cliente realiza una petición GET a `/api/tipos-reparacion`, THE Sistema SHALL responder con código HTTP 200 y un arreglo de objetos TipoReparacion, donde cada objeto contiene exactamente los campos `id` (cadena), `nombre` (cadena), `precioBase` (numérico mayor o igual a 0.01) y `tiempoEstimadoDias` (entero mayor o igual a 1).
2. WHEN el cliente realiza una petición GET a `/api/tipos-reparacion`, THE Sistema SHALL incluir en el arreglo de respuesta todos los TipoReparacion registrados en el Repositorio, sin omitir ninguno y sin incluir elementos que no estén registrados.
3. WHEN el cliente realiza una petición GET a `/api/tipos-reparacion`, THE Sistema SHALL devolver los elementos del arreglo aplicando OrdenPorNombre.
4. IF el Repositorio no contiene ningún TipoReparacion, THEN THE Sistema SHALL responder con código HTTP 200 y un arreglo vacío.

---

### Requirement 3: Generar una cotización

**User Story:** Como cliente, quiero seleccionar un tipo de calzado y una o más reparaciones para obtener una cotización estimada del costo total.

_Trazabilidad: HU-01, RN-01, RN-03, RN-05._

#### Acceptance Criteria

1. WHEN el cliente realiza una petición POST a `/api/cotizaciones` con un CotizacionRequest válido, THE Sistema SHALL calcular el Subtotal recorriendo `tipoReparacionIds`, acumulando para cada entrada el producto (precioBase del TipoReparacion referido × factorComplejidad del Calzado indicado en `tipoCalzadoId`), y aplicando RedondeoMonetario únicamente a la suma final, sin redondear los productos individuales.
2. WHEN el CotizacionRequest contiene el mismo identificador repetido en `tipoReparacionIds`, THE Sistema SHALL acumular una vez el producto correspondiente por cada aparición del identificador, de modo que la reparación repetida se cobre tantas veces como aparezca.
3. WHEN el CotizacionRequest tiene `urgente` con valor `false`, ausente o nulo, THE Sistema SHALL tratar la solicitud como NivelUrgencia `NORMAL`, establecer el RecargoUrgencia en `0.00` y establecer el Total igual al Subtotal.
4. WHEN el CotizacionRequest tiene `urgente` con valor `false`, ausente o nulo, THE Sistema SHALL calcular el TiempoEstimadoDias como el valor máximo de los `tiempoEstimadoDias` de los TipoReparacion referidos, sin reducción alguna.
5. WHEN el Sistema completa el cálculo de una cotización válida, THE Sistema SHALL responder con código HTTP 201, `Content-Type: application/json` y un CotizacionResponse que contiene `id`, `subtotal`, `recargoUrgencia`, `total`, `moneda` con el valor fijo `"USD"`, `tiempoEstimadoDias` y `fechaCreacion`.
6. WHEN el Sistema genera una cotización válida, THE Sistema SHALL asignar como `id` un UUID versión 4 en su representación canónica de cadena, distinto del `id` de toda cotización previamente generada durante la vida del proceso.
7. WHEN el Sistema genera una cotización válida, THE Sistema SHALL asignar como `fechaCreacion` el instante de generación expresado en ISO 8601 con desplazamiento UTC explícito y precisión de al menos segundos (por ejemplo `2026-08-20T14:32:07Z`).
8. WHEN el Sistema genera una cotización válida, THE Sistema SHALL almacenar la Cotizacion resultante en el Repositorio a través de su puerto de salida. Este almacenamiento no se expone por la API y es verificable únicamente mediante pruebas del puerto de salida.
9. IF el CotizacionRequest no es válido según el Requirement 5, THEN THE Sistema SHALL rechazar la solicitud conforme a ese requisito, sin generar ni almacenar ninguna Cotizacion.

---

### Requirement 4: Aplicar recargo y reducción de tiempo por servicio urgente

**User Story:** Como cliente, quiero marcar el servicio como urgente para conocer el recargo aplicable y el nuevo tiempo estimado de entrega.

_Trazabilidad: HU-02, RN-02, RN-03._

#### Acceptance Criteria

1. WHEN el CotizacionRequest tiene `urgente` con valor `true`, THE Sistema SHALL tratar la solicitud como NivelUrgencia `URGENTE` y calcular el RecargoUrgencia como el 30 % del Subtotal, aplicando RedondeoMonetario al resultado.
2. WHEN el CotizacionRequest tiene `urgente` con valor `true`, THE Sistema SHALL calcular el Total como la suma del Subtotal más el RecargoUrgencia, tomando el Subtotal ya redondeado como base del cálculo.
3. WHEN el CotizacionRequest tiene `urgente` con valor `true`, THE Sistema SHALL calcular el TiempoEstimadoDias como el máximo entre 1 y el resultado de dividir entre dos el valor máximo de los `tiempoEstimadoDias` de los TipoReparacion referidos, redondeado hacia arriba.
4. THE Sistema SHALL exponer el porcentaje de recargo por urgencia como una constante única de la aplicación, de modo que su valor no aparezca duplicado en más de un punto del código.

---

### Requirement 5: Validar y rechazar solicitudes de cotización inválidas

**User Story:** Como cliente, quiero recibir un mensaje de error claro y específico cuando mi solicitud es inválida, para poder corregirla sin adivinar qué falló.

_Trazabilidad: RN-04, UI-03._

#### Acceptance Criteria

1. IF el Sistema rechaza una petición POST a `/api/cotizaciones`, THEN THE Sistema SHALL responder con código HTTP 400, `Content-Type: application/problem+json` y un cuerpo ProblemDetails cuyo campo `status` sea `400` y cuyo campo `detail` describa la causa concreta del rechazo en un texto apto para mostrarse directamente al cliente, sin generar ni almacenar ninguna Cotizacion.
2. IF el CotizacionRequest contiene `tipoReparacionIds` como arreglo vacío, ausente o nulo, THEN THE Sistema SHALL responder con código HTTP 400 y un ProblemDetails cuyo `type` sea `https://api.cotizador/errors/reparaciones-requeridas`, cuyo `detail` indique explícitamente que se requiere seleccionar al menos una reparación, y cuyo `errors` contenga una entrada con `field` igual a `tipoReparacionIds`.
3. IF el CotizacionRequest contiene `tipoCalzadoId` con un valor que no corresponde a ningún Calzado registrado en el Repositorio, THEN THE Sistema SHALL responder con código HTTP 400 y un ProblemDetails cuyo `type` sea `https://api.cotizador/errors/tipo-calzado-no-encontrado`, cuyo `detail` identifique el valor recibido, y cuyo `errors` contenga una entrada con `field` igual a `tipoCalzadoId` y `valoresInvalidos` con el valor recibido.
4. IF el CotizacionRequest contiene `tipoCalzadoId` ausente, nulo o vacío, THEN THE Sistema SHALL responder con código HTTP 400 y un ProblemDetails con el mismo `type` del criterio 3, cuyo `detail` indique que se requiere indicar el tipo de calzado sin reproducir el valor ausente como texto, y cuyo `errors` contenga una entrada con `field` igual a `tipoCalzadoId` y sin `valoresInvalidos`.
5. IF el CotizacionRequest contiene en `tipoReparacionIds` uno o más identificadores que no corresponden a TipoReparacion registrados en el Repositorio, THEN THE Sistema SHALL responder con código HTTP 400 y un ProblemDetails cuyo `type` sea `https://api.cotizador/errors/tipo-reparacion-no-encontrado`, y cuyo `errors` contenga una entrada con `field` igual a `tipoReparacionIds` y `valoresInvalidos` con todos los identificadores no encontrados, cada uno listado una sola vez.
6. IF el CotizacionRequest contiene una mezcla de identificadores válidos e inválidos en `tipoReparacionIds`, THEN THE Sistema SHALL rechazar la solicitud completa conforme al criterio 5, sin procesarla parcialmente y sin calcular Subtotal, Total ni TiempoEstimadoDias.
7. IF el cuerpo de la petición no es JSON válido, o `urgente` no es un booleano, o algún campo tiene un tipo distinto al declarado en el Glossary, THEN THE Sistema SHALL responder con código HTTP 400 y un ProblemDetails cuyo `type` sea `https://api.cotizador/errors/solicitud-malformada` y cuyo `errors` identifique los campos afectados, sin realizar ningún cálculo.
8. WHEN el Sistema detecta simultáneamente más de una causa de rechazo en un mismo CotizacionRequest, THE Sistema SHALL responder con un único ProblemDetails que agrupe en `errors` una entrada por cada campo afectado, tomando como `type` la causa de la primera entrada según el orden de los criterios 2, 3, 4, 5 y 7.
9. WHEN el cuerpo de la petición incluye propiedades no declaradas en la definición de CotizacionRequest del Glossary, THE Sistema SHALL ignorarlas y procesar la solicitud con normalidad, sin responder con código HTTP 400 por ese motivo.
10. IF el Sistema responde con código HTTP 400, THEN THE Sistema SHALL incluir en el campo `instance` del ProblemDetails la ruta de la petición que originó el error.

---

### Requirement 6: Propiedades de corrección del cálculo de cotización

**User Story:** Como desarrollador, quiero garantizar la corrección matemática del motor de cotización para cualquier combinación válida de entrada, de modo que los clientes siempre reciban cifras consistentes.

_Trazabilidad: RN-01, RN-02, RN-03._

#### Acceptance Criteria

1. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido, el Subtotal sea igual a `redondeo_half_up(Σ (precioBase_i × factorComplejidad), 2)`, donde `i` recorre cada aparición de `tipoReparacionIds` y `factorComplejidad` es el valor único del Calzado indicado en `tipoCalzadoId`.
2. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido con `urgente` en `true`, el Total sea igual a `Subtotal + redondeo_half_up(Subtotal × 0.30, 2)`.
3. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido con `urgente` en `true`, el TiempoEstimadoDias sea igual a `max(1, techo(max(tiempoEstimadoDias_i) / 2))`.
4. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido con `urgente` en `false`, el RecargoUrgencia sea `0.00`, el Total sea igual al Subtotal, y el TiempoEstimadoDias sea igual a `max(tiempoEstimadoDias_i)`.
5. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido, el Total sea mayor o igual al Subtotal y el Subtotal sea mayor o igual a 0.01.
6. THE Sistema SHALL garantizar que, para todo CotizacionRequest válido, el TiempoEstimadoDias sea mayor o igual a 1.
7. THE Sistema SHALL garantizar que, para todo par de CotizacionRequest válidos que difieran únicamente en el valor de `urgente`, el TiempoEstimadoDias del que tiene `urgente` en `true` sea menor o igual al del que tiene `urgente` en `false`, y su Total sea mayor o igual al de aquel.
8. THE Sistema SHALL garantizar que, para todo par de CotizacionRequest válidos que difieran únicamente en el orden de los elementos de `tipoReparacionIds`, el Subtotal, el RecargoUrgencia, el Total y el TiempoEstimadoDias resultantes sean idénticos.
9. THE Sistema SHALL producir, para las combinaciones del CatalogoSemilla listadas a continuación, exactamente los valores indicados:

   | Calzado | Reparaciones | urgente | Subtotal | RecargoUrgencia | Total | TiempoEstimadoDias |
   | --- | --- | --- | --- | --- | --- | --- |
   | Zapato formal | Cambio de tacón | `false` | 14.40 | 0.00 | 14.40 | 2 |
   | Bota de cuero | Cambio de suela | `true` | 30.00 | 9.00 | 39.00 | 2 |
   | Zapatilla deportiva | Cosido de costura, Limpieza y tinturado | `false` | 18.00 | 0.00 | 18.00 | 3 |

---

### Requirement 7: Inicializar el catálogo y garantizar sus invariantes

**User Story:** Como estudiante que valida el sistema en el navegador, quiero que el catálogo esté disponible desde el arranque, para poder ejecutar los escenarios de aceptación sin cargar datos manualmente.

_Trazabilidad: HU-03, UI-E1, UI-E2, Anexo C._

#### Acceptance Criteria

1. WHEN el Sistema arranca, THE Sistema SHALL precargar en el Repositorio los siguientes Calzado:

   | id | nombre | factorComplejidad |
   | --- | --- | --- |
   | `1` | Zapato formal | 1.2 |
   | `2` | Bota de cuero | 1.5 |
   | `3` | Zapatilla deportiva | 1.0 |

2. WHEN el Sistema arranca, THE Sistema SHALL precargar en el Repositorio los siguientes TipoReparacion:

   | id | nombre | precioBase | tiempoEstimadoDias |
   | --- | --- | --- | --- |
   | `1` | Cambio de tacón | 12.00 | 2 |
   | `2` | Cambio de suela | 20.00 | 4 |
   | `3` | Cosido de costura | 8.00 | 1 |
   | `4` | Limpieza y tinturado | 10.00 | 3 |

3. WHEN el Sistema arranca, THE Sistema SHALL dejar el Repositorio de Cotizaciones vacío.
4. THE Sistema SHALL garantizar que todo Calzado registrado tenga un `factorComplejidad` mayor o igual a 0.5, expresado con a lo sumo 2 decimales, y un `id` único entre los Calzado.
5. THE Sistema SHALL garantizar que todo TipoReparacion registrado tenga un `precioBase` mayor o igual a 0.01, expresado con a lo sumo 2 decimales, un `tiempoEstimadoDias` entero mayor o igual a 1, y un `id` único entre los TipoReparacion.
6. IF alguna invariante de los criterios 4 o 5 no se cumple durante la inicialización, THEN THE Sistema SHALL fallar el arranque en lugar de quedar operativo con un catálogo inválido.

   > Las cotas inferiores de los criterios 4 y 5 no son arbitrarias: con `precioBase >= 0.01` y `factorComplejidad >= 0.5`, el producto mínimo de una reparación es `0.005`, que bajo RedondeoMonetario asciende a `0.01`. Esto es lo que hace demostrable el `Subtotal > 0` del criterio 6.5, que de otro modo podría violarse con importes arbitrariamente pequeños.
7. THE Sistema SHALL tratar el catálogo como de solo lectura: no expone ninguna operación de creación, modificación ni eliminación de Calzado o TipoReparacion.

---

## Trazabilidad

| Origen | Enunciado | Cubierto por |
| --- | --- | --- |
| HU-01 | Seleccionar calzado y reparaciones para obtener una cotización | Requirement 3 |
| HU-02 | Marcar el servicio como urgente y conocer recargo y tiempo | Requirement 4 |
| HU-03 | Consultar los catálogos antes de cotizar | Requirements 1, 2, 7 |
| RN-01 | Subtotal = Σ (precioBase × factorComplejidad) | 3.1, 3.2, 6.1 |
| RN-02 | Recargo del 30 % si es urgente; Total = Subtotal + Recargo | 4.1, 4.2, 6.2 |
| RN-03 | Tiempo = máximo; si es urgente, mitad hacia arriba, mínimo 1 día | 3.4, 4.3, 6.3, 6.4 |
| RN-04 | Al menos una reparación seleccionada | 5.2, 3.9 |
| RN-05 | Identificador único y fecha de creación | 3.6, 3.7 |
| UI-03 | La interfaz muestra el mensaje de error que devuelve la API | 5.1 |
| Anexo B | Contrato OpenAPI (rutas, esquemas, códigos) | 1.1, 2.1, 3.5, 5.1 |
| Anexo C | Escenarios Gherkin de negocio | 6.9, 7.1, 7.2 |

---

## Notas de alcance

Los siguientes puntos se declaran explícitamente fuera de alcance para evitar que se implementen por inferencia:

- **Sin respuesta HTTP 503.** El Repositorio vive en memoria dentro del mismo proceso, por lo que un estado de "repositorio no disponible" no es alcanzable ni provocable en una prueba. El contrato del Anexo B define únicamente 200 para los GET y 201/400 para el POST.
- **Sin consulta de cotizaciones.** No existe `GET /api/cotizaciones/{id}`. El almacenamiento exigido por 3.8 es interno y se verifica por prueba del puerto de salida, no por API.
- **Sin persistencia entre reinicios.** El contenido del Repositorio se pierde al reiniciar el proceso; el CatalogoSemilla se vuelve a cargar en cada arranque.
- **Sin autenticación, autorización ni pasarela de pago.**
- **Sin paginación ni filtrado** en los dos endpoints de catálogo: devuelven siempre la colección completa.
- **Solicitudes con reparaciones repetidas.** El criterio 3.2 define su comportamiento porque el contrato HTTP lo permite, pero la interfaz del cotizador usa casillas de verificación y no puede producirlas: ese camino solo es alcanzable llamando a la API directamente.
