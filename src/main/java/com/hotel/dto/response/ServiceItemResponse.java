package com.hotel.dto.response;

import com.hotel.entity.ServiceItem;
import java.math.BigDecimal;

public record ServiceItemResponse(Long id, String name, BigDecimal unitPrice, String unit, boolean active) {
    public static ServiceItemResponse from(ServiceItem item) {
        return new ServiceItemResponse(item.getId(), item.getName(), item.getUnitPrice(), item.getUnit(), item.isActive());
    }

    public ServiceItemResponse(Long id, String name, double unitPrice, String unit, boolean active) {
        this(id, name, BigDecimal.valueOf(unitPrice), unit, active);
    }
}

