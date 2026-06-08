package com.erp.identity.mapper;

import com.erp.identity.domain.User;
import com.erp.identity.dto.UserDto;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface UserMapper {

    UserDto.Response toResponse(User user);

    User toEntity(UserDto.CreateRequest req);

    void updateEntity(UserDto.UpdateRequest req, @MappingTarget User user);
}
