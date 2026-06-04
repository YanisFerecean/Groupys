package com.groupys.service;

import com.groupys.model.ProfileView;
import com.groupys.model.User;
import com.groupys.repository.ProfileViewRepository;
import com.groupys.repository.UserRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.UUID;

/** Records profile views that feed the "👀 N people viewed your profile" retention teaser. */
@ApplicationScoped
public class ProfileViewService {

    @Inject
    UserRepository userRepository;

    @Inject
    ProfileViewRepository profileViewRepository;

    @Transactional
    public void record(String viewerClerkId, UUID viewedUserId) {
        User viewer = userRepository.findByClerkId(viewerClerkId).orElse(null);
        if (viewer == null || viewedUserId == null || viewer.id.equals(viewedUserId)) {
            return; // ignore self-views and unknown viewers
        }
        User viewed = userRepository.findById(viewedUserId);
        if (viewed == null) {
            return;
        }
        ProfileView view = new ProfileView();
        view.viewer = viewer;
        view.viewed = viewed;
        profileViewRepository.persist(view);
    }
}
