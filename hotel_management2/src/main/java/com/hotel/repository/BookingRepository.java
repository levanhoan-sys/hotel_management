package com.hotel.repository;

import com.hotel.entity.Booking;
import com.hotel.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;
import java.time.Instant;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByCustomerId(Long customerId);
    List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Booking> findAllByOrderByCreatedAtDesc();
    Page<Booking> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    List<Booking> findByStatus(BookingStatus status);
    List<Booking> findByStatusOrderByDepositReportedAtAsc(BookingStatus status);
    long countByStatus(BookingStatus status);
    @Query("SELECT b.id FROM Booking b WHERE b.status = 'PENDING_DEPOSIT' AND b.depositDeadline <= :now")
    List<Long> findExpiredDepositBookingIds(@Param("now") Instant now);

    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    java.util.Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT COUNT(bd) > 0 FROM BookingDetail bd JOIN bd.booking b " +
            "WHERE bd.room.id = :roomId AND (b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') OR (b.status = 'PENDING_DEPOSIT' AND b.depositDeadline > CURRENT_TIMESTAMP) OR (b.status = 'PENDING_VERIFICATION' AND b.verificationDeadline > CURRENT_TIMESTAMP)) " +
            "AND b.checkInDate < :endDate AND b.checkOutDate > :startDate")
    boolean existsRoomBookingOverlap(@Param("roomId") Long roomId,
                                     @Param("startDate") LocalDate startDate,
                                     @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(bd) > 0 FROM BookingDetail bd JOIN bd.booking b " +
            "WHERE bd.room.id = :roomId AND b.id <> :bookingId " +
            "AND (b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') OR (b.status = 'PENDING_DEPOSIT' AND b.depositDeadline > CURRENT_TIMESTAMP) OR (b.status = 'PENDING_VERIFICATION' AND b.verificationDeadline > CURRENT_TIMESTAMP)) " +
            "AND b.checkInDate < :endDate AND b.checkOutDate > :startDate")
    boolean existsOtherRoomBookingOverlap(@Param("roomId") Long roomId,
                                          @Param("bookingId") Long bookingId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(bd) > 0 FROM BookingDetail bd JOIN bd.booking b " +
            "WHERE bd.room.id = :roomId AND (b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') OR (b.status = 'PENDING_DEPOSIT' AND b.depositDeadline > CURRENT_TIMESTAMP) OR (b.status = 'PENDING_VERIFICATION' AND b.verificationDeadline > CURRENT_TIMESTAMP)) " +
            "AND b.checkOutDate > :afterDate")
    boolean existsActiveOrFutureBooking(@Param("roomId") Long roomId, @Param("afterDate") LocalDate afterDate);
}
