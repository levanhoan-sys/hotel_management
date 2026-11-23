package com.hotel.strategy.pricing;

import com.hotel.service.PricingRateService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingStrategyTest {

    @Mock
    private PricingRateService pricingRateService;

    @Test
    void standardPricingCalculatesExactBigDecimal() {
        when(pricingRateService.multiplier("STANDARD")).thenReturn(BigDecimal.ONE);
        StandardPricing pricing = new StandardPricing(pricingRateService);
        BigDecimal basePrice = new BigDecimal("1000000.00");
        BigDecimal total = pricing.computePrice(basePrice, 3);
        assertEquals(new BigDecimal("3000000"), total);
    }

    @Test
    void weekendPricingAppliesMultiplierAccurately() {
        when(pricingRateService.multiplier("WEEKEND")).thenReturn(new BigDecimal("1.20"));
        WeekendPricing pricing = new WeekendPricing(pricingRateService);
        BigDecimal basePrice = new BigDecimal("1000000.00");
        BigDecimal total = pricing.computePrice(basePrice, 2);
        // 1,000,000 * 1.20 * 2 = 2,400,000
        assertEquals(new BigDecimal("2400000"), total);
    }

    @Test
    void holidayPricingAppliesMultiplierAccurately() {
        when(pricingRateService.multiplier("HOLIDAY")).thenReturn(new BigDecimal("1.50"));
        HolidayPricing pricing = new HolidayPricing(pricingRateService);
        BigDecimal basePrice = new BigDecimal("1500000.00");
        BigDecimal total = pricing.computePrice(basePrice, 1);
        // 1,500,000 * 1.50 * 1 = 2,250,000
        assertEquals(new BigDecimal("2250000"), total);
    }
}
