package com.hotel.service.impl;

import com.hotel.dto.request.RoomTypeRequest;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.entity.RoomType;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.RoomTypeRepository;
import com.hotel.service.RoomTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomTypeServiceImpl implements RoomTypeService {
    private final RoomTypeRepository roomTypeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getRoomTypes() {
        return roomTypeRepository.findAll().stream().map(RoomTypeResponse::from).toList();
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        String name = request.name().trim();
        if (roomTypeRepository.findByName(name).isPresent())
            throw new ConflictException("Room type name is already in use");

        RoomType roomType = new RoomType(name, request.basePrice(), request.capacity(),
                request.description(), request.imageUrl(), request.areaSqm(), request.amenities());
        return RoomTypeResponse.from(roomTypeRepository.save(roomType));
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        RoomType roomType = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        String name = request.name().trim();
        roomTypeRepository.findByName(name)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ConflictException("Room type name is already in use");
                });

        roomType.setName(name);
        roomType.setBasePrice(request.basePrice());
        roomType.setCapacity(request.capacity());
        roomType.setDescription(request.description());
        roomType.setImageUrl(request.imageUrl());
        roomType.setAreaSqm(request.areaSqm());
        roomType.setAmenities(request.amenities());
        return RoomTypeResponse.from(roomType);
    }
}
