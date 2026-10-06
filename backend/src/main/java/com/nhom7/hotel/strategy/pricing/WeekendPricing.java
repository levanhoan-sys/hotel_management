package com.nhom7.hotel.strategy.pricing;

public class WeekendPricing implements PricingStrategy {

    private static final double DEFAULT_SURCHARGE_RATE = 0.2;

    private final double surchargeRate;

    public WeekendPricing() {
        this(DEFAULT_SURCHARGE_RATE);
    }

    public WeekendPricing(double surchargeRate) {
        if (surchargeRate < 0) {
            throw new IllegalArgumentException("Surcharge rate must not be negative");
        }
        this.surchargeRate = surchargeRate;
    }

    public double getSurchargeRate() {
        return surchargeRate;
    }

    @Override
    public double computePrice(double basePrice, int nights) {
        if (basePrice < 0 || nights <= 0) {
            throw new IllegalArgumentException("Invalid base price or number of nights");
        }
        return Math.round(basePrice * nights * (1 + surchargeRate));
    }
}
