package com.hotel.config;

import com.hotel.entity.Receptionist;
import com.hotel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ReceptionistBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    @Value("${app.bootstrap.receptionist.username:}")
    private String username;
    @Value("${app.bootstrap.receptionist.password:}")
    private String password;

    public ReceptionistBootstrap(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    @Override
    public void run(String... args) {
        if (username.isBlank() || password.isBlank() || users.existsByUsername(username.trim())) {
            return;
        }
        String trimmedUsername = username.trim();
        Receptionist staff = new Receptionist(trimmedUsername, passwords.encode(password), "Lễ tân",
                trimmedUsername + "@hotel.local", null, "FRONTDESK-1", null, LocalDate.now(), 1);
        users.save(staff);
    }
}
