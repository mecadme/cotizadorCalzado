/**
 * calcEngine — Lógica de dominio pura para el Cotizador de Calzado.
 *
 * Este módulo NO accede al DOM. Recibe datos y devuelve valores, lo que
 * permite pruebas unitarias y de propiedades sin necesidad de JSDOM.
 *
 * Requirements: 2.2, 2.3, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4
 */

const calcEngine = {
  /**
   * Suma los precios base de las reparaciones seleccionadas.
   *
   * @param {Array<{id: string, label: string, precio: number}>} reparaciones
   *   Listado completo de reparaciones del catálogo.
   * @param {Set<string>} seleccionados
   *   Conjunto de IDs de reparaciones activas.
   * @returns {number} Subtotal (>= 0). Retorna 0 si el Set está vacío o es nulo.
   *
   * Requirements: 2.2, 2.3, 5.1
   */
  calcularSubtotal(reparaciones, seleccionados) {
    if (!seleccionados || seleccionados.size === 0) {
      return 0;
    }
    return reparaciones
      .filter(function(r) { return seleccionados.has(r.id); })
      .reduce(function(acc, r) { return acc + r.precio; }, 0);
  },

  /**
   * Calcula el total aplicando o no el recargo de urgencia.
   *
   * @param {number}  subtotal     Suma de precios base de las reparaciones seleccionadas.
   * @param {boolean} urgente      Indica si el servicio es urgente.
   * @param {number}  recargoPorc  Porcentaje entero de recargo (1 a 100).
   * @returns {number} subtotal * (1 + recargoPorc / 100) si urgente; subtotal en caso contrario.
   *
   * Requirements: 3.2, 3.3, 5.2, 5.3
   */
  calcularTotal(subtotal, urgente, recargoPorc) {
    if (urgente) {
      return subtotal * (1 + recargoPorc / 100);
    }
    return subtotal;
  },

  /**
   * Formatea un número como string con exactamente 2 decimales.
   *
   * @param {number} valor  Valor monetario a formatear.
   * @returns {string} p. ej. "250.00", "0.00", "1234.50"
   *
   * Requirements: 2.1, 5.4
   */
  formatearMoneda(valor) {
    return Number(valor).toFixed(2);
  },
};

export { calcEngine };
