package com.hotel.strategy.pricing;

public interface PricingStrategy {
    double computePrice(double basePrice, int numberOfNights);
    String getStrategyName();
}
