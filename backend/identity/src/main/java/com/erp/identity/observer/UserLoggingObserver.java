package com.erp.identity.observer;

import com.erp.identity.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class UserLoggingObserver implements UserLifecycleObserver {

    private static final Logger log = LoggerFactory.getLogger(UserLoggingObserver.class);

    @Override
    public void onUserCreated(User user) {
        log.info("User created: {} ({})", user.getDisplayName(), user.getId());
    }

    @Override
    public void onUserDeactivated(User user) {
        log.info("User deactivated: {} ({})", user.getDisplayName(), user.getId());
    }
}
