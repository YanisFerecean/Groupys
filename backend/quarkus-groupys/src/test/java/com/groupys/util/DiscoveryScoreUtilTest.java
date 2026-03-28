package com.groupys.util;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DiscoveryScoreUtilTest {

    @Test
    void weightedOverlapUsesSharedWeights() {
        double overlap = DiscoveryScoreUtil.weightedOverlap(
                Map.of("artist-a", 1.0, "artist-b", 0.5),
                Map.of("artist-a", 0.9, "artist-c", 1.0)
        );

        assertEquals(0.6d, overlap, 0.0001d);
    }

    @Test
    void countryMatchIsCaseInsensitive() {
        assertEquals(1d, DiscoveryScoreUtil.countryMatchScore("at", "AT"), 0.0001d);
        assertEquals(0d, DiscoveryScoreUtil.countryMatchScore("AT", "DE"), 0.0001d);
    }

    @Test
    void countryMatchSupportsCountryNamesAndAliases() {
        assertEquals(1d, DiscoveryScoreUtil.countryMatchScore("Myanmar", "MM"), 0.0001d);
        assertEquals(1d, DiscoveryScoreUtil.countryMatchScore("United States of America", "US"), 0.0001d);
    }

    @Test
    void buildsTasteSummaryFromArtistsAndGenres() {
        String summary = DiscoveryScoreUtil.buildTasteSummary(
                java.util.List.of("Fred again..", "Overmono"),
                java.util.List.of("electronic", "uk garage")
        );

        assertTrue(summary.contains("Fred again.."));
        assertTrue(summary.contains("electronic"));
    }
}
