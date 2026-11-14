package com.hotel.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateRoomBlockRequest(@NotNull LocalDate startDate,
                                     @NotNull LocalDate endDate,
                                     @NotBlank @Size(max = 255) String reason) { }
