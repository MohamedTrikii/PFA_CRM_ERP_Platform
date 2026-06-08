package com.erp.inventory.config;

import com.erp.inventory.strategy.AverageValuationStrategy;
import com.erp.inventory.strategy.FifoValuationStrategy;
import com.erp.inventory.strategy.LifoValuationStrategy;
import com.erp.inventory.strategy.StockValuationStrategy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StockValuationConfig {

    @Value("${inventory.valuation.strategy:FIFO}")
    private String strategy;

    @Bean
    public StockValuationStrategy stockValuationStrategy(FifoValuationStrategy fifo,
                                                         LifoValuationStrategy lifo,
                                                         AverageValuationStrategy avg) {
        switch (strategy.toUpperCase()) {
            case "LIFO": return lifo;
            case "AVERAGE": return avg;
            case "FIFO":
            default: return fifo;
        }
    }
}
