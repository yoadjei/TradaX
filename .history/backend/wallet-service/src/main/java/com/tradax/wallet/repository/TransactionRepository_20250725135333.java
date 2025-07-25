package com.tradax.wallet.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.tradax.wallet.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for Transaction entity
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * Find transactions for a user with pagination
     */
    Page<Transaction> findByUserEmail(String userEmail, Pageable pageable);

    /**
     * Find transactions for a user and specific asset
     */
    List<Transaction> findByUserEmailAndAsset(String userEmail, String asset);

    /**
     * Find transactions by type
     */
    List<Transaction> findByUserEmailAndType(String userEmail, Transaction.TransactionType type);

    /**
     * Find transactions by status
     */
    List<Transaction> findByStatus(Transaction.TransactionStatus status);

    /**
     * Find transactions within date range
     */
    List<Transaction> findByUserEmailAndCreatedAtBetween(String userEmail, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find recent transactions for a user
     */
    List<Transaction> findTop10ByUserEmailOrderByCreatedAtDesc(String userEmail);

    /**
     * Calculate total trading volume for a user (BUY + SELL), using the persisted transactionValue ("value" column).
     * Uses a native query to avoid enum path issues in JPQL.
     */
    @Query(
        value = "select coalesce(sum(t.value), 0) " +
                "from transactions t " +
                "where t.user_email = :userEmail " +
                "  and t.type in ('BUY','SELL')",
        nativeQuery = true
    )
    BigDecimal calculateTotalTradingVolume(@Param("userEmail") String userEmail);

    /**
     * Count transactions by type for a user
     */
    long countByUserEmailAndType(String userEmail, Transaction.TransactionType type);

    /**
     * Find transactions with amount greater than specified value
     */
    List<Transaction> findByUserEmailAndAmountGreaterThan(String userEmail, BigDecimal amount);

    /**
     * Find pending transactions older than specified time
     */
    List<Transaction> findByStatusAndCreatedAtBefore(Transaction.TransactionStatus status, LocalDateTime dateTime);

    /**
     * Find transactions by multiple types
     */
    List<Transaction> findByUserEmailAndTypeIn(String userEmail, List<Transaction.TransactionType> types);

    /**
     * Find completed transactions for a user
     */
    List<Transaction> findByUserEmailAndStatusOrderByCreatedAtDesc(String userEmail, Transaction.TransactionStatus status);

    /**
     * (Optional helper) Sum net amount of an asset for a user.
     * Useful when computing balances/holdings.
     */
    @Query("select coalesce(sum(t.amount), 0) " +
           "from Transaction t " +
           "where t.userEmail = :userEmail and t.asset = :asset")
    BigDecimal sumAmountByUserEmailAndAsset(@Param("userEmail") String userEmail, @Param("asset") String asset);
}
