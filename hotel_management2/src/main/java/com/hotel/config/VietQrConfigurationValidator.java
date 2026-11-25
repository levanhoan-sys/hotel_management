package com.hotel.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class VietQrConfigurationValidator {
    private final VietQrProperties properties;

    @PostConstruct
    void validate() { properties.validate(); }
}
