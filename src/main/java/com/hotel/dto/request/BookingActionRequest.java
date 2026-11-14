package com.hotel.dto.request;

import jakarta.validation.constraints.Size;

public record BookingActionRequest(@Size(max = 500) String reason) { }
