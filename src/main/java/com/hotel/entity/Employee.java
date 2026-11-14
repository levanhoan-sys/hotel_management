package com.hotel.entity;

import com.hotel.enums.RoleName;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "employees")
@Inheritance(strategy = InheritanceType.JOINED)
public abstract class Employee extends User {

    @Column(name = "employee_code", unique = true, length = 30)
    protected String employeeCode;

    @Column(name = "salary")
    protected Double salary;

    @Column(name = "hire_date")
    protected LocalDate hireDate;

    public Employee(String username, String password, String fullName, String email, String phone,
                    RoleName role, String employeeCode, Double salary, LocalDate hireDate) {
        super(username, password, fullName, email, phone, role);
        this.employeeCode = employeeCode;
        this.salary = salary;
        this.hireDate = hireDate;
    }
}
