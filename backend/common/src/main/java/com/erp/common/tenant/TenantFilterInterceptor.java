package com.erp.common.tenant;

import com.erp.common.domain.TenantEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Enables the Hibernate "tenantFilter" at the start of every @Transactional
 * method when a tenant_id is present in TenantContext.
 *
 * This acts as a second application-level safety net on top of explicit
 * tenant_id filtering in repository queries.
 */
@Aspect
@Component
@ConditionalOnClass(name = "org.hibernate.Session")
public class TenantFilterInterceptor {

    @PersistenceContext
    private EntityManager entityManager;

    @Before("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void enableFilter() {
        String tenantId = TenantContext.get();
        if (tenantId == null || tenantId.isBlank()) return;

        UUID tid = TenantUtils.parseOrNull(tenantId);
        if (tid == null) return;

        try {
            Session session = entityManager.unwrap(Session.class);
            session.enableFilter(TenantEntity.FILTER_NAME)
                   .setParameter("tenantId", tid);
        } catch (Exception ignored) {
            // If no Hibernate Session is active (e.g. non-JPA service), silently skip
        }
    }
}
