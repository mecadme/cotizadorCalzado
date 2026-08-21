package com.tallerdae.cotizador.domain.exception;

public class SinReparacionesSeleccionadasException extends RuntimeException {

    public SinReparacionesSeleccionadasException(String mensaje) {
        super(mensaje);
    }
}
