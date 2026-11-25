package com.hotel.repository;

import com.hotel.entity.Payment;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.PaymentStatus;
import com.hotel.enums.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    List<Payment> findByBookingIdOrderByCreatedAtDesc(Long bookingId);
    boolean existsByBookingIdAndTypeAndStatus(Long bookingId, PaymentType type, PaymentStatus status);
    Optional<Payment> findFirstByBookingIdAndTypeOrderByCreatedAtDesc(Long bookingId, PaymentType type);
    boolean existsByMethodAndReferenceAndStatus(PaymentMethod method, String reference, PaymentStatus status);
}
