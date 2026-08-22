# Requirements Document

## Introduction

El **Cotizador de Calzado** es una aplicación web de una sola página (`index.html`) que permite a los usuarios obtener una cotización de reparación de calzado consultando una API REST. Al cargar, la aplicación obtiene el catálogo de tipos de calzado y de reparaciones desde el backend. El usuario selecciona un tipo de calzado, elige uno o más tipos de reparación, opcionalmente indica si el servicio es urgente y solicita la cotización. El backend devuelve el subtotal, el recargo por urgencia, el total y el tiempo estimado de entrega; el frontend los muestra tal como los recibe, sin realizar ningún cálculo propio.

## Glossary

- **Cotizador**: La aplicación web descrita en este documento.
- **API**: El backend REST accesible en `http://localhost:8080/api`.
- **Catalogo**: Conjunto de `Tipos_de_Calzado` y `Tipos_de_Reparacion` obtenidos de la API al iniciar.
- **Tipo_de_Calzado**: Objeto devuelto por `GET /api/tipos-calzado` con campos `id`, `nombre` y `factorComplejidad`.
- **Tipo_de_Reparacion**: Objeto devuelto por `GET /api/tipos-reparacion` con campos `id`, `nombre`, `precioBase` y `tiempoEstimadoDias`.
- **Urgencia**: Campo booleano `urgente` incluido en el request de cotización; indica que el servicio se requiere en un plazo reducido.
- **Boton_Cotizar**: Elemento interactivo que dispara el `POST /api/cotizaciones`.
- **Panel_Resultado**: Sección de la pantalla que muestra los valores devueltos por el backend: `subtotal`, `recargoUrgencia`, `total` y `tiempoEstimadoDias`.
- **ProblemDetails**: Objeto de error que devuelve la API en respuestas 400, conforme a RFC 7807, con campos `type`, `title`, `status`, `detail` e `instance`.
- **UI-E1**: Estado "Cargando catálogo" — controles deshabilitados mientras se resuelven los GET iniciales.
- **UI-E2**: Estado "Lista para cotizar" — catálogo cargado, usuario puede interactuar con los controles.
- **UI-E3**: Estado "Cotizando" — POST en curso, botón deshabilitado hasta recibir respuesta.
- **UI-E4**: Estado "Resultado mostrado" — Panel_Resultado visible con los datos de la última cotización.
- **UI-E5**: Estado "Error" — mensaje de error visible, selección del usuario intacta.

---

## Requirements

### Requirement 1: Carga inicial del catálogo

**User Story:** Como usuario, quiero que la aplicación cargue automáticamente las opciones de calzado y reparación al abrir la página, para poder hacer una selección sin pasos adicionales.

#### Acceptance Criteria

1. WHEN el Cotizador termina de inicializar en el navegador, THE Cotizador SHALL realizar simultáneamente una petición `GET /api/tipos-calzado` y una petición `GET /api/tipos-reparacion`.
2. WHILE las peticiones de carga del Catalogo están en curso (UI-E1), THE Cotizador SHALL mantener deshabilitados el selector de Tipo_de_Calzado, los checkboxes de Tipo_de_Reparacion y el Boton_Cotizar.
3. WHILE las peticiones de carga del Catalogo están en curso (UI-E1), THE Cotizador SHALL mostrar un indicador de carga visible en la interfaz.
4. WHEN ambas peticiones de carga del Catalogo se resuelven exitosamente con datos válidos, THE Cotizador SHALL transicionar al estado UI-E2 y habilitar los controles de selección; si las peticiones completan sin datos válidos, los controles permanecen deshabilitados.
5. IF cualquiera de las peticiones de carga del Catalogo falla, THEN THE Cotizador SHALL mostrar un mensaje de error indicando que no fue posible cargar el catálogo y mantener los controles deshabilitados.

---

### Requirement 2: Selector de tipo de calzado

**User Story:** Como usuario, quiero seleccionar el tipo de calzado que deseo reparar desde una lista cargada dinámicamente, para que la cotización refleje el contexto correcto del servicio.

#### Acceptance Criteria

1. WHEN el Cotizador inicia la transición al estado UI-E2, THE Cotizador SHALL poblar el selector de Tipo_de_Calzado con una opción por cada elemento devuelto por `GET /api/tipos-calzado`, mostrando el campo `nombre` como texto visible, antes de completar la transición al estado UI-E2.
2. THE Cotizador SHALL mostrar una opción de marcador de posición no seleccionable ("Selecciona un tipo") como valor inicial del selector antes de cualquier interacción del usuario.
3. WHEN el usuario selecciona un Tipo_de_Calzado, THE Cotizador SHALL mantener la selección visible en el control hasta que el usuario la cambie o la página se recargue.

---

### Requirement 3: Lista de reparaciones

**User Story:** Como usuario, quiero elegir uno o más tipos de reparación mediante checkboxes, para que la cotización incluya exactamente los servicios que necesito.

#### Acceptance Criteria

