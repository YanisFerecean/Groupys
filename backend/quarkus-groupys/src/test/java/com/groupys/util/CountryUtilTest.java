package com.groupys.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class CountryUtilTest {

    @Test
    void resolvesIsoCodeFromCountryName() {
        assertEquals("MM", CountryUtil.resolveCountryCode(null, "Myanmar"));
        assertEquals("AT", CountryUtil.resolveCountryCode(null, "Austria"));
    }

    @Test
    void normalizesExistingCountryCode() {
        assertEquals("AT", CountryUtil.normalizeCountryCode(" at "));
        assertEquals("GB", CountryUtil.normalizeCountryCode("uk"));
    }

    @Test
    void returnsNullForUnknownCountry() {
        assertNull(CountryUtil.resolveCountryCode(null, "Atlantis"));
    }
}
