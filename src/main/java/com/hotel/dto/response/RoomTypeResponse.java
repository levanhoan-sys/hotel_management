package com.hotel.dto.response;

import com.hotel.entity.RoomType;
import java.math.BigDecimal;

public record RoomTypeResponse(Long id, String name, BigDecimal basePrice, int capacity, String description, String imageUrl, Double areaSqm, String amenities) {
    public static RoomTypeResponse from(RoomType type) {
        return new RoomTypeResponse(type.getId(), type.getName(), type.getBasePrice(), type.getCapacity(), type.getDescription(), type.getImageUrl(), type.getAreaSqm(), type.getAmenities());
    }
}

