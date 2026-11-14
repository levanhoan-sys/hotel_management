package com.hotel.repository;

import com.hotel.entity.Room;
import com.hotel.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomNumber(String roomNumber);
    boolean existsByRoomNumberAndIdNot(String roomNumber, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id IN :ids ORDER BY r.id")
    List<Room> findAllByIdForUpdate(@Param("ids") List<Long> ids);

    List<Room> findByStatus(RoomStatus status);

    List<Room> findByRoomTypeId(Long roomTypeId);

    @Query("""
        SELECT r FROM Room r
        WHERE r.operational = true
        AND (r.status = 'AVAILABLE' OR (:checkIn > CURRENT_DATE AND r.status IN ('OCCUPIED', 'CLEANING')))
        AND r.id NOT IN (
            SELECT bd.room.id FROM BookingDetail bd
            JOIN bd.booking b
            WHERE (b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') OR (b.status = 'PENDING_DEPOSIT' AND b.depositDeadline > CURRENT_TIMESTAMP) OR (b.status = 'PENDING_VERIFICATION' AND b.verificationDeadline > CURRENT_TIMESTAMP))
            AND (
                (:checkIn < b.checkOutDate) AND (:checkOut > b.checkInDate)
            )
        )
        AND r.id NOT IN (SELECT rb.room.id FROM RoomBlock rb
            WHERE rb.startDate < :checkOut AND rb.endDate > :checkIn)
    """)
    List<Room> findAvailableRoomsInDateRange(
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut
    );

    @Query("""
        SELECT r FROM Room r JOIN r.roomType t
        WHERE r.operational = true
          AND (:checkIn IS NULL OR r.status = 'AVAILABLE' OR
               (:checkIn > CURRENT_DATE AND r.status IN ('OCCUPIED', 'CLEANING')))
          AND (:roomTypeId IS NULL OR t.id = :roomTypeId)
          AND (:minCapacity IS NULL OR t.capacity >= :minCapacity)
          AND (:minPrice IS NULL OR t.basePrice >= :minPrice)
          AND (:maxPrice IS NULL OR t.basePrice <= :maxPrice)
          AND (:checkIn IS NULL OR NOT EXISTS (
              SELECT bd.id FROM BookingDetail bd JOIN bd.booking b
              WHERE bd.room = r AND (b.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') OR (b.status = 'PENDING_DEPOSIT' AND b.depositDeadline > CURRENT_TIMESTAMP) OR (b.status = 'PENDING_VERIFICATION' AND b.verificationDeadline > CURRENT_TIMESTAMP))
                AND b.checkInDate < :checkOut AND b.checkOutDate > :checkIn
          ))
          AND (:checkIn IS NULL OR NOT EXISTS (
              SELECT rb.id FROM RoomBlock rb
              WHERE rb.room = r AND rb.startDate < :checkOut AND rb.endDate > :checkIn
          ))
        ORDER BY r.roomNumber
        """)
    List<Room> searchRooms(@Param("checkIn") LocalDate checkIn,
                           @Param("checkOut") LocalDate checkOut,
                           @Param("roomTypeId") Long roomTypeId,
                           @Param("minCapacity") Integer minCapacity,
                           @Param("minPrice") Double minPrice,
                           @Param("maxPrice") Double maxPrice);
}
