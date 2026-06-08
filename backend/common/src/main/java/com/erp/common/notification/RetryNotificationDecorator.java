package com.erp.common.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;

public class RetryNotificationDecorator implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(RetryNotificationDecorator.class);

    private final NotificationService delegate;
    private final int maxAttempts = 3;
    private final Duration backoff = Duration.ofSeconds(1);

    public RetryNotificationDecorator(NotificationService delegate) {
        this.delegate = delegate;
    }

    @Override
    public void notify(String recipient, String subject, String message) {
        int attempt = 0;
        while (true) {
            try {
                attempt++;
                delegate.notify(recipient, subject, message);
                return;
            } catch (RuntimeException e) {
                log.warn("Notification send failed (attempt {}/{}): {}", attempt, maxAttempts, e.getMessage());
                if (attempt >= maxAttempts) throw e;
                try { Thread.sleep(backoff.toMillis()); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); throw new RuntimeException(ie); }
            }
        }
    }
}
