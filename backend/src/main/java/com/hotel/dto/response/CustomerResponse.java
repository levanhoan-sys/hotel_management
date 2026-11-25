package com.hotel.dto.response;

import com.hotel.entity.Customer;

public record CustomerResponse(Long id, String username, String fullName, String email, String phone,
                               String identityCard, String address, int loyaltyPoints,
                               String stayStatus, Long currentBookingId) {
    public static CustomerResponse from(Customer customer, String stayStatus, Long currentBookingId) {
        return new CustomerResponse(customer.getId(), customer.getUsername(), customer.getFullName(),
                customer.getEmail(), customer.getPhone(), customer.getIdentityCard(), customer.getAddress(),
                customer.getLoyaltyPoints(), stayStatus, currentBookingId);
    }
}
