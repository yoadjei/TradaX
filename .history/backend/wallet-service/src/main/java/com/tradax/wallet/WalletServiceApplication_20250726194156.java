package com.tradax.wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Main application class for TradaX Wallet Service
 */
@SpringBootApplication
@EntityScan(basePackages = "com.tradax.wallet.model")
@EnableJpaRepositories(basePackages = "com.tradax.wallet.repository")
public class WalletServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(WalletServiceApplication.class, args);
    }
}
