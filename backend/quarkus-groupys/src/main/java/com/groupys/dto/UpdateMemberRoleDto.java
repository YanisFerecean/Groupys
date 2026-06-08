package com.groupys.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateMemberRoleDto(
        @NotBlank
        @Pattern(regexp = "^(admin|member)$", message = "Role must be 'admin' or 'member'")
        String role
) {
}
