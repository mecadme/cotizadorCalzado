# Notas para el reporte final — Taller Vibe Coding y Spec-Driven Development

Documento de trabajo. Cada sección la llena quien hizo el cambio correspondiente.

- [x] **Configuración de Kiro** (permisos / Trust v2) — abajo
- [x] **Inconsistencias detectadas y corregidas** en la spec de `seccion-2-spec-driven` — abajo

---

## 1. Configuración de Kiro: eliminar los prompts de permisos

### Problema

Durante el taller, Kiro interrumpe cada acción del agente pidiendo confirmación
(escribir archivo, correr `mvn`, consultar la web). Al usar "Always allow" archivo
por archivo, la aprobación se acumula como reglas puntuales y el agente vuelve a
preguntar en cuanto toca un archivo o comando nuevo — inviable para una demo en vivo.

### Mecanismo real: Trust v2

Kiro migró su modelo de confianza a **Trust v2**. El setting antiguo
`kiroAgent.autoApproveAgentCommands` (en `settings.json`) está **deprecado**: los
valores existentes se migran automáticamente y las reglas ahora viven en archivos
`permissions.yaml`.

Ubicaciones, en orden de alcance:

| Alcance | Ruta | Notas |
|---|---|---|
| `administration` | `/Library/Application Support/Kiro/managed-settings.json` (macOS) | Gestionado por TI. Solo admite `deny` / `ask`. |
| `user` | `~/.kiro/settings/permissions.yaml` | **Aplica a todos los workspaces.** Admite `allow`. |
| `workspace` | `~/.kiro/workspace-roots/<hash>/permissions.yaml` | Por proyecto, pero **fuera del repo** (carpeta con hash del path). No se puede versionar. |
| `kiro` (interno) | — | Reglas implícitas que fuerzan `ask` al escribir dentro de `.kiro/` (steering, hooks, specs). |

Kiro vigila estos archivos con un *file watcher*: los cambios toman efecto sin
reiniciar el IDE (a lo mucho, iniciando una sesión de chat nueva).

Comandos útiles en la paleta: **Kiro: Open Permissions (User)** y
**Kiro: Open Permissions (Workspace)**.

### Lo que se configuró

Archivo creado: **`~/.kiro/settings/permissions.yaml`** (alcance `user`)

```yaml
# Kiro Trust v2 — user scope (aplica a todos los workspaces)
# Auto-aprueba todas las llamadas de herramientas: sin prompts de permisos.
# Para volver al comportamiento normal: borra este archivo o comenta la regla.
#
# Capacidades disponibles si quieres algo mas granular:
#   all | builtin | filesystem | fs_read | fs_write | shell
#   web_fetch | web_search | subagent | skill | power | context | diagnostics | mcp
# Efectos: allow | ask | deny   (opcional: match / exclude con globs o "cmd *")

# Presets integrados: allow-all, edit-workspace, dev-shell,
#                     read-all, read-only-shell, read-workspace
policies:
  - allow-all

rules:
  - capability: all
    effect: allow
```

`policies: [allow-all]` y la regla explícita son **equivalentes** (el preset
`allow-all` es exactamente `capability: all` + `effect: allow`). Se dejaron las dos
a propósito, para mostrar en el taller las dos formas de escribir lo mismo.

### Por qué alcance `user` y no `workspace`

1. El archivo de workspace no vive en el repo, sino en
   `~/.kiro/workspace-roots/<hash>/`, así que no aporta nada versionable.
2. Solo un `allow` amplio en alcance `user` (o `administration`) desactiva además
   las reglas internas que fuerzan confirmación al escribir dentro de `.kiro/`.
   Como el taller edita specs y steering, eso importa: en alcance `workspace`
   Kiro seguiría preguntando al tocar esos archivos.

### Formato del archivo (referencia)

Claves de nivel superior: `rules` (array, requerido) y `policies` (array de ids de
preset, opcional). Cada regla admite **solo** estos campos — cualquier otro es
error de parseo:

- `capability` — `fs_read`, `fs_write`, `shell`, `web_fetch`, `web_search`,
  `subagent`, `skill`, `power`, `context`, `diagnostics`, `mcp`, más los alias
  `all`, `builtin`, `filesystem`.
- `effect` — `allow`, `ask` o `deny`.
- `match` (opcional) — array de globs de ruta (`./**`) o patrones de comando (`mvn *`).
  Sin `match`, la regla aplica a todo.
