package com.tallerdae.cotizador.infrastructure.adapter.out.persistence;

import com.tallerdae.cotizador.application.port.out.ReparacionRepositoryPort;
import com.tallerdae.cotizador.domain.model.TipoReparacion;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class InMemoryReparacionRepositoryAdapter implements ReparacionRepositoryPort {

    private final Map<String, TipoReparacion> mapa;

    public InMemoryReparacionRepositoryAdapter(List<TipoReparacion> reparacionesSemilla) {
        Map<String, TipoReparacion> mapaTemp = new HashMap<>();
        for (TipoReparacion reparacion : reparacionesSemilla) {
            mapaTemp.put(reparacion.getId(), reparacion);
        }
        this.mapa = Map.copyOf(mapaTemp);
    }

    @Override
    public List<TipoReparacion> findAll() {
        return new ArrayList<>(mapa.values());
    }

    @Override
    public Map<String, TipoReparacion> findAllById(Collection<String> ids) {
        Map<String, TipoReparacion> resultado = new HashMap<>();
        for (String id : ids) {
            TipoReparacion reparacion = mapa.get(id);
            if (reparacion != null) {
                resultado.put(id, reparacion);
            }
        }
        return resultado;
    }
}
