package com.hotel.security;

import com.hotel.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class AccessTokenAuthenticationFilter extends OncePerRequestFilter {
    private final AccessTokenService tokens;
    private final UserRepository users;

    public AccessTokenAuthenticationFilter(AccessTokenService tokens, UserRepository users) {
        this.tokens = tokens;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            AccessTokenService.Claims claims = tokens.verify(authorization.substring(7));
            if (claims != null) {
                var user = users.findByUsername(claims.username()).filter(com.hotel.entity.User::isActive).orElse(null);
                if (user != null) {
                    var authentication = new UsernamePasswordAuthenticationToken(
                            user.getUsername(), null, List.of(new SimpleGrantedAuthority(user.getRole().name())));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        chain.doFilter(request, response);
    }
}
