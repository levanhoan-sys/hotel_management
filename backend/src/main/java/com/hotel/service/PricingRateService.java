package com.hotel.service;

import com.hotel.entity.PricingConfiguration;
import com.hotel.repository.PricingConfigurationRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class PricingRateService {
    private static final Map<String, BigDecimal> DEFAULTS = Map.of(
            "STANDARD", BigDecimal.ONE,
            "WEEKEND", new BigDecimal("1.20"),
            "HOLIDAY", new BigDecimal("1.50"));

    private final PricingConfigurationRepository configurations;

    public PricingRateService(PricingConfigurationRepository configurations) {
        this.configurations = configurations;
    }

    public BigDecimal multiplier(String strategyName) {
        String normalized = strategyName.toUpperCase();
        return configurations.findByStrategy(normalized)
                .map(PricingConfiguration::getMultiplier)
                .orElse(DEFAULTS.getOrDefault(normalized, BigDecimal.ONE));
    }

    public static Map<String, BigDecimal> defaults() {
        return DEFAULTS;
    }
}
