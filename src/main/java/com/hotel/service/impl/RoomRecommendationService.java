package com.hotel.service.impl;

import com.hotel.dto.response.RoomRecommendationResponse;
import com.hotel.dto.response.RoomResponse;
import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomRecommendationService {
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;

    @Transactional(readOnly = true)
    public List<RoomRecommendationResponse> recommend(Long referenceRoomId, Long referenceTypeId,
            LocalDate checkIn, LocalDate checkOut, Integer guests, Integer roomQuantity,
            boolean alternatives, Integer limit) {
        if ((checkIn == null) != (checkOut == null)) throw new BadRequestException("Both check-in and check-out dates are required");
        if (checkIn != null && !checkOut.isAfter(checkIn)) throw new BadRequestException("Check-out date must be after check-in date");
        if (guests != null && guests < 1) throw new BadRequestException("Guest count must be at least 1");
        if (roomQuantity != null && roomQuantity < 1) throw new BadRequestException("Room quantity must be at least 1");
        if (limit != null && (limit < 1 || limit > 12)) throw new BadRequestException("Recommendation limit must be between 1 and 12");

        Room reference = referenceRoomId == null ? null : roomRepository.findById(referenceRoomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + referenceRoomId));
        RoomType refType = reference != null ? reference.getRoomType() : null;
        if (refType == null && referenceTypeId != null) {
            refType = roomTypeRepository.findById(referenceTypeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        }
        if (referenceTypeId != null && refType != null && !referenceTypeId.equals(refType.getId())) throw new BadRequestException("Room and room type references do not match");

        List<Room> inventory = roomRepository.searchRooms(checkIn, checkOut, null, guests, null, null);
        if (checkIn == null) inventory = inventory.stream().filter(r -> r.getStatus() == com.hotel.enums.RoomStatus.AVAILABLE).toList();
        Map<Long, List<Room>> byType = inventory.stream().filter(Room::isOperational)
                .filter(r -> r.getRoomType() != null && (guests == null || r.getRoomType().getCapacity() >= guests))
                .filter(r -> reference == null || !r.getId().equals(reference.getId()))
                .collect(Collectors.groupingBy(r -> r.getRoomType().getId()));

        int required = roomQuantity == null ? 1 : roomQuantity;
        RoomType target = refType;
        return byType.values().stream().filter(group -> group.size() >= required)
                .map(group -> group.getFirst())
                .filter(room -> !alternatives || target == null || !room.getRoomType().getId().equals(target.getId()))
                .map(room -> {
                    RoomType type = room.getRoomType();
                    BigDecimal referencePrice = target == null ? type.getBasePrice() : target.getBasePrice();
                    BigDecimal priceDifference = (type.getBasePrice() != null && referencePrice != null)
                            ? type.getBasePrice().subtract(referencePrice)
                            : BigDecimal.ZERO;
                    int score = score(target, type, guests);
                    return RoomRecommendationResponse.builder().room(RoomResponse.fromEntity(room)).score(score)
                            .priceDifference(priceDifference)
                            .availableQuantity(checkIn == null ? null : byType.get(type.getId()).size())
                            .availabilityChecked(checkIn != null).build();
                }).sorted(Comparator.comparingInt(RoomRecommendationResponse::getScore).reversed()
                        .thenComparing(r -> r.getPriceDifference().abs()))
                .limit(limit == null ? 4 : limit).toList();
    }

    private int score(RoomType reference, RoomType candidate, Integer guests) {
        if (reference == null) return 100;
        double refVal = reference.getBasePrice() != null ? reference.getBasePrice().doubleValue() : 0.0;
        double candVal = candidate.getBasePrice() != null ? candidate.getBasePrice().doubleValue() : 0.0;
        double priceSimilarity = 1 - Math.min(1, Math.abs(refVal - candVal) / Math.max(refVal, 1.0));
        double capacitySimilarity = guests == null ? 1 - Math.min(1, Math.abs(reference.getCapacity() - candidate.getCapacity()) / (double) Math.max(reference.getCapacity(), 1))
                : (candidate.getCapacity() >= guests ? 1 : 0);
        double typeSimilarity = reference.getId().equals(candidate.getId()) ? 1 : 0;
        Set<String> a = tokens(reference.getAmenities()), b = tokens(candidate.getAmenities());
        Set<String> union = new HashSet<>(a); union.addAll(b);
        Set<String> intersection = new HashSet<>(a); intersection.retainAll(b);
        double amenitySimilarity = union.isEmpty() ? 0.5 : intersection.size() / (double) union.size();
        return (int) Math.round(100 * (priceSimilarity * .40 + capacitySimilarity * .25 + typeSimilarity * .20 + amenitySimilarity * .15));
    }

    private Set<String> tokens(String amenities) {
        if (amenities == null || amenities.isBlank()) return Set.of();
        return Arrays.stream(amenities.toLowerCase(Locale.ROOT).split(",|;"))
                .map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toSet());
    }
}
