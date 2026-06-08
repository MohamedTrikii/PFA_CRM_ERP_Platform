package com.erp.common.notification;

import lombok.extern.slf4j.Slf4j;

/**
 * Decorator — ajoute la journalisation avant/après l'envoi de notification.
 */
@Slf4j
public class LoggingNotificationDecorator implements NotificationService {

    private final NotificationService delegate;

    public LoggingNotificationDecorator(NotificationService delegate) {
        this.delegate = delegate;
    }

    @Override
    public void notify(String recipient, String subject, String message) {
        log.info("[NOTIF] Envoi → {} | sujet: {}", recipient, subject);
        delegate.notify(recipient, subject, message);
        log.info("[NOTIF] Envoyé → {}", recipient);
    }
}
