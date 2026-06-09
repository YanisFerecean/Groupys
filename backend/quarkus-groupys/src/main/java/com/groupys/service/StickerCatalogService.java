package com.groupys.service;

import com.groupys.dto.StickerResDto;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

/** Small server-owned sticker allowlist; custom sticker uploads can extend this later. */
@ApplicationScoped
public class StickerCatalogService {

    private static final String PACK_ID = "groupys-classics";
    private static final String BASE_URL =
            "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/";

    private static final List<StickerResDto> STICKERS = List.of(
            sticker("music-note", "1f3b5", "Music note"),
            sticker("headphones", "1f3a7", "Headphones"),
            sticker("guitar", "1f3b8", "Guitar"),
            sticker("microphone", "1f3a4", "Microphone"),
            sticker("disco-ball", "1faa9", "Disco ball"),
            sticker("sparkles", "2728", "Sparkles"),
            sticker("fire", "1f525", "Fire"),
            sticker("heart", "2764", "Heart"),
            sticker("dancer", "1f483", "Dancer"),
            sticker("party", "1f389", "Party"),
            sticker("eyes", "1f440", "Eyes"),
            sticker("clap", "1f44f", "Clap")
    );

    public List<StickerResDto> list() {
        return STICKERS;
    }

    public boolean isAllowed(String id, String url) {
        return STICKERS.stream().anyMatch(sticker -> sticker.id().equals(id) && sticker.url().equals(url));
    }

    private static StickerResDto sticker(String id, String codepoint, String name) {
        return new StickerResDto(id, PACK_ID, BASE_URL + codepoint + ".png", name);
    }
}
