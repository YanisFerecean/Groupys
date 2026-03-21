package com.groupys.resource;

import com.groupys.dto.PostResDto;
import com.groupys.service.PostService;
import com.groupys.service.StorageService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.quarkus.security.Authenticated;
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
    @Path("/community/{communityId}")
    public List<PostResDto> getByCommunity(@PathParam("communityId") UUID communityId) {
        return postService.getByCommunity(communityId);
    }

    @POST
    @Path("/community/{communityId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response create(
            @PathParam("communityId") UUID communityId,
            @RestForm("content") String content,
            @RestForm("file") FileUpload file) {

        String clerkId = jwt.getSubject();
        String mediaUrl = null;
        String mediaType = null;

        if (file != null && file.size() > 0) {
            try {
                mediaType = file.contentType();
                InputStream is = Files.newInputStream(file.uploadedFile());
                mediaUrl = storageService.upload(file.fileName(), mediaType, is, file.size());
                is.close();
            } catch (Exception e) {
                throw new InternalServerErrorException("File upload failed", e);
            }
        }

        PostResDto created = postService.create(communityId, content, mediaUrl, mediaType, clerkId);
        return Response.status(Response.Status.CREATED).entity(created).build();
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
    public Response getMedia(@PathParam("key") String key) {
        try {
            StatObjectResponse stat = minioClient.statObject(
                    StatObjectArgs.builder().bucket("posts").object(key).build());
            InputStream stream = minioClient.getObject(
                    GetObjectArgs.builder().bucket("posts").object(key).build());
            return Response.ok(stream)
                    .header("Content-Type", stat.contentType())
                    .header("Cache-Control", "public, max-age=31536000, immutable")
                    .build();
        } catch (Exception e) {
            throw new NotFoundException("Media not found");
        }
    }
}
