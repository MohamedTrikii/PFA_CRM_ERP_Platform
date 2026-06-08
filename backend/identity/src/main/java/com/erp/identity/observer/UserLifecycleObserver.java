package com.erp.identity.observer;

import com.erp.identity.domain.User;

public interface UserLifecycleObserver {
    void onUserCreated(User user);
    void onUserDeactivated(User user);
}
