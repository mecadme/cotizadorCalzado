package com.tallerdae.cotizador.infrastructure.adapter.out.persistence;

import com.tallerdae.cotizador.application.port.out.CotizacionRepositoryPort;
import com.tallerdae.cotizador.domain.model.Cotizacion;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryCotizacionRepositoryAdapter implements CotizacionRepositoryPort {

    private final ConcurrentHashMap<String, Cotizacion> almacen = new ConcurrentHashMap<>();

    @Override
    public Cotizacion save(Cotizacion cotizacion) {
        almacen.put(cotizacion.getId(), cotizacion);
        return cotizacion;
    }
}
