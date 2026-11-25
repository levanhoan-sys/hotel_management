package com.hotel.entity;

import com.hotel.enums.AccountStatus;
import com.hotel.enums.RoleName;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    protected String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    protected String password;

    @Column(name = "full_name", nullable = false, length = 150)
    protected String fullName;

    @Column(nullable = false, unique = true, length = 150)
    protected String email;

    @Column(length = 30)
    protected String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    protected RoleName role;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'ACTIVE'")
    @Column(name = "account_status", nullable = false, length = 20)
    protected AccountStatus accountStatus = AccountStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public User(String username, String password, String fullName, String email, String phone, RoleName role) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
    }

    public boolean isActive() {
        return accountStatus == AccountStatus.ACTIVE;
    }

    public void updateProfile(String fullName, String email, String phone) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void lock() {
        this.accountStatus = AccountStatus.LOCKED;
    }

    public void activate() {
        this.accountStatus = AccountStatus.ACTIVE;
    }
}
