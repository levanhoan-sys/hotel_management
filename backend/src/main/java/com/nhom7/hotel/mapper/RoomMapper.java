package com.nhom7.hotel.mapper;

import com.nhom7.hotel.dto.request.RoomTypeRequest;
import com.nhom7.hotel.dto.response.RoomResponse;
import com.nhom7.hotel.dto.response.RoomTypeResponse;
import com.nhom7.hotel.entity.Room;
import com.nhom7.hotel.entity.RoomType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RoomMapper {

    @Mapping(source = "roomType.id", target = "roomTypeId")
    @Mapping(source = "roomType.name", target = "roomTypeName")
    @Mapping(source = "roomType.capacity", target = "capacity")
    @Mapping(source = "roomType.basePrice", target = "basePrice")
    @Mapping(target = "nights", ignore = true)
    @Mapping(target = "totalPrice", ignore = true)
    @Mapping(target = "pricingType", ignore = true)
    RoomResponse toRoomResponse(Room room);

    RoomTypeResponse toRoomTypeResponse(RoomType roomType);

    @Mapping(target = "id", ignore = true)
    RoomType toRoomType(RoomTypeRequest request);

    @Mapping(target = "id", ignore = true)
    void updateRoomType(@MappingTarget RoomType roomType, RoomTypeRequest request);
}
