package com.hotel.repository;

import com.hotel.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    Optional<Refund> findByBookingId(Long bookingId);
    List<Refund> findByStatusOrderByCreatedAtDesc(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Refund r WHERE r.id = :id")
    Optional<Refund> findByIdForUpdate(@Param("id") Long id);
}
