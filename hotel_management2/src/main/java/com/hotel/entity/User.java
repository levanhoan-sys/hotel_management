package com.hotel.entity;

import com.hotel.enums.RoleName;
import com.hotel.enums.AccountStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    protected String username;

    @Column(nullable = false)
    protected String password;

    @Column(name = "full_name", nullable = false, length = 100)
    protected String fullName;

    @Column(unique = true, length = 100)
    protected String email;

    @Column(length = 20)
    protected String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    protected RoleName role;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'ACTIVE'")
    @Column(name = "account_status", nullable = false, length = 20)
    protected AccountStatus accountStatus = AccountStatus.ACTIVE;

    public User(String username, String password, String fullName, String email, String phone, RoleName role) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
    }

    public boolean isActive() { return accountStatus == AccountStatus.ACTIVE; }

    public void updateProfile(String fullName, String email, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    public void changePassword(String encodedPassword) { this.password = encodedPassword; }

    public void lock() { this.accountStatus = AccountStatus.LOCKED; }

    public void activate() { this.accountStatus = AccountStatus.ACTIVE; }
}
