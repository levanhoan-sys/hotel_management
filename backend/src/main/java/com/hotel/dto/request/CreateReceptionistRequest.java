package com.hotel.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateReceptionistRequest(
        @NotBlank @Size(max = 50) String username,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Email @Size(max = 150) String email,
        @Size(max = 30) String phone,
        @NotBlank @Size(max = 50) String employeeCode,
        @PositiveOrZero Double salary,
        @NotNull LocalDate hireDate,
        @PositiveOrZero Integer deskNumber
) { }
