package com.hotel.entity;

import com.hotel.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rooms")
public class Room extends BaseEntity {

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "room_services", joinColumns = @JoinColumn(name = "room_id"), inverseJoinColumns = @JoinColumn(name = "service_item_id"))
    private java.util.Set<ServiceItem> services = new java.util.HashSet<>();

    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    private String roomNumber;

    @Column(nullable = false)
    private int floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RoomStatus status = RoomStatus.AVAILABLE;

    @ColumnDefault("true")
    @Column(name = "operational", nullable = false)
    private boolean operational = true;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    public boolean isAvailable() {
        return operational && this.status == RoomStatus.AVAILABLE;
    }
}
