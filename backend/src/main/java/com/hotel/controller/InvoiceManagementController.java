package com.hotel.controller;

import com.hotel.dto.request.InvoiceDraftRequest;
import com.hotel.dto.request.PaymentRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.dto.response.PaymentResponse;
import com.hotel.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reception")
@RequiredArgsConstructor
public class InvoiceManagementController {
    private final InvoiceService invoices;

    @PostMapping("/bookings/{bookingId}/invoice")
    public ResponseEntity<ApiResponse<InvoiceResponse>> createDraft(@PathVariable Long bookingId,
                                                                    @Valid @RequestBody(required = false) InvoiceDraftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(invoices.createOrUpdateDraft(bookingId, request), "Invoice draft saved"));
    }

    @PutMapping("/invoices/{invoiceId}/draft")
    public ApiResponse<InvoiceResponse> updateDraft(@PathVariable Long invoiceId,
                                                    @Valid @RequestBody InvoiceDraftRequest request) {
        return ApiResponse.ok(invoices.updateDraft(invoiceId, request), "Invoice draft updated");
    }

    @PostMapping("/invoices/{invoiceId}/issue")
    public ApiResponse<InvoiceResponse> issue(@PathVariable Long invoiceId) {
        return ApiResponse.ok(invoices.issueInvoice(invoiceId), "Invoice issued");
    }

    @PostMapping("/invoices/{invoiceId}/payments")
    public ApiResponse<PaymentResponse> payment(@PathVariable Long invoiceId,
                                                @Valid @RequestBody PaymentRequest request) {
        return ApiResponse.ok(invoices.recordPayment(invoiceId, request), "Payment recorded");
    }
}
