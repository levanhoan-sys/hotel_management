package com.hotel.service;

import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.request.CancelServiceUsageRequest;
import com.hotel.dto.request.CreateServiceUsageRequest;
import com.hotel.dto.request.ServiceItemRequest;
import com.hotel.dto.response.ServiceItemResponse;
import com.hotel.dto.response.ServiceUsageResponse;

import java.util.List;

public interface ServiceUsageService {
    List<ServiceItemResponse> getActiveServices();
    List<ServiceItemResponse> getAllServices();
    ServiceItemResponse createService(ServiceItemRequest request);
    ServiceItemResponse updateService(Long id, ServiceItemRequest request);
    ServiceItemResponse setServiceActive(Long id, boolean active);
    ServiceUsageResponse addUsage(Long bookingId, CreateServiceUsageRequest request);
    ServiceUsageResponse addLegacyUsage(Long bookingId, AddServiceOrderRequest request);
    List<ServiceUsageResponse> getUsages(Long bookingId);
    List<ServiceUsageResponse> getPendingUsages();
    ServiceUsageResponse approveUsage(Long usageId);
    ServiceUsageResponse rejectUsage(Long usageId);
    ServiceUsageResponse cancelUsage(Long usageId, CancelServiceUsageRequest request);
}
