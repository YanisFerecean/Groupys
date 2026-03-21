package com.groupys.dto;

import java.util.List;

public record ArtistResDto(
        Long id,
        String name,
        List<String> images,
        Long listeners,
        Long playcount,
        String summary
) {
}
