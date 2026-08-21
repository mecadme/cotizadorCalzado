package com.tallerdae.cotizador.infrastructure.adapter.out.persistence;

import com.tallerdae.cotizador.application.port.out.CalzadoRepositoryPort;
import com.tallerdae.cotizador.domain.model.Calzado;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class InMemoryCalzadoRepositoryAdapter implements CalzadoRepositoryPort {

    private final Map<String, Calzado> mapa;

    public InMemoryCalzadoRepositoryAdapter(List<Calzado> calzadosSemilla) {
        this.mapa = Map.copyOf(
            calzadosSemilla.stream()
                .collect(Collectors.toMap(Calzado::getId, c -> c))
        );
    }

    @Override
    public List<Calzado> findAll() {
        return new ArrayList<>(mapa.values());
    }

    @Override
    public Optional<Calzado> findById(String id) {
        return Optional.ofNullable(mapa.get(id));
    }
}
