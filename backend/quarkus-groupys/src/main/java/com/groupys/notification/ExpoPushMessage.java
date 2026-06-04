package com.groupys.notification;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * A single Expo push message. Field names map 1:1 to the Expo Push API
 * (https://docs.expo.dev/push-notifications/sending-notifications/). Nulls are omitted.
 *
 * <p>iOS rich media: {@code mutableContent=true} lets the app's Notification Service Extension
 * pull {@code data.imageUrl} and attach it to the notification for a branded, minimal card.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExpoPushMessage(
        String to,
        String title,
        String body,
        String subtitle,
        Map<String, Object> data,
        String sound,
        Integer badge,
        Boolean mutableContent,
        String categoryId,
        String channelId,
        Integer ttl,
        String priority
) {
    public static ExpoPushMessage of(String token, String title, String body, Integer badge,
                                     String categoryId, Map<String, Object> data) {
        return new ExpoPushMessage(
                token,
                title,
                body,
                null,
                data,
                "default",
                badge,
                Boolean.TRUE,
                categoryId,
                "default",
                null,
                "high"
        );
    }
}
