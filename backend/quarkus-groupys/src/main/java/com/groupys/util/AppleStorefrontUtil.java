package com.groupys.util;

import java.util.Locale;
import java.util.Set;

public final class AppleStorefrontUtil {

    public static final String DEFAULT_STOREFRONT = "us";

    private static final Set<String> KNOWN_STOREFRONTS = Set.of(
            "ae", "ag", "ai", "al", "am", "ao", "ar", "at", "au", "az",
            "bb", "bd", "be", "bf", "bg", "bh", "bj", "bm", "bn", "bo", "br", "bs", "bt", "bw", "by", "bz",
            "ca", "cd", "cg", "ch", "ci", "cl", "cm", "cn", "co", "cr", "cv", "cy", "cz",
            "de", "dk", "dm", "do", "dz",
            "ec", "ee", "eg", "es",
            "fi", "fj", "fm", "fr",
            "ga", "gb", "gd", "ge", "gh", "gm", "gr", "gt", "gw", "gy",
            "hk", "hn", "hr", "hu",
            "id", "ie", "il", "in", "iq", "is", "it",
            "jm", "jo", "jp",
            "ke", "kg", "kh", "kn", "kr", "kw", "ky", "kz",
            "la", "lb", "lc", "li", "lk", "lr", "lt", "lu", "lv", "ly",
            "ma", "md", "mg", "mk", "ml", "mn", "mo", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz",
            "na", "ne", "ng", "ni", "nl", "no", "np", "nz",
            "om",
            "pa", "pe", "pg", "ph", "pk", "pl", "pt", "pw", "py",
            "qa",
            "ro", "rs", "ru", "rw",
            "sa", "sb", "sc", "se", "sg", "si", "sk", "sl", "sn", "sr", "sv", "sz",
            "tc", "td", "th", "tj", "tm", "tn", "to", "tr", "tt", "tw", "tz",
            "ua", "ug", "us", "uy", "uz",
            "vc", "ve", "vg", "vn", "vu",
            "ws",
            "ye", "za", "zm", "zw"
    );

    private AppleStorefrontUtil() {
    }

    public static String resolve(String country) {
        String countryCode = CountryUtil.normalizeCountryCode(country);
        if (countryCode == null || countryCode.isBlank()) {
            return DEFAULT_STOREFRONT;
        }
        String storefront = countryCode.toLowerCase(Locale.ROOT);
        return KNOWN_STOREFRONTS.contains(storefront) ? storefront : DEFAULT_STOREFRONT;
    }
}
