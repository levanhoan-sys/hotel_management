package com.hotel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZoneId;

@ConfigurationProperties(prefix = "hotel.booking")
public record HotelBookingProperties(
        BigDecimal depositRate,
        int depositTimeoutMinutes,
        LocalTime checkInTime,
        ZoneId timezone) {
    public HotelBookingProperties {
        depositRate = depositRate == null ? new BigDecimal("0.30") : depositRate;
        depositTimeoutMinutes = depositTimeoutMinutes <= 0 ? 15 : depositTimeoutMinutes;
        checkInTime = checkInTime == null ? LocalTime.of(14, 0) : checkInTime;
        timezone = timezone == null ? ZoneId.of("Asia/Ho_Chi_Minh") : timezone;
    }
}
