package com.hotel.service;

import com.hotel.dto.request.RegisterCustomerRequest;
import com.hotel.dto.response.AuthResponse;
import com.hotel.entity.Customer;
import com.hotel.enums.RoleName;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.repository.UserRepository;
import com.hotel.security.AccessTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder passwords;
    @Mock AccessTokenService tokens;
    AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, passwords, tokens);
    }

    @Test
    void registrationRejectsDuplicateEmail() {
        RegisterCustomerRequest request = new RegisterCustomerRequest();
        request.setUsername("guest1");
        request.setEmail("guest@example.com");
        request.setPassword("password123");
        request.setFullName("Guest");
        when(users.existsByUsername("guest1")).thenReturn(false);
        when(users.existsByEmail("guest@example.com")).thenReturn(true);

        assertThrows(ConflictException.class, () -> service.register(request));
        verify(users, never()).save(any());
    }

    @Test
    void loginRejectsIncorrectPassword() {
        Customer customer = new Customer("guest1", "encoded", "Guest", "guest@example.com", null, null, null);
        when(users.findByUsername("guest1")).thenReturn(Optional.of(customer));
        when(passwords.matches("wrong-password", "encoded")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> service.login("guest1", "wrong-password"));
        verify(tokens, never()).issue(any(), any(), any());
    }

    @Test
    void loginSupportsEmailIdentifier() {
        Customer customer = new Customer("guest1", "encoded", "Guest", "guest@example.com", null, null, null);
        customer.setId(7L);
        when(users.findByUsername("Guest@Example.com")).thenReturn(Optional.empty());
        when(users.findByUsernameIgnoreCase("Guest@Example.com")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("guest@example.com")).thenReturn(Optional.of(customer));
        when(passwords.matches("secret123", "encoded")).thenReturn(true);
        when(tokens.issue(7L, "guest1", RoleName.ROLE_CUSTOMER.name())).thenReturn("jwt-token");

        AuthResponse response = service.login(" Guest@Example.com ", "secret123");
        assertEquals("guest1", response.getUsername());
        assertEquals("jwt-token", response.getToken());
    }

    @Test
    void loginRejectsLockedAccountWithClearMessage() {
        Customer customer = new Customer("guest1", "encoded", "Guest", "guest@example.com", null, null, null);
        customer.lock();
        when(users.findByUsername("guest1")).thenReturn(Optional.of(customer));
        when(passwords.matches("secret123", "encoded")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.login("guest1", "secret123"));
        assertEquals("Account is locked", ex.getMessage());
        verify(tokens, never()).issue(any(), any(), any());
    }
}
