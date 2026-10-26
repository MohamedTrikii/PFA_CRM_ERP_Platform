package com.erp.inventory.service;

import com.erp.common.tenant.TenantContext;
import com.erp.inventory.mapper.InventoryMapper;
import com.erp.inventory.repository.StockItemRepository;
import com.erp.inventory.repository.StockLocationRepository;
import com.erp.inventory.repository.StockMovementRepository;
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
class StockServiceTest {

    @Mock
    private StockItemRepository itemRepo;

    @Mock
    private StockMovementRepository movementRepo;

    @Mock
    private StockLocationRepository locationRepo;

    @Mock
    private InventoryMapper mapper;

    private StockService service;

    @BeforeEach
    void setUp() {
        service = new StockService(itemRepo, movementRepo, locationRepo, mapper, null, null, null);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void findAllMovements_fallsBackToSystemTenantWhenNoTenantContext() {
        Pageable pageable = PageRequest.of(0, 10);
        UUID expectedTenant = UUID.fromString("00000000-0000-0000-0000-000000000001");

        given(movementRepo.findAllByTenant(expectedTenant, pageable))
            .willReturn(new PageImpl<>(java.util.List.<com.erp.inventory.domain.StockMovement>of()));

        service.findAllMovements(pageable);

        verify(movementRepo).findAllByTenant(expectedTenant, pageable);
    }
}
