package com.tallerdae.cotizador.application.port.out;

import com.tallerdae.cotizador.domain.model.Calzado;

import java.util.List;
import java.util.Optional;

public interface CalzadoRepositoryPort {

    List<Calzado> findAll();

    Optional<Calzado> findById(String id);
}
