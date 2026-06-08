package com.erp.cms.repository;

import com.erp.cms.domain.TenantNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface TenantNoticeRepository extends JpaRepository<TenantNotice, UUID> {

    @Query("SELECT n FROM TenantNotice n WHERE n.tenantId = :tid ORDER BY n.createdAt DESC")
    List<TenantNotice> findAllByTenant(@Param("tid") UUID tid);

    @Query("""
        SELECT n FROM TenantNotice n
        WHERE n.tenantId = :tid AND n.active = true
          AND (n.startsAt IS NULL OR n.startsAt <= :now)
          AND (n.endsAt   IS NULL OR n.endsAt   >= :now)
        ORDER BY n.severity DESC, n.createdAt DESC
        """)
    List<TenantNotice> findActiveByTenant(@Param("tid") UUID tid, @Param("now") Instant now);

    @Query("SELECT n FROM TenantNotice n WHERE n.tenantId = :tid AND n.id = :id")
    java.util.Optional<TenantNotice> findByTenantAndId(@Param("tid") UUID tid, @Param("id") UUID id);
}
