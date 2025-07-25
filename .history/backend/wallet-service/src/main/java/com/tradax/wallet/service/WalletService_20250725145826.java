package com.tradax.wallet.service;

import com.tradax.wallet.model.Transaction;
import com.tradax.wallet.model.Wallet;
import com.tradax.wallet.repository.TransactionRepository;
import com.tradax.wallet.repository.WalletRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service class for wallet operations
 */
@Service
@Transactional
public class WalletService {

    private static final Logger logger = LoggerFactory.getLogger(WalletService.class);

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    // Simulated current prices for cryptocurrencies (in a real app, this would come from an external API)
    private final Map<String, BigDecimal> currentPrices = new HashMap<String, BigDecimal>() {{
        put("btc", new BigDecimal("45000.00"));
        put("eth", new BigDecimal("3000.00"));
        put("ada", new BigDecimal("0.50"));
        put("sol", new BigDecimal("100.00"));
        put("usd", new BigDecimal("1.00"));
    }};

    /**
     * Get all wallets for a user
     */
    @Transactional(readOnly = true)
    public List<Wallet> getUserWallets(String userEmail) {
        List<Wallet> wallets = walletRepository.findByUserEmail(userEmail);

        // If user has no wallets, create initial ones with zero balance
        if (wallets.isEmpty()) {
            wallets = createInitialWallets(userEmail);
        }

        // Update current prices and values
        for (Wallet wallet : wallets) {
            BigDecimal currentPrice = getCurrentPrice(wallet.getAsset());
            wallet.setPrice(currentPrice);
        }

        return wallets;
    }

    /**
     * Create initial wallets for a new user
     */
    private List<Wallet> createInitialWallets(String userEmail) {
        logger.info("Creating initial wallets for user: {}", userEmail);

        String[] assets = {"BTC", "ETH", "ADA", "SOL", "USD"};
        String[] assetNames = {"Bitcoin", "Ethereum", "Cardano", "Solana", "US Dollar"};

        for (int i = 0; i < assets.length; i++) {
            Wallet wallet = new Wallet();
            wallet.setUserEmail(userEmail);
            wallet.setAsset(assets[i]);
            wallet.setSymbol(assets[i]);
            wallet.setName(assetNames[i]);
            wallet.setBalance(BigDecimal.ZERO);
            wallet.setPrice(getCurrentPrice(assets[i].toLowerCase()));
            wallet.setCreatedAt(LocalDateTime.now());
            wallet.setUpdatedAt(LocalDateTime.now());

            // Give initial USD balance for testing
            if ("USD".equals(assets[i])) {
                wallet.setBalance(new BigDecimal("10000.00"));
            }

            walletRepository.save(wallet);
        }

        return walletRepository.findByUserEmail(userEmail);
    }

    /**
     * Deposit funds to user wallet
     */
    public Transaction deposit(String userEmail, String asset, BigDecimal amount) {
        logger.info("Processing deposit: user={}, asset={}, amount={}", userEmail, asset, amount);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Deposit amount must be greater than zero");
        }

        Wallet wallet = getOrCreateWallet(userEmail, asset.toUpperCase());

        // Update wallet balance
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setUserEmail(userEmail);
        transaction.setType(Transaction.TransactionType.DEPOSIT);
        transaction.setAsset(asset.toUpperCase());
        transaction.setAmount(amount);
        BigDecimal price = getCurrentPrice(asset.toLowerCase());
        transaction.setPrice(price);
        transaction.setValue(amount.multiply(price));
        transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
        transaction.setCreatedAt(LocalDateTime.now());

