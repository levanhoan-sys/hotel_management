package com.nhom7.hotel.exception;

public enum ErrorCode {
    User_Existed(1002,"User existed"),
    User_Notfound(1003,"User not found"),
    Uncategorized_Exception(9999,"Uncategorized error"),
    User_Not_Existed(1005, "User not existed"),
    Unauthenticated(1006, "unauthenticated"),
    Room_Existed(1007, "Room number existed"),
    Room_Notfound(1008, "Room not found"),
    Room_In_Use(1009, "Room is booked or occupied"),
    Room_Invalid_Status(1010, "Invalid room status transition"),
    RoomType_Existed(1011, "Room type existed"),
    RoomType_Notfound(1012, "Room type not found"),
    RoomType_In_Use(1013, "Room type is being used by rooms"),
    Invalid_Date_Range(1014, "Invalid check-in or check-out date"),
    Invalid_Guests(1015, "Number of guests must be greater than 0");

    private int code;
    private String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}