package com.hotel.repository;

import com.hotel.entity.PricingConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PricingConfigurationRepository extends JpaRepository<PricingConfiguration, Long> {
    Optional<PricingConfiguration> findByStrategy(String strategy);

    default Optional<PricingConfiguration> findByStrategyName(String strategyName) {
        return findByStrategy(strategyName);
    }
}
