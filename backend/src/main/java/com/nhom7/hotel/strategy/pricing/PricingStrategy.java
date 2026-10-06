package com.nhom7.hotel.strategy.pricing;

public interface PricingStrategy {

    double computePrice(double basePrice, int nights);
}
