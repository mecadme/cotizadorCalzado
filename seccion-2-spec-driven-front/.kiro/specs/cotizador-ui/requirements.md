# Requirements Document

## Introduction

El **Cotizador de Calzado** es una aplicación web de una sola página (`index.html`) que permite a los usuarios obtener una cotización instantánea para la reparación de calzado. El usuario selecciona el tipo de calzado, elige uno o más tipos de reparación, indica si requiere servicio urgente y solicita el desglose del costo total. La interfaz es completamente estática, sin dependencia de backend en tiempo real, y corre en el navegador sin necesidad de servidor de aplicaciones.

## Glossary

- **Cotizador**: La aplicación web descrita en este documento.
- **Tipo_de_Calzado**: Categoría del zapato a reparar (p. ej. "Deportivo", "Cuero formal", "Bota", "Sandalia").
- **Tipo_de_Reparacion**: Servicio de reparación seleccionable (p. ej. "Cambio de suela", "Costura", "Lustrado", "Pegado", "Cambio de tacón").
- **Urgencia**: Indicador booleano que señala que el servicio se requiere en un plazo reducido y aplica un recargo porcentual fijo.
- **Boton_Cotizar**: Elemento interactivo que dispara el cálculo y muestra el desglose.
- **Desglose**: Sección visible que lista cada reparación seleccionada con su precio unitario, el recargo de urgencia cuando aplica, y el total final.
- **Precio_Base**: Precio en pesos (MXN) de cada Tipo_de_Reparacion sin recargo de urgencia.
- **Recargo_Urgencia**: Porcentaje adicional que se suma al subtotal cuando la Urgencia está activa (valor fijo definido en la configuración de la aplicación).
- **Subtotal**: Suma de todos los Precio_Base de los Tipos_de_Reparacion seleccionados.
- **Total**: Subtotal más Recargo_Urgencia cuando corresponde.

---

## Requirements

### Requirement 1: Selector de tipo de calzado

**User Story:** Como usuario, quiero seleccionar el tipo de calzado que deseo reparar, para que la cotización refleje el contexto correcto del servicio.

#### Acceptance Criteria

1. THE Cotizador SHALL presentar un control de selección con exactamente cuatro o más opciones de Tipo_de_Calzado, donde las opciones incluyan al menos: zapato, bota, sandalia y tenis.
2. THE Cotizador SHALL mostrar una opción de marcador de posición no seleccionable ("Selecciona un tipo") como valor inicial del selector antes de cualquier interacción del usuario.
3. WHEN el usuario selecciona un Tipo_de_Calzado, THE Cotizador SHALL mantener la selección visible en el control hasta que el usuario la cambie o reinicie el formulario.
4. IF el usuario intenta continuar con la cotización sin haber seleccionado un Tipo_de_Calzado, THEN THE Cotizador SHALL mostrar un mensaje de error indicando que el tipo de calzado es obligatorio y bloqueará el avance al siguiente paso.

---

### Requirement 2: Selección de tipos de reparación

**User Story:** Como usuario, quiero elegir uno o más tipos de reparación mediante checkboxes, para que la cotización incluya exactamente los servicios que necesito.

#### Acceptance Criteria

1. THE Cotizador SHALL presentar un mínimo de cinco y un máximo de veinte opciones de Tipo_de_Reparacion, cada una representada por un checkbox con su etiqueta descriptiva de hasta 80 caracteres y su Precio_Base visible en formato numérico con dos decimales.
2. WHEN el usuario activa un checkbox de Tipo_de_Reparacion, THE Cotizador SHALL marcar visualmente ese checkbox como seleccionado e incluir su Precio_Base en el cálculo del total de la cotización.
3. WHEN el usuario desactiva un checkbox de Tipo_de_Reparacion previamente seleccionado, THE Cotizador SHALL desmarcar visualmente ese checkbox y excluir su Precio_Base del cálculo del total de la cotización.
4. THE Cotizador SHALL permitir seleccionar entre uno y veinte Tipos_de_Reparacion de forma simultánea, sin restricción de orden de selección.
5. IF el usuario intenta continuar al siguiente paso de la cotización sin haber seleccionado al menos un Tipo_de_Reparacion, THEN THE Cotizador SHALL deshabilitar la acción de avance y mostrar un mensaje indicando que se requiere seleccionar al menos un servicio.

