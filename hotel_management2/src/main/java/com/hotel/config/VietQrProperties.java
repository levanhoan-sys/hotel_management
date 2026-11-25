package com.hotel.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "hotel.payment.bank")
public record VietQrProperties(String bin, String accountNumber, String accountName) {
    public boolean configured() {
        return bin != null && !bin.isBlank() && accountNumber != null && !accountNumber.isBlank()
                && accountName != null && !accountName.isBlank();
    }

    public void validate() {
        boolean any = (bin != null && !bin.isBlank()) || (accountNumber != null && !accountNumber.isBlank())
                || (accountName != null && !accountName.isBlank());
        if (!any) return; // Local environments can start without payment receiving details.
        if (bin == null || !bin.matches("\\d{6}")) throw new IllegalStateException("HOTEL_BANK_BIN must be a six digit VietQR BIN");
        if (accountNumber == null || !accountNumber.matches("\\d{6,20}")) throw new IllegalStateException("HOTEL_BANK_ACCOUNT must contain 6 to 20 digits");
        if (accountName == null || accountName.isBlank() || accountName.length() > 100) throw new IllegalStateException("HOTEL_BANK_ACCOUNT_NAME is required (max 100 characters)");
    }
}
