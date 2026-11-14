package com.hotel.repository;

import com.hotel.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import com.hotel.enums.PaymentStatus;
import com.hotel.enums.PaymentType;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    List<Payment> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
    boolean existsByBookingIdAndTypeAndStatus(Long bookingId, PaymentType type, PaymentStatus status);
    Optional<Payment> findFirstByBookingIdAndTypeOrderByCreatedAtDesc(Long bookingId, PaymentType type);
    boolean existsByMethodAndReferenceAndStatus(com.hotel.enums.PaymentMethod method, String reference, PaymentStatus status);
}
