package com.hotel.repository;

import com.hotel.entity.RoomBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RoomBlockRepository extends JpaRepository<RoomBlock, Long> {
    List<RoomBlock> findByRoomIdOrderByStartDateAsc(Long roomId);

    @Query("SELECT COUNT(b) > 0 FROM RoomBlock b WHERE b.room.id = :roomId " +
            "AND b.startDate < :endDate AND b.endDate > :startDate")
    boolean existsOverlap(@Param("roomId") Long roomId,
                          @Param("startDate") LocalDate startDate,
                          @Param("endDate") LocalDate endDate);
}
