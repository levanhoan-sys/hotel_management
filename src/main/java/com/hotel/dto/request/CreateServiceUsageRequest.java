package com.hotel.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateServiceUsageRequest(@NotNull Long bookingRoomId,
                                        @NotNull Long serviceItemId,
                                        @Min(1) int quantity) { }
