package com.hotel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "booking_details", uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_detail_room", columnNames = {"booking_id", "room_id"})
}, indexes = {
        @Index(name = "idx_booking_detail_room", columnList = "room_id")
})
public class BookingDetail extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "price_per_night", nullable = false, precision = 15, scale = 2)
    private BigDecimal pricePerNight;

    @ColumnDefault("1")
    @Column(name = "guest_count", nullable = false)
    private int guestCount = 1;

    public BookingDetail(Booking booking, Room room, BigDecimal pricePerNight) {
        this(booking, room, pricePerNight, 1);
    }

    public BookingDetail(Booking booking, Room room, BigDecimal pricePerNight, int guestCount) {
        this.booking = booking;
        this.room = room;
        this.pricePerNight = pricePerNight;
        this.guestCount = guestCount;
    }

    public BookingDetail(Booking booking, Room room, double pricePerNight) {
        this(booking, room, BigDecimal.valueOf(pricePerNight), 1);
    }

    public BookingDetail(Booking booking, Room room, double pricePerNight, int guestCount) {
        this(booking, room, BigDecimal.valueOf(pricePerNight), guestCount);
    }

    public double getPricePerNightDouble() {
        return pricePerNight != null ? pricePerNight.doubleValue() : 0.0;
    }
}