- `exclude` (opcional) — array de patrones a exceptuar dentro del `match`.

Presets integrados: `allow-all`, `edit-workspace`, `dev-shell`, `read-all`,
`read-only-shell`, `read-workspace`.

### Advertencia y alternativa con frenos

La configuración aplicada es **bypass total**: incluye escritura fuera del
workspace y cualquier comando de shell. Es aceptable en una máquina de taller,
pero **no** conviene recomendarla tal cual a los asistentes si trabajan en equipos
con datos sensibles o credenciales. Versión razonable para compartir:

```yaml
policies:
  - edit-workspace   # lectura/escritura solo dentro del workspace
  - dev-shell        # git, mvn, npm, docker read-only, etc.
  - read-all
rules: []
```

### Cómo revertir

Borrar `~/.kiro/settings/permissions.yaml` (o comentar sus reglas). Opcionalmente,
borrar también `~/.kiro/workspace-roots/<hash>/permissions.yaml`, que quedó con
~30 reglas puntuales acumuladas de los "Always allow" del taller y ya es redundante.

### Estado de verificación

El formato se derivó del parser del agente de Kiro
(`/Applications/Kiro.app/Contents/Resources/app/extensions/kiro.kiro-agent/`),
que valida los campos y rechaza claves desconocidas. **No se verificó abriendo Kiro**;
si hubiera un error de parseo, aparecería en la barra de estado del IDE.

---

## 2. Inconsistencias detectadas y corregidas

Alcance: la especificación de `seccion-2-spec-driven/.kiro/specs/cotizador-backend/`
(`requirements.md`, `design.md`, `tasks.md`). El código Java no se modificó a mano:
Kiro lo generó a partir de la spec ya corregida.

### 2.1 Cómo se detectaron

Se convirtió el PDF del taller a Markdown con `markitdown` para poder hacer
búsquedas y comparaciones automatizadas contra la spec. Con el texto en plano se
cruzaron los criterios de aceptación de `requirements.md` contra las cuatro fuentes
de verdad del taller: el Anexo B (contrato OpenAPI), las reglas RN-01 a RN-05 y las
historias HU-01 a HU-03 (sección 3.3), el Anexo C (escenarios Gherkin) y la
especificación técnica (3.4.2 a 3.4.4).

Ese cruce es lo que hizo visibles las inconsistencias: **la mayoría no se ven leyendo
la spec de forma aislada**, solo aparecen al confrontarla con su fuente. Es el
argumento central de la sección: el gate de revisión humana del Paso 3 no puede ser
una lectura rápida, tiene que ser una comparación contra el documento origen.

### 2.2 Contradicciones internas que el documento fuente resolvió por sí solo

Ninguna de estas necesitó una decisión de negocio: la respuesta ya estaba en el taller.

| # | Inconsistencia | Fuente que la dirimió | Corrección |
|---|---|---|---|
| A1 | `ceiling(Subtotal × 1.30, 2 decimales half-up)` — `ceiling` y `half-up` son modos de redondeo mutuamente excluyentes | RN-02: «recargo del 30 % sobre el subtotal. El total = subtotal + recargo» | `Total = Subtotal + redondeo_half_up(Subtotal × 0.30, 2)`, sin `ceiling` |
| A2 | `precioBase_i × factorComplejidad_i` sugería un factor de complejidad **por reparación** | RN-01: «factor de complejidad **del tipo de calzado**» (singular) | `factorComplejidad` sin subíndice, valor único del calzado elegido |
| A3 | El mínimo de 1 día se exigía para todo request, contradiciendo el `max(t_i)` «sin modificación» del caso no urgente | RN-03: el mínimo aplica **solo** si el servicio es urgente | El mínimo queda en el criterio urgente; el caso general se garantiza con la invariante de catálogo `tiempoEstimadoDias >= 1` |
| A4 | No se decía si el 30 % se aplica sobre el subtotal crudo o ya redondeado (diferencia observable de 0.01) | Secuencia RN-01 → RN-02 | Se fija: el subtotal se redondea primero y es la base del recargo |
| C1 | HTTP 503 «repositorio no disponible» en dos endpoints | El Anexo B declara solo 200, 201 y 400; el 503 no aparece en ninguna parte del taller | Eliminado. Con un repositorio in-memory en el mismo proceso ese estado no es alcanzable ni provocable en una prueba, o sea que el criterio era **inverificable** |
| C3 | El glosario llamaba `TipoCalzado` a la entidad | 3.4.2, 3.4.4 y el Anexo D usan `Calzado` | Entidad `Calzado`; `tipoCalzadoId` queda marcado como campo del DTO, no del dominio |
| — | El `id` de la cotización solo se pedía «único», sin formato | Anexo D: `UUID.randomUUID().toString()` | UUID v4 en representación canónica |
| — | `moneda` en la respuesta sin valor definido | Anexo B (`example: USD`) + `new Dinero(12.00, "USD")` del ejemplo JUnit | Valor fijo `"USD"` |

