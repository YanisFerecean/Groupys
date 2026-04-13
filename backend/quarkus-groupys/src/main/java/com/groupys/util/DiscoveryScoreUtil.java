package com.groupys.util;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

public final class DiscoveryScoreUtil {

    private DiscoveryScoreUtil() {
    }

    public static double normalizedRankScore(int rank, int total) {
        if (rank <= 0 || total <= 0) {
            return 0d;
        }
        return clamp01((double) (total - rank + 1) / total);
    }

    public static double weightedOverlap(Map<?, Double> left, Map<?, Double> right) {
        if (left == null || right == null || left.isEmpty() || right.isEmpty()) {
            return 0d;
        }
        double numerator = 0d;
        double denominator = 0d;
        for (Map.Entry<?, Double> entry : left.entrySet()) {
            double leftValue = safe(entry.getValue());
            double rightValue = safe(right.get(entry.getKey()));
            numerator += Math.min(leftValue, rightValue);
            denominator += leftValue;
        }
        return denominator == 0d ? 0d : clamp01(numerator / denominator);
    }

    public static double normalizedCount(long numerator, long denominatorCap) {
        if (numerator <= 0 || denominatorCap <= 0) {
            return 0d;
        }
        return clamp01((double) numerator / denominatorCap);
    }

    public static double activityScore(long posts, long comments, long reactions) {
        return clamp01((posts * 1.0 + comments * 0.7 + reactions * 0.4) / 20.0);
    }

    public static double userMatchScore(double artistScore,
                                        double genreScore,
                                        double sharedCommunityScore,
                                        double activityScore,
                                        double countryScore,
                                        double followGraphScore) {
        return 0.30 * artistScore
                + 0.20 * genreScore
                + 0.20 * sharedCommunityScore
                + 0.15 * activityScore
                + 0.05 * countryScore
                + 0.05 * followGraphScore;
    }

    public static double countryMatchScore(String left, String right) {
        String normalizedLeft = normalizeCountryValue(left);
        String normalizedRight = normalizeCountryValue(right);
        if (normalizedLeft.isBlank() || normalizedRight.isBlank()) {
            return 0d;
        }
        return normalizedLeft.equals(normalizedRight) ? 1d : 0d;
    }

    public static String normalizeCountryValue(String value) {
        return CountryUtil.normalizeCountryValue(value);
    }

    public static double clamp01(double value) {
        return Math.max(0d, Math.min(1d, value));
    }

    public static String buildTasteSummary(Collection<String> artists, Collection<String> genres) {
        String artistPart = joinTop(artists, 3);
        String genrePart = joinTop(genres, 3);
        if (!artistPart.isBlank() && !genrePart.isBlank()) {
            return "Into " + artistPart + " with a strong " + genrePart + " lean.";
        }
        if (!artistPart.isBlank()) {
            return "Into " + artistPart + ".";
        }
        if (!genrePart.isBlank()) {
            return "Mostly into " + genrePart + ".";
        }
        return null;
    }

    public static List<String> topNames(Map<String, Double> weightedNames, int limit) {
        return weightedNames.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .filter(Objects::nonNull)
                .toList();
    }

    private static String joinTop(Collection<String> values, int limit) {
        if (values == null) {
            return "";
        }
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .limit(limit)
                .collect(Collectors.joining(", "));
    }

    private static double safe(Double value) {
        return value == null ? 0d : value;
    }
}
