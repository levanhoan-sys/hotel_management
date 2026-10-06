package com.nhom7.hotel.strategy.pricing;

import com.nhom7.hotel.enums.PricingType;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.Set;

@Component
public class PricingStrategyFactory {

    private static final double WEEKEND_SURCHARGE_RATE = 0.2;
    private static final double HOLIDAY_MULTIPLIER = 1.5;

    private static final Set<MonthDay> HOLIDAYS = Set.of(
            MonthDay.of(1, 1),
            MonthDay.of(4, 30),
            MonthDay.of(5, 1),
            MonthDay.of(9, 2));

    public PricingStrategy create(PricingType type) {
        if (type == null) {
            throw new IllegalArgumentException("Pricing type must not be null");
        }
        return switch (type) {
            case STANDARD -> new StandardPricing();
            case WEEKEND -> new WeekendPricing(WEEKEND_SURCHARGE_RATE);
            case HOLIDAY -> new HolidayPricing(HOLIDAY_MULTIPLIER);
        };
    }

    public PricingType resolveType(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("Invalid date range");
        }
        boolean hasWeekendNight = false;
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            if (HOLIDAYS.contains(MonthDay.from(night))) {
                return PricingType.HOLIDAY;
            }
            DayOfWeek day = night.getDayOfWeek();
            if (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY) {
                hasWeekendNight = true;
            }
        }
        return hasWeekendNight ? PricingType.WEEKEND : PricingType.STANDARD;
    }

    public PricingStrategy resolve(LocalDate checkIn, LocalDate checkOut) {
        return create(resolveType(checkIn, checkOut));
    }
}
