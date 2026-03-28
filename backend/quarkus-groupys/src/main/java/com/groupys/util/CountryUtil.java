package com.groupys.util;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.MissingResourceException;

public final class CountryUtil {

    private static final Map<String, String> COUNTRY_CODE_LOOKUP = buildCountryCodeLookup();

    private CountryUtil() {
    }

    public static String resolveCountryCode(String primaryCode, String fallbackCountry) {
        String normalizedPrimary = normalizeCountryCode(primaryCode);
        if (normalizedPrimary != null) {
            return normalizedPrimary;
        }
        return normalizeCountryCode(fallbackCountry);
    }

    public static String normalizeCountryCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String key = canonicalizeCountryKey(value);
        if (key.isBlank()) {
            return null;
        }
        return COUNTRY_CODE_LOOKUP.get(key);
    }

    public static String normalizeCountryValue(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String countryCode = normalizeCountryCode(value);
        return countryCode != null ? countryCode : canonicalizeCountryKey(value);
    }

    private static Map<String, String> buildCountryCodeLookup() {
        Map<String, String> lookup = new HashMap<>();
        for (String isoCountry : Locale.getISOCountries()) {
            Locale locale = Locale.of("", isoCountry);
            register(lookup, isoCountry, isoCountry);
            register(lookup, locale.getDisplayCountry(Locale.ENGLISH), isoCountry);
            register(lookup, locale.getDisplayCountry(Locale.ROOT), isoCountry);
            try {
                register(lookup, locale.getISO3Country(), isoCountry);
            } catch (MissingResourceException ignored) {
                // Ignore locales without an ISO3 representation.
            }
        }

        registerAlias(lookup, "USA", "US");
        registerAlias(lookup, "UNITED STATES OF AMERICA", "US");
        registerAlias(lookup, "UK", "GB");
        registerAlias(lookup, "GREAT BRITAIN", "GB");
        registerAlias(lookup, "ENGLAND", "GB");
        registerAlias(lookup, "SCOTLAND", "GB");
        registerAlias(lookup, "WALES", "GB");
        registerAlias(lookup, "UAE", "AE");
        registerAlias(lookup, "SOUTH KOREA", "KR");
        registerAlias(lookup, "NORTH KOREA", "KP");
        registerAlias(lookup, "RUSSIA", "RU");
        registerAlias(lookup, "VIETNAM", "VN");
        registerAlias(lookup, "LAOS", "LA");
        registerAlias(lookup, "SYRIA", "SY");
        registerAlias(lookup, "IRAN", "IR");
        registerAlias(lookup, "MOLDOVA", "MD");
        registerAlias(lookup, "TANZANIA", "TZ");
        registerAlias(lookup, "BOLIVIA", "BO");
        registerAlias(lookup, "VENEZUELA", "VE");
        registerAlias(lookup, "BRUNEI", "BN");
        registerAlias(lookup, "PALESTINE", "PS");
        registerAlias(lookup, "CZECH REPUBLIC", "CZ");
        registerAlias(lookup, "MYANMAR", "MM");
        registerAlias(lookup, "BURMA", "MM");
        registerAlias(lookup, "MACAU", "MO");
        registerAlias(lookup, "KOSOVO", "XK");

        return Map.copyOf(lookup);
    }

    private static void registerAlias(Map<String, String> lookup, String alias, String isoCountry) {
        register(lookup, alias, isoCountry);
    }

    private static void register(Map<String, String> lookup, String key, String isoCountry) {
        if (key == null || key.isBlank() || isoCountry == null || isoCountry.isBlank()) {
            return;
        }
        lookup.put(canonicalizeCountryKey(key), isoCountry.trim().toUpperCase(Locale.ROOT));
    }

    private static String canonicalizeCountryKey(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        normalized = normalized.toUpperCase(Locale.ROOT)
                .replace('&', ' ')
                .replaceAll("[^A-Z0-9]+", " ")
                .trim()
                .replaceAll("\\s+", " ");
        return normalized;
    }
}
