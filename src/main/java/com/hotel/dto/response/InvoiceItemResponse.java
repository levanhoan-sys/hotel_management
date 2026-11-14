package com.hotel.dto.response;

import com.hotel.entity.InvoiceItem;
import com.hotel.enums.InvoiceItemType;

import java.math.BigDecimal;

public record InvoiceItemResponse(Long id, InvoiceItemType type, String description,
                                  BigDecimal quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
    public static InvoiceItemResponse from(InvoiceItem item) {
        return new InvoiceItemResponse(item.getId(), item.getType(), item.getDescription(),
                item.getQuantity(), item.getUnitPrice(), item.getLineTotal());
    }
}
