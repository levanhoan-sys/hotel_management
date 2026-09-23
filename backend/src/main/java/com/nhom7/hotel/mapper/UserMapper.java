package com.nhom7.hotel.mapper;

import com.nhom7.hotel.dto.request.UserCreationRequest;
import com.nhom7.hotel.dto.request.UserUpdateRequest;
import com.nhom7.hotel.dto.response.UserResponse;
import com.nhom7.hotel.entity.User;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserResponse toUserResponse(User user);
    User toUser(UserCreationRequest request);
    //    @Mapping(source = "firstName", target = "lastName")
//    @Mapping(target = "lastName", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
