package com.bank.authservice.controller;

import java.time.LocalDateTime;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bank.authservice.domain.User;
import com.bank.authservice.event.LoginFailureEventListener;
import com.bank.authservice.repository.UserRepository;
import com.bank.authservice.service.AuditService;
import com.bank.authservice.service.EmailService;
import com.bank.authservice.service.OtpService;
import com.bank.authservice.service.SmsService;
import com.bank.authservice.service.UserService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Login", description = "Password verification and OTP dispatch (step 1 of login)")
@SecurityRequirements
public class LoginController {

    private final LoginFailureEventListener loginFailureEventListener;
	private final AuditService auditService;
	private final UserService userService;
	private final UserRepository userRepo;
	private final PasswordEncoder passwordEncoder;
	private final OtpService otpService;
	private final SmsService smsService;
	private final EmailService emailService;

   
	@Operation(summary = "Record a successful login in the audit log")
	@PostMapping("/login-success")
	public void loginSuccess(@RequestParam String userName,HttpServletRequest request) {
		auditService.logSuccess(userName, request.getRemoteAddr());
	}
	@Operation(summary = "Record a failed login in the audit log")
	@PostMapping("/login-failure")
	public void loginFailure(@RequestParam String userName, @RequestParam String reason,HttpServletRequest request) {
		auditService.logFailure(userName, request.getRemoteAddr(), reason);
	}
	@Operation(summary = "Verify username/password and send an OTP",
			description = "Locks the account for 15 minutes after 5 failed attempts. "
					+ "Exchange the OTP for tokens at POST /oauth2/token with grant_type=otp.")
	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestParam String userName, @RequestParam String password, HttpServletRequest request){
		User user = userService.findByUserName(userName);
		if(!user.isAccountNonLocked()) {
			if(user.getLockTime() != null && user.getLockTime().plusMinutes(15).isBefore(LocalDateTime.now())) {
				user.setAccountNonLocked(true);
				user.setFailedAttempts(0);
				userRepo.save(user);
			}else {
				throw new RuntimeException("Account locked. Try After 15 minutes");
			}
		}
		if(!passwordEncoder.matches(password, user.getPassword())) {
			user.setFailedAttempts(user.getFailedAttempts()+1);
			if(user.getFailedAttempts() >=5) {
				user.setAccountNonLocked(false);
				user.setLockTime(LocalDateTime.now());
			}
			userRepo.save(user);
			throw new RuntimeException("Invalid Credential");
		}
		user.setFailedAttempts(0);
		userRepo.save(user);
		String ip = request.getRemoteAddr();
		String deviceId = request.getHeader("X-Device-Id");
	 String otp =  otpService.generateOtp(userName,ip , deviceId);
	 smsService.sendOtp(user.getPhoneNumber(), otp);
	 emailService.sendOtp(user.getEmail(), otp);
	 return ResponseEntity.ok("OTP sent");
	}
}
