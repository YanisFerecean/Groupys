package com.groupys.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.SongOfWeekCandidateDto;
import com.groupys.dto.SongOfWeekPollDto;
import com.groupys.model.*;
import com.groupys.repository.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Weekly community track poll with reaction-style votes and a pinned winner recap (ticket 6.4). */
@ApplicationScoped
public class SongOfWeekService {

    private final SongOfWeekPollRepository pollRepository;
    private final SongOfWeekCandidateRepository candidateRepository;
    private final SongOfWeekVoteRepository voteRepository;
    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository communityMemberRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public SongOfWeekService(
            SongOfWeekPollRepository pollRepository,
            SongOfWeekCandidateRepository candidateRepository,
            SongOfWeekVoteRepository voteRepository,
            CommunityRepository communityRepository,
            CommunityMemberRepository communityMemberRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.pollRepository = pollRepository;
        this.candidateRepository = candidateRepository;
        this.voteRepository = voteRepository;
        this.communityRepository = communityRepository;
        this.communityMemberRepository = communityMemberRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SongOfWeekPollDto getPoll(UUID communityId, String clerkId) {
        User user = requireUser(clerkId);
        Community community = requireCommunity(communityId);
        closeExpiredPolls();
        SongOfWeekPoll poll = getOrCreateCurrent(community);
        return toDto(poll, user);
    }

    @Transactional
    public SongOfWeekPollDto submitCandidate(UUID communityId, String clerkId, String trackJson) {
        User user = requireMember(communityId, clerkId);
        Community community = requireCommunity(communityId);
        closeExpiredPolls();
        SongOfWeekPoll poll = getOrCreateCurrent(community);
        JsonNode track = parseTrack(trackJson);
        String trackId = track.path("id").asText();
        if (candidateRepository.findOne(poll.id, trackId) == null) {
            SongOfWeekCandidate candidate = new SongOfWeekCandidate();
            candidate.poll = poll;
            candidate.submittedBy = user;
            candidate.trackKey = trackId;
            candidate.trackPayload = write(track);
            candidateRepository.persist(candidate);
            candidateRepository.flush();
        }
        return toDto(poll, user);
    }

    @Transactional
    public SongOfWeekPollDto toggleVote(UUID communityId, UUID candidateId, String clerkId) {
        User user = requireMember(communityId, clerkId);
        closeExpiredPolls();
        SongOfWeekCandidate candidate = candidateRepository.findByIdOptional(candidateId)
                .orElseThrow(() -> new NotFoundException("Candidate not found"));
        if (!candidate.poll.community.id.equals(communityId) || !"OPEN".equals(candidate.poll.status)) {
            throw new BadRequestException("Candidate is not in the active poll");
        }
        SongOfWeekVote existing = voteRepository.findByPollAndUser(candidate.poll.id, user.id);
        if (existing != null && existing.candidate.id.equals(candidateId)) {
            voteRepository.delete(existing);
        } else if (existing != null) {
            existing.candidate = candidate;
        } else {
            SongOfWeekVote vote = new SongOfWeekVote();
            vote.poll = candidate.poll;
            vote.candidate = candidate;
            vote.user = user;
            voteRepository.persist(vote);
        }
        return toDto(candidate.poll, user);
    }

    @Transactional
    public int closeExpiredPolls() {
        LocalDate currentWeek = currentWeekStart();
        int closed = 0;
        for (SongOfWeekPoll poll : pollRepository.findExpiredOpen(currentWeek)) {
            List<SongOfWeekCandidate> candidates = candidateRepository.findByPoll(poll.id);
            Map<UUID, Long> counts = voteCounts(poll.id);
            SongOfWeekCandidate winner = candidates.stream()
                    .max(Comparator
                            .comparingLong((SongOfWeekCandidate candidate) -> counts.getOrDefault(candidate.id, 0L))
                            .thenComparing(candidate -> candidate.createdAt, Comparator.reverseOrder()))
                    .orElse(null);
            poll.status = "CLOSED";
            poll.closedAt = Instant.now();
            if (winner != null) {
                poll.winnerCandidate = winner;
                poll.pinnedAt = poll.closedAt;
                JsonNode track = read(winner.trackPayload);
                long votes = counts.getOrDefault(winner.id, 0L);
                poll.recap = String.format("%s won Song of the Week with %d %s.",
                        track.path("title").asText("The winning track"), votes, votes == 1 ? "vote" : "votes");
            } else {
                poll.recap = "No song was selected this week.";
            }
            closed++;
        }
        return closed;
    }

    private SongOfWeekPoll getOrCreateCurrent(Community community) {
        LocalDate weekStart = currentWeekStart();
        SongOfWeekPoll poll = pollRepository.findForWeek(community.id, weekStart);
        if (poll != null) return poll;
        poll = new SongOfWeekPoll();
        poll.community = community;
        poll.weekStart = weekStart;
        pollRepository.persist(poll);
        pollRepository.flush();
        return poll;
    }

    private SongOfWeekPollDto toDto(SongOfWeekPoll poll, User user) {
        SongOfWeekVote myVote = voteRepository.findByPollAndUser(poll.id, user.id);
        Map<UUID, Long> counts = voteCounts(poll.id);
        List<SongOfWeekCandidateDto> candidates = candidateRepository.findByPoll(poll.id).stream()
                .map(candidate -> toCandidateDto(candidate, counts, myVote))
                .sorted(Comparator.comparingLong(SongOfWeekCandidateDto::voteCount).reversed())
                .toList();

        SongOfWeekPoll previous = pollRepository.findLatestClosed(poll.community.id);
        SongOfWeekCandidateDto pinnedWinner = null;
        String recap = null;
        if (previous != null && previous.winnerCandidate != null) {
            Map<UUID, Long> previousCounts = voteCounts(previous.id);
            pinnedWinner = toCandidateDto(previous.winnerCandidate, previousCounts, null);
            recap = previous.recap;
        }
        Instant endsAt = poll.weekStart.plusDays(7).atStartOfDay(ZoneOffset.UTC).toInstant();
        return new SongOfWeekPollDto(
                poll.id, poll.community.id, poll.weekStart, endsAt, candidates, pinnedWinner, recap);
    }

    private SongOfWeekCandidateDto toCandidateDto(
            SongOfWeekCandidate candidate, Map<UUID, Long> counts, SongOfWeekVote myVote) {
        return new SongOfWeekCandidateDto(
                candidate.id,
                read(candidate.trackPayload),
                counts.getOrDefault(candidate.id, 0L),
                myVote != null && myVote.candidate.id.equals(candidate.id),
                candidate.submittedBy.id);
    }

    private Map<UUID, Long> voteCounts(UUID pollId) {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : voteRepository.countsByPoll(pollId)) {
            counts.put((UUID) row[0], (Long) row[1]);
        }
        return counts;
    }

