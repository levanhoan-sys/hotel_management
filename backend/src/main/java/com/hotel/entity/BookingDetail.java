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
@Table(name = "booking_details", indexes = {
        @Index(name = "idx_booking_details_booking", columnList = "booking_id"),
        @Index(name = "idx_booking_details_room", columnList = "room_id")
})
public class BookingDetail extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "price_per_night", nullable = false, precision = 15, scale = 2)
    private BigDecimal pricePerNight = BigDecimal.ZERO;

    @ColumnDefault("1")
    @Column(name = "guest_count", nullable = false)
    private int guestCount = 1;

    public BookingDetail(Booking booking, Room room, double pricePerNight) {
        this(booking, room, pricePerNight, 1);
    }

    public BookingDetail(Booking booking, Room room, double pricePerNight, int guestCount) {
        this.booking = booking;
        this.room = room;
        this.pricePerNight = BigDecimal.valueOf(pricePerNight);
        this.guestCount = guestCount;
    }

    public double getPricePerNight() {
        return pricePerNight == null ? 0.0 : pricePerNight.doubleValue();
    }

    public void setPricePerNight(double pricePerNight) {
        this.pricePerNight = BigDecimal.valueOf(pricePerNight);
    }
}
