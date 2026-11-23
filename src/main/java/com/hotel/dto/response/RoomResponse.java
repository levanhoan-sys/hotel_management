package com.hotel.dto.response;

import com.hotel.entity.Room;
import com.hotel.enums.RoomStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RoomResponse {
    private Long id;
    private String roomNumber;
    private int floor;
    private RoomStatus status;
    private boolean operational;
    private String roomTypeName;
    private java.math.BigDecimal basePrice;
    private int capacity;
    private String description;
    private String imageUrl;
    private Double areaSqm;
    private String amenities;
    private java.util.List<ServiceItemResponse> services;

    public static RoomResponse fromEntity(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .floor(room.getFloor())
                .status(room.getStatus())
                .operational(room.isOperational())
                .roomTypeName(room.getRoomType() != null ? room.getRoomType().getName() : null)
                .basePrice(room.getRoomType() != null ? room.getRoomType().getBasePrice() : java.math.BigDecimal.ZERO)
                .capacity(room.getRoomType() != null ? room.getRoomType().getCapacity() : 0)
                .description(room.getRoomType() != null ? room.getRoomType().getDescription() : null)
                .imageUrl(room.getRoomType() != null ? room.getRoomType().getImageUrl() : null)
                .areaSqm(room.getRoomType() != null ? room.getRoomType().getAreaSqm() : null)
                .amenities(room.getRoomType() != null ? room.getRoomType().getAmenities() : null)
                .services(room.getServices().stream().filter(com.hotel.entity.ServiceItem::isActive).map(ServiceItemResponse::from).toList())
                .build();
    }
}
