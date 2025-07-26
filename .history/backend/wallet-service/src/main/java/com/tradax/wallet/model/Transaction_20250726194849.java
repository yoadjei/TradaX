package com.tradax.wallet.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TransactionType type;

    @Column(name = "asset", nullable = false)
    private String asset;

    @Column(name = "amount", nullable = false, precision = 20, scale = 8)
    private BigDecimal amount;

    @Column(name = "price", precision = 20, scale = 8)
    private BigDecimal price;

    // rename the column to avoid reserved keyword issues
    @Column(name = "tx_value", precision = 20, scale = 8)
    private BigDecimal transactionValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TransactionStatus status;

    @Column(name = "transaction_hash")
    private String transactionHash;

    @Column(name = "description")
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public enum TransactionType {
        DEPOSIT,
        WITHDRAWAL,
        BUY,
        SELL,
        TRANSFER_IN,
        TRANSFER_OUT
    }

    public enum TransactionStatus {
        PENDING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public Transaction() {
    }

    public Transaction(String userEmail, TransactionType type, String asset, BigDecimal amount) {
        this.userEmail = userEmail;
        this.type = type;
        this.asset = asset;
        this.amount = amount;
        this.status = TransactionStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    // Getters / setters

    public Long getId() { return id; }

    public void setId(Long id) { this.id = id; }

    public String getUserEmail() { return userEmail; }

    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public TransactionType getType() { return type; }

    public void setType(TransactionType type) { this.type = type; }

    public String getAsset() { return asset; }

    public void setAsset(String asset) { this.asset = asset; }

    public BigDecimal getAmount() { return amount; }

    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getPrice() { return price; }

    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getValue() { return transactionValue; }

    public void setValue(BigDecimal value) { this.transactionValue = value; }

    public TransactionStatus getStatus() { return status; }

    public void setStatus(TransactionStatus status) { this.status = status; }

    public String getTransactionHash() { return transactionHash; }

    public void setTransactionHash(String transactionHash) { this.transactionHash = transactionHash; }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }

    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = TransactionStatus.PENDING;
    }

    @Override
    public String toString() {
        return "Transaction{" +
                "id=" + id +
                ", userEmail='" + userEmail + '\'' +
                ", type=" + type +
                ", asset='" + asset + '\'' +
                ", amount=" + amount +
                ", price=" + price +
                ", value=" + transactionValue +
                ", status=" + status +
                ", createdAt=" + createdAt +
                ", completedAt=" + completedAt +
                '}';
    }
}