1. WHEN el Cotizador transiciona al estado UI-E2, THE Cotizador SHALL mostrar un checkbox por cada Tipo_de_Reparacion devuelto por `GET /api/tipos-reparacion`, con su campo `nombre` como etiqueta y su campo `precioBase` formateado con exactamente dos decimales y símbolo de moneda visible.
2. WHEN el usuario activa un checkbox de Tipo_de_Reparacion, THE Cotizador SHALL marcar visualmente ese checkbox como seleccionado e incluir el `id` del Tipo_de_Reparacion en el array `tipoReparacionIds` del siguiente request de cotización.
3. WHEN el usuario desactiva un checkbox de Tipo_de_Reparacion previamente seleccionado, THE Cotizador SHALL desmarcar visualmente ese checkbox y excluir su `id` del array `tipoReparacionIds`.
4. THE Cotizador SHALL permitir seleccionar cualquier combinación de Tipos_de_Reparacion simultáneamente, sin restricción de orden de selección.

---

### Requirement 4: Indicador de urgencia

**User Story:** Como usuario, quiero indicar si el servicio es urgente, para que la cotización incluya el recargo correspondiente calculado por el backend.

#### Acceptance Criteria

1. THE Cotizador SHALL presentar un único checkbox de Urgencia con una etiqueta descriptiva que indique que el servicio es urgente.
2. WHEN el usuario activa el checkbox de Urgencia, THE Cotizador SHALL establecer el valor del campo `urgente` a `true` en el próximo request `POST /api/cotizaciones`.
3. WHEN el usuario desactiva el checkbox de Urgencia, THE Cotizador SHALL establecer el valor del campo `urgente` a `false` en el próximo request `POST /api/cotizaciones`.
4. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el checkbox de Urgencia en estado desmarcado, con `urgente` igual a `false` por defecto.

---

### Requirement 5: Habilitación del botón Cotizar

**User Story:** Como usuario, quiero que el botón "Cotizar" esté habilitado solo cuando la selección es válida, para evitar enviar solicitudes incompletas al servidor.

#### Acceptance Criteria

1. WHILE el Cotizador se encuentra en estado UI-E1, THE Boton_Cotizar SHALL permanecer deshabilitado e inoperable.
2. WHILE no hay ningún Tipo_de_Calzado seleccionado o no hay al menos un Tipo_de_Reparacion marcado, THE Boton_Cotizar SHALL permanecer deshabilitado e inoperable, evaluando únicamente el estado estático de la selección actual sin considerar el historial de selecciones previas.
3. WHEN el usuario selecciona un Tipo_de_Calzado y al menos un Tipo_de_Reparacion, THE Boton_Cotizar SHALL habilitarse y volverse operable independientemente de otras condiciones del sistema como conectividad de red.
4. WHEN el usuario deselecciona todos los Tipos_de_Reparacion o elimina la selección de Tipo_de_Calzado, THE Boton_Cotizar SHALL volver al estado deshabilitado.
5. WHILE el Boton_Cotizar está deshabilitado, THE Cotizador SHALL aplicar un estilo visual que indique inoperabilidad (opacidad reducida y cursor `not-allowed`).
6. WHILE el Cotizador se encuentra en estado UI-E3, THE Boton_Cotizar SHALL permanecer deshabilitado hasta recibir la respuesta del servidor.

---

### Requirement 6: Envío de cotización y visualización del resultado

**User Story:** Como usuario, quiero ver el desglose de la cotización devuelto por el servidor al presionar "Cotizar", para conocer el costo y el tiempo estimado de la reparación.

#### Acceptance Criteria

1. WHEN el usuario activa el Boton_Cotizar, THE Cotizador SHALL enviar un `POST /api/cotizaciones` con un body JSON que contenga exactamente los campos `tipoCalzadoId` (string), `tipoReparacionIds` (array de strings) y `urgente` (boolean).
2. WHILE el request `POST /api/cotizaciones` está en curso (UI-E3), THE Cotizador SHALL mostrar un indicador de carga en el Boton_Cotizar o en la interfaz y mantener el botón deshabilitado; el botón permanecerá deshabilitado también ante otras condiciones de bloqueo fuera de UI-E3.
3. WHEN el servidor responde con código 201, THE Cotizador SHALL transicionar al estado UI-E4 y mostrar en el Panel_Resultado los valores exactos recibidos: `subtotal`, `recargoUrgencia`, `total` (todos en formato numérico con dos decimales y símbolo de moneda `moneda`) y `tiempoEstimadoDias` (en días enteros); IF la transición al estado UI-E4 o la visualización del Panel_Resultado fallan, THEN THE Cotizador SHALL tratar el evento como un error completo y transicionar al estado UI-E5.
4. THE Cotizador SHALL mostrar los valores de `subtotal`, `recargoUrgencia`, `total` y `tiempoEstimadoDias` tal como los devuelve el backend, sin aplicar ningún cálculo o transformación numérica adicional.
5. WHILE el Panel_Resultado no ha sido mostrado por primera vez en la sesión, THE Cotizador SHALL mantener la sección del Panel_Resultado oculta.

