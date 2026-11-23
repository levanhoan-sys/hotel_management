package com.hotel.service.impl;

import com.hotel.dto.request.CheckOutRequest;
import com.hotel.dto.request.InvoiceDraftRequest;
import com.hotel.dto.request.PaymentRequest;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.dto.response.PaymentResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.BookingDetail;
import com.hotel.entity.Invoice;
import com.hotel.entity.InvoiceItem;
import com.hotel.entity.Payment;
import com.hotel.entity.Room;
import com.hotel.entity.ServiceOrder;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.InvoiceItemType;
import com.hotel.enums.InvoiceStatus;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.PaymentRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.ServiceOrderRepository;
import com.hotel.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {
    private static final BigDecimal TAX_RATE = new BigDecimal("0.10");
    private static final int MONEY_SCALE = 2;

    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final RoomRepository roomRepository;
    private final ServiceOrderRepository serviceOrderRepository;

    @Override
    @Transactional
    public InvoiceResponse createOrUpdateDraft(Long bookingId, InvoiceDraftRequest request) {
        Booking booking = lockCheckedInBooking(bookingId);
        Invoice invoice = invoiceRepository.findByBookingIdForUpdate(bookingId).orElse(null);
        if (invoice == null) invoice = new Invoice(booking);
        else if (invoice.getStatus() != InvoiceStatus.DRAFT)
            throw new ConflictException("An issued invoice cannot be changed");

        buildDraft(invoice, booking, request);
        return InvoiceResponse.fromEntity(invoiceRepository.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse updateDraft(Long invoiceId, InvoiceDraftRequest request) {
        Invoice current = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        Booking booking = lockCheckedInBooking(current.getBooking().getId());
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (invoice.getStatus() != InvoiceStatus.DRAFT) throw new ConflictException("Only draft invoices can be updated");
        buildDraft(invoice, booking, request);
        return InvoiceResponse.fromEntity(invoiceRepository.save(invoice));
    }

    private void buildDraft(Invoice invoice, Booking booking, InvoiceDraftRequest request) {
        if (booking.getDetails().isEmpty()) throw new BadRequestException("Booking has no rooms");
        BigDecimal surcharge = amount(request == null ? null : request.surcharge());
        BigDecimal discount = amount(request == null ? null : request.discount());
        if (surcharge.signum() < 0 || discount.signum() < 0) throw new BadRequestException("Surcharge and discount cannot be negative");

        int nights = Math.toIntExact(booking.getCheckOutDate().toEpochDay() - booking.getCheckInDate().toEpochDay());
        if (nights <= 0) throw new BadRequestException("Booking dates are invalid");
        BigDecimal roomTotal = BigDecimal.ZERO;
        BigDecimal serviceTotal = BigDecimal.ZERO;
        List<InvoiceItem> items = new ArrayList<>();

        for (BookingDetail detail : booking.getDetails()) {
            BigDecimal perNight = money(detail.getPricePerNight());
            BigDecimal quantity = BigDecimal.valueOf(nights);
            BigDecimal lineTotal = money(perNight.multiply(quantity));
            roomTotal = roomTotal.add(lineTotal);
            String description = "Room " + detail.getRoom().getRoomNumber() + " for " + nights + " night(s)";
            items.add(new InvoiceItem(InvoiceItemType.ROOM, description, quantity, perNight, lineTotal));
        }

        for (ServiceOrder usage : booking.getServiceOrders()) {
            if (usage.isCancelled() || usage.getApprovalStatus() != com.hotel.enums.ServiceOrderStatus.APPROVED) continue;
            BigDecimal unitPrice = money(usage.getUnitPrice());
            BigDecimal quantity = BigDecimal.valueOf(usage.getQuantity());
            BigDecimal lineTotal = money(unitPrice.multiply(quantity));
            serviceTotal = serviceTotal.add(lineTotal);
            String room = usage.getBookingDetail() == null ? "" : " - room " + usage.getBookingDetail().getRoom().getRoomNumber();
            items.add(new InvoiceItem(InvoiceItemType.SERVICE, usage.getServiceItem().getName() + room,
                    quantity, unitPrice, lineTotal));
        }

        roomTotal = money(roomTotal);
        serviceTotal = money(serviceTotal);
        BigDecimal tax = money(roomTotal.add(serviceTotal).multiply(TAX_RATE));
        BigDecimal grandTotal = money(roomTotal.add(serviceTotal).add(tax).add(surcharge).subtract(discount));
        if (grandTotal.signum() < 0) throw new BadRequestException("Discount exceeds the invoice total");

        if (tax.signum() > 0) items.add(new InvoiceItem(InvoiceItemType.SURCHARGE, "Tax (10%)", BigDecimal.ONE, tax, tax));
        if (surcharge.signum() > 0) items.add(new InvoiceItem(InvoiceItemType.SURCHARGE, "Surcharge", BigDecimal.ONE, surcharge, surcharge));
        if (discount.signum() > 0) items.add(new InvoiceItem(InvoiceItemType.DISCOUNT, "Discount", BigDecimal.ONE, discount.negate(), discount.negate()));

        invoice.replaceItems(items);
        invoice.setAmounts(roomTotal, serviceTotal, tax, surcharge, discount, grandTotal);
    }

    @Override
    @Transactional
    public InvoiceResponse issueInvoice(Long invoiceId) {
        Invoice current = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        Booking booking = lockCheckedInBooking(current.getBooking().getId());
        if (serviceOrderRepository.existsByBookingIdAndApprovalStatus(booking.getId(), com.hotel.enums.ServiceOrderStatus.PENDING))
            throw new ConflictException("Pending service requests must be reviewed before issuing the invoice");
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        if (invoice.getStatus() != InvoiceStatus.DRAFT) throw new ConflictException("Invoice is already issued");
        try {
            invoice.issue();
        } catch (IllegalStateException exception) {
            throw new BadRequestException(exception.getMessage());
        }
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional
    public PaymentResponse recordPayment(Long invoiceId, PaymentRequest request) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));

        if (request.idempotencyKey() == null || request.idempotencyKey().isBlank())
            throw new BadRequestException("Idempotency key is required");
        String idempotencyKey = request.idempotencyKey().trim();
        Payment previous = paymentRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (previous != null) {
            if (!previous.getInvoice().getId().equals(invoiceId)
                    || previous.getAmount().compareTo(request.amount()) != 0
                    || previous.getMethod() != request.method())
                throw new ConflictException("Idempotency key was already used for a different payment");
            return PaymentResponse.from(previous);
        }

        if (invoice.getStatus() != InvoiceStatus.ISSUED) throw new BadRequestException("Payments require an issued invoice with a balance due");
        if (request.method() != PaymentMethod.CASH && request.method() != PaymentMethod.BANK_TRANSFER)
            throw new BadRequestException("Only CASH and manually confirmed BANK_TRANSFER payments are supported");
        BigDecimal amount = money(request.amount());
        if (amount.signum() <= 0) throw new BadRequestException("Payment amount must be greater than zero");
        if (amount.compareTo(invoice.getBalanceDue()) > 0) throw new BadRequestException("Payment cannot exceed the balance due");

        Payment payment = new Payment(amount, request.method(), idempotencyKey, clean(request.reference()));
        payment.setInvoice(invoice);
        paymentRepository.save(payment);
        invoice.addSuccessfulPayment(payment);
        return PaymentResponse.from(payment);
    }

    @Override
    @Transactional
    public InvoiceResponse completeCheckout(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        Invoice invoice = invoiceRepository.findByBookingIdForUpdate(bookingId)
                .orElseThrow(() -> new BadRequestException("An invoice must be issued and paid before checkout"));
        if (booking.getStatus() == BookingStatus.COMPLETED && invoice.getStatus() == InvoiceStatus.PAID)
            return InvoiceResponse.fromEntity(invoice);
        if (booking.getStatus() != BookingStatus.CHECKED_IN)
            throw new BadRequestException("Only checked-in bookings can check out");
        if (invoice.getStatus() != InvoiceStatus.PAID || invoice.getBalanceDue().signum() > 0)
            throw new BadRequestException("Invoice must be fully paid before checkout");

        List<Room> lockedRooms = lockBookingRooms(booking);
        for (Room room : lockedRooms) {
            if (!room.isOperational() || room.getStatus() != RoomStatus.OCCUPIED)
                throw new BadRequestException("Room " + room.getRoomNumber() + " is not occupied by this booking");
        }
        booking.complete();
        lockedRooms.forEach(room -> room.setStatus(RoomStatus.CLEANING));
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse checkOutAndPay(Long bookingId, CheckOutRequest request) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getStatus() == BookingStatus.COMPLETED) return getInvoiceByBookingId(bookingId);
        if (booking.getStatus() != BookingStatus.CHECKED_IN)
            throw new BadRequestException("Only checked-in bookings can check out");
        Invoice existing = invoiceRepository.findByBookingIdForUpdate(bookingId).orElse(null);
        if (existing != null && existing.getStatus() == InvoiceStatus.PAID) {
            completeCheckout(bookingId);
            return getInvoiceByBookingId(bookingId);
        }
        InvoiceResponse draft = createOrUpdateDraft(bookingId,
                new InvoiceDraftRequest(request.getSurcharge(), request.getDiscount()));
        if (draft.status() == InvoiceStatus.DRAFT) issueInvoice(draft.id());
        InvoiceResponse issued = getInvoiceByBookingId(bookingId);
        if (issued.balanceDue().signum() > 0) {
            String key = request.getIdempotencyKey() == null || request.getIdempotencyKey().isBlank()
                    ? "legacy-checkout-" + bookingId : request.getIdempotencyKey().trim();
            recordPayment(issued.id(), new PaymentRequest(issued.balanceDue(), request.getPaymentMethod(), key, null));
        }
        completeCheckout(bookingId);
        return getInvoiceByBookingId(bookingId);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByBookingId(Long bookingId) {
        Invoice invoice = invoiceRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found for booking"));
        return InvoiceResponse.fromEntity(invoice);
    }

    private Booking lockCheckedInBooking(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (booking.getStatus() != BookingStatus.CHECKED_IN) throw new BadRequestException("Invoice can only be created for checked-in bookings");
        return booking;
    }

    private List<Room> lockBookingRooms(Booking booking) {
        if (booking.getDetails().isEmpty()) throw new BadRequestException("Booking has no rooms");
        TreeSet<Long> roomIds = new TreeSet<>();
        booking.getDetails().forEach(detail -> roomIds.add(detail.getRoom().getId()));
        List<Room> rooms = roomRepository.findAllByIdForUpdate(List.copyOf(roomIds));
        if (rooms.size() != roomIds.size()) throw new BadRequestException("One or more booked rooms no longer exist");
        return rooms;
    }

    private BigDecimal amount(BigDecimal value) { return value == null ? BigDecimal.ZERO : money(value); }
    private BigDecimal money(BigDecimal value) { return value.setScale(MONEY_SCALE, RoundingMode.HALF_UP); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
