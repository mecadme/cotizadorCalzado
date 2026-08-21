package com.tallerdae.cotizador.application.port.in;

import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.TipoReparacion;

import java.util.List;

public interface ConsultarCatalogoUseCase {

    List<Calzado> consultarCalzados();

    List<TipoReparacion> consultarReparaciones();
}