        return transactionRepository.save(transaction);
    }

    /**
     * Withdraw funds from user wallet
     */
    public Transaction withdraw(String userEmail, String asset, BigDecimal amount) {
        logger.info("Processing withdrawal: user={}, asset={}, amount={}", userEmail, asset, amount);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Withdrawal amount must be greater than zero");
        }

        Wallet wallet = getOrCreateWallet(userEmail, asset.toUpperCase());

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance for withdrawal");
        }

        // Update wallet balance
        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setUserEmail(userEmail);
        transaction.setType(Transaction.TransactionType.WITHDRAWAL);
        transaction.setAsset(asset.toUpperCase());
        transaction.setAmount(amount);
        BigDecimal price = getCurrentPrice(asset.toLowerCase());
        transaction.setPrice(price);
        transaction.setValue(amount.multiply(price));
        transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
        transaction.setCreatedAt(LocalDateTime.now());

        return transactionRepository.save(transaction);
    }

    /**
     * Execute a trade (buy or sell)
     */
    public Transaction executeTrade(String userEmail, String type, String asset, BigDecimal amount, BigDecimal price) {
        logger.info("Executing trade: user={}, type={}, asset={}, amount={}, price={}",
                userEmail, type, asset, amount, price);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Trade amount must be greater than zero");
        }

        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Trade price must be greater than zero");
        }

        BigDecimal totalValue = amount.multiply(price);

        if ("buy".equalsIgnoreCase(type)) {
            return executeBuyTrade(userEmail, asset.toUpperCase(), amount, price, totalValue);
        } else if ("sell".equalsIgnoreCase(type)) {
            return executeSellTrade(userEmail, asset.toUpperCase(), amount, price, totalValue);
        } else {
            throw new RuntimeException("Invalid trade type. Must be 'buy' or 'sell'");
        }
    }

    /**
     * Execute buy trade
     */
    private Transaction executeBuyTrade(String userEmail, String asset, BigDecimal amount, BigDecimal price, BigDecimal totalValue) {
        // Get USD wallet to pay from
        Wallet usdWallet = getOrCreateWallet(userEmail, "USD");

        if (usdWallet.getBalance().compareTo(totalValue) < 0) {
            throw new RuntimeException("Insufficient USD balance for purchase");
        }

        // Get asset wallet to add to
        Wallet assetWallet = getOrCreateWallet(userEmail, asset);

        // Update balances
        usdWallet.setBalance(usdWallet.getBalance().subtract(totalValue));
        usdWallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(usdWallet);

        assetWallet.setBalance(assetWallet.getBalance().add(amount));
        assetWallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(assetWallet);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setUserEmail(userEmail);
        transaction.setType(Transaction.TransactionType.BUY);
        transaction.setAsset(asset);
        transaction.setAmount(amount);
        transaction.setPrice(price);
        transaction.setValue(totalValue);
        transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
        transaction.setCreatedAt(LocalDateTime.now());

        return transactionRepository.save(transaction);
    }

    /**
     * Execute sell trade
     */
    private Transaction executeSellTrade(String userEmail, String asset, BigDecimal amount, BigDecimal price, BigDecimal totalValue) {
        // Get asset wallet to sell from
        Wallet assetWallet = getOrCreateWallet(userEmail, asset);

        if (assetWallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient " + asset + " balance for sale");
        }

        // Get USD wallet to add to
        Wallet usdWallet = getOrCreateWallet(userEmail, "USD");

        // Update balances
        assetWallet.setBalance(assetWallet.getBalance().subtract(amount));
        assetWallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(assetWallet);

        usdWallet.setBalance(usdWallet.getBalance().add(totalValue));
        usdWallet.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(usdWallet);

        // Create transaction record
        Transaction transaction = new Transaction();
        transaction.setUserEmail(userEmail);
        transaction.setType(Transaction.TransactionType.SELL);
        transaction.setAsset(asset);
        transaction.setAmount(amount);
        transaction.setPrice(price);
        transaction.setValue(totalValue);
        transaction.setStatus(Transaction.TransactionStatus.COMPLETED);
        transaction.setCreatedAt(LocalDateTime.now());

        return transactionRepository.save(transaction);
    }

    /**
     * Get transaction history for a user
     */
    @Transactional(readOnly = true)
    public Page<Transaction> getTransactionHistory(String userEmail, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return transactionRepository.findByUserEmail(userEmail, pageable);
    }

    /**
     * Calculate total portfolio value in USD
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPortfolioValue(String userEmail) {
        List<Wallet> wallets = walletRepository.findByUserEmail(userEmail);
        BigDecimal totalValue = BigDecimal.ZERO;

        for (Wallet wallet : wallets) {
            BigDecimal currentPrice = getCurrentPrice(wallet.getAsset().toLowerCase());
            BigDecimal walletValue = wallet.getBalance().multiply(currentPrice);
            totalValue = totalValue.add(walletValue);
        }

        return totalValue.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Get portfolio performance metrics
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPortfolioPerformance(String userEmail) {
        Map<String, Object> performance = new HashMap<>();

        // Calculate basic performance metrics
        BigDecimal totalValue = calculateTotalPortfolioValue(userEmail);
        BigDecimal initialValue = new BigDecimal("10000.00"); // Initial USD balance
        BigDecimal gain = totalValue.subtract(initialValue);
        BigDecimal gainPercentage = initialValue.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : gain.divide(initialValue, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));

        performance.put("totalValue", totalValue);
        performance.put("initialValue", initialValue);
        performance.put("totalGain", gain.setScale(2, RoundingMode.HALF_UP));
        performance.put("totalGainPercentage", gainPercentage.setScale(2, RoundingMode.HALF_UP));
        performance.put("dayChange", new BigDecimal("0.00")); // Would be calculated from historical data
        performance.put("dayChangePercentage", new BigDecimal("0.00"));

        return performance;
    }

    /**
     * Calculate profit or loss for a user
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateProfitLoss(String userEmail) {
        BigDecimal totalSellValue = transactionRepository
                .findByUserEmailAndType(userEmail, Transaction.TransactionType.SELL)
                .stream()
                .map(t -> Optional.ofNullable(t.getValue()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalBuyValue = transactionRepository
                .findByUserEmailAndType(userEmail, Transaction.TransactionType.BUY)
                .stream()
                .map(t -> Optional.ofNullable(t.getValue()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalSellValue.subtract(totalBuyValue).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Total trading volume for a user (BUY + SELL summed by stored transaction value)
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalTradingVolume(String userEmail) {
        BigDecimal vol = transactionRepository.calculateTotalTradingVolume(userEmail);
        return (vol == null ? BigDecimal.ZERO : vol).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Get or create wallet for user and asset
     */
    private Wallet getOrCreateWallet(String userEmail, String asset) {
        Optional<Wallet> existingWallet = walletRepository.findByUserEmailAndAsset(userEmail, asset);

        if (existingWallet.isPresent()) {
            return existingWallet.get();
        }

        // Create new wallet
        Wallet wallet = new Wallet();
        wallet.setUserEmail(userEmail);
        wallet.setAsset(asset);
        wallet.setSymbol(asset);
        wallet.setName(getAssetName(asset));
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setPrice(getCurrentPrice(asset.toLowerCase()));
        wallet.setCreatedAt(LocalDateTime.now());
        wallet.setUpdatedAt(LocalDateTime.now());

        return walletRepository.save(wallet);
    }

    /**
     * Get current price for an asset
     */
    private BigDecimal getCurrentPrice(String asset) {
        return currentPrices.getOrDefault(asset.toLowerCase(), BigDecimal.ONE);
    }

    /**
     * Get asset name from symbol
     */
    private String getAssetName(String symbol) {
        Map<String, String> assetNames = new HashMap<String, String>() {{
            put("BTC", "Bitcoin");
            put("ETH", "Ethereum");
            put("ADA", "Cardano");
            put("SOL", "Solana");
            put("USD", "US Dollar");
        }};

        return assetNames.getOrDefault(symbol.toUpperCase(), symbol);
    }
}

