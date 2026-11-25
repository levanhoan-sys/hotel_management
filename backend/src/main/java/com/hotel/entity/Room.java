package com.hotel.entity;

import com.hotel.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "rooms", indexes = {
        @Index(name = "idx_rooms_type_status", columnList = "room_type_id, status")
})
public class Room extends BaseEntity {

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "room_services", joinColumns = @JoinColumn(name = "room_id"), inverseJoinColumns = @JoinColumn(name = "service_item_id"))
    private Set<ServiceItem> services = new HashSet<>();

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

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC, id ASC")
    private List<RoomImage> images = new ArrayList<>();

    public boolean isAvailable() {
        return operational && this.status == RoomStatus.AVAILABLE;
    }

    public List<String> getImageUrls() {
        if (images != null && !images.isEmpty()) {
            return images.stream()
                    .map(RoomImage::getImageUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .toList();
        }
        return roomType != null ? roomType.getImageUrls() : List.of();
    }

    public void replaceImages(List<String> rawUrls) {
        Set<String> unique = new LinkedHashSet<>();
        if (rawUrls != null) {
            for (String url : rawUrls) {
                if (url != null && !url.isBlank()) {
                    unique.add(url.trim());
                }
            }
        }
        this.images.clear();
        int order = 1;
        for (String url : unique) {
            this.images.add(new RoomImage(this, url, null, order++));
        }
    }
}
