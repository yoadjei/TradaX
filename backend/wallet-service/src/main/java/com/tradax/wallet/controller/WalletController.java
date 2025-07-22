package com.tradax.wallet.controller;

import com.tradax.wallet.model.Transaction;
import com.tradax.wallet.model.Wallet;
import com.tradax.wallet.service.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for wallet operations
 */
@RestController
@RequestMapping("/wallet")
@CrossOrigin(origins = "*", maxAge = 3600)
public class WalletController {

    private static final Logger logger = LoggerFactory.getLogger(WalletController.class);

    @Autowired
    private WalletService walletService;

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "wallet-service");
        return ResponseEntity.ok(response);
    }

    /**
     * Get user wallet balances
     */
    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalances() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Fetching balances for user: {}", userEmail);
            
            List<Wallet> wallets = walletService.getUserWallets(userEmail);
            BigDecimal totalValue = walletService.calculateTotalPortfolioValue(userEmail);
            
            Map<String, Object> response = new HashMap<>();
            response.put("balances", wallets);
            response.put("totalValue", totalValue);
            response.put("currency", "USD");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching balances", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Deposit funds to wallet
     */
    @PostMapping("/deposit")
    public ResponseEntity<Map<String, Object>> deposit(@Valid @RequestBody DepositRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Processing deposit for user: {}, asset: {}, amount: {}", 
                       userEmail, request.getAsset(), request.getAmount());
            
            Transaction transaction = walletService.deposit(userEmail, request.getAsset(), request.getAmount());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Deposit successful");
            response.put("transaction", transaction);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Deposit failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Withdraw funds from wallet
     */
    @PostMapping("/withdraw")
    public ResponseEntity<Map<String, Object>> withdraw(@Valid @RequestBody WithdrawRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Processing withdrawal for user: {}, asset: {}, amount: {}", 
                       userEmail, request.getAsset(), request.getAmount());
            
            Transaction transaction = walletService.withdraw(userEmail, request.getAsset(), request.getAmount());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Withdrawal successful");
            response.put("transaction", transaction);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Withdrawal failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Execute a trade (buy/sell)
     */
    @PostMapping("/trade")
    public ResponseEntity<Map<String, Object>> trade(@Valid @RequestBody TradeRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Processing trade for user: {}, type: {}, asset: {}, amount: {}, price: {}", 
                       userEmail, request.getType(), request.getAsset(), request.getAmount(), request.getPrice());
            
            Transaction transaction = walletService.executeTrade(userEmail, request.getType(), 
                                                               request.getAsset(), request.getAmount(), request.getPrice());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Trade executed successfully");
            response.put("transaction", transaction);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Trade execution failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Get transaction history
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getTransactionHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Fetching transaction history for user: {}, page: {}, size: {}", userEmail, page, size);
            
            Page<Transaction> transactions = walletService.getTransactionHistory(userEmail, page, size);
            
            Map<String, Object> response = new HashMap<>();
            response.put("transactions", transactions.getContent());
            response.put("totalElements", transactions.getTotalElements());
            response.put("totalPages", transactions.getTotalPages());
            response.put("currentPage", page);
            response.put("size", size);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching transaction history", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * Get portfolio summary
     */
    @GetMapping("/portfolio")
    public ResponseEntity<Map<String, Object>> getPortfolioSummary() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();
            
            logger.info("Fetching portfolio summary for user: {}", userEmail);
            
            List<Wallet> wallets = walletService.getUserWallets(userEmail);
            BigDecimal totalValue = walletService.calculateTotalPortfolioValue(userEmail);
            Map<String, Object> performanceMetrics = walletService.getPortfolioPerformance(userEmail);
            
            Map<String, Object> response = new HashMap<>();
            response.put("wallets", wallets);
            response.put("totalValue", totalValue);
            response.put("performance", performanceMetrics);
            response.put("currency", "USD");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching portfolio summary", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Request DTOs
    public static class DepositRequest {
        @javax.validation.constraints.NotBlank
        private String asset;
        
        @javax.validation.constraints.NotNull
        @javax.validation.constraints.DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal amount;

        // Getters and setters
        public String getAsset() { return asset; }
        public void setAsset(String asset) { this.asset = asset; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    public static class WithdrawRequest {
        @javax.validation.constraints.NotBlank
        private String asset;
        
        @javax.validation.constraints.NotNull
        @javax.validation.constraints.DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal amount;

        // Getters and setters
        public String getAsset() { return asset; }
        public void setAsset(String asset) { this.asset = asset; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    public static class TradeRequest {
        @javax.validation.constraints.NotBlank
        @javax.validation.constraints.Pattern(regexp = "buy|sell", message = "Type must be 'buy' or 'sell'")
        private String type;
        
        @javax.validation.constraints.NotBlank
        private String asset;
        
        @javax.validation.constraints.NotNull
        @javax.validation.constraints.DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal amount;
        
        @javax.validation.constraints.NotNull
        @javax.validation.constraints.DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal price;

        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getAsset() { return asset; }
        public void setAsset(String asset) { this.asset = asset; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
    }
}
