package com.hotel.dto.response;

import com.hotel.entity.Room;
import com.hotel.entity.ServiceItem;
import com.hotel.enums.RoomStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private String roomNumber;
    private int floor;
    private RoomStatus status;
    private boolean operational;
    private String roomTypeName;
    private double basePrice;
    private int capacity;
    private String description;
    private String imageUrl;
    private List<String> imageUrls;
    private Double areaSqm;
    private String amenities;
    private List<ServiceItemResponse> services;

    public static RoomResponse fromEntity(Room room) {
        List<String> urls = room.getImageUrls();
        String primaryImage = !urls.isEmpty()
                ? urls.getFirst()
                : (room.getRoomType() != null ? room.getRoomType().getImageUrl() : null);

        return RoomResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .status(room.getStatus())
                .operational(room.isOperational())
                .roomTypeName(room.getRoomType() != null ? room.getRoomType().getName() : null)
                .basePrice(room.getRoomType() != null ? room.getRoomType().getBasePrice() : 0.0)
                .capacity(room.getRoomType() != null ? room.getRoomType().getCapacity() : 0)
                .description(room.getRoomType() != null ? room.getRoomType().getDescription() : null)
                .imageUrl(primaryImage)
                .imageUrls(urls)
                .areaSqm(room.getRoomType() != null ? room.getRoomType().getAreaSqm() : null)
                .amenities(room.getRoomType() != null ? room.getRoomType().getAmenities() : null)
                .services(room.getServices().stream()
                        .filter(ServiceItem::isActive)
                        .map(ServiceItemResponse::from)
                        .toList())
                .build();
    }
}
