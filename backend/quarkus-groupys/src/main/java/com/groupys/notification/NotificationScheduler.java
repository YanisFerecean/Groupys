package com.groupys.notification;

import com.groupys.model.HotTake;
import com.groupys.model.HotTakeStreak;
import com.groupys.model.User;
import com.groupys.model.UserMatch;
import com.groupys.repository.HotTakeAnswerRepository;
import com.groupys.repository.HotTakeRepository;
import com.groupys.repository.HotTakeStreakRepository;
import com.groupys.repository.NotificationLogRepository;
import com.groupys.repository.ProfileViewRepository;
import com.groupys.repository.UserMatchRepository;
import com.groupys.service.NotificationService;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Retention nudges sent on a schedule. Each job is idempotent via {@link NotificationLogRepository}
 * so a missed/duplicate trigger never double-sends, and each respects per-user prefs + quiet hours
 * (enforced inside {@link NotificationService}).
 */
@ApplicationScoped
public class NotificationScheduler {

    @Inject
    NotificationService notificationService;

    @Inject
    NotificationLogRepository notificationLogRepository;

    @Inject
    HotTakeRepository hotTakeRepository;

    @Inject
    HotTakeStreakRepository hotTakeStreakRepository;

    @Inject
    HotTakeAnswerRepository hotTakeAnswerRepository;

    @Inject
    ProfileViewRepository profileViewRepository;

    @Inject
    UserMatchRepository userMatchRepository;

    /** 18:00 daily — remind users with a live streak who haven't answered today's hot take. */
    @Scheduled(cron = "{groupys.notifications.streak-reminder.cron:0 0 18 * * ?}", identity = "hot-take-streak-reminder")
    @Transactional
    void streakReminder() {
        HotTake current = hotTakeRepository.findCurrent().orElse(null);
        if (current == null) {
            return;
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        String refKey = "streak:" + today;
        int sent = 0;
        for (HotTakeStreak streak : hotTakeStreakRepository.findAtRisk(today, 5000)) {
            UUID userId = streak.user.id;
            if (hotTakeAnswerRepository.findByHotTakeAndUser(current.id, userId).isPresent()) {
                continue; // already answered the current hot take
            }
            if (!notificationLogRepository.record(userId, "STREAK_REMINDER", refKey)) {
                continue; // already nudged today
            }
            NotificationService.Content content = NotificationService.Content.of(
                    "🔥 " + streak.currentStreak + "-day streak",
                    "Answer today's hot take to keep it alive",
                    "/(home)/(feed)?hotTake=1");
            notificationService.notify(userId, NotificationService.Type.STREAK_REMINDER, content);
            sent++;
        }
        Log.infof("Streak reminder job sent %d nudge(s)", sent);
    }

    /** 12:00 daily — tell users how many people viewed their profile in the last 24h (counts only). */
    @Scheduled(cron = "{groupys.notifications.profile-view-teaser.cron:0 0 12 * * ?}", identity = "profile-view-teaser")
    @Transactional
    void profileViewTeaser() {
        Instant since = Instant.now().minus(24, ChronoUnit.HOURS);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        String refKey = "views:" + today;
        int sent = 0;
        for (Object[] row : profileViewRepository.viewedWithCountsSince(since)) {
            UUID viewedId = (UUID) row[0];
            long count = (Long) row[1];
            if (count <= 0) {
                continue;
            }
            if (!notificationLogRepository.record(viewedId, "PROFILE_VIEW", refKey)) {
                continue;
            }
            String title = count == 1 ? "👀 A new visitor" : "👀 " + count + " new visitors";
            String body = count == 1
                    ? "Someone viewed your profile — see who's into your taste"
                    : count + " people viewed your profile in the last day";
            NotificationService.Content content = NotificationService.Content.of(title, body, "/(home)/(profile)");
            notificationService.notify(viewedId, NotificationService.Type.PROFILE_VIEW, content);
            sent++;
        }
        Log.infof("Profile-view teaser job sent %d nudge(s)", sent);
    }

    /** Every 6h — nudge both sides of matches older than 48h that still have no messages. */
    @Scheduled(cron = "{groupys.notifications.match-reengage.cron:0 0 */6 * * ?}", identity = "match-reengagement")
    @Transactional
    void matchReengagement() {
        Instant before = Instant.now().minus(48, ChronoUnit.HOURS);
        int sent = 0;
        for (UserMatch match : userMatchRepository.findStaleUnmessagedActiveMatches(before, 2000)) {
            sent += notifyReengage(match, match.userA, match.userB) ? 1 : 0;
            sent += notifyReengage(match, match.userB, match.userA) ? 1 : 0;
        }
        Log.infof("Match re-engagement job sent %d nudge(s)", sent);
    }

    private boolean notifyReengage(UserMatch match, User recipient, User other) {
        if (!notificationLogRepository.record(recipient.id, "MATCH_REENGAGE", "match:" + match.id)) {
            return false;
        }
        String name = other.displayName != null && !other.displayName.isBlank() ? other.displayName : other.username;
        String deeplink = match.conversation != null
                ? "/(home)/(match)/chat/" + match.conversation.id
                : "/(home)/(match)";
        NotificationService.Content content = NotificationService.Content
                .of("You matched with " + name + " 👋", "Break the ice before it goes cold", deeplink)
                .withImage(other.profileImage);
        notificationService.notify(recipient.id, NotificationService.Type.MATCH_REENGAGE, content);
        return true;
    }
}
