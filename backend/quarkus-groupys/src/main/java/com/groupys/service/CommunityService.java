package com.groupys.service;

import com.groupys.dto.CommunityCreateDto;
import com.groupys.dto.CommunityMemberResDto;
import com.groupys.dto.CommunityResDto;
import com.groupys.dto.CommunityUpdateDto;
import com.groupys.model.Artist;
import com.groupys.model.Community;
import com.groupys.model.CommunityMember;
import com.groupys.model.User;
import com.groupys.repository.ArtistRepository;
import com.groupys.repository.CommunityMemberRepository;
import com.groupys.repository.CommunityRepository;
import com.groupys.repository.UserRepository;
import com.groupys.util.CommunityUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class CommunityService {

    @Inject
    CommunityRepository communityRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    CommunityMemberRepository communityMemberRepository;

    @Inject
    ArtistRepository artistRepository;

    public List<CommunityResDto> getJoinedCommunities(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return communityMemberRepository.findByUser(user.id).stream()
                .map(m -> CommunityUtil.toDto(m.community))
                .toList();
    }

    public List<CommunityResDto> listAll() {
        return communityRepository.listAll().stream()
                .map(CommunityUtil::toDto)
                .toList();
    }

    public CommunityResDto getById(UUID id) {
        Community community = communityRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        return CommunityUtil.toDto(community);
    }

    public CommunityResDto getByName(String name) {
        Community community = communityRepository.findByName(name)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        return CommunityUtil.toDto(community);
    }

    public List<CommunityResDto> getByGenre(String genre) {
        return communityRepository.findByGenre(genre).stream()
                .map(CommunityUtil::toDto)
                .toList();
    }

    public List<CommunityResDto> getByCountry(String country) {
        return communityRepository.findByCountry(country).stream()
                .map(CommunityUtil::toDto)
                .toList();
    }

    public List<CommunityResDto> getByArtist(Long artistId) {
        return communityRepository.findByArtist(artistId).stream()
                .map(CommunityUtil::toDto)
                .toList();
    }

    @Transactional
    public CommunityResDto create(CommunityCreateDto dto, String clerkId) {
        User creator = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Community community = new Community();
        community.name = dto.name();
        community.description = dto.description();
        community.genre = dto.genre();
        community.country = dto.country();
        community.imageUrl = dto.imageUrl();
        if (dto.artistId() != null) {
            Artist artist = artistRepository.findByIdOptional(dto.artistId())
                    .orElseThrow(() -> new NotFoundException("Artist not found"));
            community.artist = artist;
        }
        if (dto.tags() != null) {
            community.tags = new java.util.ArrayList<>(dto.tags());
        }
        community.memberCount = 1;
        community.createdBy = creator;
        communityRepository.persist(community);

        CommunityMember membership = new CommunityMember();
        membership.community = community;
        membership.user = creator;
        membership.role = "owner";
        communityMemberRepository.persist(membership);

        return CommunityUtil.toDto(community);
    }

    @Transactional
    public CommunityResDto join(UUID communityId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Community community = communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));

        if (communityMemberRepository.findByUserAndCommunity(user.id, communityId).isPresent()) {
            return CommunityUtil.toDto(community);
        }

        CommunityMember membership = new CommunityMember();
        membership.community = community;
        membership.user = user;
        membership.role = "member";
        communityMemberRepository.persist(membership);

        community.memberCount++;
        return CommunityUtil.toDto(community);
    }

    @Transactional
    public CommunityResDto leave(UUID communityId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Community community = communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));

        CommunityMember membership = communityMemberRepository
                .findByUserAndCommunity(user.id, communityId)
                .orElseThrow(() -> new NotFoundException("Not a member"));

        if ("owner".equals(membership.role)) {
            throw new jakarta.ws.rs.BadRequestException("Owner cannot leave the community");
        }

        communityMemberRepository.delete(membership);
        community.memberCount = Math.max(0, community.memberCount - 1);
        return CommunityUtil.toDto(community);
    }

    public boolean isMember(UUID communityId, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return communityMemberRepository.findByUserAndCommunity(user.id, communityId).isPresent();
    }

    public List<CommunityMemberResDto> getMembers(UUID communityId) {
        communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        return communityMemberRepository.findByCommunity(communityId).stream()
                .map(m -> new CommunityMemberResDto(
                        m.id,
                        m.user.id,
                        m.user.username,
                        m.user.displayName,
                        m.user.profileImage,
                        m.role,
                        m.joinedAt
                ))
                .toList();
    }

    @Transactional
    public CommunityResDto update(UUID id, CommunityUpdateDto dto) {
        Community community = communityRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        community.description = dto.description();
        community.genre = dto.genre();
        community.country = dto.country();
        community.imageUrl = dto.imageUrl();
        return CommunityUtil.toDto(community);
    }

    @Transactional
    public void delete(UUID id) {
        Community community = communityRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Community not found"));
        communityRepository.delete(community);
    }
}
