package com.tallerdae.cotizador.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Value object que encapsula un monto monetario y su moneda.
 * Todas las operaciones son inmutables: devuelven nuevas instancias.
 *
 * Regla de redondeo:
 *   - multiplicarPor y sumar NO redondean (para acumular productos intermedios).
 *   - aplicarPorcentaje y redondear aplican HALF_UP a escala 2.
 *   - getMonto() siempre devuelve un BigDecimal con escala 2.
 */
public final class Dinero {

    private final BigDecimal monto;
    private final String moneda;

    /**
     * Constructor público. Rechaza nulos.
     *
     * @param monto  el importe (puede tener cualquier escala; getMonto() normalizará a 2)
     * @param moneda código de moneda, p. ej. "USD"
     */
    public Dinero(BigDecimal monto, String moneda) {
        Objects.requireNonNull(monto, "monto no puede ser nulo");
        Objects.requireNonNull(moneda, "moneda no puede ser nula");
        this.monto = monto;
        this.moneda = moneda;
    }

    /**
     * Devuelve una instancia con monto 0.00 en la moneda indicada.
     */
    public static Dinero cero(String moneda) {
        return new Dinero(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), moneda);
    }

    /**
     * Suma dos montos de la misma moneda, SIN redondear.
     *
     * @throws IllegalArgumentException si las monedas son distintas
     */
    public Dinero sumar(Dinero otro) {
        Objects.requireNonNull(otro, "otro no puede ser nulo");
        if (!this.moneda.equals(otro.moneda)) {
            throw new IllegalArgumentException(
                "No se pueden sumar monedas distintas: " + this.moneda + " y " + otro.moneda);
        }
        return new Dinero(this.monto.add(otro.monto), this.moneda);
    }

    /**
     * Multiplica el monto por el factor dado, SIN redondear
     * (para acumular productos intermedios sin pérdida de precisión).
     */
    public Dinero multiplicarPor(BigDecimal factor) {
        Objects.requireNonNull(factor, "factor no puede ser nulo");
        return new Dinero(this.monto.multiply(factor), this.moneda);
    }

    /**
     * Multiplica el monto por el porcentaje dado y redondea a escala 2 con HALF_UP.
     * Útil para calcular recargos; el porcentaje concreto lo aporta la estrategia
     * de pricing, que es su única fuente (Req 4.4).
     */
    public Dinero aplicarPorcentaje(BigDecimal porcentaje) {
        Objects.requireNonNull(porcentaje, "porcentaje no puede ser nulo");
        BigDecimal resultado = this.monto.multiply(porcentaje)
                                        .setScale(2, RoundingMode.HALF_UP);
        return new Dinero(resultado, this.moneda);
    }

    /**
     * Devuelve una nueva instancia con el monto redondeado a escala 2 con HALF_UP.
     */
    public Dinero redondear() {
        return new Dinero(this.monto.setScale(2, RoundingMode.HALF_UP), this.moneda);
    }

    /**
     * Devuelve el monto con escala 2 (siempre, independientemente de la escala interna).
     */
    public BigDecimal getMonto() {
        return this.monto.setScale(2, RoundingMode.HALF_UP);
    }

    public String getMoneda() {
        return moneda;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Dinero other)) return false;
        // Compara usando getMonto() para normalizar la escala antes de comparar
        return this.getMonto().compareTo(other.getMonto()) == 0
            && this.moneda.equals(other.moneda);
    }

    @Override
    public int hashCode() {
        return Objects.hash(getMonto().stripTrailingZeros(), moneda);
    }

    @Override
    public String toString() {
        return getMonto().toPlainString() + " " + moneda;
    }
}
