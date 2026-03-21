package com.groupys.service;

import com.groupys.dto.UserCreateDto;
import com.groupys.dto.UserResDto;
import com.groupys.dto.UserUpdateDto;
import com.groupys.model.User;
import com.groupys.repository.UserRepository;
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

    public List<UserResDto> listAll() {
        return userRepository.listAll().stream()
                .map(UserUtil::toDto)
                .toList();
    }

    public UserResDto getById(UUID id) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return UserUtil.toDto(user);
    }

    public UserResDto getByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return UserUtil.toDto(user);
    }

    public UserResDto getByClerkId(String clerkId) {
        User user = userRepository.findByClerkId(clerkId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return UserUtil.toDto(user);
    }

    public Optional<UserResDto> findByClerkId(String clerkId) {
        return userRepository.findByClerkId(clerkId).map(UserUtil::toDto);
    }

    @Transactional
    public UserResDto create(UserCreateDto dto) {
        User user = new User();
        user.clerkId = dto.clerkId();
        user.username = dto.username();
        user.displayName = dto.displayName();
        user.bio = dto.bio();
        userRepository.persist(user);
        return UserUtil.toDto(user);
    }

    @Transactional
    public UserResDto update(UUID id, UserUpdateDto dto) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.displayName = dto.displayName();
        user.bio = dto.bio();
        user.country = dto.country();
        user.bannerUrl = dto.bannerUrl();
        user.accentColor = dto.accentColor();
        user.nameColor = dto.nameColor();
        if (dto.widgets() != null) {
            user.widgets = dto.widgets();
        }
        return UserUtil.toDto(user);
    }

    @Transactional
    public void delete(UUID id) {
        User user = userRepository.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        userRepository.delete(user);
    }
}
