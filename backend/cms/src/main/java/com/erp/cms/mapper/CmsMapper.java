package com.erp.cms.mapper;

import com.erp.cms.domain.TenantBranding;
import com.erp.cms.domain.TenantNotice;
import com.erp.cms.dto.CmsDto;
import org.mapstruct.*;

import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface CmsMapper {

    /**
     * Partial update: copies only non-null fields from the request onto the entity.
     * Gallery is managed via dedicated upload/delete endpoints, so galleryJson is excluded.
     */
    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "galleryJson", ignore = true)  // managed separately
    void updateBranding(CmsDto.BrandingUpdateRequest req, @MappingTarget TenantBranding b);

    CmsDto.NoticeResponse toNoticeResponse(TenantNotice n);

    List<CmsDto.NoticeResponse> toNoticeResponseList(List<TenantNotice> notices);

    @BeanMapping(builder = @Builder(disableBuilder = true))
    void updateNotice(CmsDto.NoticeUpdateRequest req, @MappingTarget TenantNotice n);
}
