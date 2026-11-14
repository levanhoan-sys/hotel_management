package com.hotel.strategy.payment;

import com.hotel.enums.PaymentMethod;
import org.springframework.stereotype.Component;

@Component
public class CreditCardPayment implements PaymentStrategy {

    @Override
    public boolean pay(double amount) {
        // Xử lý quẹt thẻ POS hoặc cổng thanh toán quốc tế
        System.out.println("Processing credit card payment of: $" + amount);
        return true;
    }

    @Override
    public PaymentMethod getSupportedMethod() {
        return PaymentMethod.CREDIT_CARD;
    }
}
