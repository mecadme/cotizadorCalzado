package com.tallerdae.cotizador.domain.strategy;

import com.tallerdae.cotizador.domain.model.Dinero;

/**
 * Estrategia de pricing por nivel de urgencia.
 * Cada implementación encapsula el cálculo de recargo y tiempo para un nivel concreto.
 *
 * <p>Vive en {@code domain} — y no en {@code application} — porque {@link
 * com.tallerdae.cotizador.domain.model.Cotizacion#crear} la recibe como parámetro: si la
 * interfaz estuviera en la capa de aplicación, el dominio importaría hacia afuera y se
 * invertiría la regla de dependencias hexagonal. Las implementaciones concretas, que sí
 * fijan valores de negocio como el 30 % de recargo, viven en {@code application.strategy}.
 *
 * Requirements: 3.4, 4.1, 4.3
 */
public interface UrgencyPricingStrategy {

    /**
     * Calcula el recargo a partir del subtotal ya redondeado.
     *
     * @param subtotal subtotal redondeado a 2 decimales HALF_UP
     * @return importe del recargo (puede ser cero)
     */
    Dinero calcularRecargo(Dinero subtotal);

    /**
     * Calcula el tiempo estimado de entrega en días a partir del tiempo máximo de las reparaciones.
     *
     * @param tiempoMaxDias valor máximo de tiempoEstimadoDias entre las reparaciones solicitadas
     * @return tiempo estimado en días (>= 1)
     */
    int calcularTiempo(int tiempoMaxDias);
}
