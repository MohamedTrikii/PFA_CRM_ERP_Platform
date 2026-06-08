package com.erp.sales.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${erp.rabbitmq.exchange:erp.events}")
    private String exchangeName;

    @Bean
    public TopicExchange erpEventsExchange() {
        return new TopicExchange(exchangeName, true, false);
    }
}
