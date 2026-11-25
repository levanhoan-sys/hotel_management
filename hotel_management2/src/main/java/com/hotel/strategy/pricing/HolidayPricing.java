package com.hotel.strategy.pricing;

import org.springframework.stereotype.Component;
import com.hotel.service.PricingRateService;

@Component("HOLIDAY")
public class HolidayPricing implements PricingStrategy {

    private final PricingRateService rates;
    public HolidayPricing(PricingRateService rates) { this.rates = rates; }

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return (basePrice * rates.multiplier("HOLIDAY").doubleValue()) * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "HOLIDAY";
    }
}
