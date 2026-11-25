package com.hotel.security;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class AccessTokenService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    public AccessTokenService(JwtEncoder encoder, JwtDecoder decoder) {
        this.encoder = encoder;
        this.decoder = decoder;
    }

    public String issue(Long userId, String username, String role) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("hotel-management-system")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(86_400))
                .subject(username)
                .claim("userId", userId)
                .claim("role", role)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Claims verify(String token) {
        try {
            Jwt jwt = decoder.decode(token);
            return new Claims(jwt.getSubject(), jwt.getClaimAsString("role"));
        } catch (RuntimeException exception) {
            return null;
        }
    }

    public record Claims(String username, String role) { }
}
