package com.tradax.wallet.repository;

import com.tradax.wallet.model.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for Transaction entity
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Page<Transaction> findByUserEmail(String userEmail, Pageable pageable);

    List<Transaction> findByUserEmailAndAsset(String userEmail, String asset);

    List<Transaction> findByUserEmailAndType(String userEmail, Transaction.TransactionType type);

    List<Transaction> findByStatus(Transaction.TransactionStatus status);

    List<Transaction> findByUserEmailAndCreatedAtBetween(String userEmail, LocalDateTime startDate, LocalDateTime endDate);

    List<Transaction> findTop10ByUserEmailOrderByCreatedAtDesc(String userEmail);

    @Query(
        value = "select coalesce(sum(t.value), 0) " +
                "from transactions t " +
                "where t.user_email = :userEmail " +
                "  and t.type in ('BUY','SELL')",
        nativeQuery = true
    )
    BigDecimal calculateTotalTradingVolume(@Param("userEmail") String userEmail);

    long countByUserEmailAndType(String userEmail, Transaction.TransactionType type);

    List<Transaction> findByUserEmailAndAmountGreaterThan(String userEmail, BigDecimal amount);

    List<Transaction> findByStatusAndCreatedAtBefore(Transaction.TransactionStatus status, LocalDateTime dateTime);

    List<Transaction> findByUserEmailAndTypeIn(String userEmail, List<Transaction.TransactionType> types);

    List<Transaction> findByUserEmailAndStatusOrderByCreatedAtDesc(String userEmail, Transaction.TransactionStatus status);

    @Query("select coalesce(sum(t.amount), 0) " +
           "from Transaction t " +
           "where t.userEmail = :userEmail and t.asset = :asset")
    BigDecimal sumAmountByUserEmailAndAsset(@Param("userEmail") String userEmail, @Param("asset") String asset);
}
