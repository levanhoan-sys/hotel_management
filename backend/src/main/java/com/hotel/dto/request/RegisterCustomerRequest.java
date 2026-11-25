package com.hotel.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterCustomerRequest {
    @NotBlank(message = "Username cannot be blank")
    @Size(min = 4, max = 50, message = "Username must be between 4 and 50 characters")
    private String username;

    @NotBlank(message = "Password cannot be blank")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    private String password;

    @NotBlank(message = "Full name cannot be blank")
    @Size(max = 150)
    private String fullName;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    @Size(max = 150)
    private String email;

    @Size(max = 30)
    private String phone;

    @Size(max = 50)
    private String identityCard;

    @Size(max = 255)
    private String address;
}
