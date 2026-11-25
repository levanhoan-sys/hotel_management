package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.DepositResponse;
import com.hotel.dto.response.VietQrResponse;
import com.hotel.service.impl.DepositPaymentService;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings/{bookingId}/deposit")
@RequiredArgsConstructor
public class DepositController {
    private final DepositPaymentService deposits;

    @GetMapping
    public ApiResponse<DepositResponse> status(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.status(bookingId, authentication.getName(), isStaff(authentication)));
    }

    @GetMapping("/qr")
    public ApiResponse<VietQrResponse> qr(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.qr(bookingId, authentication.getName(), isStaff(authentication)));
    }

    @PostMapping("/report")
    public ApiResponse<DepositResponse> report(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.report(bookingId, authentication.getName(), isStaff(authentication)),
                "Đã ghi nhận thông báo chuyển khoản, vui lòng chờ lễ tân xác minh");
    }

    @PostMapping("/payment")
    public ApiResponse<DepositResponse> initiate(@PathVariable Long bookingId,
                                                 @RequestBody(required = false) PaymentStartRequest request,
                                                 Authentication authentication) {
        return ApiResponse.ok(deposits.initiate(bookingId, authentication.getName(),
                request == null ? null : request.idempotencyKey()));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_RECEPTIONIST".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
    }

    public record PaymentStartRequest(@Size(max = 100) String idempotencyKey) { }
}
