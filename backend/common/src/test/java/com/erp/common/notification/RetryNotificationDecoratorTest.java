package com.erp.common.notification;

import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class RetryNotificationDecoratorTest {

    @Test
    void retriesOnFailureAndEventuallySucceeds() {
        AtomicInteger calls = new AtomicInteger(0);
        NotificationService flaky = new NotificationService() {
            @Override
            public void notify(String recipient, String subject, String message) {
                int c = calls.incrementAndGet();
                if (c < 3) throw new RuntimeException("transient");
            }
        };

        RetryNotificationDecorator decorator = new RetryNotificationDecorator(flaky);
        assertDoesNotThrow(() -> decorator.notify("a@b.com", "sub", "msg"));
        assertEquals(3, calls.get());
    }

    @Test
    void failsAfterMaxAttempts() {
        NotificationService alwaysFail = (r, s, m) -> { throw new RuntimeException("boom"); };
        RetryNotificationDecorator decorator = new RetryNotificationDecorator(alwaysFail);
        RuntimeException ex = assertThrows(RuntimeException.class, () -> decorator.notify("a@b.com", "s", "m"));
        assertEquals("boom", ex.getMessage());
    }
}
