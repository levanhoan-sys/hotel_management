package com.hotel.config;

import com.hotel.entity.Admin;
import com.hotel.repository.UserRepository;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    @Value("${app.bootstrap.admin.username:}") private String username;
    @Value("${app.bootstrap.admin.password:}") private String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    @Override public void run(String... args) {
        if (username.isBlank() || password.isBlank() || users.existsByUsername(username)) return;
        String code = ("ADMIN-" + username).substring(0, Math.min(30, username.length() + 6));
        users.save(new Admin(username.trim(), passwords.encode(password), "Quản trị viên", null, null,
                code, null, LocalDate.now(), "ALL"));
    }
}
