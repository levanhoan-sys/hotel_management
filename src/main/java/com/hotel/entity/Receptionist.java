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
@Table(name = "receptionists")
public class Receptionist extends Employee {

    @Column(name = "desk_number")
    private int deskNumber;

    public Receptionist(String username, String password, String fullName, String email, String phone,
                        String employeeCode, Double salary, LocalDate hireDate, int deskNumber) {
        super(username, password, fullName, email, phone, RoleName.ROLE_RECEPTIONIST, employeeCode, salary, hireDate);
        this.deskNumber = deskNumber;
    }
}
