package com.tallerdae.cotizador.infrastructure.config;

import com.tallerdae.cotizador.application.strategy.NormalPricingStrategy;
import com.tallerdae.cotizador.application.strategy.RecargoUrgentePricingStrategy;
import com.tallerdae.cotizador.domain.strategy.UrgencyPricingStrategy;
import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.NivelUrgencia;
import com.tallerdae.cotizador.domain.model.TipoReparacion;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Configuración de la semilla del catálogo y beans de infraestructura.
 *
 * Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 3.7
 */
@Configuration
public class CatalogoSemillaConfig {

    /**
     * Precarga los tres Calzado del catálogo semilla.
     * Los constructores de dominio validan factorComplejidad >= 0.5 y demás invariantes.
     * Se valida unicidad de id aquí para cumplir Req 7.6.
     *
     * Requirements: 7.1, 7.4, 7.6
     */
    @Bean
    public List<Calzado> calzadosSemilla() {
        List<Calzado> calzados = List.of(
            new Calzado("1", "Zapato formal",      new BigDecimal("1.2")),
            new Calzado("2", "Bota de cuero",      new BigDecimal("1.5")),
            new Calzado("3", "Zapatilla deportiva", new BigDecimal("1.0"))
        );
        validarIdsUnicos(calzados.stream().map(Calzado::getId).collect(Collectors.toList()),
                "Calzado");
        return calzados;
    }

    /**
     * Precarga las cuatro TipoReparacion del catálogo semilla.
     * Los constructores de dominio validan precioBase >= 0.01, tiempoEstimadoDias >= 1, etc.
     * Se valida unicidad de id aquí para cumplir Req 7.6.
     *
     * Requirements: 7.2, 7.5, 7.6
     */
    @Bean
    public List<TipoReparacion> reparacionesSemilla() {
        List<TipoReparacion> reparaciones = List.of(
            new TipoReparacion("1", "Cambio de tacón",      new BigDecimal("12.00"), 2),
            new TipoReparacion("2", "Cambio de suela",      new BigDecimal("20.00"), 4),
            new TipoReparacion("3", "Cosido de costura",    new BigDecimal("8.00"),  1),
            new TipoReparacion("4", "Limpieza y tinturado", new BigDecimal("10.00"), 3)
        );
        validarIdsUnicos(reparaciones.stream().map(TipoReparacion::getId).collect(Collectors.toList()),
                "TipoReparacion");
        return reparaciones;
    }

    /**
     * Bean Clock inyectable en producción y reemplazable en tests con Clock.fixed(…).
     *
     * Requirements: 3.7
     */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }

    /**
     * Mapa de estrategias de pricing indexado por NivelUrgencia.
     * Requerido por GenerarCotizacionService. Las estrategias se instancian aquí
     * porque `application.strategy` no depende de Spring (ver checkpoint de la tarea 15).
     *
     * Requirements: 3.3, 4.1, 4.3
     */
    @Bean
    public Map<NivelUrgencia, UrgencyPricingStrategy> estrategias() {
        return Map.of(
            NivelUrgencia.NORMAL,   new NormalPricingStrategy(),
            NivelUrgencia.URGENTE,  new RecargoUrgentePricingStrategy()
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validarIdsUnicos(List<String> ids, String tipo) {
        Set<String> vistos = new java.util.HashSet<>();
        for (String id : ids) {
            if (!vistos.add(id)) {
                throw new IllegalStateException(
                    "Id duplicado '" + id + "' en el catálogo semilla de " + tipo +
                    ". El Sistema no puede arrancar con un catálogo inválido (Req 7.6).");
            }
        }
    }
}
