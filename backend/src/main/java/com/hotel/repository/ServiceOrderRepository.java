package com.hotel.repository;

import com.hotel.entity.ServiceOrder;
import com.hotel.enums.ServiceOrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByBookingIdOrderByOrderedAtDesc(Long bookingId);
    List<ServiceOrder> findByApprovalStatusOrderByOrderedAtAsc(ServiceOrderStatus approvalStatus);
    boolean existsByBookingIdAndApprovalStatus(Long bookingId, ServiceOrderStatus approvalStatus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select serviceUsage from ServiceOrder serviceUsage where serviceUsage.id = :id")
    Optional<ServiceOrder> findByIdForUpdate(@Param("id") Long id);
}
