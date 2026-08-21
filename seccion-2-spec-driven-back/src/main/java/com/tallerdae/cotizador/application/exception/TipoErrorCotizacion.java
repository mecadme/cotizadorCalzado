package com.tallerdae.cotizador.application.exception;

/**
 * Tipos de error para el cotizador. El orden de los valores define la precedencia
 * para elegir el {@code type} cuando concurren varias causas simultáneamente.
 */
public enum TipoErrorCotizacion {

    REPARACIONES_REQUERIDAS(
            "https://api.cotizador/errors/reparaciones-requeridas",
            "Se requiere al menos una reparación"),

    TIPO_CALZADO_NO_ENCONTRADO(
            "https://api.cotizador/errors/tipo-calzado-no-encontrado",
            "Tipo de calzado no encontrado"),

    TIPO_REPARACION_NO_ENCONTRADO(
            "https://api.cotizador/errors/tipo-reparacion-no-encontrado",
            "Tipo de reparación no encontrado"),

    SOLICITUD_MALFORMADA(
            "https://api.cotizador/errors/solicitud-malformada",
            "Solicitud malformada");

    private final String uri;
    private final String title;

    TipoErrorCotizacion(String uri, String title) {
        this.uri = uri;
        this.title = title;
    }

    public String getUri() {
        return uri;
    }

    public String getTitle() {
        return title;
    }
}
