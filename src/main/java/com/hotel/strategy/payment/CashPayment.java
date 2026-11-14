package com.hotel.strategy.payment;

import com.hotel.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class CashPayment implements PaymentStrategy {

    @Override
    public boolean pay(double amount) {
        // Xử lý thu tiền mặt tại quầy lễ tân
        System.out.println("Processing cash payment of: $" + amount + " at the reception desk.");
        return true;
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.CASH;
    }
}
