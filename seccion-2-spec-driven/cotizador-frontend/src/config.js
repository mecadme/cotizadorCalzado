/**
 * CONFIG — Única fuente de verdad para datos y constantes de la aplicación.
 * Este módulo se extrae durante el desarrollo para pruebas unitarias y luego
 * se incrusta en el <script> de index.html como artefacto final.
 *
 * Requirements: 1.1, 2.1, 3.1, 3.4
 */
const CONFIG = {
  // Porcentaje de recargo por urgencia (entero 1–100). Req 3.1, 3.4
  recargo_urgencia: 20,

  // Catálogo de tipos de calzado (≥4 entradas). Req 1.1
  tipos_calzado: [
    { id: 'zapato',   label: 'Zapato'   },
    { id: 'bota',     label: 'Bota'     },
    { id: 'sandalia', label: 'Sandalia' },
    { id: 'tenis',    label: 'Tenis'    },
  ],

  // Catálogo de reparaciones (5–20 entradas con id, label y precio). Req 2.1
  reparaciones: [
    { id: 'suela',    label: 'Cambio de suela', precio: 250.00 },
    { id: 'costura',  label: 'Costura',          precio: 120.00 },
    { id: 'lustrado', label: 'Lustrado',         precio:  80.00 },
    { id: 'pegado',   label: 'Pegado',           precio:  90.00 },
    { id: 'tacon',    label: 'Cambio de tacón',  precio: 180.00 },
  ],
};

export { CONFIG };
