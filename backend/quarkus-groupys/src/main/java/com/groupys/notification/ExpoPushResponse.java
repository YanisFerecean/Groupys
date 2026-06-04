package com.groupys.notification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/**
 * Response from POST /--/api/v2/push/send. {@code data} holds one ticket per sent message,
 * positionally aligned with the request list.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ExpoPushResponse(List<Ticket> data) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Ticket(String status, String id, String message, Map<String, Object> details) {

        public boolean isError() {
            return "error".equalsIgnoreCase(status);
        }

        /** Expo error code, e.g. "DeviceNotRegistered", "MessageTooBig". */
        public String errorCode() {
            return details == null ? null : String.valueOf(details.get("error"));
        }
    }
}
