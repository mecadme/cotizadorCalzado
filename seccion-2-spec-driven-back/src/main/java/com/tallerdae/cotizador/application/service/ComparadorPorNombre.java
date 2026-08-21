package com.tallerdae.cotizador.application.service;

import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.TipoReparacion;

import java.text.Collator;
import java.util.Comparator;
import java.util.Locale;

/**
 * Provee comparadores para ordenar entidades del catálogo por nombre
 * siguiendo el término OrdenPorNombre del glosario: orden lexicográfico
 * ascendente, insensible a mayúsculas y acentos, con reglas de colación
 * del español (Requirements 1.3, 2.3).
 *
 * <p>Clase de utilidad: no instanciable, solo métodos estáticos.</p>
 */
public final class ComparadorPorNombre {

    private static final Collator COLLATOR = crearCollator();

    private ComparadorPorNombre() {
        // utilidad; no instanciable
    }

    private static Collator crearCollator() {
        Collator c = Collator.getInstance(Locale.forLanguageTag("es"));
        // PRIMARY: ignora mayúsculas/minúsculas y diferencias de acento
        c.setStrength(Collator.PRIMARY);
        return c;
    }

    /**
     * Comparador por {@code nombre} para {@link Calzado}, usando el Collator
     * español con fuerza PRIMARY.
     *
     * @return comparador ascendente por nombre
     */
    public static Comparator<Calzado> porNombreCalzado() {
        return (a, b) -> COLLATOR.compare(a.getNombre(), b.getNombre());
    }

    /**
     * Comparador por {@code nombre} para {@link TipoReparacion}, usando el
     * Collator español con fuerza PRIMARY.
     *
     * @return comparador ascendente por nombre
     */
    public static Comparator<TipoReparacion> porNombreReparacion() {
        return (a, b) -> COLLATOR.compare(a.getNombre(), b.getNombre());
    }
}
