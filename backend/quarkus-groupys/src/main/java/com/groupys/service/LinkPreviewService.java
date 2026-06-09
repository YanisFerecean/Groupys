package com.groupys.service;

import com.groupys.dto.LinkPreviewResDto;
import com.groupys.dto.apple.AppleCatalogAlbum;
import com.groupys.dto.apple.AppleCatalogSong;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Fetches safe OpenGraph metadata and upgrades Apple Music URLs to existing card payloads. */
@ApplicationScoped
public class LinkPreviewService {

    private static final int MAX_BYTES = 512 * 1024;
    private static final int MAX_REDIRECTS = 3;

    @Inject
    AppleCatalogService appleCatalogService;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public LinkPreviewResDto resolve(String rawUrl) {
        URI uri = parseAndValidate(rawUrl);
        LinkPreviewResDto apple = resolveAppleMusic(uri);
        return apple != null ? apple : genericPreview(uri, "LINK_PREVIEW");
    }

    private LinkPreviewResDto resolveAppleMusic(URI uri) {
        if (!"music.apple.com".equalsIgnoreCase(uri.getHost())) {
            return null;
        }
        List<String> parts = List.of(uri.getPath().split("/")).stream()
                .filter(part -> !part.isBlank())
                .toList();
        String storefront = parts.isEmpty() ? "us" : parts.get(0).toLowerCase(Locale.ROOT);
        String itemType = parts.size() > 1 ? parts.get(1).toLowerCase(Locale.ROOT) : "";
        String id = parts.isEmpty() ? null : parts.get(parts.size() - 1);
        String songId = queryParam(uri, "i");

        if (songId != null || "song".equals(itemType)) {
            String resolvedId = songId != null ? songId : id;
            AppleCatalogSong song = appleCatalogService.getSong(storefront, resolvedId).orElse(null);
            if (song != null) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("type", "TRACK");
                payload.put("id", song.id());
                payload.put("title", song.name());
                payload.put("artist", song.artistName());
                put(payload, "album", song.albumName());
                put(payload, "artworkUrl", artwork(song.artworkUrlTemplate(), song.artworkWidth(), song.artworkHeight()));
                put(payload, "previewUrl", song.previewUrl());
                put(payload, "durationMs", song.durationInMillis());
                payload.put("appleMusicUrl", uri.toString());
                return new LinkPreviewResDto("TRACK", "🎵 " + song.name() + " — " + song.artistName(), payload);
            }
        }

