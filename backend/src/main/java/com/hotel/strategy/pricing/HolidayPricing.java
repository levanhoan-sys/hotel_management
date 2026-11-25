package com.hotel.strategy.pricing;

import com.hotel.service.PricingRateService;
import org.springframework.stereotype.Component;

@Component("HOLIDAY")
public class HolidayPricing implements PricingStrategy {

    private final PricingRateService rates;

    public HolidayPricing(PricingRateService rates) {
        this.rates = rates;
    }

    @Override
    public double computePrice(double basePrice, int numberOfNights) {
        return (basePrice * rates.multiplier("HOLIDAY").doubleValue()) * numberOfNights;
    }

    @Override
    public String getStrategyName() {
        return "HOLIDAY";
    }
}
