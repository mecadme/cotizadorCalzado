package com.tallerdae.cotizador.application.port.out;

import com.tallerdae.cotizador.domain.model.TipoReparacion;

import java.util.Collection;
import java.util.List;
import java.util.Map;

public interface ReparacionRepositoryPort {

    List<TipoReparacion> findAll();

    /**
     * Devuelve un índice {id → TipoReparacion} para los ids que existan en el repositorio.
     * Los ids que no existan simplemente no aparecen en el mapa.
     * El servicio usa el mapa para: (a) reconstruir la lista con repeticiones y
     * (b) detectar exactamente qué ids faltaron.
     */
    Map<String, TipoReparacion> findAllById(Collection<String> ids);
}
