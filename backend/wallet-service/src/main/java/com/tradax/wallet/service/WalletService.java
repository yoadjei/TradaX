package com.tradax.wallet.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradax.wallet.model.Transaction;
import com.tradax.wallet.model.Wallet;
import com.tradax.wallet.repository.TransactionRepository;
import com.tradax.wallet.repository.WalletRepository;

@Service
@Transactional
public class WalletService {

    private static final Logger logger = LoggerFactory.getLogger(WalletService.class);

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private static final BigDecimal FEE_RATE = new BigDecimal("0.001");
    private static final Map<String, BigDecimal> CURRENT_PRICES = new HashMap<>() {{
        put("btc", new BigDecimal("45000.00"));
        put("eth", new BigDecimal("3000.00"));
        put("ada", new BigDecimal("0.50"));
        put("sol", new BigDecimal("100.00"));
        put("usd", new BigDecimal("1.00"));
    }};

    @Transactional(readOnly = true)
    public List<Wallet> getUserWallets(String userEmail) {
        List<Wallet> wallets = walletRepository.findByUserEmail(userEmail);
        if (wallets.isEmpty()) {
            wallets = createInitialWallets(userEmail);
        }
        wallets.forEach(w -> w.setPrice(getCurrentPrice(w.getAsset())));
        return wallets;
    }

    private List<Wallet> createInitialWallets(String userEmail) {
        logger.info("Creating initial wallets for user: {}", userEmail);
        String[] assets = {"BTC","ETH","ADA","SOL","USD"};
        String[] names  = {"Bitcoin","Ethereum","Cardano","Solana","US Dollar"};
        for(int i=0;i<assets.length;i++){
            Wallet w = new Wallet();
            w.setUserEmail(userEmail);
            w.setAsset(assets[i]);
            w.setSymbol(assets[i]);
            w.setName(names[i]);
            w.setBalance(BigDecimal.ZERO);
            if("USD".equals(assets[i])) w.setBalance(new BigDecimal("10000.00"));
            w.setPrice(getCurrentPrice(assets[i]));
            w.setCreatedAt(LocalDateTime.now());
            w.setUpdatedAt(LocalDateTime.now());
            walletRepository.save(w);
        }
        return walletRepository.findByUserEmail(userEmail);
    }

    public Transaction deposit(String userEmail, String asset, BigDecimal amount) {
        if(amount.compareTo(BigDecimal.ZERO)<=0)
            throw new RuntimeException("Deposit amount must be > 0");
        Wallet w = getOrCreateWallet(userEmail, asset.toUpperCase());
        w.setBalance(w.getBalance().add(amount));
        w.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(w);

        BigDecimal price = getCurrentPrice(asset);
        BigDecimal value = amount.multiply(price);

        Transaction t = new Transaction();
        t.setUserEmail(userEmail);
        t.setType(Transaction.TransactionType.DEPOSIT);
        t.setAsset(asset.toUpperCase());
        t.setAmount(amount);
        t.setPrice(price);
        t.setValue(value);
        t.setStatus(Transaction.TransactionStatus.COMPLETED);
        t.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(t);
    }

    public Transaction withdraw(String userEmail, String asset, BigDecimal amount) {
        if(amount.compareTo(BigDecimal.ZERO)<=0)
            throw new RuntimeException("Withdrawal amount must be > 0");
        Wallet w = getOrCreateWallet(userEmail, asset.toUpperCase());
        if(w.getBalance().compareTo(amount)<0)
            throw new RuntimeException("Insufficient balance");
        w.setBalance(w.getBalance().subtract(amount));
        w.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(w);

        BigDecimal price = getCurrentPrice(asset);
        BigDecimal value = amount.multiply(price);

        Transaction t = new Transaction();
        t.setUserEmail(userEmail);
        t.setType(Transaction.TransactionType.WITHDRAWAL);
        t.setAsset(asset.toUpperCase());
        t.setAmount(amount);
        t.setPrice(price);
        t.setValue(value);
        t.setStatus(Transaction.TransactionStatus.COMPLETED);
        t.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(t);
    }

    public Transaction executeTrade(String userEmail, String type, String asset, BigDecimal amount, BigDecimal price) {
        BigDecimal total = amount.multiply(price);
        if("buy".equalsIgnoreCase(type)) {
            return executeBuy(userEmail, asset.toUpperCase(), amount, price, total);
        } else if("sell".equalsIgnoreCase(type)) {
            return executeSell(userEmail, asset.toUpperCase(), amount, price, total);
        } else {
            throw new RuntimeException("Invalid trade type");
        }
    }

