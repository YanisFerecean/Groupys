package com.groupys.notification;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;

/**
 * Typed client for the Expo Push API. Base URL configured via
 * {@code quarkus.rest-client.expo-push-api.url}. Send up to 100 messages per call.
 */
@Path("/--/api/v2/push")
@RegisterRestClient(configKey = "expo-push-api")
public interface ExpoPushClient {

    @POST
    @Path("/send")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    ExpoPushResponse send(List<ExpoPushMessage> messages);
}
