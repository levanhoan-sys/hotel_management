package com.nhom7.hotel.repository;

import com.nhom7.hotel.entity.Room;
import com.nhom7.hotel.enums.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

//code chay tam
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


// code chuan neu co query findAvailableRoom tham chieu toi bookingDetails,...
// @Repository
// public interface RoomRepository extends JpaRepository<Room, String> {

//     boolean existsByRoomNumber(String roomNumber);

//     boolean existsByRoomNumberAndIdNot(String roomNumber, String id);

//     boolean existsByRoomTypeId(String roomTypeId);

//     List<Room> findByStatus(RoomStatus status);

//     @Query("SELECT r FROM Room r JOIN FETCH r.roomType ORDER BY r.roomNumber")
//     List<Room> findAllWithRoomType();

//     @Query("""
//             SELECT r FROM Room r JOIN FETCH r.roomType rt
//             WHERE r.status <> com.nhom7.hotel.enums.RoomStatus.MAINTENANCE
//               AND (:roomTypeId IS NULL OR rt.id = :roomTypeId)
//               AND (:guests IS NULL OR rt.capacity >= :guests)
//               AND NOT EXISTS (
//                     SELECT 1 FROM BookingDetail bd
//                     WHERE bd.room = r
//                       AND bd.booking.status IN (
//                             com.nhom7.hotel.enums.BookingStatus.PENDING,
//                             com.nhom7.hotel.enums.BookingStatus.CONFIRMED,
//                             com.nhom7.hotel.enums.BookingStatus.CHECKED_IN)
//                       AND bd.booking.checkInDate < :checkOut
//                       AND bd.booking.checkOutDate > :checkIn)
//             ORDER BY r.roomNumber
//             """)
//     List<Room> findAvailableRooms(@Param("checkIn") LocalDate checkIn,
//                                   @Param("checkOut") LocalDate checkOut,
//                                   @Param("guests") Integer guests,
//                                   @Param("roomTypeId") String roomTypeId);

//     @Query("""
//             SELECT COUNT(bd) FROM BookingDetail bd
//             WHERE bd.room.id = :roomId
//               AND bd.booking.status IN (
//                     com.nhom7.hotel.enums.BookingStatus.PENDING,
//                     com.nhom7.hotel.enums.BookingStatus.CONFIRMED,
//                     com.nhom7.hotel.enums.BookingStatus.CHECKED_IN)
//               AND bd.booking.checkInDate < :checkOut
//               AND bd.booking.checkOutDate > :checkIn
//             """)
//     long countConflictingBookings(@Param("roomId") String roomId,
//                                   @Param("checkIn") LocalDate checkIn,
//                                   @Param("checkOut") LocalDate checkOut);
// }
