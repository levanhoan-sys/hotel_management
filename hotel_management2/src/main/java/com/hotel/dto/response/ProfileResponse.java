package com.hotel.dto.response;

import com.hotel.enums.AccountStatus;
import com.hotel.enums.RoleName;
import com.hotel.entity.User;

public record ProfileResponse(Long id, String username, String fullName, String email,
                              String phone, RoleName role, AccountStatus accountStatus) {
    public static ProfileResponse from(User user) {
        return new ProfileResponse(user.getId(), user.getUsername(), user.getFullName(),
                user.getEmail(), user.getPhone(), user.getRole(), user.getAccountStatus());
    }
}
