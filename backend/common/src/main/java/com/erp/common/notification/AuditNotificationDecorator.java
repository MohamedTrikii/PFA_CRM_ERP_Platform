package com.erp.common.notification;

import lombok.extern.slf4j.Slf4j;

import java.time.Instant;

/**
 * Decorator — ajoute une trace d'audit horodatée pour chaque notification envoyée.
 * Peut être chaîné avec LoggingNotificationDecorator.
 */
@Slf4j
public class AuditNotificationDecorator implements NotificationService {

    private final NotificationService delegate;

    public AuditNotificationDecorator(NotificationService delegate) {
        this.delegate = delegate;
    }

    @Override
    public void notify(String recipient, String subject, String message) {
        delegate.notify(recipient, subject, message);
        log.info("[AUDIT-NOTIF] at={} recipient={} subject={}", Instant.now(), recipient, subject);
    }
}
