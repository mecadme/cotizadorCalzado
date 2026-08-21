package com.tallerdae.cotizador.infrastructure.adapter.in.rest;

import com.tallerdae.cotizador.application.port.in.ConsultarCatalogoUseCase;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.CalzadoResponse;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.TipoReparacionResponse;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper.CatalogoMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controlador REST para el catálogo de calzados y tipos de reparación.
 * El servicio ya entrega los datos ordenados; el controlador solo mapea y responde.
 * Requirements: 1.1, 1.3, 2.1, 2.3
 */
@RestController
@RequestMapping("/api")
public class CatalogoController {

    private final ConsultarCatalogoUseCase consultarCatalogoUseCase;

    public CatalogoController(ConsultarCatalogoUseCase consultarCatalogoUseCase) {
        this.consultarCatalogoUseCase = consultarCatalogoUseCase;
    }

    @GetMapping("/tipos-calzado")
    public List<CalzadoResponse> getTiposCalzado() {
        return consultarCatalogoUseCase.consultarCalzados()
                .stream()
                .map(CatalogoMapper::toResponse)
                .toList();
    }

    @GetMapping("/tipos-reparacion")
    public List<TipoReparacionResponse> getTiposReparacion() {
        return consultarCatalogoUseCase.consultarReparaciones()
                .stream()
                .map(CatalogoMapper::toResponse)
                .toList();
    }
}
