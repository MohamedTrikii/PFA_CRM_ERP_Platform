package com.erp.cms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.erp.cms", "com.erp.common"})
@EnableJpaRepositories(basePackages = {"com.erp.cms", "com.erp.common"})
@EntityScan(basePackages = {"com.erp.cms", "com.erp.common"})
public class CmsApplication {
    public static void main(String[] args) {
        SpringApplication.run(CmsApplication.class, args);
    }
}
