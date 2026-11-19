package com.hotel.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoomRecommendationResponse {
    private RoomResponse room;
    private int score;
    private double priceDifference;
    private Integer availableQuantity;
    private boolean availabilityChecked;
}
