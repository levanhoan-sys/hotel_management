package com.hotel.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "room_blocks", indexes = {
        @jakarta.persistence.Index(name = "idx_room_block_range", columnList = "room_id, start_date, end_date")
})
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RoomBlock extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    Room room;

    @Column(name = "start_date", nullable = false)
    LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    LocalDate endDate;

    @Column(nullable = false, length = 255)
    String reason;

    public RoomBlock(Room room, LocalDate startDate, LocalDate endDate, String reason) {
        this.room = room;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
    }
}
