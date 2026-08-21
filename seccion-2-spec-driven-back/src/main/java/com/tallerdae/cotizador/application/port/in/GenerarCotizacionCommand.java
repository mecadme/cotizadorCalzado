package com.tallerdae.cotizador.application.port.in;

import java.util.List;

public record GenerarCotizacionCommand(
        String tipoCalzadoId,
        List<String> tipoReparacionIds,
        Boolean urgente
) {}
