package com.tradax.auth.repository;

import com.tradax.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by email address
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if user exists by email
     */
    boolean existsByEmail(String email);

    /**
     * Find users with expired OTP
     */
    List<User> findByOtpExpiryBefore(LocalDateTime dateTime);

    /**
     * Find unverified users older than specified date
     */
    List<User> findByEmailVerifiedFalseAndCreatedAtBefore(LocalDateTime dateTime);

    /**
     * Find users by email verification status
     */
    List<User> findByEmailVerified(boolean emailVerified);

    /**
     * Count total number of users
     */
    long count();

    /**
     * Count verified users
     */
    long countByEmailVerifiedTrue();

    /**
     * Count users created after a specific date
     */
    long countByCreatedAtAfter(LocalDateTime dateTime);
}
