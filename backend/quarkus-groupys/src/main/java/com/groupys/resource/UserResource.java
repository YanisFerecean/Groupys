package com.groupys.resource;

import com.groupys.dto.UserCreateDto;
import com.groupys.dto.UserFollowResDto;
import com.groupys.dto.UserResDto;
import com.groupys.dto.UserUpdateDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
import com.groupys.service.DiscoveryService;
import com.groupys.service.StorageService;
import com.groupys.service.UserService;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

@Path("/users")
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@SecurityRequirement(name = "bearerAuth")
public class UserResource {

    @Inject
    UserService userService;

    @Inject
    UserRepository userRepository;

    @Inject
    DiscoveryService discoveryService;

    @Inject
    StorageService storageService;

    @Inject
    MinioClient minioClient;

    @Inject
    JsonWebToken jwt;

    @GET
    public List<UserResDto> list() {
        return userService.listAll();
    }

    @GET
    @Path("/search")
    public List<UserResDto> search(@QueryParam("q") String query,
                                   @QueryParam("limit") @DefaultValue("10") int limit) {
        return userService.search(jwt.getSubject(), query, limit);
    }

    @GET
    @Path("/{id: [0-9a-fA-F\\-]{36}}")
    public UserResDto getById(@PathParam("id") UUID id) {
        return userService.getById(id);
    }

    @GET
    @Path("/username/{username}")
    public UserResDto getByUsername(@PathParam("username") String username) {
        return userService.getByUsername(username);
    }

    @GET
    @Path("/clerk/{clerkId}")
    public UserResDto getByClerkId(@PathParam("clerkId") String clerkId) {
        return userService.getByClerkId(clerkId);
    }

    @POST
    public Response create(@Valid UserCreateDto dto) {
        if (userService.findByClerkId(dto.clerkId()).isPresent()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("{\"error\":\"User with this clerkId already exists\"}")
                    .build();
        }
        UserResDto created = userService.create(dto);
        return Response.created(URI.create("/api/users/" + created.id())).entity(created).build();
    }

    @PUT
    @Path("/{id: [0-9a-fA-F\\-]{36}}")
    public UserResDto update(@PathParam("id") UUID id, @Valid UserUpdateDto dto) {
        return userService.update(id, dto);
    }

    @POST
    @Path("/{id: [0-9a-fA-F\\-]{36}}/follow")
    public UserFollowResDto follow(@PathParam("id") UUID id) {
        return discoveryService.followUser(jwt.getSubject(), id);
    }

    @DELETE
    @Path("/{id: [0-9a-fA-F\\-]{36}}")
    public Response delete(@PathParam("id") UUID id) {
        userService.delete(id);
        return Response.noContent().build();
    }

    private static final long MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final String BANNER_PREFIX = "/api/users/banner/";

    @POST
    @Path("/banner")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public UserResDto uploadBanner(@RestForm("file") FileUpload file) {
        if (file == null || file.size() == 0) {
            throw new BadRequestException("No file provided");
        }
        if (file.size() > MAX_BANNER_SIZE) {
            throw new BadRequestException("File too large. Maximum size is 5 MB.");
        }
        String contentType = file.contentType();
        if (contentType == null || !(contentType.equals("image/jpeg") || contentType.equals("image/png") || contentType.equals("image/webp"))) {
            throw new BadRequestException("Unsupported format. Use JPG, PNG, or WebP.");
        }
        try {
            // Delete old banner from MinIO if present
            User user = userRepository.findByClerkId(jwt.getSubject())
                .orElseThrow(() -> new NotFoundException("User not found"));
            if (user.bannerUrl != null && user.bannerUrl.startsWith(BANNER_PREFIX)) {
                String oldKey = user.bannerUrl.substring(BANNER_PREFIX.length());
                try {
                    minioClient.removeObject(
                        RemoveObjectArgs.builder().bucket("banners").object(oldKey).build());
                } catch (Exception e) {
                    System.err.println("Failed to delete old banner: " + e.getMessage());
                }
            }

            InputStream is = Files.newInputStream(file.uploadedFile());
            String key = storageService.uploadToBucket("banners", file.fileName(), file.contentType(), is, file.size());
            is.close();
            return userService.updateBanner(jwt.getSubject(), BANNER_PREFIX + key);
        } catch (Exception e) {
            throw new InternalServerErrorException("Banner upload failed", e);
        }
    }

    @GET
    @Path("/banner/{key}")
    @Produces(MediaType.WILDCARD)
    @PermitAll
    public Response getBanner(@PathParam("key") String key) {
        try {
            StatObjectResponse stat = minioClient.statObject(
                StatObjectArgs.builder().bucket("banners").object(key).build());
            InputStream stream = minioClient.getObject(
                GetObjectArgs.builder().bucket("banners").object(key).build());
            return Response.ok(stream)
                .header("Content-Type", stat.contentType())
                .header("Content-Length", stat.size())
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .build();
        } catch (Exception e) {
            throw new NotFoundException("Banner not found");
        }
    }
}
