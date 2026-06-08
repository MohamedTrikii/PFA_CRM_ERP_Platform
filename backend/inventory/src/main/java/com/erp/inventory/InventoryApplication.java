package com.erp.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.inventory", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.inventory", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.inventory", "com.erp.common"})
public class InventoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(InventoryApplication.class, args);
    }
}
