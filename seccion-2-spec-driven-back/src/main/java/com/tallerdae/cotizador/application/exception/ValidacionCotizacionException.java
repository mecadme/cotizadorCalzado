package com.tallerdae.cotizador.application.exception;

import java.util.List;

/**
 * Excepción lanzada cuando la solicitud de cotización contiene una o más
 * violaciones de validación. La lista de {@link ViolacionCampo} está en orden
 * canónico (definido por la precedencia de {@link TipoErrorCotizacion}) y nunca
 * está vacía.
 */
public class ValidacionCotizacionException extends RuntimeException {

    private final List<ViolacionCampo> violaciones;

    /**
     * @param violaciones lista no vacía de violaciones en orden canónico; nunca {@code null}
     */
    public ValidacionCotizacionException(List<ViolacionCampo> violaciones) {
        super("Validación fallida con " + violaciones.size() + " violación(es)");
        if (violaciones == null || violaciones.isEmpty()) {
            throw new IllegalArgumentException("La lista de violaciones no puede ser nula ni vacía");
        }
        this.violaciones = List.copyOf(violaciones);
    }

    public List<ViolacionCampo> violaciones() {
        return violaciones;
    }
}
