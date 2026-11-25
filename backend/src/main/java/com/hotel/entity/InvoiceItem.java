package com.hotel.entity;

import com.hotel.enums.InvoiceItemType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "invoice_items", indexes = @Index(name = "idx_invoice_items_invoice", columnList = "invoice_id"))
public class InvoiceItem extends BaseEntity {
    @Setter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private InvoiceItemType type;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 15, scale = 2)
    private BigDecimal lineTotal;

    public InvoiceItem(InvoiceItemType type, String description, BigDecimal quantity,
                       BigDecimal unitPrice, BigDecimal lineTotal) {
        this.type = type;
        this.description = description;
        this.quantity = quantity == null ? 1 : quantity.intValue();
        this.unitPrice = unitPrice;
        this.lineTotal = lineTotal;
    }

    public InvoiceItem(InvoiceItemType type, String description, int quantity,
                       BigDecimal unitPrice, BigDecimal lineTotal) {
        this.type = type;
        this.description = description;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.lineTotal = lineTotal;
    }

    public BigDecimal getQuantity() {
        return BigDecimal.valueOf(quantity);
    }
}
