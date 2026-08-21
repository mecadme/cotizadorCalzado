package com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto;

import java.math.BigDecimal;

public record TipoReparacionResponse(
        String id,
        String nombre,
        BigDecimal precioBase,
        int tiempoEstimadoDias
) {}
