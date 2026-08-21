package com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto;

import java.math.BigDecimal;

/**
 * DTO de salida con el resultado de una cotización.
 * {@code fechaCreacion} se serializa como cadena ISO 8601 UTC.
 */
public record CotizacionResponse(
        String id,
        BigDecimal subtotal,
        BigDecimal recargoUrgencia,
        BigDecimal total,
        String moneda,
        int tiempoEstimadoDias,
        String fechaCreacion
) {}
