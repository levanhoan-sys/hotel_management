package com.hotel.controller;

import com.hotel.dto.request.AuthRequest;
import com.hotel.dto.request.RegisterCustomerRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.AuthResponse;
import com.hotel.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(authService.register(request), "Đăng ký thành công"));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ApiResponse.ok(authService.login(request.getUsername(), request.getPassword()), "Đăng nhập thành công");
    }

    @GetMapping("/me")
    public ApiResponse<AuthResponse> me(@AuthenticationPrincipal String username) {
        return ApiResponse.ok(authService.loginProfileToken(username), "Thông tin tài khoản");
    }
}
