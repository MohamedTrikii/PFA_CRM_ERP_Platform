package com.erp.achat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.achat", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.achat", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.achat", "com.erp.common"})
public class AchatApplication {
    public static void main(String[] args) {
        SpringApplication.run(AchatApplication.class, args);
    }
}
