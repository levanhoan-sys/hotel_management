package com.hotel.controller;

import com.hotel.dto.request.ChangePasswordRequest;
import com.hotel.dto.request.UpdateProfileRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.ProfileResponse;
import com.hotel.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {
    private final AuthService authService;

    @GetMapping
    public ApiResponse<ProfileResponse> profile(@AuthenticationPrincipal String username) {
        return ApiResponse.ok(authService.profile(username));
    }

    @PutMapping
    public ApiResponse<ProfileResponse> updateProfile(@AuthenticationPrincipal String username,
                                                        @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(username, request), "Cập nhật hồ sơ thành công");
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal String username,
                                             @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(username, request);
        return ApiResponse.ok(null, "Đổi mật khẩu thành công");
    }
}
