package com.erp.cms.repository;

import com.erp.cms.domain.ReferenceValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ReferenceValueRepository extends JpaRepository<ReferenceValue, UUID> {

    List<ReferenceValue> findByCategoryIdOrderBySortOrderAscLabelAsc(UUID categoryId);

    List<ReferenceValue> findByCategoryIdAndActiveTrueOrderBySortOrderAscLabelAsc(UUID categoryId);

    long countByCategoryId(UUID categoryId);

    boolean existsByCategoryIdAndCode(UUID categoryId, String code);

    @Modifying
    @Query("UPDATE ReferenceValue v SET v.defaultValue = FALSE WHERE v.category.id = :catId AND v.id <> :exceptId")
    void clearDefaultForCategory(@Param("catId") UUID catId, @Param("exceptId") UUID exceptId);
}
