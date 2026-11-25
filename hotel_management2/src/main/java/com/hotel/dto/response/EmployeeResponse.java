package com.hotel.dto.response;

import com.hotel.entity.Employee;
import com.hotel.entity.Receptionist;
import com.hotel.enums.AccountStatus;
import com.hotel.enums.RoleName;
import java.time.LocalDate;

public record EmployeeResponse(Long id, String username, String fullName, String email, String phone,
        String employeeCode, Double salary, LocalDate hireDate, Integer deskNumber,
        RoleName role, AccountStatus accountStatus) {
    public static EmployeeResponse from(Employee employee) {
        return new EmployeeResponse(employee.getId(), employee.getUsername(), employee.getFullName(),
                employee.getEmail(), employee.getPhone(), employee.getEmployeeCode(), employee.getSalary(),
                employee.getHireDate(), employee instanceof Receptionist receptionist ? receptionist.getDeskNumber() : null,
                employee.getRole(), employee.getAccountStatus());
    }
}
