package com.groupys.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class AppleDeveloperTokenService {

    private static final long MAX_TTL_SECONDS = 15777000L; // Apple max: 6 months
    private static final long RENEWAL_SKEW_SECONDS = 30L;
    private static final int ES256_SIGNATURE_SIZE = 64;

    @ConfigProperty(name = "music.apple.team-id")
    Optional<String> teamId;

    @ConfigProperty(name = "music.apple.key-id")
    Optional<String> keyId;

    @ConfigProperty(name = "music.apple.private-key")
    Optional<String> privateKeySource;

    @ConfigProperty(name = "music.apple.media-id", defaultValue = "")
    String mediaId;

    @ConfigProperty(name = "music.apple.developer-token-ttl-seconds", defaultValue = "300")
    long developerTokenTtlSeconds;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private volatile IssuedToken cachedToken;
    private volatile PrivateKey signingKey;

    public synchronized String getDeveloperToken() {
        return getIssuedToken().token();
    }

    public synchronized long getDeveloperTokenExpiryEpochSeconds() {
        return getIssuedToken().expiresAtEpochSeconds();
    }

    private IssuedToken getIssuedToken() {
        long now = Instant.now().getEpochSecond();
        IssuedToken current = cachedToken;
        if (current != null && now + RENEWAL_SKEW_SECONDS < current.expiresAtEpochSeconds()) {
            return current;
        }

        long ttl = Math.max(60L, Math.min(developerTokenTtlSeconds, MAX_TTL_SECONDS));
        long issuedAt = now;
        long expiresAt = issuedAt + ttl;
        String token = signDeveloperToken(issuedAt, expiresAt);
        cachedToken = new IssuedToken(token, expiresAt);
        return cachedToken;
    }

    private String signDeveloperToken(long issuedAtEpochSeconds, long expiresAtEpochSeconds) {
        try {
            String resolvedTeamId = requireConfigValue(teamId.orElse(null), "music.apple.team-id");
            String resolvedKeyId = requireConfigValue(keyId.orElse(null), "music.apple.key-id");

            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "ES256");
            header.put("kid", resolvedKeyId);
            header.put("typ", "JWT");

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("iss", resolvedTeamId);
            payload.put("iat", issuedAtEpochSeconds);
            payload.put("exp", expiresAtEpochSeconds);
            if (mediaId != null && !mediaId.isBlank()) {
                payload.put("sub", mediaId.trim());
            }

            String headerSegment = base64Url(objectMapper.writeValueAsBytes(header));
            String payloadSegment = base64Url(objectMapper.writeValueAsBytes(payload));
            String signingInput = headerSegment + "." + payloadSegment;

            Signature signature = Signature.getInstance("SHA256withECDSA");
            signature.initSign(resolveSigningKey());
            signature.update(signingInput.getBytes(StandardCharsets.UTF_8));
            byte[] derSignature = signature.sign();
            byte[] joseSignature = derToJose(derSignature, ES256_SIGNATURE_SIZE);
            return signingInput + "." + base64Url(joseSignature);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign Apple developer token", e);
        }
    }

    private PrivateKey resolveSigningKey() {
        PrivateKey key = signingKey;
        if (key != null) {
            return key;
        }

        synchronized (this) {
            if (signingKey != null) {
                return signingKey;
            }
            String resolvedPrivateKey = requireConfigValue(privateKeySource.orElse(null), "music.apple.private-key");
            signingKey = loadPrivateKey(resolvedPrivateKey);
            return signingKey;
        }
    }

    private PrivateKey loadPrivateKey(String source) {
        try {
            String material = readPrivateKeyMaterial(source);
            String pem = material
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] der = Base64.getDecoder().decode(pem);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
            return KeyFactory.getInstance("EC").generatePrivate(spec);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load Apple private key", e);
        }
    }

    private String requireConfigValue(String value, String configKey) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(configKey + " is required");
        }
        return value.trim();
    }

    private String readPrivateKeyMaterial(String source) throws Exception {
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("music.apple.private-key is required");
        }

        String trimmed = source.trim();
        if (trimmed.contains("BEGIN PRIVATE KEY")) {
            return trimmed.replace("\\n", "\n");
        }

        Path filePath = Path.of(trimmed);
        if (Files.exists(filePath)) {
            Log.debugf("Loading Apple private key from file %s", filePath);
            return Files.readString(filePath, StandardCharsets.UTF_8);
        }

        return trimmed.replace("\\n", "\n");
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static byte[] derToJose(byte[] derSignature, int outputLength) {
        int[] offset = new int[]{0};
        if ((derSignature[offset[0]++] & 0xff) != 0x30) {
            throw new IllegalArgumentException("Invalid ECDSA DER signature format (sequence)");
        }
        int sequenceLength = readDerLength(derSignature, offset);
        if (sequenceLength <= 0 || offset[0] + sequenceLength > derSignature.length) {
            throw new IllegalArgumentException("Invalid ECDSA DER signature sequence length");
        }

        if ((derSignature[offset[0]++] & 0xff) != 0x02) {
            throw new IllegalArgumentException("Invalid ECDSA DER signature format (r marker)");
        }
        int rLength = readDerLength(derSignature, offset);
        byte[] r = copySegment(derSignature, offset, rLength);

        if ((derSignature[offset[0]++] & 0xff) != 0x02) {
            throw new IllegalArgumentException("Invalid ECDSA DER signature format (s marker)");
        }
        int sLength = readDerLength(derSignature, offset);
        byte[] s = copySegment(derSignature, offset, sLength);

        int partLength = outputLength / 2;
        byte[] jose = new byte[outputLength];
        System.arraycopy(toFixedUnsigned(r, partLength), 0, jose, 0, partLength);
        System.arraycopy(toFixedUnsigned(s, partLength), 0, jose, partLength, partLength);
        return jose;
    }

    private static int readDerLength(byte[] bytes, int[] offset) {
        int first = bytes[offset[0]++] & 0xff;
        if ((first & 0x80) == 0) {
            return first;
        }
        int count = first & 0x7f;
        if (count < 1 || count > 4) {
            throw new IllegalArgumentException("Unsupported DER length encoding");
        }
        int length = 0;
        for (int i = 0; i < count; i++) {
            length = (length << 8) | (bytes[offset[0]++] & 0xff);
        }
        return length;
    }

    private static byte[] copySegment(byte[] bytes, int[] offset, int length) {
        if (length < 0 || offset[0] + length > bytes.length) {
            throw new IllegalArgumentException("Invalid DER integer length");
        }
        byte[] result = new byte[length];
        System.arraycopy(bytes, offset[0], result, 0, length);
        offset[0] += length;
        return result;
    }

    private static byte[] toFixedUnsigned(byte[] value, int size) {
        int start = 0;
        while (start < value.length - 1 && value[start] == 0) {
            start++;
        }
        int length = value.length - start;
        if (length > size) {
            throw new IllegalArgumentException("ECDSA signature component overflow");
        }
        byte[] result = new byte[size];
        System.arraycopy(value, start, result, size - length, length);
        return result;
    }

    private record IssuedToken(String token, long expiresAtEpochSeconds) {
    }
}
