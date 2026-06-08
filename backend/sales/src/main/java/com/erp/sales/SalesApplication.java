package com.erp.sales;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.sales", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.sales", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.sales", "com.erp.common"})
public class SalesApplication {
    public static void main(String[] args) {
        SpringApplication.run(SalesApplication.class, args);
    }
}
