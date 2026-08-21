package com.tallerdae.cotizador.application.port.in;

import com.tallerdae.cotizador.domain.model.Cotizacion;

public interface GenerarCotizacionUseCase {

    Cotizacion generarCotizacion(GenerarCotizacionCommand command);
}
