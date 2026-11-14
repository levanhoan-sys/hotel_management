package com.hotel.builder;

import com.hotel.entity.Booking;
import com.hotel.entity.Customer;
import com.hotel.entity.Room;
import com.hotel.enums.BookingStatus;
import com.hotel.strategy.pricing.PricingStrategy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class BookingBuilder {

    private Customer customer;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private final List<Room> rooms = new ArrayList<>();
    private PricingStrategy pricingStrategy;
    private BookingStatus status = BookingStatus.PENDING;

    public static BookingBuilder builder() {
        return new BookingBuilder();
    }

    public BookingBuilder customer(Customer customer) {
        this.customer = customer;
        return this;
    }

    public BookingBuilder dates(LocalDate checkInDate, LocalDate checkOutDate) {
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        return this;
    }

    public BookingBuilder addRoom(Room room) {
        if (room != null) {
            this.rooms.add(room);
        }
        return this;
    }

    public BookingBuilder addRooms(List<Room> rooms) {
        if (rooms != null) {
            this.rooms.addAll(rooms);
        }
        return this;
    }

    public BookingBuilder pricingStrategy(PricingStrategy strategy) {
        this.pricingStrategy = strategy;
        return this;
    }

    public BookingBuilder status(BookingStatus status) {
        this.status = status;
        return this;
    }

    public Booking build() {
        if (customer == null) {
            throw new IllegalStateException("Customer is required for a Booking");
        }
        if (checkInDate == null || checkOutDate == null) {
            throw new IllegalStateException("Check-in and Check-out dates are required");
        }
        if (checkOutDate.isBefore(checkInDate)) {
            throw new IllegalStateException("Check-out date cannot be before check-in date");
        }
        if (rooms.isEmpty()) {
            throw new IllegalStateException("At least one room must be assigned to the booking");
        }

        Booking booking = new Booking(customer, checkInDate, checkOutDate);
        booking.setStatus(this.status);

        for (Room room : rooms) {
            double basePrice = room.getRoomType().getBasePrice();
            double pricePerNight = basePrice;
            if (pricingStrategy != null) {
                pricePerNight = pricingStrategy.computePrice(basePrice, 1);
            }
            booking.addBookingDetail(room, pricePerNight);
        }

        return booking;
    }
}
