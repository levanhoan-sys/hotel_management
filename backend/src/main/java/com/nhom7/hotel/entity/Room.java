package com.nhom7.hotel.entity;

import com.nhom7.hotel.enums.RoomStatus;
import com.nhom7.hotel.strategy.pricing.PricingStrategy;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "room_number", nullable = false, unique = true, length = 10)
    String roomNumber;

    @Column(nullable = false)
    int floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Setter(AccessLevel.NONE)
    RoomStatus status = RoomStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_type_id", nullable = false)
    RoomType roomType;

    public boolean isAvailable(LocalDate from, LocalDate to) {
        if (from == null || to == null || !to.isAfter(from)) {
            throw new IllegalArgumentException("Invalid date range");
        }
        return status != RoomStatus.MAINTENANCE;
    }

    public double calculateFinalPrice(int nights, PricingStrategy strategy) {
        if (strategy == null) {
            throw new IllegalArgumentException("Pricing strategy must not be null");
        }
        return strategy.computePrice(roomType.getBasePrice(), nights);
    }

    public void changeStatus(RoomStatus newStatus) {
        if (newStatus == null) {
            throw new IllegalArgumentException("Status must not be null");
        }
        if (newStatus == this.status) {
            return;
        }
        if (!this.status.canTransitionTo(newStatus)) {
            throw new IllegalStateException("Cannot change room status from " + this.status + " to " + newStatus);
        }
        this.status = newStatus;
    }
}
