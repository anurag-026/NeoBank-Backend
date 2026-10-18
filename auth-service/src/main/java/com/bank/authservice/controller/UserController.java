package com.bank.authservice.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bank.authservice.domain.User;
import com.bank.authservice.dto.RegisterRequest;
import com.bank.authservice.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User self-registration")
public class UserController {
private final UserService userService;
@Operation(summary = "Register a new user")
@SecurityRequirements
@PostMapping("/register")
public User register(@RequestBody RegisterRequest request) {
	return userService.register(request);
}
}
