package com.hotel.strategy.payment;

import com.hotel.enums.PaymentMethod;

public interface PaymentStrategy {
    boolean pay(double amount);
    PaymentMethod getSupportedMethod();
}
