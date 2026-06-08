package com.erp.cms.factory;

import com.erp.cms.domain.TenantNotice;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
public class NoticeFactory {

    public TenantNotice create(String title, String body, UUID tenantId) {
        TenantNotice n = new TenantNotice();
        n.setId(UUID.randomUUID());
        n.setTitle(title);
        n.setBody(body);
        n.setTenantId(tenantId);
        n.setStartsAt(Instant.now());
        return n;
    }
}
