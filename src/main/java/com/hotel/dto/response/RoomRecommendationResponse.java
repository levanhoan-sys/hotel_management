package com.hotel.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RoomRecommendationResponse {
    private RoomResponse room;
    private int score;
    private BigDecimal priceDifference;
    private Integer availableQuantity;
    private boolean availabilityChecked;
}
