package com.tallerdae.cotizador.domain.model;

public enum NivelUrgencia {

    NORMAL,
    URGENTE;

    /**
     * Convierte un flag booleano en nivel de urgencia.
     * {@code true} → {@code URGENTE}; {@code false}, {@code null} o ausente → {@code NORMAL}.
     */
    public static NivelUrgencia desdeFlag(Boolean urgente) {
        return Boolean.TRUE.equals(urgente) ? URGENTE : NORMAL;
    }
}
