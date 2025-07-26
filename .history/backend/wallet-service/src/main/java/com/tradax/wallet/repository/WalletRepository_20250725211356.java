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

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    List<Wallet> findByUserEmail(String userEmail);

    Optional<Wallet> findByUserEmailAndAsset(String userEmail, String asset);

    List<Wallet> findByUserEmailAndBalanceGreaterThan(String userEmail, BigDecimal balance);

    List<Wallet> findByAsset(String asset);

    List<Wallet> findByUpdatedAtAfter(LocalDateTime dateTime);

    @Query("SELECT SUM(w.balance * w.price) FROM Wallet w WHERE w.userEmail = :userEmail")
    BigDecimal calculateTotalPortfolioValue(@Param("userEmail") String userEmail);

    long countByUserEmail(String userEmail);

    List<Wallet> findBySymbolIn(List<String> symbols);

    boolean existsByUserEmailAndAsset(String userEmail, String asset);

    List<Wallet> findTop10ByAssetOrderByBalanceDesc(String asset);
}
