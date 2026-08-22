# Arquitectura Frontend

Aplicación Web Vanilla (HTML5, CSS3, JavaScript ES Modules) sin framework ni bundler.

## Estructura de archivos

```
cotizador-frontend/
├── index.html          → Estructura y layout de la UI. Expone IDs estables. Sin lógica.
├── css/
│   └── estilos.css     → Estilos visuales. Sin lógica.
└── js/
    ├── api.js          → Único módulo que conoce las URLs del backend. Hace fetch y
    │                     traduce respuestas HTTP a objetos JavaScript simples.
    ├── state.js        → Mantiene en memoria el estado de la aplicación (catálogo cargado,
    │                     selección actual del usuario, última cotización recibida).
    └── app.js          → Escucha eventos del DOM, coordina state.js y api.js, y decide
                          qué volver a pintar en pantalla.
```

## Regla de dependencia única

`state.js` y `api.js` no se conocen entre sí ni conocen el DOM. Toda coordinación pasa por `app.js`.

| Archivo | Responsabilidad | Puede depender de |
|---|---|---|
| `index.html` + `css/estilos.css` | Estructura y estilo visual. Expone IDs estables. No contiene lógica. | Nada |
| `js/state.js` | Mantiene en memoria el estado: catálogo cargado, selección actual, última cotización. No toca el DOM ni hace fetch. | Nada |
| `js/api.js` | Único módulo que conoce las URLs del backend. Hace fetch y traduce respuestas HTTP a objetos JS simples. No conoce el DOM ni el estado. | Nada |
| `js/app.js` | Escucha eventos del DOM, coordina state.js y api.js, decide qué renderizar. | `state.js` y `api.js` |

Esta separación evita que una función de renderizado termine haciendo fetch directamente, o que `api.js` manipule elementos del HTML.

## Pantalla única

No hay navegación entre pantallas ni rutas. Todo ocurre en `index.html`. No se agregan rutas, frameworks de routing ni pantallas adicionales.
