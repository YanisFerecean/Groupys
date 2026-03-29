package com.groupys.service;

import com.groupys.dto.FriendResDto;
import com.groupys.dto.FriendStatusDto;
import com.groupys.model.Friendship;
import com.groupys.model.User;
import com.groupys.repository.FriendshipRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class FriendshipService {

    @Inject
    FriendshipRepository friendshipRepository;

    @Inject
    UserRepository userRepository;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User requireByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private FriendResDto toDto(Friendship f, UUID myId) {
        User other = f.requester.id.equals(myId) ? f.recipient : f.requester;
        return new FriendResDto(
                f.id,
                other.id,
                other.username,
                other.displayName,
                other.profileImage,
                f.status.name()
        );
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    @Transactional
    public FriendResDto sendRequest(String myClerkId, UUID targetUserId) {
        User me = requireByClerkId(myClerkId);
        if (me.id.equals(targetUserId)) {
            throw new BadRequestException("Cannot send a friend request to yourself");
        }
        User target = userRepository.findByIdOptional(targetUserId)
                .orElseThrow(() -> new NotFoundException("Target user not found"));

        friendshipRepository.findBetween(me.id, targetUserId).ifPresent(existing -> {
            throw new BadRequestException("A friendship or request already exists");
        });

        Friendship f = new Friendship();
        f.requester = me;
        f.recipient = target;
        f.status = Friendship.Status.PENDING;
        friendshipRepository.persist(f);
        return toDto(f, me.id);
    }

    @Transactional
    public FriendResDto acceptRequest(String myClerkId, UUID friendshipId) {
        User me = requireByClerkId(myClerkId);
        Friendship f = friendshipRepository.findByIdOptional(friendshipId)
                .orElseThrow(() -> new NotFoundException("Friendship request not found"));

        if (!f.recipient.id.equals(me.id)) {
            throw new ForbiddenException("Not your request to accept");
        }
        if (f.status != Friendship.Status.PENDING) {
            throw new BadRequestException("Request is not pending");
        }
        f.status = Friendship.Status.ACCEPTED;
        return toDto(f, me.id);
    }

    @Transactional
    public void declineOrCancel(String myClerkId, UUID friendshipId) {
        User me = requireByClerkId(myClerkId);
        Friendship f = friendshipRepository.findByIdOptional(friendshipId)
                .orElseThrow(() -> new NotFoundException("Friendship request not found"));

        boolean isParty = f.recipient.id.equals(me.id) || f.requester.id.equals(me.id);
        if (!isParty) {
            throw new ForbiddenException("Not your request");
        }
        friendshipRepository.delete(f);
    }

    @Transactional
    public void removeFriend(String myClerkId, UUID otherUserId) {
        User me = requireByClerkId(myClerkId);
        Friendship f = friendshipRepository.findBetween(me.id, otherUserId)
                .orElseThrow(() -> new NotFoundException("No friendship found"));
        friendshipRepository.delete(f);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<FriendResDto> getFriends(String myClerkId) {
        User me = requireByClerkId(myClerkId);
        return friendshipRepository.findAcceptedByUser(me.id)
                .stream().map(f -> toDto(f, me.id)).toList();
    }

    public List<FriendResDto> getPendingReceived(String myClerkId) {
        User me = requireByClerkId(myClerkId);
        return friendshipRepository.findPendingReceivedBy(me.id)
                .stream().map(f -> toDto(f, me.id)).toList();
    }

    public List<FriendResDto> getPendingSent(String myClerkId) {
        User me = requireByClerkId(myClerkId);
        return friendshipRepository.findPendingSentBy(me.id)
                .stream().map(f -> toDto(f, me.id)).toList();
    }

    public FriendStatusDto getStatus(String myClerkId, UUID targetUserId) {
        User me = requireByClerkId(myClerkId);
        return friendshipRepository.findBetween(me.id, targetUserId)
                .map(f -> {
                    if (f.status == Friendship.Status.ACCEPTED) {
                        return new FriendStatusDto("ACCEPTED", f.id);
                    }
                    if (f.requester.id.equals(me.id)) {
                        return new FriendStatusDto("PENDING_SENT", f.id);
                    }
                    return new FriendStatusDto("PENDING_RECEIVED", f.id);
                })
                .orElse(new FriendStatusDto("NONE", null));
    }
}
