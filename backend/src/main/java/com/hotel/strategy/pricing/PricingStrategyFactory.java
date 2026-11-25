package com.hotel.strategy.pricing;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PricingStrategyFactory {

    private final Map<String, PricingStrategy> strategies;

    @Autowired
    public PricingStrategyFactory(Map<String, PricingStrategy> strategies) {
        this.strategies = strategies;
    }

    public PricingStrategy getStrategy(String pricingType) {
        if (pricingType == null || !strategies.containsKey(pricingType.toUpperCase())) {
            return strategies.get("STANDARD");
        }
        return strategies.get(pricingType.toUpperCase());
    }
}
