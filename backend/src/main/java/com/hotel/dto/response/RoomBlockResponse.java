package com.hotel.dto.response;

import com.hotel.entity.RoomBlock;

import java.time.LocalDate;

public record RoomBlockResponse(Long id, Long roomId, LocalDate startDate, LocalDate endDate, String reason) {
    public static RoomBlockResponse from(RoomBlock block) {
        return new RoomBlockResponse(block.getId(), block.getRoom().getId(),
                block.getStartDate(), block.getEndDate(), block.getReason());
    }
}
