package com.erp.identity.factory;

import com.erp.identity.domain.User;
import com.erp.identity.domain.UserRole;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class UserFactory {

    public User create(String displayName, String email, UserRole role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setDisplayName(displayName);
        u.setEmail(email);
        u.setRole(role);
        u.setActive(true);
        return u;
    }
}
