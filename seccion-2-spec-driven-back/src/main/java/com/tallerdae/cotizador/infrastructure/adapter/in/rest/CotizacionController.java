package com.tallerdae.cotizador.infrastructure.adapter.in.rest;

import com.tallerdae.cotizador.application.port.in.GenerarCotizacionCommand;
import com.tallerdae.cotizador.application.port.in.GenerarCotizacionUseCase;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.CotizacionRequest;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.dto.CotizacionResponse;
import com.tallerdae.cotizador.infrastructure.adapter.in.rest.mapper.CotizacionMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Adaptador REST de entrada para la generación de cotizaciones.
 *
 * <p>Recibe un {@link CotizacionRequest}, construye el comando de aplicación,
 * delega en {@link GenerarCotizacionUseCase} y responde con 201 + {@link CotizacionResponse}.
 *
 * <p>Requirements: 3.5, 3.6, 3.7
 */
@RestController
@RequestMapping("/api")
public class CotizacionController {

    private final GenerarCotizacionUseCase generarCotizacionUseCase;

    public CotizacionController(GenerarCotizacionUseCase generarCotizacionUseCase) {
        this.generarCotizacionUseCase = generarCotizacionUseCase;
    }

    /**
     * {@code POST /api/cotizaciones}
     *
     * <p>Deserializa el body como {@link CotizacionRequest}, construye un
     * {@link GenerarCotizacionCommand} con los mismos datos, delega en el caso
     * de uso, mapea el agregado resultado a {@link CotizacionResponse} y responde
     * con HTTP 201 Created.
     *
     * @param request body de la petición; campos opcionales son {@code null} si
     *                no se envían
     * @return DTO con los montos, tiempo e identificador de la cotización generada
     */
    @PostMapping("/cotizaciones")
    @ResponseStatus(HttpStatus.CREATED)
    public CotizacionResponse crearCotizacion(@RequestBody CotizacionRequest request) {
        var command = new GenerarCotizacionCommand(
                request.tipoCalzadoId(),
                request.tipoReparacionIds(),
                request.urgente()
        );
        var cotizacion = generarCotizacionUseCase.generarCotizacion(command);
        return CotizacionMapper.toResponse(cotizacion);
    }
}
