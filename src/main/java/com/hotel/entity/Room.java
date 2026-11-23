package com.hotel.entity;

import com.hotel.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.ColumnDefault;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rooms")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Room extends BaseEntity {

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "room_services", joinColumns = @JoinColumn(name = "room_id"), inverseJoinColumns = @JoinColumn(name = "service_item_id"))
    Set<ServiceItem> services = new HashSet<>();

    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    String roomNumber;

    @Column(nullable = false)
    int floor;

    @Setter(AccessLevel.NONE)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    RoomStatus status = RoomStatus.AVAILABLE;

    @ColumnDefault("true")
    @Column(name = "operational", nullable = false)
    boolean operational = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_type_id", nullable = false)
    RoomType roomType;

    public void changeStatus(RoomStatus newStatus) {
        if (newStatus == null)
            throw new IllegalArgumentException("Status must not be null");
        if (newStatus == this.status)
            return;
        if (!this.status.canTransitionTo(newStatus)) {
            throw new IllegalStateException("Cannot change room status from " + this.status + " to " + newStatus);
        }
        this.status = newStatus;
    }

    public boolean isAvailable() {
        return operational && this.status == RoomStatus.AVAILABLE;
    }
}
