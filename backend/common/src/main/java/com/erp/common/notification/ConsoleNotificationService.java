package com.erp.common.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Concrete Component (Decorator) — implémentation de base qui affiche la notification.
 * En production, remplacé par un adaptateur SMTP ou SMS.
 */
public class ConsoleNotificationService implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(ConsoleNotificationService.class);

    @Override
    public void notify(String recipient, String subject, String message) {
        log.info("[NOTIFICATION] To: {} | Subject: {} | {}", recipient, subject, message);
    }
}
