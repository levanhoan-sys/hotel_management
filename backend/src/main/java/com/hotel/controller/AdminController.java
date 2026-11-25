package com.hotel.controller;

import com.hotel.dto.request.CreateReceptionistRequest;
import com.hotel.dto.request.PricingRateRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.EmployeeResponse;
import com.hotel.dto.response.PricingHistoryResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.Employee;
import com.hotel.entity.PricingConfiguration;
import com.hotel.entity.Receptionist;
import com.hotel.entity.RoomType;
import com.hotel.enums.BookingStatus;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.PricingConfigurationRepository;
import com.hotel.repository.RoomTypeRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.PricingRateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private static final Map<Integer, SeasonalProfile> SEASONAL_PROFILES = Map.ofEntries(
            Map.entry(1, new SeasonalProfile(1.14, 84, "Đầu năm & du xuân")),
            Map.entry(2, new SeasonalProfile(1.18, 88, "Cao điểm Tết & lễ hội")),
            Map.entry(3, new SeasonalProfile(1.02, 68, "Sau Tết, khách công tác")),
            Map.entry(4, new SeasonalProfile(1.06, 74, "Nghỉ lễ 30/4 - 1/5")),
            Map.entry(5, new SeasonalProfile(1.04, 71, "Đầu hè & hội nghị")),
            Map.entry(6, new SeasonalProfile(1.12, 82, "Cao điểm du lịch hè")),
            Map.entry(7, new SeasonalProfile(1.15, 86, "Đỉnh điểm mùa hè")),
            Map.entry(8, new SeasonalProfile(1.08, 78, "Cuối hè & gia đình")),
            Map.entry(9, new SeasonalProfile(0.96, 63, "Giao mùa thu, giá ưu đãi")),
            Map.entry(10, new SeasonalProfile(1.09, 79, "Mùa thu Hà Nội")),
            Map.entry(11, new SeasonalProfile(1.03, 73, "Cuối thu & sự kiện")),
            Map.entry(12, new SeasonalProfile(1.17, 89, "Lễ hội cuối năm"))
    );

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final PricingConfigurationRepository pricingConfigurations;
    private final RoomTypeRepository roomTypes;
    private final BookingRepository bookings;

    public record PricingRateResponse(String strategy, BigDecimal multiplier, BigDecimal defaultMultiplier) { }

    private record SeasonalProfile(double factor, int occupancy, String context) { }

    @GetMapping("/employees")
    public ApiResponse<List<EmployeeResponse>> employees() {
        return ApiResponse.ok(users.findAll().stream()
                .filter(Employee.class::isInstance)
                .map(Employee.class::cast)
                .map(EmployeeResponse::from)
                .toList());
    }

    @PostMapping("/employees/receptionists")
    public ApiResponse<EmployeeResponse> createReceptionist(@Valid @RequestBody CreateReceptionistRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase();
        String code = request.employeeCode().trim();
        if (users.existsByUsername(username)) {
            throw new ConflictException("Username is already in use");
        }
        if (users.existsByEmail(email)) {
            throw new ConflictException("Email is already in use");
        }
        if (users.findAll().stream()
                .filter(Employee.class::isInstance)
                .map(Employee.class::cast)
                .anyMatch(employee -> code.equalsIgnoreCase(employee.getEmployeeCode()))) {
            throw new ConflictException("Employee code is already in use");
        }
        Receptionist receptionist = new Receptionist(username, passwords.encode(request.password()),
                request.fullName().trim(), email, clean(request.phone()), code, request.salary(),
                request.hireDate(), request.deskNumber() == null ? 0 : request.deskNumber());
        return ApiResponse.ok(EmployeeResponse.from(users.save(receptionist)), "Đã tạo tài khoản lễ tân.");
    }

    @PatchMapping("/employees/{id}/active")
    public ApiResponse<EmployeeResponse> setActive(@PathVariable Long id, @RequestParam boolean active) {
        Employee employee = users.findById(id)
                .filter(Employee.class::isInstance)
                .map(Employee.class::cast)
                .orElseThrow(() -> new ResourceNotFoundException("Employee account not found"));
        if (active) {
            employee.activate();
        } else {
            employee.lock();
        }
        users.save(employee);
        return ApiResponse.ok(EmployeeResponse.from(employee), active ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
    }

    @GetMapping("/pricing")
    public ApiResponse<List<PricingRateResponse>> pricing() {
        return ApiResponse.ok(PricingRateService.defaults().entrySet().stream().map(entry -> {
            BigDecimal multiplier = pricingConfigurations.findByStrategy(entry.getKey())
                    .map(PricingConfiguration::getMultiplier)
                    .orElse(entry.getValue());
            return new PricingRateResponse(entry.getKey(), multiplier, entry.getValue());
        }).toList());
    }

    @GetMapping("/pricing/history")
    @Transactional(readOnly = true)
    public ApiResponse<PricingHistoryResponse> pricingHistory() {
        double stdRate = rateValue("STANDARD");
        double wkndRate = rateValue("WEEKEND");
        double holRate = rateValue("HOLIDAY");
        double currentBlendedMultiplier = (stdRate * 20.0 + wkndRate * 8.0 + holRate * 2.0) / 30.0;

        List<RoomType> allTypes = roomTypes.findAll();
        List<Booking> allBookings = bookings.findAll();
        YearMonth currentYm = YearMonth.now(ZoneOffset.UTC);

        List<PricingHistoryResponse.MonthPoint> months = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            int offset = 5 - i;
            YearMonth ym = currentYm.minusMonths(offset);
            int year = ym.getYear();
            int monthNumber = ym.getMonthValue();
            String isoMonth = String.format("%d-%02d", year, monthNumber);
            String label = "Th" + monthNumber + "/" + year;
            String shortLabel = "Th" + monthNumber;
            SeasonalProfile profile = SEASONAL_PROFILES.getOrDefault(
                    monthNumber, new SeasonalProfile(1.0, 70, "Mùa tiêu chuẩn"));

            Map<String, Long> prices = new LinkedHashMap<>();
            long priceSum = 0L;

            for (RoomType rt : allTypes) {
                double basePrice = rt.getBasePrice();
                double tierSensitivity = basePrice >= 3_000_000 ? 1.18 : (basePrice >= 1_400_000 ? 1.08 : 0.96);
                double seasonalDelta = (profile.factor() - 1.0) * tierSensitivity;
                double seasonalMultiplier = 1.0 + seasonalDelta;

                List<Double> monthBookingPrices = allBookings.stream()
                        .filter(b -> b.getStatus() != BookingStatus.CANCELLED
                                && b.getStatus() != BookingStatus.REJECTED
                                && b.getStatus() != BookingStatus.EXPIRED
                                && b.getCheckInDate() != null
                                && YearMonth.from(b.getCheckInDate()).equals(ym))
                        .flatMap(b -> b.getDetails().stream())
                        .filter(d -> d.getRoom() != null
                                && d.getRoom().getRoomType() != null
                                && d.getRoom().getRoomType().getId().equals(rt.getId()))
                        .map(d -> d.getPricePerNight())
                        .toList();

                double effectivePrice;
                if (offset == 0) {
                    double liveEstimate = basePrice * currentBlendedMultiplier * (1.0 + seasonalDelta * 0.35);
                    if (!monthBookingPrices.isEmpty()) {
                        double avgActual = monthBookingPrices.stream().mapToDouble(Double::doubleValue).average().orElse(liveEstimate);
                        effectivePrice = liveEstimate * 0.75 + avgActual * 0.25;
                    } else {
                        effectivePrice = liveEstimate;
                    }
                } else {
                    double historicalEstimate = basePrice * seasonalMultiplier;
                    if (!monthBookingPrices.isEmpty()) {
                        double avgActual = monthBookingPrices.stream().mapToDouble(Double::doubleValue).average().orElse(historicalEstimate);
                        effectivePrice = historicalEstimate * 0.7 + avgActual * 0.3;
                    } else {
                        effectivePrice = historicalEstimate;
                    }
                }

                long rounded = Math.round(effectivePrice / 1000.0) * 1000L;
                prices.put(String.valueOf(rt.getId()), rounded);
                priceSum += rounded;
            }

            long averagePrice = allTypes.isEmpty()
                    ? 0L
                    : Math.round((priceSum / (double) allTypes.size()) / 1000.0) * 1000L;

            months.add(new PricingHistoryResponse.MonthPoint(
                    isoMonth,
                    label,
                    shortLabel,
                    offset == 0 ? profile.context() + " (Hiện tại)" : profile.context(),
                    profile.occupancy(),
                    averagePrice,
                    prices
            ));
        }

        List<PricingHistoryResponse.RoomTypeSummary> roomTypeSummaries = new ArrayList<>();
        for (RoomType rt : allTypes) {
            String key = String.valueOf(rt.getId());
            long fallbackPrice = Math.round(rt.getBasePrice());
            List<Long> series = months.stream()
                    .map(m -> m.prices().getOrDefault(key, fallbackPrice))
                    .toList();
            long first = series.isEmpty() ? fallbackPrice : series.getFirst();
            long current = series.isEmpty() ? fallbackPrice : series.getLast();
            long minPrice = series.stream().mapToLong(Long::longValue).min().orElse(fallbackPrice);
            long maxPrice = series.stream().mapToLong(Long::longValue).max().orElse(fallbackPrice);
            double changePercent = first > 0
                    ? Math.round(((current - first) / (double) first) * 1000.0) / 10.0
                    : 0.0;

            roomTypeSummaries.add(new PricingHistoryResponse.RoomTypeSummary(
                    rt.getId(),
                    rt.getName(),
                    rt.getBasePrice(),
                    current,
                    minPrice,
                    maxPrice,
                    changePercent
            ));
        }

        double roundedBlended = Math.round(currentBlendedMultiplier * 100.0) / 100.0;
        return ApiResponse.ok(new PricingHistoryResponse(months, roomTypeSummaries, roundedBlended));
    }

    @PutMapping("/pricing/{strategy}")
    public ApiResponse<PricingRateResponse> updatePricing(@PathVariable String strategy,
                                                          @Valid @RequestBody PricingRateRequest request) {
        String normalized = strategy.toUpperCase();
        BigDecimal defaultMultiplier = PricingRateService.defaults().get(normalized);
        if (defaultMultiplier == null) {
            throw new ResourceNotFoundException("Pricing strategy not found");
        }
        PricingConfiguration config = pricingConfigurations.findByStrategy(normalized)
                .orElseGet(() -> new PricingConfiguration(normalized, defaultMultiplier, defaultMultiplier));
        config.setMultiplier(request.multiplier());
        pricingConfigurations.save(config);
        return ApiResponse.ok(new PricingRateResponse(normalized, config.getMultiplier(), defaultMultiplier),
                "Đã cập nhật hệ số giá.");
    }

    private double rateValue(String strategy) {
        BigDecimal fallback = PricingRateService.defaults().getOrDefault(strategy, BigDecimal.ONE);
        return pricingConfigurations.findByStrategy(strategy)
                .map(PricingConfiguration::getMultiplier)
                .orElse(fallback)
                .doubleValue();
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
