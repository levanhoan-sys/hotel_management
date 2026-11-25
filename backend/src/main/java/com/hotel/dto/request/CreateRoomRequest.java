package com.hotel.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
public class CreateRoomRequest {
    @NotBlank(message = "Room number cannot be blank")
    private String roomNumber;

    @Min(value = 1, message = "Floor must be at least 1")
    private int floor;

    @NotNull(message = "Room type ID is required")
    private Long roomTypeId;

    private Set<Long> serviceIds = new HashSet<>();

    private List<String> imageUrls;
}
