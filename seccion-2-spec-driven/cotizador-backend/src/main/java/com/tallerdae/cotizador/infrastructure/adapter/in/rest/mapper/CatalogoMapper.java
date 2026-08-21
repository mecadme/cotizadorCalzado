package com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper;

import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.TipoReparacion;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.CalzadoResponse;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.TipoReparacionResponse;

/**
 * Mapper estático de dominio → DTO para el catálogo.
 * Sin lógica de negocio; solo traslada campos.
 * Requirements: 1.1, 2.1
 */
public final class CatalogoMapper {

    private CatalogoMapper() {}

    public static CalzadoResponse toResponse(Calzado calzado) {
        return new CalzadoResponse(
                calzado.getId(),
                calzado.getNombre(),
                calzado.getFactorComplejidad()
        );
    }

    public static TipoReparacionResponse toResponse(TipoReparacion reparacion) {
        return new TipoReparacionResponse(
                reparacion.getId(),
                reparacion.getNombre(),
                reparacion.getPrecioBase(),
                reparacion.getTiempoEstimadoDias()
        );
    }
}