### 2.3 Vacíos que bloqueaban el gate del Paso 5

Estos no eran contradicciones sino ausencias, y eran los más graves porque el
ejercicio no se podía cerrar con ellos abiertos.

**B1 — No se exigía ningún dato semilla del catálogo.** El más grave. Los tres
escenarios del Anexo C y las filas 1 a 3 del guion de pruebas en navegador (4.6.1)
dependen de datos concretos: `Zapato formal` (1.2), `Bota de cuero` (1.5),
`Zapatilla deportiva` (1.0), `Cambio de tacón` (12.00 / 2 d), `Cambio de suela`
(20.00 / 4 d), `Cosido de costura` (8.00 / 1 d), `Limpieza y tinturado` (10.00 / 3 d).
Con un repositorio in-memory y sin requisito de inicialización, el estado por defecto
es catálogo vacío — exactamente el caso que describían otros dos criterios. El
checklist final del taller («las pruebas de los tres escenarios del Anexo C pasan en
verde») era **inalcanzable**. Se agregó el **Requirement 7** con los siete registros y
sus valores exactos, más el fallo de arranque si el catálogo viola sus invariantes.

**B2 — No había contrato para el cuerpo de error.** Seis criterios exigían «un mensaje
de error indicando X», pero ninguno definía la forma de ese cuerpo, y el Anexo B deja
la respuesta 400 sin `schema`. Sin eso, la regla de interfaz UI-03 («el mensaje mostrado
debe ser el que devuelve la API, no un texto genérico») no es implementable de forma
determinista y backend y frontend divergen. Se resolvió con RFC 7807 (ver 2.5).

**B3 — La persistencia de la cotización no se exigía ni era observable.** El glosario
decía que el repositorio almacena cotizaciones y 3.4.4 hace de `Cotizacion` el agregado
raíz, pero ningún criterio exigía guardarla y no existe `GET /api/cotizaciones/{id}`
para comprobarlo. Añadir ese endpoint habría violado el checklist del taller («expone
exactamente los tres endpoints del Anexo B, ni más ni menos»), así que se resolvió al
revés: un criterio que exige persistir por el puerto de salida, verificable solo por
prueba de ese puerto, y una nota explícita de que no se publica en la API.

### 2.4 Contradicciones dentro del propio documento del taller

Dos casos en que el material fuente se contradice consigo mismo. Se resolvieron
fijando una **regla de precedencia** en la introducción de `requirements.md`
(Anexo B > RN/HU > Anexo C > 3.4.x, y el Anexo D como ilustrativo no normativo),
para que Kiro no tuviera que adivinar en cada caso:

1. **`fechaCreacion`**: el Anexo D usa `LocalDateTime.now()`, que no tiene zona
   horaria, mientras el Anexo B declara `format: date-time` (RFC 3339, con offset).
   Gana el Anexo B, que es la fuente de verdad declarada: se exige ISO 8601 con
   offset UTC explícito, y en el diseño se usa `Instant` — el único tipo de
   `java.time` que representa un punto en la línea temporal sin ambigüedad.
2. **Firma del caso de uso**: el Anexo D declara
   `generar(String, List<String>, boolean)` mientras el ejemplo JUnit de 3.7 usa
   `generar(Calzado, List<TipoReparacion>, NivelUrgencia)`. Además el fragmento de
   `Cotizacion` del Anexo D omite `subtotal` y `recargoUrgencia`, que 3.4.4 sí lista
   como atributos mínimos y que la respuesta HTTP necesita. Al ser el Anexo D
   ilustrativo, prevalecen 3.4.4 y el Anexo B.

### 2.5 Decisiones que el taller nunca define

Tres puntos que ninguna fuente resolvía y que cambiaban el contenido de la spec.
Requirieron decisión humana explícita — vale registrarlas como tal en el reporte,
porque son ejemplo de lo que un gate de revisión debe **escalar** en lugar de dejar
que la IA elija por su cuenta:

