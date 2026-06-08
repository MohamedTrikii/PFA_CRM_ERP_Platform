package com.erp.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.identity", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.identity", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.identity", "com.erp.common"})
public class IdentityApplication {
    public static void main(String[] args) {
        SpringApplication.run(IdentityApplication.class, args);
    }
}
