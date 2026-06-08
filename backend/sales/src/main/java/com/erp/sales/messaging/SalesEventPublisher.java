package com.erp.sales.messaging;

import com.erp.common.event.LivraisonConfirmedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SalesEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${erp.rabbitmq.exchange:erp.events}")
    private String exchange;

    private static final String ROUTING_KEY_LIVRAISON_CONFIRMED = "livraison.confirmed";

    public void publishLivraisonConfirmed(LivraisonConfirmedEvent event) {
        log.info("Publishing LivraisonConfirmedEvent livraisonId={} tenantId={}",
                event.livraisonId(), event.tenantId());
        rabbitTemplate.convertAndSend(exchange, ROUTING_KEY_LIVRAISON_CONFIRMED, event);
    }
}
