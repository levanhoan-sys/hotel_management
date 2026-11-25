package com.hotel.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

/** Provides JWT primitives separately from the filter chain to avoid a bean cycle. */
@Configuration
public class JwtConfiguration {
    private static final String DEFAULT_DEV_SECRET = "local-development-only-token-secret-change-before-deploy-2026";

    @Bean
    public JwtEncoder jwtEncoder(@Value("${app.security.access-token-secret:}") String secret) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtKey(secret)));
    }

    @Bean
    public JwtDecoder jwtDecoder(@Value("${app.security.access-token-secret:}") String secret) {
        return NimbusJwtDecoder.withSecretKey(jwtKey(secret))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    private SecretKey jwtKey(String secret) {
        String effectiveSecret = (secret == null || secret.isBlank()) ? DEFAULT_DEV_SECRET : secret;
        byte[] bytes = effectiveSecret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalArgumentException("JWT secret must contain at least 32 bytes");
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }
}
