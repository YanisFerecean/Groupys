package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppleDeveloperTokenServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void tokenContainsExpectedClaimsAndHeader() throws Exception {
        AppleDeveloperTokenService service = serviceWithGeneratedKey(600L);

        String token = service.getDeveloperToken();
        String[] parts = token.split("\\.");
        assertEquals(3, parts.length);

        JsonNode header = decodeSegment(parts[0]);
        JsonNode payload = decodeSegment(parts[1]);
        assertEquals("ES256", header.path("alg").asText());
        assertEquals("TEST_KEY_ID", header.path("kid").asText());
        assertEquals("TEST_TEAM_ID", payload.path("iss").asText());

        long iat = payload.path("iat").asLong();
        long exp = payload.path("exp").asLong();
        assertTrue(exp > iat);
        assertTrue(exp - iat <= 600L);
    }

    @Test
    void tokenTtlIsClampedToAppleMaximum() throws Exception {
        AppleDeveloperTokenService service = serviceWithGeneratedKey(15777000L + 3600L);
        String token = service.getDeveloperToken();
        JsonNode payload = decodeSegment(token.split("\\.")[1]);
        long ttl = payload.path("exp").asLong() - payload.path("iat").asLong();
        assertTrue(ttl <= 15777000L);
    }

    @Test
    void invalidPrivateKeyMaterialThrows() {
        AppleDeveloperTokenService service = new AppleDeveloperTokenService();
        service.teamId = Optional.of("TEST_TEAM_ID");
        service.keyId = Optional.of("TEST_KEY_ID");
        service.mediaId = "app.groupys.music";
        service.privateKeySource = Optional.of("NOT_A_VALID_KEY");
        service.developerTokenTtlSeconds = 600L;

        assertThrows(IllegalStateException.class, service::getDeveloperToken);
    }

    private AppleDeveloperTokenService serviceWithGeneratedKey(long ttlSeconds) throws Exception {
        AppleDeveloperTokenService service = new AppleDeveloperTokenService();
        service.teamId = Optional.of("TEST_TEAM_ID");
        service.keyId = Optional.of("TEST_KEY_ID");
        service.mediaId = "app.groupys.music";
        service.privateKeySource = Optional.of(toPkcs8Pem(generateEcKeyPair()));
        service.developerTokenTtlSeconds = ttlSeconds;
        return service;
    }

    private JsonNode decodeSegment(String segment) throws Exception {
        byte[] bytes = Base64.getUrlDecoder().decode(segment);
        return objectMapper.readTree(bytes);
    }

    private KeyPair generateEcKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(256);
        return generator.generateKeyPair();
    }

    private String toPkcs8Pem(KeyPair pair) {
        String base64 = Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded());
        StringBuilder builder = new StringBuilder();
        builder.append("-----BEGIN PRIVATE KEY-----\n");
        for (int i = 0; i < base64.length(); i += 64) {
            int end = Math.min(i + 64, base64.length());
            builder.append(base64, i, end).append('\n');
        }
        builder.append("-----END PRIVATE KEY-----\n");
        return builder.toString();
    }
}
