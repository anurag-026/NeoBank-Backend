package com.bank.authservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bank.authservice.service.UserRoleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/user-role")
@RequiredArgsConstructor
@Tag(name = "Admin: user roles", description = "Requires ROLE_ADMIN")
public class UserRoleAdminController {
private final UserRoleService service;
@Operation(summary = "Assign a role to a user")
@PostMapping("/user/{userId}/role/{roleId}")
public ResponseEntity<?> assignRole(@PathVariable Long userId, @PathVariable Long roleId){
	service.assignRoleToUser(userId, roleId);
	return ResponseEntity.ok("role assigned successfully");
}
@Operation(summary = "Remove a role from a user")
@DeleteMapping("/user/{userId}/role/{roleId}")
public ResponseEntity<?> removeRole(@PathVariable Long userId, @PathVariable Long roleId){
	service.removeRoleFromUser(userId, roleId);
	return ResponseEntity.ok("Role Removed successfully");
}
}
