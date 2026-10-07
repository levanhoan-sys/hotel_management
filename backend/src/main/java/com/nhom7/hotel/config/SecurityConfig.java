//code cu
// package com.nhom7.hotel.config;

// public class SecurityConfig {

// } 

//code chay tam trong postman
package com.nhom7.hotel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Cho phép gọi vào các API phòng mà không cần token
                .requestMatchers("/room/**", "/rooms/**").permitAll() 
                // Các request khác vẫn giữ nguyên yêu cầu xác thực
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
