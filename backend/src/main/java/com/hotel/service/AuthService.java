package com.hotel.service;

import com.hotel.dto.request.ChangePasswordRequest;
import com.hotel.dto.request.RegisterCustomerRequest;
import com.hotel.dto.request.UpdateProfileRequest;
import com.hotel.dto.response.AuthResponse;
import com.hotel.dto.response.ProfileResponse;
import com.hotel.entity.Customer;
import com.hotel.entity.User;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.UserRepository;
import com.hotel.security.AccessTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AccessTokenService tokens;

    @Transactional
    public AuthResponse register(RegisterCustomerRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();
        if (users.existsByUsername(username)) {
            throw new ConflictException("Username is already in use");
        }
        if (users.existsByEmail(email)) {
            throw new ConflictException("Email is already in use");
        }
        Customer customer = new Customer(username, passwords.encode(request.getPassword()),
                request.getFullName().trim(), email, clean(request.getPhone()),
                request.getIdentityCard(), request.getAddress());
        return authResponse(users.save(customer));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String username, String password) {
        User user = users.findByUsername(username.trim())
                .orElseThrow(() -> new BadRequestException("Username or password is incorrect"));
        if (!user.isActive() || !passwords.matches(password, user.getPassword())) {
            throw new BadRequestException("Username or password is incorrect");
        }
        return authResponse(user);
    }

    @Transactional(readOnly = true)
    public ProfileResponse profile(String username) {
        return ProfileResponse.from(findUser(username));
    }

    @Transactional(readOnly = true)
    public AuthResponse loginProfileToken(String username) {
        return authResponse(findUser(username));
    }

    @Transactional
    public ProfileResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = findUser(username);
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailAndIdNot(email, user.getId())) {
            throw new ConflictException("Email is already in use");
        }
        user.updateProfile(request.fullName().trim(), email, clean(request.phone()));
        return ProfileResponse.from(user);
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = findUser(username);
        if (!passwords.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwords.matches(request.newPassword(), user.getPassword())) {
            throw new BadRequestException("New password must differ from the current password");
        }
        user.changePassword(passwords.encode(request.newPassword()));
    }

    private User findUser(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    private AuthResponse authResponse(User user) {
        return new AuthResponse(tokens.issue(user.getId(), user.getUsername(), user.getRole().name()),
                user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), user.getRole());
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
