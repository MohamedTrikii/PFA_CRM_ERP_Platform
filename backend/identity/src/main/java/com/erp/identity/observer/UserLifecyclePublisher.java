package com.erp.identity.observer;

import com.erp.identity.domain.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class UserLifecyclePublisher {

    private static final Logger log = LoggerFactory.getLogger(UserLifecyclePublisher.class);

    private final List<UserLifecycleObserver> observers = new CopyOnWriteArrayList<>();

    public void register(UserLifecycleObserver o) { observers.add(o); }
    public void unregister(UserLifecycleObserver o) { observers.remove(o); }

    public void publishCreated(User user) {
        for (UserLifecycleObserver o : observers) {
            try { o.onUserCreated(user); } catch (Exception e) { log.warn("Observer threw during user created publish", e); }
        }
    }

    public void publishDeactivated(User user) {
        for (UserLifecycleObserver o : observers) {
            try { o.onUserDeactivated(user); } catch (Exception e) { log.warn("Observer threw during user deactivated publish", e); }
        }
    }
}