| Decisión | Opción tomada | Consecuencia |
|---|---|---|
| Formato del cuerpo de error | **RFC 7807 Problem Details** (`application/problem+json`) | Cuatro URIs de `type` estables, extensión `errors[].{field, valoresInvalidos}`, y un criterio nuevo para agrupar varias causas en una sola respuesta |
| `tipoReparacionIds` con identificadores repetidos | **Cobrar cada repetición** | Obligó a cambiar el puerto de salida (ver 2.6, punto 3). Nota: la UI usa casillas de verificación y no puede producir duplicados, así que este camino solo es alcanzable llamando a la API directamente; quedó documentado como tal |
| Orden de los listados de catálogo | **Ambos por nombre ascendente** | Simétrico y determinista para el guion de pruebas manual; obligó a usar `java.text.Collator` de español en lugar de `String.compareTo`, porque la comparación binaria de UTF-16 ordena mal `"Cambio de tacón"` |

### 2.6 Inconsistencias internas de `design.md`

El diseño generado tenía además tres problemas propios, independientes de los
requisitos:

1. **`@NotNull Boolean urgente` en el DTO** rechazaba con 400 un campo que la
   especificación define como opcional con default `false`. Se quitó Bean Validation
   del DTO por completo — no solo por ese defecto, sino porque agrupar varias causas
   de rechazo en un solo `ProblemDetails` es **imposible** con Bean Validation: se
   ejecuta antes de entrar al controlador y corta el flujo, así que un request con
   lista vacía *y* calzado desconocido solo reportaría el primer problema. Toda la
   validación semántica pasó al servicio de aplicación, que acumula violaciones.
2. **`NormalPricingStrategy`** aparecía en la tabla de patrones de diseño pero no
   existía ni en la estructura de paquetes ni en el diagrama de arquitectura. Se
   agregó en los tres lugares, y la selección de estrategia pasó a un
   `Map<NivelUrgencia, UrgencyPricingStrategy>` inyectado.
3. **`findAllById` devolvía `List`**, lo que perdía dos informaciones necesarias: la
   multiplicidad de la petición (`["1","1"]` colapsaba a un elemento, incumpliendo la
   decisión de cobrar repeticiones) y qué identificadores concretos faltaron
   (necesario para reportarlos todos en el error). Se cambió a
   `Map<String, TipoReparacion>` y el servicio reconstruye la lista recorriendo la
   petición original.

### 2.7 Duplicación y alcance en los requisitos

Además de las contradicciones, había redundancia que se desincroniza en cuanto una
copia cambia:

- **Tres fuentes de verdad para el mismo error 400**: un criterio enumeraba todos los
  casos de rechazo, un requisito entero los detallaba, y un tercer criterio repetía el
  caso de lista vacía. Se dejó un único requisito dueño de la validación y los otros
  dos remiten a él o se eliminaron.
- **Un criterio del requisito «con servicio urgente» describía el caso no urgente**,
  duplicando dos criterios del requisito anterior. Eliminado.
- **Dos títulos más estrechos que su contenido**: «Rechazar cotización sin reparaciones
  seleccionadas» cubría también calzado e identificadores desconocidos; «Generar
  cotización sin urgencia» contenía criterios aplicables a toda cotización. Renombrados.
- **Patrones EARS inconsistentes**: requisitos gemelos usaban `WHILE` en un endpoint e
  `IF` en el otro para exactamente la misma condición. Unificados.
- **Sin trazabilidad**: ningún requisito referenciaba HU-01 a HU-03 ni RN-01 a RN-05,
  lo que hacía imposible verificar cobertura de forma mecánica en el gate de revisión.
  Se agregó una línea de trazabilidad por requisito y una tabla de cobertura.

### 2.8 Endurecimiento de cotas (7.4 / 7.5)

Caso interesante para el reporte, porque es una inconsistencia que **introdujo la
propia corrección**. Un criterio nuevo garantizaba `Subtotal > 0`, pero las
invariantes del catálogo solo pedían `factorComplejidad > 0` y `precioBase > 0`, sin
cota inferior: con `precioBase = 0.000001` el subtotal redondea a `0.00` y el
invariante se viola. No es alcanzable con el catálogo semilla, que es de solo lectura,
pero sí lo generaría un property-based test, y el fallo habría aparecido recién al
ejecutar la tarea de pruebas.

