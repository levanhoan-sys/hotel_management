package com.hotel.strategy.payment;

import com.hotel.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class VNPayPayment implements PaymentStrategy {

    @Override
    public boolean pay(double amount) {
        // Mock tích hợp cổng VNPay QR
        System.out.println("Processing VNPay QR code payment of: " + amount + " VND");
        return true;
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.VNPAY;
    }
}
