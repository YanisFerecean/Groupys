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
    void userMatchScoreUsesMatchingFactorWeights() {
        double score = DiscoveryScoreUtil.userMatchScore(
                0.8d,
                0.4d,
                0.5d,
                0.9d,
                1.0d,
                0.2d
        );

        assertEquals(0.615d, score, 0.0001d);
    }

    @Test
    void userMatchScoreHonorsIndividualFactorContribution() {
        assertEquals(0.2d, DiscoveryScoreUtil.userMatchScore(0d, 1d, 0d, 0d, 0d, 0d), 0.0001d);
        assertEquals(0.05d, DiscoveryScoreUtil.userMatchScore(0d, 0d, 0d, 0d, 1d, 0d), 0.0001d);
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