---

### Requirement 7: Manejo de errores

**User Story:** Como usuario, quiero ver mensajes de error claros cuando la solicitud falla, para entender qué ocurrió y poder corregir mi selección si es necesario.

#### Acceptance Criteria

1. IF el servidor responde al `POST /api/cotizaciones` con código 400, THEN THE Cotizador SHALL transicionar al estado UI-E5 y mostrar el valor del campo `detail` del objeto ProblemDetails recibido como mensaje de error en línea, sin usar un modal.
2. IF el servidor responde al `POST /api/cotizaciones` con código 400, THEN THE Cotizador SHALL conservar intacta la selección de Tipo_de_Calzado, Tipos_de_Reparacion y Urgencia que tenía el usuario al momento del error.
3. IF ocurre un error de red durante el `POST /api/cotizaciones` y el servidor no responde, THEN THE Cotizador SHALL mostrar un mensaje genérico indicando que no fue posible completar la solicitud; IF el servidor responde eventualmente con código 400 tras una reconexión, THEN THE Cotizador SHALL mostrar el mensaje `detail` del ProblemDetails recibido.
4. IF el servidor responde con un código de error distinto de 400, THEN THE Cotizador SHALL mostrar un mensaje genérico de error de servidor sin exponer detalles técnicos internos.
5. WHEN el usuario modifica cualquier selección (Tipo_de_Calzado, Tipo_de_Reparacion o Urgencia) mientras la pantalla se encuentra en el estado UI-E5, THE Cotizador SHALL ocultar el mensaje de error activo de inmediato.

---

### Requirement 8: Reset del panel de resultado al modificar la selección

**User Story:** Como usuario, quiero que el panel de resultado se oculte al cambiar mis opciones, para no confundir un resultado anterior con la selección actual.

#### Acceptance Criteria

1. WHEN el usuario inicia la modificación de la selección de Tipo_de_Calzado mientras la pantalla se encuentra en el estado UI-E4, THE Cotizador SHALL ocultar el Panel_Resultado de inmediato, sin esperar a que el usuario complete el cambio, hasta que vuelva a pulsar el Boton_Cotizar.
2. WHEN el usuario inicia la activación o desactivación de cualquier checkbox de Tipo_de_Reparacion mientras la pantalla se encuentra en el estado UI-E4, THE Cotizador SHALL ocultar el Panel_Resultado de inmediato, sin esperar a que el usuario complete el cambio, hasta que vuelva a pulsar el Boton_Cotizar.
3. WHEN el usuario inicia la activación o desactivación del checkbox de Urgencia mientras la pantalla se encuentra en el estado UI-E4, THE Cotizador SHALL ocultar el Panel_Resultado de inmediato, sin esperar a que el usuario complete el cambio, hasta que vuelva a pulsar el Boton_Cotizar.

---

### Requirement 9: Accesibilidad

**User Story:** Como usuario con necesidades de accesibilidad, quiero que los controles estén correctamente etiquetados y que los cambios dinámicos sean anunciados, para poder utilizar la aplicación con tecnologías asistivas.

#### Acceptance Criteria

1. THE Cotizador SHALL asociar cada control de formulario (selector de Tipo_de_Calzado y cada checkbox de Tipo_de_Reparacion y Urgencia) con un elemento `<label>` vinculado mediante el atributo `for`/`id`.
2. THE Boton_Cotizar SHALL contener texto visible y no vacío que identifique la acción, sin depender únicamente de un ícono gráfico.
3. WHILE el Boton_Cotizar está deshabilitado, THE Cotizador SHALL exponer el atributo `disabled` en el elemento HTML correspondiente para que las tecnologías asistivas lo detecten correctamente.
4. THE Cotizador SHALL incluir desde la carga inicial de la página un elemento con atributo `aria-live="polite"` que envuelva el Panel_Resultado, de modo que esté presente en el DOM antes de cualquier actualización dinámica.
5. WHEN el Panel_Resultado se hace visible o su contenido es actualizado, THE Cotizador SHALL anunciar el cambio a través del elemento `aria-live="polite"` previamente configurado en el DOM, incluso si el contenido mostrado es idéntico al de una visualización anterior.

---

### Requirement 10: Estado inicial limpio

**User Story:** Como usuario, quiero que la aplicación inicie en un estado limpio y predecible al cargar la página, para que no haya datos residuales de interacciones anteriores.

#### Acceptance Criteria

1. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el selector de Tipo_de_Calzado con la opción de marcador de posición activa y sin ningún tipo de calzado preseleccionado, sin recuperar selecciones de sesiones anteriores.
2. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar todos los checkboxes de Tipo_de_Reparacion en estado desmarcado.
3. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el checkbox de Urgencia en estado desmarcado.
4. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el Boton_Cotizar en estado deshabilitado.
5. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL mantener el Panel_Resultado oculto, sin ningún valor de cotización visible.
