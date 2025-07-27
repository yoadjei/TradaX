package com.tradax.auth.service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradax.auth.model.User;
import com.tradax.auth.repository.UserRepository;
import com.tradax.auth.util.JwtUtil;

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

    @Autowired
    private JavaMailSender mailSender;

    public User register(String firstName, String lastName, String email, String password) {
        logger.info("Attempting to register user with email: {}", email);

        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("User with this email already exists");
        }

        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email.toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setEmailVerified(false);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        String otp = generateOTP();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

        User savedUser = userRepository.save(user);

        sendEmail(user.getEmail(), "Email Verification OTP",
                "Your verification code is: " + otp + "\n\nThis code expires in 10 minutes.");

        return savedUser;
    }

    public User validateUser(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("Invalid email or password");

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword()))
            throw new RuntimeException("Invalid email or password");

        if (!user.isEmailVerified())
            throw new RuntimeException("Please verify your email before logging in");

        user.setLastLogin(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return user;
    }

    public String generateToken(User user) {
        return jwtUtil.generateToken(user.getEmail());
    }

    public boolean verifyOTP(String email, String otp) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");

        User user = userOpt.get();
        if (user.getOtp() == null || !user.getOtp().equals(otp)) return false;
        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now()))
            throw new RuntimeException("OTP has expired");

        user.setEmailVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return true;
    }

    public void resendOTP(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");

        User user = userOpt.get();
        if (user.isEmailVerified())
            throw new RuntimeException("Email is already verified");

        String otp = generateOTP();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        sendEmail(user.getEmail(), "Resend Verification OTP",
                "Your new verification code is: " + otp + "\n\nThis code expires in 10 minutes.");
    }

    public void sendPasswordResetOTP(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");

        User user = userOpt.get();
        String otp = generateOTP();
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        sendEmail(user.getEmail(), "Password Reset OTP",
                "Your password reset code is: " + otp + "\n\nThis code expires in 10 minutes.");
    }

    public boolean resetPassword(String email, String otp, String newPassword) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");

        User user = userOpt.get();
        if (user.getOtp() == null || !user.getOtp().equals(otp)) return false;
        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now()))
            throw new RuntimeException("OTP has expired");

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return true;
    }

    public User updateProfile(String email, String firstName, String lastName) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty()) throw new RuntimeException("User not found");

        User user = userOpt.get();
        boolean changed = false;

        if (firstName != null && !firstName.isBlank() && !firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName.trim());
            changed = true;
        }
        if (lastName != null && !lastName.isBlank() && !lastName.equals(user.getLastName())) {
            user.setLastName(lastName.trim());
            changed = true;
        }

        if (changed) {
            user.setUpdatedAt(LocalDateTime.now());
            user = userRepository.save(user);
        }

        return user;
    }

    private void sendEmail(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    private String generateOTP() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase());
    }
}
