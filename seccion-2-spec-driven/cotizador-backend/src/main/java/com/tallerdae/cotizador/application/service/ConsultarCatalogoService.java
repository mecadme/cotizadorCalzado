package com.tallerdae.cotizador.application.service;

import com.tallerdae.cotizador.application.port.in.ConsultarCatalogoUseCase;
import com.tallerdae.cotizador.application.port.out.CalzadoRepositoryPort;
import com.tallerdae.cotizador.application.port.out.ReparacionRepositoryPort;
import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.TipoReparacion;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Servicio de aplicación que implementa {@link ConsultarCatalogoUseCase}.
 * Devuelve los catálogos de calzados y reparaciones ordenados por nombre
 * según las reglas de colación del español (Requirements 1.2, 1.3, 2.2, 2.3).
 *
 * <p>Lista vacía en el repositorio → lista vacía en la respuesta; nunca lanza
 * excepción por catálogo vacío (Requirements 1.4, 2.4).</p>
 */
@Service
public class ConsultarCatalogoService implements ConsultarCatalogoUseCase {

    private final CalzadoRepositoryPort calzadoRepository;
    private final ReparacionRepositoryPort reparacionRepository;

    public ConsultarCatalogoService(CalzadoRepositoryPort calzadoRepository,
                                    ReparacionRepositoryPort reparacionRepository) {
        this.calzadoRepository = calzadoRepository;
        this.reparacionRepository = reparacionRepository;
    }

    /**
     * Devuelve todos los calzados disponibles, ordenados por nombre de forma
     * ascendente e insensible a mayúsculas y acentos (OrdenPorNombre, Req 1.3).
     *
     * @return lista ordenada; vacía si el repositorio no tiene elementos (Req 1.4)
     */
    @Override
    public List<Calzado> consultarCalzados() {
        List<Calzado> calzados = new ArrayList<>(calzadoRepository.findAll());
        calzados.sort(ComparadorPorNombre.porNombreCalzado());
        return calzados;
    }

    /**
     * Devuelve todos los tipos de reparación disponibles, ordenados por nombre
     * de forma ascendente e insensible a mayúsculas y acentos (OrdenPorNombre, Req 2.3).
     *
     * @return lista ordenada; vacía si el repositorio no tiene elementos (Req 2.4)
     */
    @Override
    public List<TipoReparacion> consultarReparaciones() {
        List<TipoReparacion> reparaciones = new ArrayList<>(reparacionRepository.findAll());
        reparaciones.sort(ComparadorPorNombre.porNombreReparacion());
        return reparaciones;
    }
}