Se endurecieron **ambas** cotas: `factorComplejidad >= 0.5` y `precioBase >= 0.01`,
las dos con a lo sumo 2 decimales. Endurecer solo una era inútil — la otra dejaba el
hueco abierto igual. Producto mínimo `0.01 × 0.5 = 0.005`, que bajo redondeo half-up
asciende a `0.01`, con lo que `Subtotal >= 0.01` queda **demostrable** en lugar de
solo enunciado.

Efecto secundario deseable: los generadores de los property tests ya no necesitan
acotarse «a un rango realista para que el redondeo no colapse el subtotal». Ahora se
derivan directamente de las invariantes de la especificación. Cuando un test necesita
restringir sus entradas por debajo de lo que la spec permite, casi siempre es señal de
que la spec está incompleta, no de que el test necesite ayuda.

### 2.9 Spec drift observado en vivo

Vale registrarlo porque es exactamente el fenómeno que el Anexo E del taller define
como *spec drift*, y ocurrió durante el ejercicio sin que nadie lo provocara a propósito.

`tasks.md` se generó **después** de corregir `requirements.md` y `design.md`, y recogió
bien casi todo: RFC 7807, `NivelUrgencia`, `CatalogoSemillaConfig`,
`ComparadorPorNombre` con `Collator`, `NormalPricingStrategy`,
`RECARGO_URGENCIA_PORCENTAJE`, `ValidacionCotizacionException`, y sin rastro del 503 ni
del handler viejo. Pero **no recogió el endurecimiento de cotas**: en cinco viñetas
seguía diciendo `factorComplejidad > 0` y `precioBase > 0`, las cotas de antes de la
última edición.

Si esas tareas se hubieran ejecutado tal cual, los constructores se habrían
implementado con `> 0` y el property test del invariante monetario habría salido rojo,
con la causa a tres artefactos de distancia del síntoma.

Dos conclusiones para el reporte:

1. **La propagación aguas abajo no es automática.** Cambiar `requirements.md` no
   actualiza `design.md`, y cambiar `design.md` no actualiza `tasks.md`. Cada edición
   de un artefacto obliga a revisar o regenerar los que dependen de él.
2. **La deriva es parcial y por eso es peligrosa.** No falló todo, falló un detalle
   numérico en cinco viñetas dentro de un documento de 528 líneas que por lo demás
   estaba correcto. Una revisión por lectura no lo encuentra; un cruce automatizado sí.

Se corrigieron las cinco viñetas a mano. Antes de editar se verificó que
`tasks.meta.json` indexa el historial de ejecución por el **título** de cada tarea, no
por sus viñetas de detalle, así que el cambio no desincroniza el estado de las tareas
ya ejecutadas o en curso. Se confirmó después que no quedaron claves huérfanas.

### 2.10 Resultado

| Archivo | Antes | Después | Cambio |
|---|---|---|---|
| `requirements.md` | 114 líneas, 6 requisitos | 218 líneas, 7 requisitos, 44 criterios | Reescrito; se agregó Requirement 7 (catálogo semilla), trazabilidad y notas de alcance |
| `design.md` | 691 líneas, 11 properties | 982 líneas, 17 properties | Reescrito; 12 decisiones de diseño documentadas |
| `tasks.md` | 527 líneas | 528 líneas | 5 viñetas de detalle alineadas con las cotas nuevas |

Verificaciones automatizadas al cierre:

- Las **38 referencias** `Validates: Requirements X.Y` de `design.md` apuntan a
  criterios que existen en `requirements.md`: **cero referencias rotas**.
- Los 6 criterios sin property (`4.4`, `6.9`, `7.1`, `7.2`, `7.3`, `7.7`) son
  estructurales o de valor fijo, no propiedades universales, y están cubiertos por
  unit tests e integration tests declarados en la estrategia de pruebas. Es una
  decisión, no un hueco.
- Los 7 registros del catálogo semilla cumplen las cotas nuevas (factores 1.0 a 1.5,
  precios 8.00 a 20.00).
- Cero residuos de las cotas viejas en los tres archivos.
- El código Java generado por Kiro respeta las cotas: `Calzado` valida
  `compareTo(new BigDecimal("0.5")) < 0` y `scale() > 2`; `TipoReparacion` valida
  `compareTo(new BigDecimal("0.01")) < 0` y `scale() > 2`.

Respaldos de los tres archivos en su estado previo, por si se quiere mostrar el
antes/después en la presentación: `requirements.md.bak`, `design.md.bak` y
`tasks.md.bak` en el directorio de trabajo temporal de la sesión.
