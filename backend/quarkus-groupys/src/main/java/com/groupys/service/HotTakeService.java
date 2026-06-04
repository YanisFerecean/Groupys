package com.groupys.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.groupys.dto.HotTakeAnswerCreateDto;
import com.groupys.dto.HotTakeAnswerResDto;
import com.groupys.dto.HotTakeResDto;
import com.groupys.model.Friendship;
import com.groupys.model.HotTake;
import com.groupys.model.HotTakeAnswer;
import com.groupys.model.HotTakeStreak;
import com.groupys.model.User;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.HotTakeAnswerRepository;
import com.groupys.repository.HotTakeRepository;
import com.groupys.repository.HotTakeStreakRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class HotTakeService {

    @Inject
    HotTakeRepository hotTakeRepository;

    @Inject
    HotTakeAnswerRepository hotTakeAnswerRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    FriendshipRepository friendshipRepository;

    @Inject
    HotTakeStreakRepository hotTakeStreakRepository;

    @Inject
    NotificationService notificationService;

    @Inject
    ObjectMapper objectMapper;

    public HotTakeResDto getCurrent() {
        return hotTakeRepository.findCurrent()
                .map(this::toResDto)
                .orElse(null);
    }

    @Transactional
    public HotTakeResDto create(String question, String weekLabel, String answerType, int answerCount) {
        HotTake ht = new HotTake();
        ht.question = question;
        ht.weekLabel = weekLabel != null ? weekLabel : "";
        ht.answerType = answerType != null ? answerType.toUpperCase() : "ARTIST";
        ht.answerCount = Math.max(1, answerCount);
        ht.createdAt = Instant.now();
        hotTakeRepository.persist(ht);
        return toResDto(ht);
    }

    @Transactional
    public HotTakeAnswerResDto submitAnswer(HotTakeAnswerCreateDto dto, String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        HotTake hotTake = hotTakeRepository.findByIdOptional(dto.hotTakeId())
                .orElseThrow(() -> new NotFoundException("Hot take not found"));

        HotTakeAnswer answer = hotTakeAnswerRepository
                .findByHotTakeAndUser(hotTake.id, user.id)
                .orElse(null);

        boolean isFirstAnswer = answer == null;
        if (answer == null) {
            answer = new HotTakeAnswer();
            answer.hotTake = hotTake;
            answer.user = user;
        }

        try {
            answer.answer = objectMapper.writeValueAsString(dto.answers());
            answer.imageUrl = objectMapper.writeValueAsString(dto.imageUrls());
            answer.musicType = objectMapper.writeValueAsString(dto.musicTypes());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize answer picks", e);
        }

        answer.showOnWidget = dto.showOnWidget();
        answer.answeredAt = Instant.now();

        hotTakeAnswerRepository.persist(answer);

        updateStreak(user);
        if (isFirstAnswer) {
            notifyFriendsOfAnswer(user);
        }

        return toAnswerDto(answer);
    }

    /** Bumps the user's daily answering streak — drives the "🔥 N-day streak" retention loop. */
    void updateStreak(User user) {
        HotTakeStreak streak = hotTakeStreakRepository.findByUser(user.id).orElse(null);
        if (streak == null) {
            streak = new HotTakeStreak();
            streak.user = user;
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (today.equals(streak.lastAnswerDate)) {
            return; // already counted today
        }
        if (streak.lastAnswerDate != null && today.minusDays(1).equals(streak.lastAnswerDate)) {
            streak.currentStreak += 1;
        } else {
            streak.currentStreak = 1;
        }
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
        streak.lastAnswerDate = today;
        hotTakeStreakRepository.persist(streak);
    }

    /** Lets accepted friends know a user just answered, nudging them to open the app and compare picks. */
    void notifyFriendsOfAnswer(User user) {
        Set<UUID> friendIds = friendshipRepository.findAcceptedFriendIds(user.id);
        if (friendIds.isEmpty()) {
            return;
        }
        String name = user.displayName != null && !user.displayName.isBlank() ? user.displayName : user.username;
        NotificationService.Content content = NotificationService.Content.of(
                name + " answered today's hot take 🔥",
                "Tap to see their pick and drop yours",
                "/(home)/(feed)?hotTake=1")
                .withImage(user.profileImage);
        notificationService.notifyAll(friendIds, NotificationService.Type.HOT_TAKE, content);
    }

    public HotTakeAnswerResDto getMyAnswer(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        return hotTakeRepository.findCurrent()
                .flatMap(ht -> hotTakeAnswerRepository.findByHotTakeAndUser(ht.id, user.id))
                .map(this::toAnswerDto)
                .orElse(null);
    }

    public HotTakeAnswerResDto getUserAnswer(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        return hotTakeRepository.findCurrent()
                .flatMap(ht -> hotTakeAnswerRepository.findByHotTakeAndUser(ht.id, user.id))
                .map(this::toAnswerDto)
                .orElse(null);
    }

    public List<HotTakeAnswerResDto> getFriendsAnswers(String clerkId) {
        User me = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        HotTake current = hotTakeRepository.findCurrent().orElse(null);
        if (current == null) {
            return List.of();
        }

        boolean hasAnswered = hotTakeAnswerRepository
                .findByHotTakeAndUser(current.id, me.id)
                .isPresent();
        if (!hasAnswered) {
            throw new ForbiddenException("Answer the hot take first to see friends' picks");
        }

        List<UUID> friendIds = friendshipRepository.findAcceptedByUser(me.id)
                .stream()
                .map(f -> f.requester.id.equals(me.id) ? f.recipient.id : f.requester.id)
                .toList();

        return hotTakeAnswerRepository.findByHotTakeAndUsers(current.id, friendIds)
                .stream()
                .map(this::toAnswerDto)
                .toList();
    }

    private HotTakeResDto toResDto(HotTake ht) {
        return new HotTakeResDto(ht.id, ht.question, ht.weekLabel, ht.answerType, ht.answerCount, ht.createdAt);
    }

    private HotTakeAnswerResDto toAnswerDto(HotTakeAnswer a) {
        List<String> answers = parseJsonList(a.answer);
        List<String> imageUrls = parseJsonList(a.imageUrl);
        List<String> musicTypes = parseJsonList(a.musicType);
        return new HotTakeAnswerResDto(
                a.id,
                a.user.id,
                a.user.username,
                a.user.displayName,
                a.user.profileImage,
                answers,
                imageUrls,
                musicTypes,
                a.showOnWidget,
                a.answeredAt
        );
    }

    /** Parses a JSON array string; falls back to a single-element list for legacy plain-string data. */
    private List<String> parseJsonList(String value) {
        if (value == null) return List.of();
        try {
            return objectMapper.readValue(value, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            // Legacy single-value: wrap in list
            return List.of(value);
        }
    }
}
