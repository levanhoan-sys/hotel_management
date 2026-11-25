package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.DepositResponse;
import com.hotel.service.impl.DepositPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("test")
@RequestMapping("/api/bookings/{bookingId}/deposit")
@RequiredArgsConstructor
public class DemoDepositController {
    private final DepositPaymentService deposits;

    @PostMapping("/demo-complete/{paymentId}")
    public ApiResponse<DepositResponse> complete(@PathVariable Long bookingId,
                                                 @PathVariable Long paymentId,
                                                 Authentication authentication) {
        return ApiResponse.ok(deposits.completeDemo(bookingId, paymentId, authentication.getName()));
    }
}
