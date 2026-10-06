package com.nhom7.hotel.strategy.pricing;

public class HolidayPricing implements PricingStrategy {

    private static final double DEFAULT_HOLIDAY_MULTIPLIER = 1.5;

    private final double holidayMultiplier;

    public HolidayPricing() {
        this(DEFAULT_HOLIDAY_MULTIPLIER);
    }

    public HolidayPricing(double holidayMultiplier) {
        if (holidayMultiplier < 1) {
            throw new IllegalArgumentException("Holiday multiplier must be at least 1");
        }
        this.holidayMultiplier = holidayMultiplier;
    }

    public double getHolidayMultiplier() {
        return holidayMultiplier;
    }

    @Override
    public double computePrice(double basePrice, int nights) {
        if (basePrice < 0 || nights <= 0) {
            throw new IllegalArgumentException("Invalid base price or number of nights");
        }
        return Math.round(basePrice * nights * holidayMultiplier);
    }
}
