package com.hotel.service;

import com.hotel.dto.request.CheckOutRequest;
import com.hotel.dto.request.InvoiceDraftRequest;
import com.hotel.dto.request.PaymentRequest;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.dto.response.PaymentResponse;

public interface InvoiceService {
    InvoiceResponse checkOutAndPay(Long bookingId, CheckOutRequest request);
    InvoiceResponse getInvoiceByBookingId(Long bookingId);
    InvoiceResponse createOrUpdateDraft(Long bookingId, InvoiceDraftRequest request);
    InvoiceResponse updateDraft(Long invoiceId, InvoiceDraftRequest request);
    InvoiceResponse issueInvoice(Long invoiceId);
    PaymentResponse recordPayment(Long invoiceId, PaymentRequest request);
    InvoiceResponse completeCheckout(Long bookingId);
}
