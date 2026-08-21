package com.tallerdae.cotizador.application.service;

import com.tallerdae.cotizador.application.exception.TipoErrorCotizacion;
import com.tallerdae.cotizador.application.exception.ValidacionCotizacionException;
import com.tallerdae.cotizador.application.exception.ViolacionCampo;
import com.tallerdae.cotizador.application.port.in.GenerarCotizacionCommand;
import com.tallerdae.cotizador.application.port.in.GenerarCotizacionUseCase;
import com.tallerdae.cotizador.application.port.out.CalzadoRepositoryPort;
import com.tallerdae.cotizador.application.port.out.CotizacionRepositoryPort;
import com.tallerdae.cotizador.application.port.out.ReparacionRepositoryPort;
import com.tallerdae.cotizador.application.strategy.UrgencyPricingStrategy;
import com.tallerdae.cotizador.domain.model.Calzado;
import com.tallerdae.cotizador.domain.model.Cotizacion;
import com.tallerdae.cotizador.domain.model.NivelUrgencia;
import com.tallerdae.cotizador.domain.model.TipoReparacion;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Servicio de aplicación que orquesta la generación de una cotización.
 *
 * <p>Validación acumulativa (Req 5.7): reúne todas las violaciones antes de lanzar
 * {@link ValidacionCotizacionException}, en el orden canónico definido por
 * {@link TipoErrorCotizacion}:
 * <ol>
 *   <li>{@code tipoReparacionIds} nulo o vacío → {@code REPARACIONES_REQUERIDAS}</li>
 *   <li>{@code tipoCalzadoId} nulo, vacío o no encontrado → {@code TIPO_CALZADO_NO_ENCONTRADO}</li>
 *   <li>ids de reparaciones no encontrados → {@code TIPO_REPARACION_NO_ENCONTRADO}</li>
 * </ol>
 * Si hay violaciones, se lanza la excepción sin invocar {@code save} (Req 3.9).
 *
 * Requirements: 3.1–3.9, 4.1–4.4, 5.2–5.5, 5.7
 */
@Service
public class GenerarCotizacionService implements GenerarCotizacionUseCase {

    private final CalzadoRepositoryPort calzadoRepository;
    private final ReparacionRepositoryPort reparacionRepository;
    private final CotizacionRepositoryPort cotizacionRepository;
    private final Map<NivelUrgencia, UrgencyPricingStrategy> estrategias;
    private final Clock clock;

    public GenerarCotizacionService(
            CalzadoRepositoryPort calzadoRepository,
            ReparacionRepositoryPort reparacionRepository,
            CotizacionRepositoryPort cotizacionRepository,
            Map<NivelUrgencia, UrgencyPricingStrategy> estrategias,
            Clock clock) {
        this.calzadoRepository = calzadoRepository;
        this.reparacionRepository = reparacionRepository;
        this.cotizacionRepository = cotizacionRepository;
        this.estrategias = estrategias;
        this.clock = clock;
    }

    @Override
    public Cotizacion generarCotizacion(GenerarCotizacionCommand command) {
        List<ViolacionCampo> violaciones = new ArrayList<>();

        // ── 1. tipoReparacionIds nulo o vacío (Req 5.2) ──────────────────────
        boolean reparacionesAusentes =
                command.tipoReparacionIds() == null || command.tipoReparacionIds().isEmpty();
        if (reparacionesAusentes) {
            violaciones.add(new ViolacionCampo(
                    TipoErrorCotizacion.REPARACIONES_REQUERIDAS,
                    "tipoReparacionIds",
                    List.of(),
                    "Se requiere seleccionar al menos una reparación"));
        }

        // ── 2. tipoCalzadoId nulo, vacío o no encontrado (Req 5.3) ───────────
        Calzado calzado = null;
        String tipoCalzadoId = command.tipoCalzadoId();
        if (tipoCalzadoId == null || tipoCalzadoId.isBlank()) {
            violaciones.add(new ViolacionCampo(
                    TipoErrorCotizacion.TIPO_CALZADO_NO_ENCONTRADO,
                    "tipoCalzadoId",
                    tipoCalzadoId != null ? List.of(tipoCalzadoId) : List.of(),
                    "Tipo de calzado no encontrado: " + tipoCalzadoId));
        } else {
            Optional<Calzado> calzadoOpt = calzadoRepository.findById(tipoCalzadoId);
            if (calzadoOpt.isEmpty()) {
                violaciones.add(new ViolacionCampo(
                        TipoErrorCotizacion.TIPO_CALZADO_NO_ENCONTRADO,
                        "tipoCalzadoId",
                        List.of(tipoCalzadoId),
                        "Tipo de calzado no encontrado: " + tipoCalzadoId));
            } else {
                calzado = calzadoOpt.get();
            }
        }

        // ── 3. ids de reparaciones no encontrados (Req 5.4, 5.5) ─────────────
        Map<String, TipoReparacion> indiceReparaciones = Map.of();
        if (!reparacionesAusentes) {
            Collection<String> idsRequeridos = command.tipoReparacionIds();
            indiceReparaciones = reparacionRepository.findAllById(idsRequeridos);

            // Deduplicar ids faltantes manteniendo el orden de primera aparición
            List<String> idsFaltantes = new ArrayList<>();
            LinkedHashSet<String> yaAgregados = new LinkedHashSet<>();
            for (String id : idsRequeridos) {
                if (!indiceReparaciones.containsKey(id) && yaAgregados.add(id)) {
                    idsFaltantes.add(id);
                }
            }
            if (!idsFaltantes.isEmpty()) {
                violaciones.add(new ViolacionCampo(
                        TipoErrorCotizacion.TIPO_REPARACION_NO_ENCONTRADO,
                        "tipoReparacionIds",
                        idsFaltantes,
                        "Tipos de reparación no encontrados: " + String.join(", ", idsFaltantes)));
            }
        }

        // ── Lanzar si hay violaciones (Req 5.7 — sin llamar a save) ──────────
        if (!violaciones.isEmpty()) {
            throw new ValidacionCotizacionException(violaciones);
        }

        // ── Resolución de reparaciones con repeticiones (Req 3.2) ────────────
        List<TipoReparacion> reparaciones = new ArrayList<>();
        for (String id : command.tipoReparacionIds()) {
            reparaciones.add(indiceReparaciones.get(id));
        }

        // ── Seleccionar estrategia y delegar a Cotizacion.crear ───────────────
        NivelUrgencia urgencia = NivelUrgencia.desdeFlag(command.urgente());
        UrgencyPricingStrategy strategy = estrategias.get(urgencia);

        Cotizacion cotizacion = Cotizacion.crear(calzado, reparaciones, urgencia, strategy, clock);

        // ── Persistir (Req 3.8) ───────────────────────────────────────────────
        return cotizacionRepository.save(cotizacion);
    }
}
