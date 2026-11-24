package com.hotel.controller;

import com.hotel.dto.request.CreateReceptionistRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.EmployeeResponse;
import com.hotel.entity.Employee;
import com.hotel.entity.Receptionist;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final UserRepository users;
    private final PasswordEncoder passwords;

    @GetMapping("/employees")
    public ApiResponse<List<EmployeeResponse>> employees() {
        return ApiResponse.ok(users.findAll().stream().filter(Employee.class::isInstance)
                .map(Employee.class::cast).map(EmployeeResponse::from).toList());
    }

    @PostMapping("/employees/receptionists")
    public ApiResponse<EmployeeResponse> createReceptionist(@Valid @RequestBody CreateReceptionistRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        String code = request.employeeCode().trim();
        if (users.existsByUsername(username)) throw new ConflictException("Username is already in use");
        if (users.existsByEmail(email)) throw new ConflictException("Email is already in use");
        if (users.findAll().stream().filter(Employee.class::isInstance).map(Employee.class::cast)
                .anyMatch(employee -> code.equalsIgnoreCase(employee.getEmployeeCode()))) {
            throw new ConflictException("Employee code is already in use");
        }
        Receptionist receptionist = new Receptionist(username, passwords.encode(request.password()),
                request.fullName().trim(), email, clean(request.phone()), code, request.salary(),
                request.hireDate(), request.deskNumber() == null ? 0 : request.deskNumber());
        return ApiResponse.ok(EmployeeResponse.from(users.save(receptionist)), "Đã tạo tài khoản lễ tân.");
    }

    @PatchMapping("/employees/{id}/active")
    public ApiResponse<EmployeeResponse> setActive(@PathVariable Long id, @RequestParam boolean active) {
        Employee employee = users.findById(id).filter(Employee.class::isInstance).map(Employee.class::cast)
                .orElseThrow(() -> new ResourceNotFoundException("Employee account not found"));
        if (active) employee.activate(); else employee.lock();
        users.save(employee);
        return ApiResponse.ok(EmployeeResponse.from(employee), active ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
