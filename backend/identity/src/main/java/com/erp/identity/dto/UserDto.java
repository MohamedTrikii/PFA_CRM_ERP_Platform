package com.erp.identity.dto;

import com.erp.identity.domain.EmployeeFunction;
import com.erp.identity.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public interface UserDto {

    record CreateRequest(
        @NotBlank String keycloakId,
        @Email @NotBlank String email,
        String displayName,
        @NotNull UserRole role,
        EmployeeFunction employeeFunction,  // required when role == EMPLOYEE
        UUID tenantId                       // SUPER_ADMIN only: target tenant override
    ) {}

    record UpdateRequest(
        String displayName,
        UserRole role,
        EmployeeFunction employeeFunction,
        Boolean active
    ) {}

    record Response(
        UUID             id,
        UUID             tenantId,
        String           keycloakId,
        String           email,
        String           displayName,
        UserRole         role,
        EmployeeFunction employeeFunction,
        boolean          active,
        Instant          createdAt
    ) {}
}
