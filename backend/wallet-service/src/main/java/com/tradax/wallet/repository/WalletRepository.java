package com.tradax.wallet.repository;

import com.tradax.wallet.model.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Wallet entity
 */
@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    /**
     * Find all wallets for a user
     */
    List<Wallet> findByUserEmail(String userEmail);

    /**
     * Find specific wallet for user and asset
     */
    Optional<Wallet> findByUserEmailAndAsset(String userEmail, String asset);

    /**
     * Find wallets with balance greater than zero
     */
    List<Wallet> findByUserEmailAndBalanceGreaterThan(String userEmail, BigDecimal balance);

    /**
     * Find wallets by asset type
     */
    List<Wallet> findByAsset(String asset);

    /**
     * Find wallets updated after a specific date
     */
    List<Wallet> findByUpdatedAtAfter(LocalDateTime dateTime);

    /**
     * Calculate total portfolio value for a user
     */
    @Query("SELECT SUM(w.balance * w.price) FROM Wallet w WHERE w.userEmail = :userEmail")
    BigDecimal calculateTotalPortfolioValue(@Param("userEmail") String userEmail);

    /**
     * Count wallets for a user
     */
    long countByUserEmail(String userEmail);

    /**
     * Find wallets with specific symbols
     */
    List<Wallet> findBySymbolIn(List<String> symbols);

    /**
     * Check if user has a wallet for specific asset
     */
    boolean existsByUserEmailAndAsset(String userEmail, String asset);

    /**
     * Find top holders of a specific asset
     */
    List<Wallet> findTop10ByAssetOrderByBalanceDesc(String asset);
}
