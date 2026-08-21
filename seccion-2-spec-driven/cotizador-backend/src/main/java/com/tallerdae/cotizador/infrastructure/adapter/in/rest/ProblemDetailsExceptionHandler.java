package com.tallerdae.cotizador.infrastructure.adapter.in.rest;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.tallerdae.cotizador.application.exception.TipoErrorCotizacion;
import com.tallerdae.cotizador.application.exception.ValidacionCotizacionException;
import com.tallerdae.cotizador.application.exception.ViolacionCampo;
import com.tallerdae.cotizador.domain.exception.SinReparacionesSeleccionadasException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Manejador global de excepciones que serializa errores como RFC 7807 ProblemDetails.
 *
 * <p>Todas las respuestas usan {@code Content-Type: application/problem+json} y
 * nunca incluyen stack traces en el body.
 *
 * <p>Requirements: 5.1, 5.2, 5.6, 5.7
 */
@RestControllerAdvice
public class ProblemDetailsExceptionHandler {

    private static final MediaType PROBLEM_JSON = MediaType.parseMediaType("application/problem+json");

    /**
     * Maneja {@link ValidacionCotizacionException}: una o más violaciones de validación.
     *
     * <p>La primera {@link ViolacionCampo} (orden canónico por precedencia de
     * {@link TipoErrorCotizacion}) determina el {@code type} y el {@code title} del
     * ProblemDetails. El campo {@code errors} recoge una entrada por cada violación.
     *
     * <p>Requirements: 5.2, 5.3, 5.4, 5.7
     */
    @ExceptionHandler(ValidacionCotizacionException.class)
    public ResponseEntity<ProblemDetail> handleValidacionCotizacion(ValidacionCotizacionException ex) {
        List<ViolacionCampo> violaciones = ex.violaciones();
        ViolacionCampo primera = violaciones.get(0);

        List<Map<String, Object>> errors = violaciones.stream()
                .map(v -> entradaError(v.campo(), v.valoresInvalidos()))
                .toList();

        return build(primera.tipo(), primera.detalle(), errors);
    }

    /**
     * Maneja {@link SinReparacionesSeleccionadasException}: invariante de dominio
     * (ninguna reparación seleccionada) no interceptada por la capa de aplicación.
     *
     * <p>Requirements: 5.2
     */
    @ExceptionHandler(SinReparacionesSeleccionadasException.class)
    public ResponseEntity<ProblemDetail> handleSinReparaciones(SinReparacionesSeleccionadasException ex) {
        return build(
                TipoErrorCotizacion.REPARACIONES_REQUERIDAS,
                ex.getMessage(),
                List.of(entradaError("tipoReparacionIds", null)));
    }

    /**
     * Maneja {@link HttpMessageNotReadableException}: cuerpo de la petición no es
     * JSON válido, o un campo tiene un tipo incompatible con el declarado.
     *
     * <p>Cuando Jackson aporta la ruta del campo conflictivo, {@code errors}
     * identifica los campos afectados (Requirement 5.6).
     *
     * <p>Requirements: 5.6
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleNotReadable(HttpMessageNotReadableException ex) {
        List<String> campos = camposAfectados(ex);

        String detail = campos.isEmpty()
                ? "El cuerpo de la solicitud no es JSON válido o contiene tipos incompatibles."
                : "El cuerpo de la solicitud contiene un tipo incompatible en: " + String.join(", ", campos) + ".";

        List<Map<String, Object>> errors = campos.stream()
                .map(campo -> entradaError(campo, null))
                .toList();

        return build(TipoErrorCotizacion.SOLICITUD_MALFORMADA, detail, errors);
    }

    /**
     * Maneja {@link MethodArgumentTypeMismatchException}: un parámetro de path o
     * query tiene un tipo que no puede convertirse al esperado.
     *
     * <p>Requirements: 5.6
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ProblemDetail> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String detail = String.format(
                "El valor '%s' del parámetro '%s' no puede convertirse al tipo esperado.",
                ex.getValue(), ex.getName()
        );

        List<String> valoresInvalidos = ex.getValue() == null
                ? null
                : List.of(String.valueOf(ex.getValue()));

        return build(
                TipoErrorCotizacion.SOLICITUD_MALFORMADA,
                detail,
                List.of(entradaError(ex.getName(), valoresInvalidos)));
    }

    // -------------------------------------------------------------------------
    // helpers
    // -------------------------------------------------------------------------

    /**
     * Construye la respuesta ProblemDetails: {@code type}, {@code title} y
     * {@code status} provienen del catálogo de errores; {@code errors} se añade
     * como propiedad de extensión solo si hay entradas.
     */
    private ResponseEntity<ProblemDetail> build(
            TipoErrorCotizacion tipo, String detail, List<Map<String, Object>> errors) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
        problem.setType(URI.create(tipo.getUri()));
        problem.setTitle(tipo.getTitle());

        if (errors != null && !errors.isEmpty()) {
            problem.setProperty("errors", errors);
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(PROBLEM_JSON)
                .body(problem);
    }

    /** Entrada de {@code errors}: {@code valoresInvalidos} se omite si no aporta información. */
    private static Map<String, Object> entradaError(String campo, List<String> valoresInvalidos) {
        Map<String, Object> entrada = new LinkedHashMap<>();
        entrada.put("field", campo);
        if (valoresInvalidos != null && !valoresInvalidos.isEmpty()) {
            entrada.put("valoresInvalidos", valoresInvalidos);
        }
        return entrada;
    }

    /** Extrae de la excepción de Jackson los nombres de campo de la ruta del conflicto. */
    private static List<String> camposAfectados(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof JsonMappingException jme) {
            return jme.getPath().stream()
                    .map(JsonMappingException.Reference::getFieldName)
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
        }
        return List.of();
    }
}