---

### Requirement 3: Indicador de urgencia

**User Story:** Como usuario, quiero marcar si el servicio es urgente, para que la cotización incluya el recargo correspondiente.

#### Acceptance Criteria

1. THE Cotizador SHALL presentar un único checkbox de Urgencia con una etiqueta en formato "Urgente (+N%)" donde N es el valor entero de Recargo_Urgencia definido en la configuración de la aplicación.
2. WHEN el usuario activa el checkbox de Urgencia, THE Cotizador SHALL aplicar el Recargo_Urgencia al calcular el Total mediante la fórmula: Total = Subtotal × (1 + Recargo_Urgencia / 100), antes de que el usuario realice otra acción.
3. WHEN el usuario desactiva el checkbox de Urgencia, THE Cotizador SHALL calcular el Total sin Recargo_Urgencia, de modo que Total sea igual a Subtotal, antes de que el usuario realice otra acción.
4. THE Cotizador SHALL definir Recargo_Urgencia como un número entero entre 1 y 100, con un valor predeterminado de 20.
5. IF el valor de Recargo_Urgencia en la configuración está ausente o es inválido, THEN THE Cotizador SHALL deshabilitar el checkbox de Urgencia y mostrar un mensaje informativo al usuario.

---

### Requirement 4: Estado del botón Cotizar

**User Story:** Como usuario, quiero que el botón "Cotizar" esté habilitado solo cuando hay reparaciones seleccionadas, para evitar solicitar una cotización vacía.

#### Acceptance Criteria

1. WHILE ningún Tipo_de_Reparacion está seleccionado, THE Boton_Cotizar SHALL permanecer deshabilitado e inoperable.
2. WHEN el usuario selecciona al menos un Tipo_de_Reparacion, THE Boton_Cotizar SHALL habilitarse y volverse operable.
3. WHEN el usuario deselecciona todos los Tipos_de_Reparacion, THE Boton_Cotizar SHALL volver al estado deshabilitado.
4. WHILE el Boton_Cotizar está deshabilitado, THE Cotizador SHALL aplicar una opacidad de 40% o menor y un cursor de tipo "not-allowed" sobre el elemento del botón.
5. IF el usuario intenta activar el Boton_Cotizar mientras está deshabilitado (por ejemplo, mediante script o simulación de evento), THEN THE Cotizador SHALL ignorar la interacción sin producir efectos secundarios visibles ni iniciar ningún cálculo.

---

### Requirement 5: Cálculo y desglose del total

**User Story:** Como usuario, quiero ver un desglose detallado del costo al presionar "Cotizar", para entender de qué se compone el precio final.

#### Acceptance Criteria

1. WHEN el usuario activa el Boton_Cotizar, THE Cotizador SHALL calcular el Subtotal sumando los Precio_Base de cada Tipo_de_Reparacion seleccionado, donde el Subtotal resultante debe ser mayor o igual a 0.00.
2. WHEN el usuario activa el Boton_Cotizar y la Urgencia está activa, THE Cotizador SHALL calcular el Total aplicando el Recargo_Urgencia multiplicando el Subtotal por el factor definido para Recargo_Urgencia, resultando en un Total igual a Subtotal × (1 + factor_Recargo_Urgencia).
3. WHEN el usuario activa el Boton_Cotizar y la Urgencia está inactiva, THE Cotizador SHALL presentar el Subtotal como Total sin recargo adicional, de forma que Total sea numéricamente igual a Subtotal.
4. WHEN el usuario activa el Boton_Cotizar, THE Cotizador SHALL mostrar el Desglose con: la lista de Tipos_de_Reparacion seleccionados con su Precio_Base individual, el Subtotal, el monto del Recargo_Urgencia (0.00 si no aplica), y el Total final, donde todos los valores monetarios se expresan con exactamente 2 decimales.
5. IF el usuario activa el Boton_Cotizar sin haber seleccionado ningún Tipo_de_Reparacion, THEN THE Cotizador SHALL mostrar un mensaje de error indicando que se debe seleccionar al menos un Tipo_de_Reparacion, sin mostrar el Desglose.
6. WHILE el Desglose no ha sido solicitado por primera vez, THE Cotizador SHALL mantener la sección de Desglose oculta.
7. WHEN el usuario activa el Boton_Cotizar con al menos un Tipo_de_Reparacion seleccionado, THE Cotizador SHALL actualizar el Desglose reflejando únicamente los Tipos_de_Reparacion y valores correspondientes a la selección actual.

