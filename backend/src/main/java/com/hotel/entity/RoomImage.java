package com.hotel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "room_images", indexes = {
        @Index(name = "idx_room_images_room_order", columnList = "room_id, display_order")
})
public class RoomImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(length = 255)
    private String caption;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 1;

    public RoomImage(Room room, String imageUrl, String caption, int displayOrder) {
        this.room = room;
        this.imageUrl = imageUrl;
        this.caption = caption;
        this.displayOrder = displayOrder;
    }
}
