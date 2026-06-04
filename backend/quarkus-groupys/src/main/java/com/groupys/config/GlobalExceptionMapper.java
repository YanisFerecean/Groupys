package com.groupys.config;

import io.quarkus.logging.Log;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;
import java.util.UUID;

/**
 * Centralizes error responses so unexpected exceptions never leak internal messages
 * or stack traces to clients. Intentional WebApplicationExceptions (404, 400, ...)
 * keep their status and client-facing message.
 */
@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    @Override
    public Response toResponse(Throwable exception) {
        if (exception instanceof WebApplicationException wae) {
            Response original = wae.getResponse();
            int status = original.getStatus();
            // Server-side faults dressed as WAE still get a generic body.
            if (status >= 500) {
                return serverError(exception);
            }
            String message = wae.getMessage() != null ? wae.getMessage() : original.getStatusInfo().getReasonPhrase();
            return Response.status(status)
                    .type(MediaType.APPLICATION_JSON)
                    .entity(Map.of("error", message))
                    .build();
        }
        return serverError(exception);
    }

    private Response serverError(Throwable exception) {
        String errorId = UUID.randomUUID().toString();
        Log.errorf(exception, "Unhandled exception [errorId=%s]", errorId);
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of(
                        "error", "Internal server error",
                        "errorId", errorId))
                .build();
    }
}
