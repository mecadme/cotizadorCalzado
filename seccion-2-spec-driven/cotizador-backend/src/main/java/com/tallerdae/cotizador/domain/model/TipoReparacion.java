package com.tallerdae.cotizador.domain.model;

import java.math.BigDecimal;

/**
 * Entidad de dominio que representa un servicio de reparación disponible.
 * Inmutable tras su construcción; el constructor valida todos los invariantes.
 *
 * Restricciones (Req 7.5):
 *   - id: no nulo, no vacío
 *   - nombre: no nulo, no vacío
 *   - precioBase: >= 0.01, a lo sumo 2 decimales
 *   - tiempoEstimadoDias: >= 1
 */
public final class TipoReparacion {

    private final String id;
    private final String nombre;
    private final BigDecimal precioBase;
    private final int tiempoEstimadoDias;

    /**
     * Construye un TipoReparacion validando todos sus invariantes.
     *
     * @param id                 identificador único; no nulo ni vacío
     * @param nombre             nombre del servicio; no nulo ni vacío
     * @param precioBase         precio base >= 0.01 con a lo sumo 2 decimales
     * @param tiempoEstimadoDias tiempo estimado en días >= 1
     * @throws IllegalArgumentException si alguna validación falla
     */
    public TipoReparacion(String id, String nombre, BigDecimal precioBase, int tiempoEstimadoDias) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("id no puede ser nulo ni vacío");
        }
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("nombre no puede ser nulo ni vacío");
        }
        if (precioBase == null) {
            throw new IllegalArgumentException("precioBase no puede ser nulo");
        }
        if (precioBase.scale() > 2) {
            throw new IllegalArgumentException(
                "precioBase tiene más de 2 decimales: " + precioBase.toPlainString());
        }
        if (precioBase.compareTo(new BigDecimal("0.01")) < 0) {
            throw new IllegalArgumentException(
                "precioBase debe ser >= 0.01, pero fue: " + precioBase.toPlainString());
        }
        if (tiempoEstimadoDias < 1) {
            throw new IllegalArgumentException(
                "tiempoEstimadoDias debe ser >= 1, pero fue: " + tiempoEstimadoDias);
        }
        this.id = id;
        this.nombre = nombre;
        this.precioBase = precioBase;
        this.tiempoEstimadoDias = tiempoEstimadoDias;
    }

    public String getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public BigDecimal getPrecioBase() {
        return precioBase;
    }

    public int getTiempoEstimadoDias() {
        return tiempoEstimadoDias;
    }
}
