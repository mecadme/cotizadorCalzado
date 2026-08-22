package com.tallerdae.cotizador.domain.model;

import com.tallerdae.cotizador.domain.strategy.UrgencyPricingStrategy;
import com.tallerdae.cotizador.domain.exception.SinReparacionesSeleccionadasException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Agregado raíz que representa el resultado de calcular costo y tiempo para
 * una combinación de calzado + reparaciones.
 *
 * Se crea únicamente a través del factory method {@link #crear}, que garantiza
 * todos los invariantes. El constructor es privado y no puede usarse directamente.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.6, 3.7, 4.2, 4.3, 6.1–6.8
 */
public final class Cotizacion {

    private final String id;
    private final Calzado calzado;
    private final List<TipoReparacion> reparaciones;   // snapshot inmutable
    private final NivelUrgencia urgencia;
    private final Dinero subtotal;
    private final Dinero recargoUrgencia;
    private final Dinero total;
    private final int tiempoEstimadoDias;
    private final Instant fechaCreacion;

    /**
     * Constructor privado. Solo se invoca desde {@link #crear}.
     */
    private Cotizacion(
            String id,
            Calzado calzado,
            List<TipoReparacion> reparaciones,
            NivelUrgencia urgencia,
            Dinero subtotal,
            Dinero recargoUrgencia,
            Dinero total,
            int tiempoEstimadoDias,
            Instant fechaCreacion) {
        this.id = id;
        this.calzado = calzado;
        this.reparaciones = Collections.unmodifiableList(reparaciones);
        this.urgencia = urgencia;
        this.subtotal = subtotal;
        this.recargoUrgencia = recargoUrgencia;
        this.total = total;
        this.tiempoEstimadoDias = tiempoEstimadoDias;
        this.fechaCreacion = fechaCreacion;
    }

    /**
     * Factory method que construye una {@code Cotizacion} completamente válida e inmutable.
     *
     * <p>Algoritmo:
     * <ol>
     *   <li>Lanza {@link SinReparacionesSeleccionadasException} si la lista está vacía (Req 3.9).</li>
     *   <li>Acumula {@code precioBase_i × factorComplejidad} para cada elemento de la lista
     *       <em>sin redondear</em> los productos individuales; aplica {@link Dinero#redondear()}
     *       una sola vez sobre la suma final (Req 3.1, 6.1).</li>
     *   <li>Delega {@code recargoUrgencia = strategy.calcularRecargo(subtotal)} con el subtotal
     *       ya redondeado (Req 4.2).</li>
     *   <li>Calcula {@code total = subtotal + recargoUrgencia}.</li>
     *   <li>Calcula {@code tiempoEstimadoDias = strategy.calcularTiempo(max(tiempoEstimadoDias_i))}.</li>
     *   <li>Asigna un UUID versión 4 como {@code id} (Req 3.6).</li>
     *   <li>Asigna {@code fechaCreacion = Instant.now(clock)} truncado a segundos (Req 3.7).</li>
     * </ol>
     *
     * @param calzado          calzado seleccionado; no nulo
     * @param reparaciones     lista de reparaciones con repetidos posibles; no nula, no vacía
     * @param urgencia         nivel de urgencia; no nulo
     * @param strategy         estrategia de pricing a usar; no nula
     * @param clock            reloj para asignar la fecha de creación; no nulo
     * @return instancia completamente construida e inmutable
     * @throws SinReparacionesSeleccionadasException si {@code reparaciones} está vacía
     */
    public static Cotizacion crear(
            Calzado calzado,
            List<TipoReparacion> reparaciones,
            NivelUrgencia urgencia,
            UrgencyPricingStrategy strategy,
            Clock clock) {

        if (reparaciones == null || reparaciones.isEmpty()) {
            throw new SinReparacionesSeleccionadasException(
                "Se requiere al menos una reparación para generar una cotización.");
        }

        // Paso 2: Calcular subtotal acumulando sin redondear, y redondear la suma final (Req 3.1, 6.1)
        BigDecimal factorComplejidad = calzado.getFactorComplejidad();
        Dinero acumulado = Dinero.cero("USD");
        for (TipoReparacion reparacion : reparaciones) {
            Dinero precio = new Dinero(reparacion.getPrecioBase(), "USD");
            acumulado = acumulado.sumar(precio.multiplicarPor(factorComplejidad));
        }
        Dinero subtotal = acumulado.redondear();

        // Paso 3: Delegar el recargo al strategy con el subtotal ya redondeado (Req 4.2)
        Dinero recargoUrgencia = strategy.calcularRecargo(subtotal);

        // Paso 4: total = subtotal + recargoUrgencia
        Dinero total = subtotal.sumar(recargoUrgencia);

        // Paso 5: tiempo = strategy.calcularTiempo(max(tiempoEstimadoDias_i))
        int tiempoMaxDias = reparaciones.stream()
                .mapToInt(TipoReparacion::getTiempoEstimadoDias)
                .max()
                .orElseThrow(); // seguro: la lista no está vacía
        int tiempoEstimadoDias = strategy.calcularTiempo(tiempoMaxDias);

        // Paso 6: UUID versión 4 (Req 3.6)
        String id = UUID.randomUUID().toString();

        // Paso 7: fechaCreacion truncada a segundos en UTC (Req 3.7)
        Instant fechaCreacion = Instant.now(clock).truncatedTo(ChronoUnit.SECONDS);

        return new Cotizacion(
                id,
                calzado,
                reparaciones,
                urgencia,
                subtotal,
                recargoUrgencia,
                total,
                tiempoEstimadoDias,
                fechaCreacion);
    }

    // ── Getters ─────────────────────────────────────────────────────────────

    public String getId() {
        return id;
    }

    public Calzado getCalzado() {
        return calzado;
    }

    /**
     * Snapshot inmutable de las reparaciones, incluidas repeticiones (Req 3.2).
     */
    public List<TipoReparacion> getReparaciones() {
        return reparaciones;
    }

    public NivelUrgencia getUrgencia() {
        return urgencia;
    }

    public Dinero getSubtotal() {
        return subtotal;
    }

    public Dinero getRecargoUrgencia() {
        return recargoUrgencia;
    }

    public Dinero getTotal() {
        return total;
    }

    public int getTiempoEstimadoDias() {
        return tiempoEstimadoDias;
    }

    public Instant getFechaCreacion() {
        return fechaCreacion;
    }
}
