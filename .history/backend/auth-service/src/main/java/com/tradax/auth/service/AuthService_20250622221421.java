package com.tradax.auth.service;

import com.tradax.auth.model.User;
import com.tradax.auth.repository.UserRepository;
import com.tradax.auth.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

/**
 * Service class for authentication operations
 */
@Service
@Transactional
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Register a new user
     */
    public User register(String firstName, String lastName, String email, String password) {
        logger.info("Attempting to register user with email: {}", email);
        
        // Check if user already exists
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }

        // Create new user
        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email.toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setEmailVerified(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        // Generate OTP for email verification
        String otp = generateOTP();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10)); // OTP valid for 10 minutes

        User savedUser = userRepository.save(user);
        
        // In a real application, you would send the OTP via email
        logger.info("Generated OTP for user {}: {} (This is for development only)", email, otp);
        
        return savedUser;
    }

    /**
     * Authenticate user and generate JWT token
     */
    public String login(String email, String password) {
        logger.info("Attempting login for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid email or password");
        }

        User user = userOpt.get();
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (!user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email before logging in");
        }

        // Update last login
        user.setLastLogin(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate JWT token
        return jwtUtil.generateToken(user.getEmail());
    }

    /**
     * Verify OTP for email verification
     */
    public boolean verifyOTP(String email, String otp) {
        logger.info("Attempting OTP verification for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();
        
        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            return false;
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired");
        }

        // Mark email as verified and clear OTP
        user.setEmailVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return true;
    }

    /**
     * Resend OTP for email verification
     */
    public void resendOTP(String email) {
        logger.info("Resending OTP for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();
        
        if (user.isEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }

        // Generate new OTP
        String otp = generateOTP();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // In a real application, you would send the OTP via email
        logger.info("Generated new OTP for user {}: {} (This is for development only)", email, otp);
    }

    /**
     * Update user profile
     */
    public User updateProfile(String email, String firstName, String lastName) {
        logger.info("Updating profile for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setUpdatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }

    /**
     * Generate a 6-digit OTP
     */
    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    /**
     * Find user by email
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase());
    }
}
