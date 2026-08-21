package com.tallerdae.cotizador.application.exception;

import java.util.List;

/**
 * Representa una violación de validación asociada a un campo específico de la solicitud.
 *
 * @param tipo            categoría del error (define precedencia en {@link ValidacionCotizacionException})
 * @param campo           nombre del campo que originó la violación
 * @param valoresInvalidos valores que no pudieron resolverse (p. ej. ids desconocidos)
 * @param detalle         descripción legible del problema
 */
public record ViolacionCampo(
        TipoErrorCotizacion tipo,
        String campo,
        List<String> valoresInvalidos,
        String detalle) {
}
