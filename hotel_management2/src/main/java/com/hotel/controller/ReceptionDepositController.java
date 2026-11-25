package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.DepositResponse;
import com.hotel.dto.response.BookingResponse;
import com.hotel.service.impl.DepositPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

@RestController
@RequestMapping("/api/reception/deposits")
@RequiredArgsConstructor
public class ReceptionDepositController {
    private final DepositPaymentService deposits;

    @GetMapping("/pending")
    public ApiResponse<List<BookingResponse>> pending() { return ApiResponse.ok(deposits.pendingVerification()); }

    @PostMapping("/{bookingId}/confirm")
    public ApiResponse<DepositResponse> confirm(@PathVariable Long bookingId, @Valid @RequestBody ConfirmRequest request, Authentication authentication) {
        return ApiResponse.ok(deposits.confirm(bookingId, request.actualReceivedAmount(), request.transactionReference(), authentication.getName()), "Đã xác nhận khoản cọc sau khi đối chiếu ngân hàng");
    }

    @PostMapping("/{bookingId}/reject")
    public ApiResponse<DepositResponse> reject(@PathVariable Long bookingId, Authentication authentication) {
        return ApiResponse.ok(deposits.reject(bookingId, authentication.getName()), "Đã từ chối xác minh khoản cọc");
    }

    public record ConfirmRequest(@NotNull @Positive BigDecimal actualReceivedAmount, @NotBlank String transactionReference) { }
}
