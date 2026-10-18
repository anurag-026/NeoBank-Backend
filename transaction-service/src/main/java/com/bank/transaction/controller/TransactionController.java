package com.bank.transaction.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bank.transaction.dto.TransactionRequest;
import com.bank.transaction.dto.TransactionResponse;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.enumrator.TransactionStatus;
import com.bank.transaction.enumrator.TransactionType;
import com.bank.transaction.repository.TransactionRepository;
import com.bank.transaction.service.TransactionService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Credit/debit processing and reversals")
public class TransactionController {
private final TransactionService service;
private final TransactionRepository repo;
@Operation(summary = "Process a credit or debit", description = "Requires the TRANSFER_MONEY authority. "
		+ "Runs fraud checks and is idempotent per request.")
@PreAuthorize("hasAuthority('TRANSFER_MONEY')")
@PostMapping
public TransactionResponse transact(@RequestBody TransactionRequest request, HttpServletRequest httpRequest) {
	return service.process(request, httpRequest.getRemoteAddr(), httpRequest.getHeader("X-Device-Id"));
}
@Operation(summary = "Reverse a successful transaction", description = "Posts the opposite entry for the same amount")
@PostMapping("/reverse/{txnId}")
public ResponseEntity<?> reverse(@PathVariable String txnId){
	Transaction txn = repo.findByTxnId(txnId).orElseThrow(()-> new RuntimeException("txn not found"));
	if(txn.getStatus() != TransactionStatus.SUCCESS) {
		throw new RuntimeException("only successful transaction can be reversed");
	}
	TransactionRequest reverseReq = new TransactionRequest();
	reverseReq.setAccountNumber(txn.getAccountNumber());
	reverseReq.setAmount(txn.getAmount());
	reverseReq.setType(txn.getType() == TransactionType.DEBIT ? TransactionType.CREDIT : TransactionType.DEBIT);
	return ResponseEntity.ok(service.process(reverseReq, "System", "reversal"));
}
}
