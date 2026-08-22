package com.tallerdae.cotizador.application.strategy;

import com.tallerdae.cotizador.domain.model.Dinero;
import com.tallerdae.cotizador.domain.strategy.UrgencyPricingStrategy;

/**
 * Estrategia de pricing para pedidos normales (sin urgencia).
 * No aplica recargo y devuelve el tiempo máximo sin modificar.
 *
 * Requirements: 3.3, 3.4
 */
public class NormalPricingStrategy implements UrgencyPricingStrategy {

    @Override
    public Dinero calcularRecargo(Dinero subtotal) {
        return Dinero.cero("USD");
    }

    @Override
    public int calcularTiempo(int tiempoMaxDias) {
        return tiempoMaxDias;
    }
}
