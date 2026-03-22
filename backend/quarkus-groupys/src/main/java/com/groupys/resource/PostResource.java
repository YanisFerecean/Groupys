package com.groupys.resource;

import com.groupys.dto.PostResDto;
import com.groupys.model.PostMedia;
import com.groupys.service.PostService;
import com.groupys.service.StorageService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.jboss.resteasy.reactive.RestForm;

import java.io.InputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/posts")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class PostResource {

    @Inject
    PostService postService;

    @Inject
    StorageService storageService;

    @Inject
    MinioClient minioClient;

    @Inject
    JsonWebToken jwt;

    @GET
    @Path("/feed")
    public List<PostResDto> getFeed() {
        return postService.getFeed(jwt.getSubject());
    }

    @GET
    @Path("/mine")
    public List<PostResDto> getMyPosts() {
        return postService.getAccountPosts(jwt.getSubject());
    }

    @GET
    @Path("/{id}")
    public PostResDto getById(@PathParam("id") UUID id) {
        return postService.getById(id, jwt.getSubject());
    }

    @GET
    @Path("/community/{communityId}")
    public List<PostResDto> getByCommunity(@PathParam("communityId") UUID communityId) {
        return postService.getByCommunity(communityId, jwt.getSubject());
    }

    @POST
    @Path("/community/{communityId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response create(
            @PathParam("communityId") UUID communityId,
            @RestForm("title") String title,
            @RestForm("content") String content,
            @RestForm("files") List<FileUpload> files) {

        String clerkId = jwt.getSubject();
        List<PostMedia> mediaList = new ArrayList<>();

        if (files != null && !files.isEmpty()) {
            if (files.size() > 4) {
                throw new BadRequestException("Maximum of 4 attachments allowed.");
            }
            int index = 0;
            for (FileUpload file : files) {
                try {
                    String mediaType = file.contentType();
                    InputStream is = Files.newInputStream(file.uploadedFile());
                    String mediaUrl = storageService.upload(file.fileName(), mediaType, is, file.size());
                    is.close();
                    mediaList.add(new PostMedia(mediaUrl, mediaType));
                } catch (Exception e) {
                    throw new InternalServerErrorException("File upload failed", e);
                }
            }
        }

        PostResDto created = postService.create(communityId, title, content, mediaList, clerkId);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @POST
    @Path("/{id}/react")
    @Consumes(MediaType.APPLICATION_JSON)
    public PostResDto react(@PathParam("id") UUID id, ReactionRequest request) {
        return postService.react(id, request.type(), jwt.getSubject());
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") UUID id) {
        String clerkId = jwt.getSubject();
        postService.delete(id, clerkId);
        return Response.noContent().build();
    }

    @GET
    @Path("/media/{key}")
    @Produces(MediaType.WILDCARD)
    @PermitAll
    public Response getMedia(
            @PathParam("key") String key,
            @HeaderParam("Range") String rangeHeader) {
        try {
            StatObjectResponse stat = minioClient.statObject(
                    StatObjectArgs.builder().bucket("posts").object(key).build());
            long totalSize = stat.size();
            String contentType = stat.contentType();

            // Handle range requests (required for video streaming on iOS/Android)
            if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
                String[] parts = rangeHeader.substring(6).split("-");
                long start = Long.parseLong(parts[0]);
                long end = parts.length > 1 && !parts[1].isEmpty()
                        ? Long.parseLong(parts[1])
                        : totalSize - 1;
                end = Math.min(end, totalSize - 1);
                long length = end - start + 1;

                InputStream stream = minioClient.getObject(
                        GetObjectArgs.builder()
                                .bucket("posts").object(key)
                                .offset(start).length(length)
                                .build());
                return Response.status(206)
                        .header("Content-Type", contentType)
                        .header("Content-Length", length)
                        .header("Content-Range", "bytes " + start + "-" + end + "/" + totalSize)
                        .header("Accept-Ranges", "bytes")
                        .header("Cache-Control", "public, max-age=31536000, immutable")
                        .entity(stream)
                        .build();
            }

            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder().bucket("posts").object(key).build());
            return Response.ok(stream)
                    .header("Content-Type", contentType)
                    .header("Content-Length", totalSize)
                    .header("Accept-Ranges", "bytes")
                    .header("Cache-Control", "public, max-age=31536000, immutable")
                    .build();
        } catch (Exception e) {
            throw new NotFoundException("Media not found");
        }
    }

    public record ReactionRequest(String type) {}
}
