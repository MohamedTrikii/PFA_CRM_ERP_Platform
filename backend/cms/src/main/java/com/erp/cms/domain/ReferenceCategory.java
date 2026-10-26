package com.erp.cms.domain;

import com.erp.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "reference_category")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReferenceCategory extends BaseEntity {

    @Column(length = 100, nullable = false, unique = true)
    private String code;

    @Column(length = 255, nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String icon;

    @Column(name = "is_system", nullable = false)
    @Builder.Default
    private boolean system = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
