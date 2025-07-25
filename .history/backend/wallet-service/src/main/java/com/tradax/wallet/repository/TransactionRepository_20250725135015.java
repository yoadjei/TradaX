package com.tradax.wallet.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.tradax.wallet.model.Transaction;
import com.tradax.wallet.model.Transaction.TransactionType;
import com.tradax.wallet.model.Transaction.TransactionStatus;

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

    Page<Transaction> findByUserEmail(String userEmail, Pageable pageable);

    List<Transaction> findByUserEmailAndAsset(String userEmail, String asset);

    List<Transaction> findByUserEmailAndType(String userEmail, TransactionType type);

    List<Transaction> findByStatus(TransactionStatus status);

    List<Transaction> findByUserEmailAndCreatedAtBetween(String userEmail, LocalDateTime startDate, LocalDateTime endDate);

    List<Transaction> findTop10ByUserEmailOrderByCreatedAtDesc(String userEmail);

    long countByUserEmailAndType(String userEmail, TransactionType type);

    List<Transaction> findByUserEmailAndAmountGreaterThan(String userEmail, BigDecimal amount);

    List<Transaction> findByStatusAndCreatedAtBefore(TransactionStatus status, LocalDateTime dateTime);

    List<Transaction> findByUserEmailAndTypeIn(String userEmail, List<TransactionType> types);

    List<Transaction> findByUserEmailAndStatusOrderByCreatedAtDesc(String userEmail, TransactionStatus status);

    /**
     * Calculate total trading volume (BUY + SELL) for a user
     */
    @Query("""
        SELECT COALESCE(SUM(t.transactionValue), 0)
        FROM Transaction t
        WHERE t.userEmail = :userEmail
        AND t.type IN (com.tradax.wallet.model.Transaction.TransactionType.BUY, com.tradax.wallet.model.Transaction.TransactionType.SELL)
    """)
    BigDecimal calculateTotalTradingVolume(@Param("userEmail") String userEmail);

    /**
     * Portfolio aggregation by asset for a user
     */
    @Query("""
        SELECT t.asset AS asset,
               COALESCE(SUM(t.amount), 0) AS totalQuantity,
               COALESCE(SUM(t.transactionValue), 0) AS totalValue
        FROM Transaction t
        WHERE t.userEmail = :userEmail
        AND t.type IN (com.tradax.wallet.model.Transaction.TransactionType.BUY, com.tradax.wallet.model.Transaction.TransactionType.SELL)
        GROUP BY t.asset
    """)
    List<Object[]> getPortfolioSummary(@Param("userEmail") String userEmail);
}
