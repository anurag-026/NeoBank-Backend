package com.bank.customer.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bank.customer.dto.CustomerDto;
import com.bank.customer.dto.CustomerRequest;
import com.bank.customer.dto.CustomerResponse;
import com.bank.customer.service.CustomerService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Customer profile management")
public class CustomerController {
private final CustomerService service;
@Operation(summary = "Create a customer profile")
@PostMapping
public CustomerResponse create(@RequestBody CustomerRequest request) {
	return service.create(request);
}
@Operation(summary = "Look up a customer by auth user id", description = "Service-to-service endpoint")
@GetMapping("/internal")
public CustomerDto getByUserId(@RequestParam Long userId) {
	return service.getByUserId(userId);
}
}
