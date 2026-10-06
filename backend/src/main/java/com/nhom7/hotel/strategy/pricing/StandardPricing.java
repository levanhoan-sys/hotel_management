package com.nhom7.hotel.strategy.pricing;

public class StandardPricing implements PricingStrategy {

    @Override
    public double computePrice(double basePrice, int nights) {
        if (basePrice < 0 || nights <= 0) {
            throw new IllegalArgumentException("Invalid base price or number of nights");
        }
        return Math.round(basePrice * nights);
    }
}
