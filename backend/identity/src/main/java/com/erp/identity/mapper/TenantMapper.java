package com.erp.identity.mapper;

import com.erp.identity.domain.Tenant;
import com.erp.identity.dto.TenantDto;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface TenantMapper {

    TenantDto.Response toResponse(Tenant tenant);
}