        if ("album".equals(itemType) && id != null) {
            AppleCatalogAlbum album = appleCatalogService.getAlbum(storefront, id).orElse(null);
            if (album != null) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("type", "ALBUM");
                payload.put("id", album.id());
                payload.put("title", album.name());
                payload.put("artist", album.artistName());
                put(payload, "artworkUrl", artwork(album.artworkUrlTemplate(), album.artworkWidth(), album.artworkHeight()));
                put(payload, "trackCount", album.trackCount());
                payload.put("appleMusicUrl", uri.toString());
                return new LinkPreviewResDto("ALBUM", "💿 " + album.name() + " — " + album.artistName(), payload);
            }
        }

        if ("playlist".equals(itemType)) {
            return genericPreview(uri, "PLAYLIST");
        }
        return null;
    }

    private LinkPreviewResDto genericPreview(URI uri, String messageType) {
        Document document = fetchDocument(uri);
        String title = firstOrNull(
                metaText(document, "property", "og:title"),
                metaText(document, "name", "twitter:title"),
                document.title(),
                uri.getHost());
        String description = firstOrNull(
                metaText(document, "property", "og:description"),
                metaText(document, "name", "description"),
                metaText(document, "name", "twitter:description"));
        String imageUrl = firstOrNull(
                metaUrl(document, "property", "og:image"),
                metaUrl(document, "name", "twitter:image"));
        String siteName = firstOrNull(metaText(document, "property", "og:site_name"), uri.getHost());
        if (title == null) {
            title = "Shared link";
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", messageType);
        payload.put("url", uri.toString());
        payload.put("title", title);
        put(payload, "description", description);
        put(payload, "imageUrl", imageUrl);
        put(payload, "siteName", siteName);

        if ("PLAYLIST".equals(messageType)) {
            payload.put("id", uri.getPath().substring(uri.getPath().lastIndexOf('/') + 1));
            payload.put("appleMusicUrl", uri.toString());
            put(payload, "curator", siteName);
        }
        return new LinkPreviewResDto(messageType, "🔗 " + title, payload);
    }

    private Document fetchDocument(URI initialUri) {
        URI uri = initialUri;
        for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            validatePublicHttpUri(uri);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(8))
                    .header("Accept", "text/html,application/xhtml+xml")
                    .header("User-Agent", "GroupysLinkPreview/1.0")
                    .GET()
                    .build();
            try {
                HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
                int status = response.statusCode();
                if (status >= 300 && status < 400) {
                    String location = response.headers().firstValue("location")
                            .orElseThrow(() -> new BadRequestException("Preview redirect missing location"));
                    response.body().close();
                    uri = uri.resolve(location);
                    continue;
                }
                if (status < 200 || status >= 300) {
                    response.body().close();
                    throw new BadRequestException("Unable to fetch link preview");
                }
                String contentType = response.headers().firstValue("content-type").orElse("");
                if (!contentType.toLowerCase(Locale.ROOT).contains("text/html")) {
                    response.body().close();
                    throw new BadRequestException("Link does not contain previewable HTML");
                }
                byte[] bytes;
                try (InputStream body = response.body()) {
                    bytes = body.readNBytes(MAX_BYTES + 1);
                }
                if (bytes.length > MAX_BYTES) {
                    throw new BadRequestException("Link preview is too large");
                }
                return Jsoup.parse(new String(bytes, java.nio.charset.StandardCharsets.UTF_8), uri.toString());
            } catch (BadRequestException e) {
                throw e;
            } catch (Exception e) {
                throw new BadRequestException("Unable to fetch link preview");
            }
        }
        throw new BadRequestException("Too many link preview redirects");
    }

    private URI parseAndValidate(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank() || rawUrl.length() > 2048) {
            throw new BadRequestException("A valid URL is required");
        }
        try {
            URI uri = URI.create(rawUrl.trim());
            validatePublicHttpUri(uri);
            return uri;
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("A valid URL is required");
        }
    }

    private void validatePublicHttpUri(URI uri) {
        String scheme = uri.getScheme();
        if (scheme == null || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))
                || uri.getHost() == null || uri.getUserInfo() != null) {
            throw new BadRequestException("Only public HTTP links can be previewed");
        }
        try {
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (isPrivateAddress(address)) {
                    throw new BadRequestException("Private network links cannot be previewed");
                }
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Unable to resolve link host");
        }
    }

    private String metaText(Document document, String attribute, String value) {
        Element element = document.selectFirst("meta[" + attribute + "=\"" + value + "\"]");
        return element != null ? blankToNull(element.attr("content")) : null;
    }

    private String metaUrl(Document document, String attribute, String value) {
        Element element = document.selectFirst("meta[" + attribute + "=\"" + value + "\"]");
        return element != null ? blankToNull(element.attr("abs:content")) : null;
    }

    private String queryParam(URI uri, String name) {
        if (uri.getRawQuery() == null) return null;
        for (String pair : uri.getRawQuery().split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2 && name.equals(parts[0])) {
                return java.net.URLDecoder.decode(parts[1], java.nio.charset.StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private String artwork(String template, Integer sourceWidth, Integer sourceHeight) {
        if (template == null || template.isBlank()) return null;
        int width = sourceWidth != null ? Math.min(sourceWidth, 600) : 600;
        int height = sourceHeight != null ? Math.min(sourceHeight, 600) : 600;
        return template.replace("{w}", String.valueOf(width))
                .replace("{h}", String.valueOf(height))
                .replace("{f}", "jpg");
    }

    private boolean isPrivateAddress(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) {
            return true;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = bytes[0] & 0xff;
            int second = bytes[1] & 0xff;
            return first == 0
                    || (first == 100 && second >= 64 && second <= 127)
                    || (first == 198 && (second == 18 || second == 19))
                    || first >= 224;
        }
        int first = bytes[0] & 0xff;
        return first == 0xfc || first == 0xfd;
    }

    private String firstOrNull(String... values) {
        for (String value : values) {
            String normalized = blankToNull(value);
            if (normalized != null) return normalized;
        }
        return null;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void put(Map<String, Object> map, String key, Object value) {
        if (value != null) map.put(key, value);
    }
}
