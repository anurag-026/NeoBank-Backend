package com.bank.customer.controller;

import com.bank.customer.entity.KycDetails;
import com.bank.customer.service.KycService;
import com.bank.customer.service.SetuService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/kyc")
@RequiredArgsConstructor
@Tag(name = "KYC", description = "KYC submission, PAN verification and DigiLocker consent via Setu")
public class KycController {

    private final KycService kycService;
    private final SetuService setuService;

    @Operation(summary = "Submit KYC details for a customer")
    @PostMapping("/{customerId}")
    public KycDetails submitKyc(@PathVariable Long customerId,
                                @RequestBody KycDetails request) {
        return kycService.submitKyc(customerId, request);
    }
    @Operation(summary = "Verify a PAN number")
    @PostMapping("/verify_pan")
    public ResponseEntity<?> verifyPan(@RequestParam String pan){
    	 String response = setuService.verifyPan(pan);
    	 return ResponseEntity.ok(response);
    }
    @Operation(summary = "Create a DigiLocker consent request")
    @GetMapping("/digilocker")
    public ResponseEntity<?> digilocaker(){
    	String response =  setuService.createDigilockerRequest();
    	return ResponseEntity.ok(response);
    }
    @Operation(summary = "DigiLocker consent callback", description = "Invoked by Setu after the user responds to consent")
    @GetMapping("/callback")
    public ResponseEntity<String> callback(@RequestParam("id") String requestId,
    		@RequestParam boolean success,
    		@RequestParam String scope){
    	System.out.println("this is call back function");
    	if(!success) {
    		return ResponseEntity.ok("user denied consent");
    	}
    if(scope!=null && scope.contains("ADHAR")) {
    	String aadharData =  setuService.fetchAadhar(requestId);
    	 System.out.println("Aahar data "+aadharData);
    }
   
    return ResponseEntity.ok("callback received");
    }
    @Operation(summary = "Check the status of a DigiLocker request")
    @GetMapping("/status/{id}")
    public ResponseEntity<?> checkStatus(@PathVariable String id) {
        String status = setuService.checkStatus(id);
        return ResponseEntity.ok(status);
    }
}