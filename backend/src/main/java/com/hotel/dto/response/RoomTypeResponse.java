package com.hotel.dto.response;

import com.hotel.entity.RoomType;

import java.util.List;

public record RoomTypeResponse(Long id, String name, double basePrice, int capacity, String description,
                               String imageUrl, List<String> imageUrls, Double areaSqm, String amenities) {

    public RoomTypeResponse(Long id, String name, double basePrice, int capacity, String description,
                            String imageUrl, Double areaSqm, String amenities) {
        this(id, name, basePrice, capacity, description, imageUrl,
                (imageUrl != null && !imageUrl.isBlank()) ? List.of(imageUrl) : List.of(),
                areaSqm, amenities);
    }

    public static RoomTypeResponse from(RoomType type) {
        List<String> urls = type.getImageUrls();
        String primaryImage = (type.getImageUrl() != null && !type.getImageUrl().isBlank())
                ? type.getImageUrl()
                : (!urls.isEmpty() ? urls.getFirst() : null);
        return new RoomTypeResponse(type.getId(), type.getName(), type.getBasePrice(), type.getCapacity(),
                type.getDescription(), primaryImage, urls, type.getAreaSqm(), type.getAmenities());
    }
}
