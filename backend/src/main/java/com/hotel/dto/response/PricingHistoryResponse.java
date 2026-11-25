package com.hotel.dto.response;

import java.util.List;
import java.util.Map;

public record PricingHistoryResponse(
        List<MonthPoint> months,
        List<RoomTypeSummary> roomTypes,
        double blendedMultiplier) {

    public record MonthPoint(
            String month,
            String label,
            String shortLabel,
            String seasonalContext,
            int occupancyRate,
            long averagePrice,
            Map<String, Long> prices) { }

    public record RoomTypeSummary(
            Long id,
            String name,
            double basePrice,
            long currentPrice,
            long minPrice,
            long maxPrice,
            double changePercent) { }
}
