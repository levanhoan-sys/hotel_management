package com.hotel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "room_type_images", indexes = {
        @Index(name = "idx_room_type_images_type_order", columnList = "room_type_id, display_order")
})
public class RoomTypeImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(length = 255)
    private String caption;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 1;

    public RoomTypeImage(RoomType roomType, String imageUrl, String caption, int displayOrder) {
        this.roomType = roomType;
        this.imageUrl = imageUrl;
        this.caption = caption;
        this.displayOrder = displayOrder;
    }
}
