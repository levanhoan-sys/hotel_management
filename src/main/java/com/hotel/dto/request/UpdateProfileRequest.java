package com.hotel.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @Size(max = 20) String phone) { }
