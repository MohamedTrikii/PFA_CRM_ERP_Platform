package com.erp.inventory.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${erp.rabbitmq.exchange:erp.events}")
    private String exchangeName;

    @Value("${queue.livraison-confirmed:inventory.livraison.confirmed}")
    private String livraisonQueue;

    @Value("${queue.reception-confirmed:inventory.reception.confirmed}")
    private String receptionQueue;

    @Bean
    public TopicExchange erpEventsExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public Queue livraisonConfirmedQueue() {
        return QueueBuilder.durable(livraisonQueue).build();
    }

    @Bean
    public Binding livraisonBinding(Queue livraisonConfirmedQueue, TopicExchange erpEventsExchange) {
        return BindingBuilder.bind(livraisonConfirmedQueue)
                .to(erpEventsExchange)
                .with("livraison.confirmed");
    }

    @Bean
    public Queue receptionConfirmedQueue() {
        return QueueBuilder.durable(receptionQueue).build();
    }

    @Bean
    public Binding receptionBinding(Queue receptionConfirmedQueue, TopicExchange erpEventsExchange) {
        return BindingBuilder.bind(receptionConfirmedQueue)
                .to(erpEventsExchange)
                .with("reception.confirmed");
    }
}
