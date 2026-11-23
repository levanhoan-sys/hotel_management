package com.hotel.config;

import com.hotel.entity.Receptionist;
import com.hotel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.math.BigDecimal;

@Component
public class ReceptionistBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    @Value("${app.bootstrap.receptionist.username:}") private String username;
    @Value("${app.bootstrap.receptionist.password:}") private String password;

    public ReceptionistBootstrap(UserRepository users, PasswordEncoder passwords) { this.users = users; this.passwords = passwords; }

    @Override public void run(String... args) {
        if (username.isBlank() || password.isBlank() || users.existsByUsername(username)) return;
        Receptionist staff = new Receptionist(username, passwords.encode(password), "Lễ tân", null, null, "FRONTDESK-1", (BigDecimal) null, LocalDate.now(), 1);
        users.save(staff);
    }
}
