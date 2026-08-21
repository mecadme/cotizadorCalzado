package com.tallerdae.cotizador.application.strategy;

import com.tallerdae.cotizador.domain.model.Dinero;

import java.math.BigDecimal;

/**
 * Estrategia de pricing para pedidos urgentes.
 * Aplica un recargo del 30 % sobre el subtotal y reduce el tiempo de entrega a la mitad (mínimo 1 día).
 *
 * Requirements: 4.1, 4.3, 4.4
 */
public class RecargoUrgentePricingStrategy implements UrgencyPricingStrategy {

    /**
     * Única fuente del porcentaje de recargo por urgencia en todo el proyecto.
     * Representa el 30 %.
     */
    public static final BigDecimal RECARGO_URGENCIA_PORCENTAJE = new BigDecimal("0.30");

    /**
     * Calcula el recargo de urgencia como el 30 % del subtotal redondeado.
     *
     * @param subtotal subtotal redondeado a 2 decimales HALF_UP
     * @return importe del recargo (subtotal × 0.30, redondeado a 2 decimales HALF_UP)
     */
    @Override
    public Dinero calcularRecargo(Dinero subtotal) {
        return subtotal.aplicarPorcentaje(RECARGO_URGENCIA_PORCENTAJE);
    }

    /**
     * Reduce el tiempo de entrega a la mitad, con un mínimo absoluto de 1 día.
     *
     * @param tiempoMaxDias valor máximo de tiempoEstimadoDias entre las reparaciones solicitadas
     * @return {@code Math.max(1, ceil(tiempoMaxDias / 2.0))}
     */
    @Override
    public int calcularTiempo(int tiempoMaxDias) {
        return Math.max(1, (int) Math.ceil(tiempoMaxDias / 2.0));
    }
}
