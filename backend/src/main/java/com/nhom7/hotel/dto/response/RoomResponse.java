package com.nhom7.hotel.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nhom7.hotel.enums.PricingType;
import com.nhom7.hotel.enums.RoomStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RoomResponse {
    String id;
    String roomNumber;
    int floor;
    RoomStatus status;
    String roomTypeId;
    String roomTypeName;
    int capacity;
    double basePrice;
    Integer nights;
    Double totalPrice;
    PricingType pricingType;
}
