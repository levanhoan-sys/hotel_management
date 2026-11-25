package com.hotel.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddServiceOrderRequest {

    @NotNull(message = "Service item ID is required")
    private Long serviceItemId;

    // Optional for older clients; inferred only when the booking contains one room.
    private Long bookingRoomId;

    @Min(value = 1, message = "Quantity must be at least 1")
    private int quantity = 1;
}
