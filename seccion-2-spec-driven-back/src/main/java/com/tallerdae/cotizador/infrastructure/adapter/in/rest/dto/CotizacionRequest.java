package com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto;

import java.util.List;

/**
 * DTO de entrada para generar una cotización.
 * Sin anotaciones de Bean Validation — la validación es responsabilidad del servicio de aplicación.
 */
public record CotizacionRequest(
        String tipoCalzadoId,
        List<String> tipoReparacionIds,
        Boolean urgente
) {}
