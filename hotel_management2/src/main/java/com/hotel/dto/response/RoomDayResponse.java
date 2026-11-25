package com.hotel.dto.response;

import java.time.LocalDate;

public record RoomDayResponse(LocalDate date, String status) { }
