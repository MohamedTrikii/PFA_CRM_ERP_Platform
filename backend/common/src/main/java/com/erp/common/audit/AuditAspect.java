package com.erp.common.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Intercepts every @Auditable method and writes an audit entry after it returns.
 *
 * Entity ID resolution order:
 *   1. Return value has getId() → use that
 *   2. First argument is a UUID → use that
 *   3. Leave entityId null
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditAspect {

    private final AuditService auditService;

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint pjp, Auditable auditable) throws Throwable {
        Object result = pjp.proceed();   // Let the business method run first

        try {
            String entityType = resolveEntityType(auditable, pjp);
            String entityId   = resolveEntityId(result, pjp.getArgs());
            Map<String, Object> payload = auditable.captureArgs()
                ? captureArgs(pjp)
                : null;

            auditService.log(auditable.action(), entityType, entityId, payload);
        } catch (Exception ex) {
            log.warn("AuditAspect failed to log (non-fatal): {}", ex.getMessage());
        }

        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String resolveEntityType(Auditable auditable, ProceedingJoinPoint pjp) {
        if (!auditable.entityType().isBlank()) return auditable.entityType();
        // Fall back to declaring class simple name
        return pjp.getTarget().getClass().getSimpleName()
                  .replace("Service", "")
                  .replace("Impl", "");
    }

    private String resolveEntityId(Object returnValue, Object[] args) {
        // Try return value getId()
        if (returnValue != null) {
            try {
                Method getId = returnValue.getClass().getMethod("id");
                Object id = getId.invoke(returnValue);
                if (id != null) return id.toString();
            } catch (NoSuchMethodException ignored) {}
            catch (Exception ex) {
                log.debug("Cannot read id from return value: {}", ex.getMessage());
            }
        }
        // Try first UUID arg
        if (args != null) {
            for (Object arg : args) {
                if (arg instanceof UUID u) return u.toString();
            }
        }
        return null;
    }

    private Map<String, Object> captureArgs(ProceedingJoinPoint pjp) {
        MethodSignature sig   = (MethodSignature) pjp.getSignature();
        String[]        names = sig.getParameterNames();
        Object[]        vals  = pjp.getArgs();

        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i < names.length; i++) {
            // Skip obviously sensitive parameter names
            String name = names[i].toLowerCase();
            if (name.contains("password") || name.contains("secret") || name.contains("token")) {
                map.put(names[i], "***");
            } else {
                map.put(names[i], vals[i] != null ? vals[i].toString() : null);
            }
        }
        return map;
    }
}
