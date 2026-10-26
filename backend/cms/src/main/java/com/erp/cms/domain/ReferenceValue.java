package com.erp.cms.domain;

import com.erp.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reference_value")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReferenceValue extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false, updatable = false)
    private ReferenceCategory category;

    @Column(length = 100, nullable = false, updatable = false)
    private String code;

    @Column(length = 255, nullable = false)
    private String label;

    @Column(name = "label_fr", length = 255)
    private String labelFr;

    @Column(name = "label_ar", length = 255)
    private String labelAr;

    @Column(name = "label_en", length = 255)
    private String labelEn;

    @Column(length = 50)
    private String color;

    @Column(length = 100)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private boolean defaultValue = false;

    @Column(columnDefinition = "JSONB")
    private String metadata;
}
