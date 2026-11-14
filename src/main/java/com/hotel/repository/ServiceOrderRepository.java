package com.hotel.repository;

import com.hotel.entity.ServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceOrderRepository extends JpaRepository<ServiceOrder, Long> {
    List<ServiceOrder> findByBookingIdOrderByOrderedAtDesc(Long bookingId);
}
