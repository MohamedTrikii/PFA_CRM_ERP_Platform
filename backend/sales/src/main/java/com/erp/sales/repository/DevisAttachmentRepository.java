package com.erp.sales.repository;

import com.erp.sales.domain.DevisAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevisAttachmentRepository extends JpaRepository<DevisAttachment, UUID> {

    @Query("SELECT a FROM DevisAttachment a WHERE a.tenantId = :tid AND a.entityType = :type AND a.entityId = :entityId")
    List<DevisAttachment> findByEntity(@Param("tid") UUID tid,
                                       @Param("type") String type,
                                       @Param("entityId") UUID entityId);

    @Query("SELECT a FROM DevisAttachment a WHERE a.tenantId = :tid AND a.id = :id")
    Optional<DevisAttachment> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
