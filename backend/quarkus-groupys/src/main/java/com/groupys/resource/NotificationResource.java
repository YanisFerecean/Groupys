package com.groupys.resource;

import com.groupys.model.NotificationPref;
import com.groupys.service.NotificationSettingsService;
import io.quarkus.security.Authenticated;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;

/**
 * Device-token registration + notification-preference endpoints for the mobile app.
 */
@Path("/notifications")
@Authenticated
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class NotificationResource {

    @Inject
    NotificationSettingsService settingsService;

    @Inject
    JsonWebToken jwt;

    // ── Device tokens ─────────────────────────────────────────────────────────

    @POST
    @Path("/device-tokens")
    public Response registerToken(DeviceTokenRequest req) {
        settingsService.registerToken(jwt.getSubject(), req.expoToken(), req.platform());
        return Response.noContent().build();
    }

    @DELETE
    @Path("/device-tokens/{token}")
    public Response removeToken(@PathParam("token") String token) {
        settingsService.removeToken(jwt.getSubject(), token);
        return Response.noContent().build();
    }

    // ── Preferences ───────────────────────────────────────────────────────────

    @GET
    @Path("/preferences")
    public PreferencesDto getPreferences() {
        return PreferencesDto.from(settingsService.getOrCreatePreferences(jwt.getSubject()));
    }

    @PUT
    @Path("/preferences")
    public PreferencesDto updatePreferences(PreferencesDto dto) {
        return PreferencesDto.from(settingsService.updatePreferences(jwt.getSubject(), dto.toEntity()));
    }

    // ── Payloads ──────────────────────────────────────────────────────────────

    public record DeviceTokenRequest(String expoToken, String platform) {}

    public record PreferencesDto(
            boolean matchesEnabled,
            boolean messagesEnabled,
            boolean communityEnabled,
            boolean hotTakesEnabled,
            boolean retentionEnabled,
            Integer quietStartMinute,
            Integer quietEndMinute,
            String timezone
    ) {
        static PreferencesDto from(NotificationPref p) {
            return new PreferencesDto(
                    p.matchesEnabled, p.messagesEnabled, p.communityEnabled, p.hotTakesEnabled,
                    p.retentionEnabled, p.quietStartMinute, p.quietEndMinute, p.timezone);
        }

        NotificationPref toEntity() {
            NotificationPref p = new NotificationPref();
            p.matchesEnabled = matchesEnabled;
            p.messagesEnabled = messagesEnabled;
            p.communityEnabled = communityEnabled;
            p.hotTakesEnabled = hotTakesEnabled;
            p.retentionEnabled = retentionEnabled;
            p.quietStartMinute = quietStartMinute;
            p.quietEndMinute = quietEndMinute;
            p.timezone = timezone;
            return p;
        }
    }
}