---

### Requirement 6: Actualización del desglose ante cambios

**User Story:** Como usuario, quiero que el desglose se actualice al presionar "Cotizar" tras modificar mis selecciones, para que el resultado siempre corresponda a la configuración actual.

#### Acceptance Criteria

1. WHEN el usuario modifica la selección de Tipos_de_Reparacion o el estado de Urgencia después de haber generado un Desglose previo, THE Cotizador SHALL marcar visualmente el Desglose existente como desactualizado mediante un indicador visible (por ejemplo, texto o ícono superpuesto) hasta que el usuario presione nuevamente el Boton_Cotizar.
2. WHEN el usuario activa el Boton_Cotizar tras una modificación, THE Cotizador SHALL reemplazar el contenido completo del Desglose anterior con el nuevo resultado calculado a partir de la configuración actual, eliminando el indicador de desactualizado.
3. IF el usuario activa el Boton_Cotizar y el cálculo del nuevo Desglose falla, THEN THE Cotizador SHALL conservar el Desglose anterior marcado como desactualizado y mostrar un mensaje de error indicando que no fue posible actualizar el resultado.

---

### Requirement 7: Diseño de una sola página

**User Story:** Como usuario, quiero acceder a toda la funcionalidad desde un único archivo HTML sin navegación adicional, para que la experiencia sea inmediata y sin fricción.

#### Acceptance Criteria

1. THE Cotizador SHALL estar contenido íntegramente en un único archivo `index.html`, incluyendo estilos y lógica.
2. THE Cotizador SHALL ser funcional sin requerir un servidor de aplicaciones; apertura directa en navegador mediante protocolo `file://` SHALL ser suficiente.
3. THE Cotizador SHALL presentar todos los controles (selector, checkboxes de reparación, checkbox de urgencia, botón y sección de desglose) en una única vista sin necesidad de desplazamiento vertical en pantallas de escritorio con resolución mínima de 1024×768 px.
4. THE Cotizador SHALL cargarse completamente en ≤3 segundos al abrirse mediante protocolo `file://` en un equipo de escritorio estándar, sin conexión a internet.
5. IF el navegador del usuario no soporta las APIs de HTML5 requeridas (p. ej. querySelector, addEventListener), THEN THE Cotizador SHALL mostrar un mensaje indicando que el navegador no es compatible y que se recomienda actualizar a una versión moderna.

---

### Requirement 8: Accesibilidad básica

**User Story:** Como usuario con necesidades de accesibilidad, quiero que los controles estén correctamente etiquetados, para poder utilizar la aplicación con tecnologías asistivas.

#### Acceptance Criteria

1. THE Cotizador SHALL asociar cada control de formulario (selector, checkboxes) con un elemento `<label>` vinculado mediante atributo `for`/`id`.
2. THE Boton_Cotizar SHALL contener texto no vacío y visible que identifique la acción del botón, sin depender únicamente de un ícono gráfico.
3. WHILE el Boton_Cotizar está deshabilitado, THE Cotizador SHALL exponer el atributo `disabled` en el elemento HTML correspondiente.
4. THE Cotizador SHALL incluir desde la carga inicial de la página un elemento con atributo `aria-live="polite"` que envuelva la sección de Desglose, de modo que esté presente en el DOM antes de cualquier actualización dinámica.
5. WHEN el Desglose se hace visible o es actualizado, THE Cotizador SHALL anunciar el cambio a través del elemento `aria-live="polite"` previamente configurado en el DOM.

---

### Requirement 9: Validación de estado inicial

**User Story:** Como usuario, quiero que la aplicación inicie en un estado limpio y consistente al cargar la página, para que no haya datos residuales de sesiones anteriores.

#### Acceptance Criteria

1. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar todos los checkboxes de Tipo_de_Reparacion en estado desmarcado.
2. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el checkbox de Urgencia en estado desmarcado.
3. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL presentar el Boton_Cotizar en estado deshabilitado, sin responder a interacciones del usuario.
4. WHEN el Cotizador se carga en el navegador, THE Cotizador SHALL mantener la sección de Desglose oculta, sin ningún valor de Precio_Estimado visible.