    private Transaction executeBuy(String userEmail, String asset, BigDecimal amount, BigDecimal price, BigDecimal total) {
        Wallet usd = getOrCreateWallet(userEmail, "USD");
        BigDecimal fee = total.multiply(FEE_RATE);
        BigDecimal cost = total.add(fee);
        if(usd.getBalance().compareTo(cost)<0)
            throw new RuntimeException("Insufficient USD for purchase with fees");
        usd.setBalance(usd.getBalance().subtract(cost));
        usd.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(usd);

        Wallet assetW = getOrCreateWallet(userEmail, asset);
        assetW.setBalance(assetW.getBalance().add(amount));
        assetW.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(assetW);

        Transaction t = new Transaction();
        t.setUserEmail(userEmail);
        t.setType(Transaction.TransactionType.BUY);
        t.setAsset(asset);
        t.setAmount(amount);
        t.setPrice(price);
        t.setValue(total);
        t.setStatus(Transaction.TransactionStatus.COMPLETED);
        t.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(t);
    }

    private Transaction executeSell(String userEmail, String asset, BigDecimal amount, BigDecimal price, BigDecimal total) {
        Wallet assetW = getOrCreateWallet(userEmail, asset);
        if(assetW.getBalance().compareTo(amount)<0)
            throw new RuntimeException("Insufficient asset balance");
        BigDecimal fee = total.multiply(FEE_RATE);
        BigDecimal proceeds = total.subtract(fee);

        assetW.setBalance(assetW.getBalance().subtract(amount));
        assetW.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(assetW);

        Wallet usd = getOrCreateWallet(userEmail, "USD");
        usd.setBalance(usd.getBalance().add(proceeds));
        usd.setUpdatedAt(LocalDateTime.now());
        walletRepository.save(usd);

        Transaction t = new Transaction();
        t.setUserEmail(userEmail);
        t.setType(Transaction.TransactionType.SELL);
        t.setAsset(asset);
        t.setAmount(amount);
        t.setPrice(price);
        t.setValue(total);
        t.setStatus(Transaction.TransactionStatus.COMPLETED);
        t.setCreatedAt(LocalDateTime.now());
        return transactionRepository.save(t);
    }

    @Transactional(readOnly = true)
    public Page<Transaction> getTransactionHistory(String userEmail, int page, int size) {
        return transactionRepository.findByUserEmail(
            userEmail,
            PageRequest.of(page, size, Sort.by("createdAt").descending())
        );
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPortfolioValue(String userEmail) {
        return walletRepository.findByUserEmail(userEmail).stream()
            .map(w -> w.getBalance().multiply(getCurrentPrice(w.getAsset())))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public Map<String,Object> getPortfolioPerformance(String userEmail) {
        BigDecimal total = calculateTotalPortfolioValue(userEmail);
        BigDecimal init  = new BigDecimal("10000.00");
        BigDecimal gain  = total.subtract(init);
        BigDecimal pct   = init.compareTo(BigDecimal.ZERO)==0
            ? BigDecimal.ZERO
            : gain.divide(init,4,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        Map<String,Object> perf = new HashMap<>();
        perf.put("totalValue", total);
        perf.put("initialValue", init);
        perf.put("totalGain", gain.setScale(2,RoundingMode.HALF_UP));
        perf.put("totalGainPercentage", pct.setScale(2,RoundingMode.HALF_UP));
        perf.put("dayChange", BigDecimal.ZERO);
        perf.put("dayChangePercentage", BigDecimal.ZERO);
        return perf;
    }

    @Transactional(readOnly = true)
    public BigDecimal calculateProfitLoss(String userEmail) {
        BigDecimal sells = transactionRepository.findByUserEmailAndType(userEmail, Transaction.TransactionType.SELL)
            .stream().map(t->Optional.ofNullable(t.getValue()).orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal buys  = transactionRepository.findByUserEmailAndType(userEmail, Transaction.TransactionType.BUY)
            .stream().map(t->Optional.ofNullable(t.getValue()).orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sells.subtract(buys).setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalTradingVolume(String userEmail) {
        BigDecimal vol = transactionRepository.calculateTotalTradingVolume(userEmail);
        return (vol==null?BigDecimal.ZERO:vol).setScale(2,RoundingMode.HALF_UP);
    }

    private Wallet getOrCreateWallet(String userEmail, String asset) {
        return walletRepository.findByUserEmailAndAsset(userEmail, asset)
            .orElseGet(() -> {
                Wallet w = new Wallet();
                w.setUserEmail(userEmail);
                w.setAsset(asset);
                w.setSymbol(asset);
                w.setName(getAssetName(asset));
                w.setBalance(BigDecimal.ZERO);
                w.setPrice(getCurrentPrice(asset));
                w.setCreatedAt(LocalDateTime.now());
                w.setUpdatedAt(LocalDateTime.now());
                return walletRepository.save(w);
            });
    }

    private BigDecimal getCurrentPrice(String asset) {
        return CURRENT_PRICES.getOrDefault(asset.toLowerCase(), BigDecimal.ONE);
    }

    private String getAssetName(String s) {
        Map<String,String> m = Map.of(
            "BTC","Bitcoin","ETH","Ethereum","ADA","Cardano","SOL","Solana","USD","US Dollar"
        );
        return m.getOrDefault(s.toUpperCase(), s);
    }
}
