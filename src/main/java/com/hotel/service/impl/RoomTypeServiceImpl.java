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
    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomTypeById(Long id) {
        RoomType type = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found with ID: " + id));
        return RoomTypeResponse.from(type);
    }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        if (roomTypeRepository.findByName(request.name().trim()).isPresent()) {
            throw new ConflictException("Room type name is already in use");
        }
        RoomType type = new RoomType(request.name().trim(), request.basePrice(), request.capacity(),
                request.description(), request.imageUrl(), request.areaSqm(), request.amenities());
        return RoomTypeResponse.from(roomTypeRepository.save(type));
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        RoomType type = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found with ID: " + id));
        roomTypeRepository.findByName(request.name().trim())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ConflictException("Room type name is already in use");
                });

        type.setName(request.name().trim());
        type.setBasePrice(request.basePrice());
        type.setCapacity(request.capacity());
        type.setDescription(request.description());
        type.setImageUrl(request.imageUrl());
        type.setAreaSqm(request.areaSqm());
        type.setAmenities(request.amenities());
        return RoomTypeResponse.from(type);
    }
}
