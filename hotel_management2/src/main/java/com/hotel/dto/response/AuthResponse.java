package com.hotel.dto.response;

import com.hotel.enums.RoleName;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private Long userId;
    private String username;
    private String fullName;
    private String email;
    private RoleName role;
}
