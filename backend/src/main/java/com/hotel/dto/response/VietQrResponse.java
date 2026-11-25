package com.hotel.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record VietQrResponse(Long bookingId, String bookingCode, BigDecimal amount, String transferContent,
                             String bankBin, String accountNumber, String accountName, String qrUrl,
                             Instant depositDeadline, Instant verificationDeadline) { }