    private User requireUser(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private User requireMember(UUID communityId, String clerkId) {
        User user = requireUser(clerkId);
        communityMemberRepository.findByUserAndCommunity(user.id, communityId)
                .orElseThrow(() -> new ForbiddenException("Community membership required"));
        return user;
    }

    private Community requireCommunity(UUID communityId) {
        return communityRepository.findByIdOptional(communityId)
                .orElseThrow(() -> new NotFoundException("Community not found"));
    }

    private JsonNode parseTrack(String raw) {
        if (raw == null || raw.isBlank() || raw.length() > 8000) {
            throw new BadRequestException("Invalid track");
        }
        JsonNode track;
        try {
            track = objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new BadRequestException("Invalid track");
        }
        String id = track.path("id").asText(null);
        String title = track.path("title").asText(null);
        String artist = track.path("artist").asText(null);
        String previewUrl = track.path("previewUrl").asText(null);
        if (!"TRACK".equalsIgnoreCase(track.path("type").asText(""))
                || id == null || id.isBlank() || id.length() > 255 || title == null || title.isBlank()
                || artist == null || artist.isBlank() || previewUrl == null
                || (!previewUrl.startsWith("https://") && !previewUrl.startsWith("http://"))) {
            throw new BadRequestException("Song of the Week candidates require a public-preview track");
        }
        return track;
    }

    private String write(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            throw new BadRequestException("Invalid track");
        }
    }

    private JsonNode read(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    private LocalDate currentWeekStart() {
        return LocalDate.now(ZoneOffset.UTC).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
