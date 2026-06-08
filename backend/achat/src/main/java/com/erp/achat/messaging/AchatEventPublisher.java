package com.erp.achat.messaging;

import com.erp.common.event.ReceptionConfirmedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AchatEventPublisher {

    private static final String EXCHANGE    = "erp.events";
    private static final String ROUTING_KEY = "reception.confirmed";

    private final RabbitTemplate rabbitTemplate;

    public void publishReceptionConfirmed(ReceptionConfirmedEvent event) {
        rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_KEY, event);
    }
}
