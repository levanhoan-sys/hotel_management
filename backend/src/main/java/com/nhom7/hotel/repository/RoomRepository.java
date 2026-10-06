package com.nhom7.hotel.repository;

import com.nhom7.hotel.entity.Room;
import com.nhom7.hotel.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {

    boolean existsByRoomNumber(String roomNumber);

    boolean existsByRoomNumberAndIdNot(String roomNumber, String id);

    boolean existsByRoomTypeId(String roomTypeId);

    List<Room> findByStatus(RoomStatus status);

    @Query("SELECT r FROM Room r JOIN FETCH r.roomType ORDER BY r.roomNumber")
    List<Room> findAllWithRoomType();

    @Query("""
            SELECT r FROM Room r JOIN FETCH r.roomType rt
            WHERE r.status <> com.nhom7.hotel.enums.RoomStatus.MAINTENANCE
              AND (:roomTypeId IS NULL OR rt.id = :roomTypeId)
              AND (:guests IS NULL OR rt.capacity >= :guests)
              AND :checkIn IS NOT NULL
              AND :checkOut IS NOT NULL
            ORDER BY r.roomNumber
            """)
    List<Room> findAvailableRooms(@Param("checkIn") LocalDate checkIn,
                                  @Param("checkOut") LocalDate checkOut,
                                  @Param("guests") Integer guests,
                                  @Param("roomTypeId") String roomTypeId);
}