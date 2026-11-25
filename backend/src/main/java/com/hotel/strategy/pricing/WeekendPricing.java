package com.hotel.strategy.pricing;

import com.hotel.service.PricingRateService;
import org.springframework.stereotype.Component;

@Component("WEEKEND")
public class WeekendPricing implements PricingStrategy {

    private final PricingRateService rates;

    public WeekendPricing(PricingRateService rates) {
        this.rates = rates;
    }

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return (basePrice * rates.multiplier("WEEKEND").doubleValue()) * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "WEEKEND";
    }
}
