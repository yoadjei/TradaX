package com.tradax.auth.controller;

import com.tradax.auth.model.User;
import com.tradax.auth.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for authentication endpoints
 */
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "auth-service");
        return ResponseEntity.ok(response);
    }

    /**
     * User registration endpoint
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            logger.info("Registration attempt for email: {}", request.getEmail());
            
            User user = authService.register(request.getFirstName(), request.getLastName(), 
                                           request.getEmail(), request.getPassword());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully. Please verify your email.");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            
            logger.info("User registered successfully: {}", user.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            logger.error("Registration failed for email: {}", request.getEmail(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * User login endpoint
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        try {
            logger.info("Login attempt for email: {}", request.getEmail());
            
            String token = authService.login(request.getEmail(), request.getPassword());
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("message", "Login successful");
            response.put("email", request.getEmail());
            
            logger.info("User logged in successfully: {}", request.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Login failed for email: {}", request.getEmail(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    /**
     * OTP verification endpoint
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOTP(@Valid @RequestBody OTPRequest request) {
        try {
            logger.info("OTP verification attempt for email: {}", request.getEmail());
            
            boolean verified = authService.verifyOTP(request.getEmail(), request.getOtp());
            
            Map<String, Object> response = new HashMap<>();
            if (verified) {
                response.put("message", "Email verified successfully");
                response.put("verified", true);
                logger.info("OTP verified successfully for email: {}", request.getEmail());
                return ResponseEntity.ok(response);
            } else {
                response.put("error", "Invalid or expired OTP");
                response.put("verified", false);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
            
        } catch (Exception e) {
            logger.error("OTP verification failed for email: {}", request.getEmail(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Resend OTP endpoint
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, Object>> resendOTP(@Valid @RequestBody ResendOTPRequest request) {
        try {
            logger.info("Resend OTP request for email: {}", request.getEmail());
            
            authService.resendOTP(request.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "OTP sent successfully");
            
            logger.info("OTP resent successfully for email: {}", request.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Resend OTP failed for email: {}", request.getEmail(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Update user profile endpoint
     */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            logger.info("Profile update request for email: {}", email);
            
            User user = authService.updateProfile(email, request.getFirstName(), request.getLastName());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "email", user.getEmail()
            ));
            
            logger.info("Profile updated successfully for email: {}", email);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Profile update failed", e);
            Map<String, Object> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    /**
     * Logout endpoint
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null) {
                logger.info("User logged out: {}", authentication.getName());
            }
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Logged out successfully");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Logout failed", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Logout failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Request DTOs
    public static class RegisterRequest {
        @javax.validation.constraints.NotBlank
        private String firstName;
        
        @javax.validation.constraints.NotBlank
        private String lastName;
        
        @javax.validation.constraints.Email
        @javax.validation.constraints.NotBlank
        private String email;
        
        @javax.validation.constraints.NotBlank
        @javax.validation.constraints.Size(min = 6)
        private String password;

        // Getters and setters
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        @javax.validation.constraints.Email
        @javax.validation.constraints.NotBlank
        private String email;
        
        @javax.validation.constraints.NotBlank
        private String password;

        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class OTPRequest {
        @javax.validation.constraints.Email
        @javax.validation.constraints.NotBlank
        private String email;
        
        @javax.validation.constraints.NotBlank
        private String otp;

        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }
    }

    public static class ResendOTPRequest {
        @javax.validation.constraints.Email
        @javax.validation.constraints.NotBlank
        private String email;

        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class ProfileUpdateRequest {
        @javax.validation.constraints.NotBlank
        private String firstName;
        
        @javax.validation.constraints.NotBlank
        private String lastName;

        // Getters and setters
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
    }
}
