package com.hotel.service.impl;

import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.request.CancelServiceUsageRequest;
import com.hotel.dto.request.CreateServiceUsageRequest;
import com.hotel.dto.request.ServiceItemRequest;
import com.hotel.dto.request.InvoiceDraftRequest;
import com.hotel.dto.response.ServiceItemResponse;
import com.hotel.dto.response.ServiceUsageResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.BookingDetail;
import com.hotel.entity.ServiceItem;
import com.hotel.entity.ServiceOrder;
import com.hotel.enums.BookingStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.ServiceItemRepository;
import com.hotel.repository.ServiceOrderRepository;
import com.hotel.service.ServiceUsageService;
import com.hotel.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceUsageServiceImpl implements ServiceUsageService {
    private final ServiceItemRepository serviceItems;
    private final ServiceOrderRepository usages;
    private final BookingRepository bookings;
    private final InvoiceRepository invoices;
    private final InvoiceService invoiceService;

    @Override
    @Transactional(readOnly = true)
    public List<ServiceItemResponse> getActiveServices() {
        return serviceItems.findByActiveTrueOrderByNameAsc().stream().map(ServiceItemResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceItemResponse> getAllServices() {
        return serviceItems.findAll().stream().map(ServiceItemResponse::from).toList();
    }

    @Override
    @Transactional
    public ServiceItemResponse createService(ServiceItemRequest request) {
        String name = request.name().trim();
        if (serviceItems.findByNameIgnoreCase(name).isPresent()) throw new ConflictException("Service name is already in use");
        ServiceItem service = new ServiceItem();
        service.setName(name);
        service.setUnitPrice(request.unitPrice());
        service.setUnit(clean(request.unit()));
        service.setActive(true);
        return ServiceItemResponse.from(serviceItems.save(service));
    }

    @Override
    @Transactional
    public ServiceItemResponse updateService(Long id, ServiceItemRequest request) {
        ServiceItem service = serviceItems.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        String name = request.name().trim();
        if (serviceItems.existsByNameIgnoreCaseAndIdNot(name, id)) throw new ConflictException("Service name is already in use");
        service.setName(name);
        service.setUnitPrice(request.unitPrice());
        service.setUnit(clean(request.unit()));
        return ServiceItemResponse.from(service);
    }

    @Override
    @Transactional
    public ServiceItemResponse setServiceActive(Long id, boolean active) {
        ServiceItem service = serviceItems.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        service.setActive(active);
        return ServiceItemResponse.from(service);
    }

    @Override
    @Transactional
    public ServiceUsageResponse addUsage(Long bookingId, CreateServiceUsageRequest request) {
        return addUsageInternal(bookingId, request.bookingRoomId(), request.serviceItemId(), request.quantity());
    }

    @Override
    @Transactional
    public ServiceUsageResponse addLegacyUsage(Long bookingId, AddServiceOrderRequest request) {
        Booking booking = lockCheckedInBooking(bookingId);
        Long detailId = request.getBookingRoomId();
        if (detailId == null) {
            if (booking.getDetails().size() != 1)
                throw new BadRequestException("bookingRoomId is required when a booking contains multiple rooms");
            detailId = booking.getDetails().getFirst().getId();
        }
        return createUsage(booking, detailId, request.getServiceItemId(), request.getQuantity());
    }

    private ServiceUsageResponse addUsageInternal(Long bookingId, Long bookingRoomId, Long serviceItemId, int quantity) {
        Booking booking = lockCheckedInBooking(bookingId);
        return createUsage(booking, bookingRoomId, serviceItemId, quantity);
    }

    private Booking lockCheckedInBooking(Long bookingId) {
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getStatus() != BookingStatus.CHECKED_IN)
            throw new BadRequestException("Room services can only be requested for checked-in bookings");
        if (invoices.findByBookingId(bookingId).filter(com.hotel.entity.Invoice::isFinalized).isPresent())
            throw new ConflictException("Service usage cannot be changed after the invoice is issued");
        return booking;
    }

    private ServiceUsageResponse createUsage(Booking booking, Long bookingRoomId, Long serviceItemId, int quantity) {
        if (bookingRoomId == null) throw new BadRequestException("A booking room is required for service usage");
        if (quantity <= 0) throw new BadRequestException("Quantity must be greater than zero");
        BookingDetail detail = booking.getDetails().stream().filter(d -> d.getId().equals(bookingRoomId)).findFirst()
                .orElseThrow(() -> new BadRequestException("Booking room does not belong to this booking"));
        ServiceItem service = serviceItems.findByIdForUpdate(serviceItemId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        if (!service.isActive()) throw new BadRequestException("Service is not currently available");
        boolean offeredForRoom = detail.getRoom().getServices().stream().anyMatch(item -> item.getId().equals(serviceItemId));
        if (!offeredForRoom) throw new BadRequestException("Service is not offered for this room");
        ServiceOrder usage = new ServiceOrder(booking, detail, service, quantity);
        ServiceOrder saved = usages.save(usage);
        booking.getServiceOrders().add(saved);
        refreshDraftInvoice(booking.getId());
        return ServiceUsageResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceUsageResponse> getUsages(Long bookingId) {
        if (!bookings.existsById(bookingId)) throw new ResourceNotFoundException("Booking not found");
        return usages.findByBookingIdOrderByOrderedAtDesc(bookingId).stream().map(ServiceUsageResponse::from).toList();
    }

    @Override
    @Transactional
    public ServiceUsageResponse cancelUsage(Long usageId, CancelServiceUsageRequest request) {
        ServiceOrder usage = usages.findById(usageId).orElseThrow(() -> new ResourceNotFoundException("Service usage not found"));
        Booking booking = lockCheckedInBooking(usage.getBooking().getId());
        if (usage.isCancelled()) throw new ConflictException("Service usage is already cancelled");
        usage.cancel(request == null ? null : clean(request.reason()));
        refreshDraftInvoice(booking.getId());
        return ServiceUsageResponse.from(usage);
    }

    private void refreshDraftInvoice(Long bookingId) {
        invoices.findByBookingId(bookingId)
                .filter(invoice -> invoice.getStatus() == com.hotel.enums.InvoiceStatus.DRAFT)
                .ifPresent(invoice -> invoiceService.createOrUpdateDraft(bookingId,
                        new InvoiceDraftRequest(invoice.getSurcharge(), invoice.getDiscount())));
    }

    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
