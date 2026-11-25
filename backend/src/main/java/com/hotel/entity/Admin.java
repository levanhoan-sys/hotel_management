package com.hotel.entity;

import com.hotel.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "admins")
public class Admin extends Employee {

    @Column(name = "admin_level", nullable = false, length = 50)
    private String adminLevel = "SUPER_ADMIN";

    public Admin(String username, String password, String fullName, String email, String phone,
                 String employeeCode, Double salary, LocalDate hireDate, String adminLevel) {
        super(username, password, fullName, email, phone, RoleName.ROLE_ADMIN, employeeCode, salary, hireDate);
        this.adminLevel = (adminLevel == null || adminLevel.isBlank()) ? "SUPER_ADMIN" : adminLevel;
    }
}
