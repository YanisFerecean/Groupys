package com.groupys.service;

import com.groupys.dto.UserCreateDto;
import com.groupys.dto.UserResDto;
import com.groupys.dto.UserUpdateDto;
import com.groupys.model.User;
import com.groupys.repository.UserFollowRepository;
import com.groupys.repository.UserRepository;
import com.groupys.util.CountryUtil;
import com.groupys.util.UserUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserService {

    @Inject
    UserRepository userRepository;

    @Inject
    UserFollowRepository userFollowRepository;

    @Inject
    DiscoveryService discoveryService;

    public List<UserResDto> listAll() {
        return userRepository.listAll().stream()
                .map(this::mapUser)
                .toList();
    }

    public UserResDto getById(UUID id) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return mapUser(user);
    }

    public UserResDto getByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return mapUser(user);
    }

    public UserResDto getByClerkId(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return mapUser(user);
    }

    public Optional<UserResDto> findByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId).map(this::mapUser);
    }

    public List<UserResDto> search(String clerkId, String query, int limit) {
        User currentUser = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isBlank()) {
            return List.of();
        }

        int cappedLimit = Math.max(1, Math.min(limit, 20));
        return userRepository.searchByUsernameOrDisplayName(normalizedQuery, currentUser.id, cappedLimit)
                .stream()
                .map(this::mapUser)
                .toList();
    }

    private UserResDto mapUser(User user) {
        long followers = userFollowRepository.countFollowers(user.id);
        long following = userFollowRepository.countFollowing(user.id);
        return UserUtil.toDto(user, followers, following);
    }

    @Transactional
    public UserResDto create(UserCreateDto dto) {
        User user = new User();
        user.clerkId = dto.clerkId();
        user.username = dto.username();
        user.displayName = dto.displayName();
        user.bio = dto.bio();
        user.profileImage = dto.profileImage();
        user.country = dto.country();
        user.countryCode = CountryUtil.resolveCountryCode(dto.countryCode(), dto.country());
        user.tasteSummaryText = dto.tasteSummaryText();
        if (dto.recommendationOptOut() != null) {
            user.recommendationOptOut = dto.recommendationOptOut();
        }
        if (dto.discoveryVisible() != null) {
            user.discoveryVisible = dto.discoveryVisible();
        }
        userRepository.persist(user);
        discoveryService.refreshAfterUserChange(user.id);
        return mapUser(user);
    }

    @Transactional
    public UserResDto update(UUID id, UserUpdateDto dto) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.displayName = dto.displayName();
        user.bio = dto.bio();
        user.country = dto.country();
        user.countryCode = CountryUtil.resolveCountryCode(dto.countryCode(), dto.country());
        user.bannerUrl = dto.bannerUrl();
        user.bannerText = dto.bannerText();
        user.accentColor = dto.accentColor();
        user.nameColor = dto.nameColor();
        if (dto.profileImage() != null) {
            user.profileImage = dto.profileImage();
        }
        if (dto.widgets() != null) {
            user.widgets = dto.widgets();
        }
        if (dto.tags() != null) {
            user.tags = dto.tags();
        }
        if (dto.website() != null) {
            user.website = dto.website();
        }
        if (dto.jobTitle() != null) {
            user.jobTitle = dto.jobTitle();
        }
        if (dto.location() != null) {
            user.location = dto.location();
        }
        if (dto.tasteSummaryText() != null) {
            user.tasteSummaryText = dto.tasteSummaryText();
        }
        if (dto.recommendationOptOut() != null) {
            user.recommendationOptOut = dto.recommendationOptOut();
        }
        if (dto.discoveryVisible() != null) {
            user.discoveryVisible = dto.discoveryVisible();
        }
        discoveryService.refreshAfterUserChange(user.id);
        return mapUser(user);
    }

    @Transactional
    public void delete(UUID id) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        userRepository.delete(user);
    }

    public String getPublicKeyByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.publicKey == null) throw new NotFoundException("Public key not set");
        return user.publicKey;
    }

    @Transactional
    public void savePublicKey(String clerkId, String publicKey) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.publicKey = publicKey;
    }
}
