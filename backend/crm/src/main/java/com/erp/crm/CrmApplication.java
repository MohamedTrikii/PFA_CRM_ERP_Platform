package com.erp.crm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.crm", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.crm", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.crm", "com.erp.common"})
public class CrmApplication {
    public static void main(String[] args) {
        SpringApplication.run(CrmApplication.class, args);
    }
}
