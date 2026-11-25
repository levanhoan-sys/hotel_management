package com.hotel.entity;

import com.hotel.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "customers")
public class Customer extends User {

    @Column(name = "identity_card", length = 50)
    private String identityCard;

    @Column(length = 255)
    private String address;

    @Column(name = "loyalty_points", nullable = false)
    private int loyaltyPoints = 0;

    public Customer(String username, String password, String fullName, String email, String phone,
                    String identityCard, String address) {
        super(username, password, fullName, email, phone, RoleName.ROLE_CUSTOMER);
        this.identityCard = identityCard;
        this.address = address;
        this.loyaltyPoints = 0;
    }

    public void addLoyaltyPoints(int points) {
        if (points > 0) {
            this.loyaltyPoints += points;
        }
    }
}
