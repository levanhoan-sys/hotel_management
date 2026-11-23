package com.hotel.entity;

import com.hotel.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "admins")
public class Admin extends Employee {

    @Column(name = "permissions", length = 255)
    private String permissions;

    public Admin(String username, String password, String fullName, String email, String phone,
                 String employeeCode, BigDecimal salary, LocalDate hireDate, String permissions) {
        super(username, password, fullName, email, phone, RoleName.ROLE_ADMIN, employeeCode, salary, hireDate);
        this.permissions = permissions;
    }

    public Admin(String username, String password, String fullName, String email, String phone,
                 String employeeCode, Double salary, LocalDate hireDate, String permissions) {
        super(username, password, fullName, email, phone, RoleName.ROLE_ADMIN, employeeCode, salary, hireDate);
        this.permissions = permissions;
    }
}

