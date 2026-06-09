package com.groupys.dto;

/** Fixed catalog sticker available to chat clients (ticket 3.9). */
public record StickerResDto(
        String id,
        String packId,
        String url,
        String name
) {}
