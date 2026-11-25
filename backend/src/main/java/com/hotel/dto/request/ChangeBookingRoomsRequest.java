package com.hotel.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.util.List;
import java.util.Map;

public record ChangeBookingRoomsRequest(@NotEmpty List<Long> roomIds,
                                        Map<Long, @Positive Integer> guestCounts) { }
