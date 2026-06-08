package com.erp.common.audit;

import java.lang.annotation.*;

/**
 * Marks a service method for automatic audit logging.
 *
 * The AuditAspect fires after a successful return and logs:
 *   - action (from this annotation)
 *   - entityType (from this annotation or derived from the class name)
 *   - entityId  (read from a returned DTO/entity that has an "id" accessor,
 *                or from the first method argument if it is a UUID)
 *   - actor/tenant from SecurityContext / TenantContext
 *
 * Example:
 *   @Auditable(action = AuditAction.CREATE, entityType = "User")
 *   public UserDto.Response create(UserDto.CreateRequest req) { ... }
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {

    AuditAction action();

    /** Logical entity name written into audit_log.entity_type. */
    String entityType() default "";

    /**
     * When true, the method's arguments are serialised into the payload.
     * Avoid for requests containing passwords or PII.
     */
    boolean captureArgs() default false;
}
