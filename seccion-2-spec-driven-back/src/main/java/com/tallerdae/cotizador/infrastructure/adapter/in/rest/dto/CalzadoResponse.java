package com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto;

import java.math.BigDecimal;

public record CalzadoResponse(
        String id,
        String nombre,
        BigDecimal factorComplejidad
) {}
