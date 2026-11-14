package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.DepositResponse;
import com.hotel.service.impl.DepositPaymentService;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.math.BigDecimal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@RestController
@RequestMapping("/api/bookings/{bookingId}/deposit")
@RequiredArgsConstructor
public class DepositController {
    private final DepositPaymentService deposits;

    @GetMapping
    public ApiResponse<DepositResponse> status(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.status(bookingId, authentication.getName()));
    }

    @GetMapping("/qr")
    public ApiResponse<com.hotel.dto.response.VietQrResponse> qr(@PathVariable Long bookingId, Authentication authentication) {
        boolean receptionist = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_RECEPTIONIST"));
        return ApiResponse.ok(deposits.qr(bookingId, authentication.getName(), receptionist));
    }

    @PostMapping("/report")
    public ApiResponse<DepositResponse> report(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.report(bookingId, authentication.getName()), "Đã ghi nhận thông báo chuyển khoản, vui lòng chờ lễ tân xác minh");
    }

    @PostMapping("/payment")
    public ApiResponse<DepositResponse> initiate(@PathVariable Long bookingId,
            @RequestBody(required = false) PaymentStartRequest request, Authentication authentication) {
        return ApiResponse.ok(deposits.initiate(bookingId, authentication.getName(), request == null ? null : request.idempotencyKey()));
    }

    public record PaymentStartRequest(@Size(max = 100) String idempotencyKey) { }

    public record ConfirmationRequest(@NotNull @Positive BigDecimal actualReceivedAmount, @NotBlank @Size(max = 255) String transactionReference) { }
}
