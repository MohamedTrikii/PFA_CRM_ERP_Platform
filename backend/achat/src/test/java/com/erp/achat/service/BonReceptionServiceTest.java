package com.erp.achat.service;

import com.erp.achat.mapper.AchatMapper;
import com.erp.achat.repository.BonCommandeRepository;
import com.erp.achat.repository.BonReceptionRepository;
import com.erp.common.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class BonReceptionServiceTest {

    @Mock
    private BonReceptionRepository bonReceptionRepo;

    @Mock
    private BonCommandeRepository bonCommandeRepo;

    @Mock
    private AchatMapper mapper;

    private BonReceptionService service;

    @BeforeEach
    void setUp() {
        service = new BonReceptionService(bonReceptionRepo, bonCommandeRepo, mapper, null);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void list_fallsBackToSystemTenantWhenNoTenantContext() {
        Pageable pageable = PageRequest.of(0, 10);
        UUID expectedTenant = UUID.fromString("00000000-0000-0000-0000-000000000001");

        given(bonReceptionRepo.findAllByTenant(expectedTenant, pageable))
            .willReturn(new PageImpl<>(java.util.List.<com.erp.achat.domain.BonReception>of()));

        service.list(pageable);

        verify(bonReceptionRepo).findAllByTenant(expectedTenant, pageable);
    }
}
