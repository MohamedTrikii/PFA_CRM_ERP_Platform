package com.erp.crm.mapper;

import com.erp.crm.domain.Client;
import com.erp.crm.domain.Opportunity;
import com.erp.crm.domain.Prospect;
import com.erp.crm.dto.ClientDto;
import com.erp.crm.dto.OpportunityDto;
import com.erp.crm.dto.ProspectDto;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface CrmMapper {
    ProspectDto.Response toResponse(Prospect p);
    Prospect toEntity(ProspectDto.CreateRequest r);
    void updateEntity(ProspectDto.UpdateRequest r, @MappingTarget Prospect p);

    ClientDto.Response toResponse(Client c);
    Client toEntity(ClientDto.CreateRequest r);
    void updateEntity(ClientDto.UpdateRequest r, @MappingTarget Client c);

    OpportunityDto.Response toResponse(Opportunity o);
    Opportunity toEntity(OpportunityDto.CreateRequest r);
    void updateEntity(OpportunityDto.UpdateRequest r, @MappingTarget Opportunity o);
}
