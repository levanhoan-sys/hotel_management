package com.hotel.strategy.payment;

import com.hotel.enums.PaymentMethod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PaymentStrategyFactory {

    private final Map<PaymentMethod, PaymentStrategy> strategyMap = new EnumMap<>(PaymentMethod.class);

    @Autowired
    public PaymentStrategyFactory(List<PaymentStrategy> strategies) {
        for (PaymentStrategy strategy : strategies) {
            strategyMap.put(strategy.getSupportedMethod(), strategy);
        }
    }

    public PaymentStrategy getStrategy(PaymentMethod method) {
        PaymentStrategy strategy = strategyMap.get(method);
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported payment method: " + method);
        }
        return strategy;
    }
}
