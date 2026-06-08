package com.erp.common.notification;

/**
 * Decorator — interface composant de base pour l'envoi de notifications.
 * Les décorateurs ajoutent des comportements transversaux (logging, audit, retry).
 */
public interface NotificationService {
    void notify(String recipient, String subject, String message);
}
