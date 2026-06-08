package com.erp.common.notification;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configure the notification chain: console -> audit -> logging -> retry
 */
@Configuration
public class NotificationConfig {

    @Bean
    public NotificationService consoleNotification() {
        return new ConsoleNotificationService();
    }

    @Bean
    public NotificationService auditNotification(NotificationService consoleNotification) {
        return new AuditNotificationDecorator(consoleNotification);
    }

    @Bean
    public NotificationService loggingNotification(NotificationService auditNotification) {
        return new LoggingNotificationDecorator(auditNotification);
    }

    @Bean
    public NotificationService notificationService(NotificationService loggingNotification) {
        return new RetryNotificationDecorator(loggingNotification);
    }
}
