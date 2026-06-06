package com.groupys.service;

import com.groupys.config.PerformanceFeatureFlags;
import com.groupys.dto.BlockedUserResDto;
import com.groupys.dto.ReportCreateDto;
import com.groupys.dto.ReportResDto;
import com.groupys.model.Conversation;
import com.groupys.model.Report;
import com.groupys.model.User;
import com.groupys.model.UserBlock;
import com.groupys.model.UserMatch;
import com.groupys.repository.ConversationRepository;
import com.groupys.repository.MessageRepository;
import com.groupys.repository.ReportRepository;
import com.groupys.repository.UserBlockRepository;
import com.groupys.repository.UserMatchRepository;
import com.groupys.repository.UserRepository;
import com.groupys.repository.UserSimilarityCacheRepository;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ModerationService {

    private final UserRepository userRepository;
    private final UserBlockRepository userBlockRepository;
    private final ReportRepository reportRepository;
    private final UserMatchRepository userMatchRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserSimilarityCacheRepository userSimilarityCacheRepository;
    private final DiscoveryRedisCacheService redisCacheService;
    private final PerformanceFeatureFlags flags;

    @Inject
    public ModerationService(
            UserRepository userRepository,
            UserBlockRepository userBlockRepository,
            ReportRepository reportRepository,
            UserMatchRepository userMatchRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserSimilarityCacheRepository userSimilarityCacheRepository,
            DiscoveryRedisCacheService redisCacheService,
            PerformanceFeatureFlags flags) {
        this.userRepository = userRepository;
        this.userBlockRepository = userBlockRepository;
        this.reportRepository = reportRepository;
        this.userMatchRepository = userMatchRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userSimilarityCacheRepository = userSimilarityCacheRepository;
        this.redisCacheService = redisCacheService;
        this.flags = flags;
    }

    // ── Block ───────────────────────────────────────────────────────────────────

    @Transactional
    public void blockUser(String clerkId, UUID targetUserId) {
        User blocker = requireUserByClerkId(clerkId);
        if (blocker.id.equals(targetUserId)) {
            throw new BadRequestException("Cannot block yourself");
        }
        User target = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Idempotent: re-blocking is a no-op.
        if (userBlockRepository.isBlocked(blocker.id, target.id)) {
            return;
        }

        UserBlock block = new UserBlock();
        block.blocker = blocker;
        block.blocked = target;
        userBlockRepository.persist(block);

        // Full block semantics: unmatch and delete the direct conversation.
        unmatchAndDeleteConversation(blocker.id, target.id);

        // Drop each other from recommendation caches so they stop surfacing.
        purgeSimilarityCaches(blocker.id, target.id);
    }

    @Transactional
    public void unblockUser(String clerkId, UUID targetUserId) {
        User blocker = requireUserByClerkId(clerkId);
        Optional<UserBlock> existing = userBlockRepository.findByPair(blocker.id, targetUserId);
        existing.ifPresent(userBlockRepository::delete);
    }

    public List<BlockedUserResDto> getBlockedUsers(String clerkId) {
        User blocker = requireUserByClerkId(clerkId);
        return userBlockRepository.findByBlocker(blocker.id).stream()
                .map(b -> new BlockedUserResDto(
                        b.blocked.id,
                        b.blocked.username,
                        b.blocked.displayName,
                        b.blocked.profileImage,
                        b.createdAt))
                .toList();
    }

    private void unmatchAndDeleteConversation(UUID userId1, UUID userId2) {
        // Detach + retire the match so the FK to the conversation is cleared first.
        UserMatch match = userMatchRepository.findByUsers(userId1, userId2).orElse(null);
        Conversation conversation = null;
        if (match != null) {
            conversation = match.conversation;
            match.conversation = null;
            match.status = "UNMATCHED";
        }
        if (conversation == null) {
            conversation = conversationRepository.findDirectConversation(userId1, userId2).orElse(null);
        }
        if (conversation != null) {
            messageRepository.delete("conversation.id", conversation.id);
            conversationRepository.getEntityManager().flush();
            conversationRepository.delete(conversation);
        }
    }

    private void purgeSimilarityCaches(UUID userId1, UUID userId2) {
        try {
            userSimilarityCacheRepository.delete(
                    "(user.id = ?1 and candidateUser.id = ?2) or (user.id = ?2 and candidateUser.id = ?1)",
                    userId1, userId2);
            if (flags != null && flags.redisEnabled() && flags.redisRecommendationWriteEnabled()) {
                redisCacheService.removeUserCandidate(userId1, userId2);
                redisCacheService.removeUserCandidate(userId2, userId1);
            }
        } catch (Exception e) {
            Log.warnf(e, "Failed to purge similarity caches between %s and %s", userId1, userId2);
        }
    }

    // ── Report ──────────────────────────────────────────────────────────────────

    @Transactional
    public ReportResDto createReport(String clerkId, ReportCreateDto dto) {
        User reporter = requireUserByClerkId(clerkId);

        Report.TargetType targetType = parseTargetType(dto.targetType());
        Report.Reason reason = parseReason(dto.reason());

        Report report = new Report();
        report.reporter = reporter;
        report.targetType = targetType;
        report.targetId = dto.targetId();
        report.reason = reason;
        report.details = dto.details() != null && !dto.details().isBlank() ? dto.details().strip() : null;
        report.status = "PENDING";
        reportRepository.persist(report);

        return toReportDto(report);
    }

    public List<ReportResDto> listReports(String status, int page, int size) {
        return reportRepository.findForReview(status, Math.max(page, 0), Math.min(Math.max(size, 1), 100)).stream()
                .map(this::toReportDto)
                .toList();
    }

    private ReportResDto toReportDto(Report r) {
        return new ReportResDto(
                r.id,
                r.reporter.id,
                r.reporter.username,
                r.targetType.name(),
                r.targetId,
                r.reason.name(),
                r.details,
                r.status,
                r.createdAt);
    }

    private Report.TargetType parseTargetType(String raw) {
        try {
            return Report.TargetType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid target type. Expected one of: USER, MESSAGE, POST, COMMUNITY");
        }
    }

    private Report.Reason parseReason(String raw) {
        try {
            return Report.Reason.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException(
                    "Invalid reason. Expected one of: HARASSMENT, SPAM, INAPPROPRIATE_CONTENT, IMPERSONATION, OTHER");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User requireUserByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
