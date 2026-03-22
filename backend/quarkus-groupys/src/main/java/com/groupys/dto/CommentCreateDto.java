package com.groupys.dto;

import java.util.UUID;

public record CommentCreateDto(String content, UUID parentCommentId) {
}
