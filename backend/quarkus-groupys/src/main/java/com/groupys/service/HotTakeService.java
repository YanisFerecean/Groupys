package com.groupys.service;

import com.groupys.dto.HotTakeAnswerCreateDto;
import com.groupys.dto.HotTakeAnswerResDto;
import com.groupys.dto.HotTakeResDto;
import com.groupys.model.Friendship;
import com.groupys.model.HotTake;
import com.groupys.model.HotTakeAnswer;
import com.groupys.model.User;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.HotTakeAnswerRepository;
import com.groupys.repository.HotTakeRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.util.List;
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

    public HotTakeResDto getCurrent() {
        return hotTakeRepository.findCurrent()
                .map(this::toResDto)
                .orElse(null);
    }

    @Transactional
    public HotTakeResDto create(String question, String weekLabel, String answerType) {
        HotTake ht = new HotTake();
        ht.question = question;
        ht.weekLabel = weekLabel != null ? weekLabel : "";
        ht.answerType = answerType != null ? answerType.toUpperCase() : "ARTIST";
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

        if (answer == null) {
            answer = new HotTakeAnswer();
            answer.hotTake = hotTake;
            answer.user = user;
        }

        answer.answer = dto.answer();
        answer.imageUrl = dto.imageUrl();
        answer.musicType = dto.musicType();
        answer.showOnWidget = dto.showOnWidget();
        answer.answeredAt = Instant.now();

        hotTakeAnswerRepository.persist(answer);
        return toAnswerDto(answer);
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
                .filter(a -> a.showOnWidget)
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
        return new HotTakeResDto(ht.id, ht.question, ht.weekLabel, ht.answerType, ht.createdAt);
    }

    private HotTakeAnswerResDto toAnswerDto(HotTakeAnswer a) {
        return new HotTakeAnswerResDto(
                a.id,
                a.user.id,
                a.user.username,
                a.user.displayName,
                a.user.profileImage,
                a.answer,
                a.imageUrl,
                a.musicType,
                a.showOnWidget,
                a.answeredAt
        );
    }
}
