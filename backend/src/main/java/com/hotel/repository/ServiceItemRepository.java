package com.hotel.repository;

import com.hotel.entity.ServiceItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ServiceItem s WHERE s.id = :id")
    Optional<ServiceItem> findByIdForUpdate(@Param("id") Long id);

    Optional<ServiceItem> findByName(String name);
    Optional<ServiceItem> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    List<ServiceItem> findByActiveTrueOrderByNameAsc();
}
