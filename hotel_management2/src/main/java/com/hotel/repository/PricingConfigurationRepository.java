package com.hotel.repository;

import com.hotel.entity.PricingConfiguration;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingConfigurationRepository extends JpaRepository<PricingConfiguration, Long> {
    Optional<PricingConfiguration> findByStrategyName(String strategyName);
}
