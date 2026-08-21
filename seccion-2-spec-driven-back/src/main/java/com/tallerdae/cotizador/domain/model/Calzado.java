package com.tallerdae.cotizador.domain.model;

import java.math.BigDecimal;

/**
 * Entidad de dominio que representa una categoría de calzado.
 * Inmutable tras su construcción.
 * Requirements: 7.4, 7.6
 */
public class Calzado {

    private final String id;
    private final String nombre;
    private final BigDecimal factorComplejidad;

    /**
     * Construye un Calzado validando sus invariantes.
     *
     * @param id                identificador único, no nulo ni vacío
     * @param nombre            nombre descriptivo, no nulo ni vacío
     * @param factorComplejidad factor numérico >= 0.5 con a lo sumo 2 decimales (Req 7.4)
     * @throws IllegalArgumentException si algún invariante no se cumple
     */
    public Calzado(String id, String nombre, BigDecimal factorComplejidad) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("El id del calzado no puede ser nulo ni vacío");
        }
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre del calzado no puede ser nulo ni vacío");
        }
        if (factorComplejidad == null) {
            throw new IllegalArgumentException("El factorComplejidad no puede ser nulo");
        }
        if (factorComplejidad.compareTo(new BigDecimal("0.5")) < 0) {
            throw new IllegalArgumentException(
                "El factorComplejidad debe ser mayor o igual a 0.5, valor recibido: " + factorComplejidad);
        }
        if (factorComplejidad.scale() > 2) {
            throw new IllegalArgumentException(
                "El factorComplejidad debe tener a lo sumo 2 decimales, valor recibido: " + factorComplejidad);
        }

        this.id = id;
        this.nombre = nombre;
        this.factorComplejidad = factorComplejidad;
    }

    public String getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public BigDecimal getFactorComplejidad() {
        return factorComplejidad;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Calzado calzado)) return false;
        return id.equals(calzado.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }

    @Override
    public String toString() {
        return "Calzado{id='" + id + "', nombre='" + nombre + "', factorComplejidad=" + factorComplejidad + "}";
    }
}
