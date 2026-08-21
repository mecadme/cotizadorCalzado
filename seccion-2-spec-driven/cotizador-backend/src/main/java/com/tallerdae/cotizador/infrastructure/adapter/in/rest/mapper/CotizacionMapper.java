package com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper;

import com.tallerdae.cotizador.domain.model.Cotizacion;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.CotizacionResponse;

import java.time.format.DateTimeFormatter;

/**
 * Mapper sin lógica de negocio: convierte un agregado {@link Cotizacion}
 * al DTO de salida {@link CotizacionResponse}.
 *
 * Requirements: 3.5, 3.7
 */
public final class CotizacionMapper {

    private CotizacionMapper() {
        // clase utilitaria — no instanciar
    }

    /**
     * Convierte una {@link Cotizacion} al record {@link CotizacionResponse}.
     *
     * <p>{@code fechaCreacion} se formatea como cadena ISO 8601 UTC usando
     * {@link DateTimeFormatter#ISO_INSTANT} sobre el instante ya truncado a
     * segundos que viene almacenado en el agregado (Req 3.7).
     *
     * @param cotizacion agregado raíz; no nulo
     * @return DTO de salida listo para serializar
     */
    public static CotizacionResponse toResponse(Cotizacion cotizacion) {
        return new CotizacionResponse(
                cotizacion.getId(),
                cotizacion.getSubtotal().getMonto(),
                cotizacion.getRecargoUrgencia().getMonto(),
                cotizacion.getTotal().getMonto(),
                cotizacion.getSubtotal().getMoneda(),
                cotizacion.getTiempoEstimadoDias(),
                DateTimeFormatter.ISO_INSTANT.format(cotizacion.getFechaCreacion())
        );
    }
}
