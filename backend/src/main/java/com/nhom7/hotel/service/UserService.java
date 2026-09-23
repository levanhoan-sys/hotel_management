package com.nhom7.hotel.service;

import com.nhom7.hotel.dto.request.UserCreationRequest;
import com.nhom7.hotel.dto.request.UserUpdateRequest;
import com.nhom7.hotel.dto.response.UserResponse;
import com.nhom7.hotel.entity.User;
import com.nhom7.hotel.exception.AppException;
import com.nhom7.hotel.exception.ErrorCode;
import com.nhom7.hotel.mapper.UserMapper;
import com.nhom7.hotel.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    public User creatRequest(UserCreationRequest request){
        if(userRepository.existsByUsername(request.getUsername())){
            throw new AppException(ErrorCode.User_Existed);
        }
        User user = userMapper.toUser(request);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder( 10);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        return userRepository.save(user);
    }
    public UserResponse updateRequest(String id, UserUpdateRequest request){
        User user = userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.User_Notfound));
        userMapper.updateUser(user, request);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        return userMapper.toUserResponse(userRepository.save(user));
    }
    public void deleteUser(String id){
        userRepository.deleteById(id);
    }
    public List<User> getUsers(){
        return userRepository.findAll();
    }
    public UserResponse getUser(String id){

        return userMapper.toUserResponse(userRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.User_Notfound)));
    }

}
