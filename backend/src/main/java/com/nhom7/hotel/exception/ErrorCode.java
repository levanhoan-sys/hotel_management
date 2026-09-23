package com.nhom7.hotel.exception;

public enum ErrorCode {
    User_Existed(1002,"User existed"),
    User_Notfound(1003,"User not found"),
    Uncategorized_Exception(9999,"Uncategorized error"),
    User_Not_Existed(1005, "User not existed"),
    Unauthenticated(1006, "unauthenticated");

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
