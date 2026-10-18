package com.bank.authservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bank.authservice.service.RolePermissionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/admin/rbac")
@RequiredArgsConstructor
@Tag(name = "Admin: role permissions", description = "Requires ROLE_ADMIN")
public class RbacAdminController {
private final RolePermissionService service;
@Operation(summary = "Grant a permission to a role")
@PostMapping("/role/{roleId}/permission/{permissionId}")
public ResponseEntity<?> assignPermission(@PathVariable Long roleId, @PathVariable Long permissionId){
	service.assignPermissionToRole(roleId, permissionId);
	return ResponseEntity.ok("permission assigned successfully");
}
@Operation(summary = "Revoke a permission from a role")
@DeleteMapping("/role/{roleId}/permission/{permissionId}")
public ResponseEntity<?> removePermission(@PathVariable Long roleId, @PathVariable Long permissionId){
	service.removePermissionFromRole(roleId, permissionId);
	return ResponseEntity.ok("permission removed successfully");
}
}
