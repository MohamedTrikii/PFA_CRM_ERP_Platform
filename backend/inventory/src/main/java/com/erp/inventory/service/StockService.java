package com.erp.inventory.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.tenant.TenantContext;
import com.erp.inventory.domain.*;
import com.erp.inventory.dto.StockDto;
import com.erp.inventory.mapper.InventoryMapper;
import com.erp.inventory.repository.StockItemRepository;
import com.erp.inventory.repository.StockLocationRepository;
import com.erp.inventory.repository.StockMovementRepository;
// import jakarta.persistence.EntityNotFoundException; // unused
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Objects;
import com.erp.inventory.observer.StockLevelPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final StockItemRepository itemRepo;
    private final StockMovementRepository movementRepo;
    private final StockLocationRepository locationRepo;
    private final InventoryMapper mapper;
    private final JdbcTemplate jdbc;
    private final StockLevelPublisher stockLevelPublisher;
    private final ApplicationContext ctx;

    // ── Locations ─────────────────────────────────────────────────────────────

    public List<StockDto.LocationResponse> findAllLocations() {
        return locationRepo.findAllActiveByTenant(tid())
                .stream().map(mapper::toLocationResponse).toList();
    }

    @SuppressWarnings("null")
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "StockLocation")
    public StockDto.LocationResponse createLocation(StockDto.LocationCreate dto) {
        StockLocation loc = mapper.toLocation(dto);
        StockLocation saved = Objects.requireNonNull(locationRepo.save(loc));
        return mapper.toLocationResponse(saved);
    }

    // ── Stock items ───────────────────────────────────────────────────────────

    public Page<StockDto.ItemResponse> findAllItems(Pageable pageable) {
        return itemRepo.findAllByTenant(tid(), pageable).map(mapper::toItemResponse);
    }

    public List<StockDto.ItemResponse> findByProduct(UUID productId) {
        return itemRepo.findByTenantAndProduct(tid(), productId)
                .stream().map(mapper::toItemResponse).toList();
    }

    public List<StockDto.ItemResponse> findLowStock(BigDecimal threshold) {
        return itemRepo.findLowStock(tid(), threshold)
                .stream().map(mapper::toItemResponse).toList();
    }

    // ── Movements ─────────────────────────────────────────────────────────────

    public Page<StockDto.MovementResponse> findAllMovements(Pageable pageable) {
        return movementRepo.findAllByTenant(tid(), pageable).map(mapper::toMovementResponse);
    }

    public List<StockDto.MovementResponse> findMovementsByProduct(UUID productId) {
        return movementRepo.findByTenantAndProduct(tid(), productId)
                .stream().map(mapper::toMovementResponse).toList();
    }

    /**
     * Records a stock movement and updates the StockItem ledger balance.
     * Called both by manual adjustments and the RabbitMQ event handler.
     */
    @SuppressWarnings("null")
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "StockMovement")
    public StockDto.MovementResponse recordMovement(StockDto.MovementCreate req) {
        UUID tid = tid();

        StockMovement movement = new StockMovement();
        movement.setProductId(req.productId());
        movement.setProductReference(req.productReference());
        movement.setLocationId(req.locationId());
        movement.setMovementType(req.movementType());
        movement.setQuantity(req.quantity());
        movement.setReferenceType(req.referenceType());
        movement.setReferenceId(req.referenceId());
        movement.setNotes(req.notes());
        movement.setOccurredAt(Instant.now());

        movementRepo.save(movement);

        // Update StockItem balance
        StockItem item = itemRepo
                .findByTenantProductAndLocation(tid, req.productId(), req.locationId())
                .orElseGet(() -> {
                    StockItem newItem = new StockItem();
                    newItem.setProductId(req.productId());
                    newItem.setProductReference(req.productReference());
                    newItem.setLocationId(req.locationId());
                    return newItem;
                });
        if (req.movementType() == MovementType.ENTREE || req.movementType() == MovementType.AJUSTEMENT) {
            item.setQuantity(item.getQuantity().add(req.quantity()));
        } else if (req.movementType() == MovementType.SORTIE) {
            BigDecimal newQty = item.getQuantity().subtract(req.quantity());
            if (newQty.compareTo(BigDecimal.ZERO) < 0) {
                newQty = BigDecimal.ZERO;
            }
            item.setQuantity(newQty);
        }

        StockItem savedItem = Objects.requireNonNull(itemRepo.save(item));
        // publish stock level change
        try {
            stockLevelPublisher.publish(req.productId(), savedItem.getQuantity().intValue());
        } catch (Exception e) { log.warn("Failed to publish stock level for {}", req.productId(), e); }
        return mapper.toMovementResponse(movement);
    }

    @Transactional
    public StockDto.MovementResponse adjust(StockDto.AdjustRequest dto) {
        String ref = lookupProductReference(dto.productId());
        StockDto.MovementCreate req = new StockDto.MovementCreate(
            dto.productId(), ref, dto.locationId(), dto.movementType(), dto.quantity(),
            "MANUAL", null, dto.notes());
        return ctx.getBean(StockService.class).recordMovement(req);
    }

    private String lookupProductReference(UUID productId) {
        try {
            return jdbc.queryForObject(
                "SELECT reference FROM catalog_products WHERE id = ?",
                String.class, productId);
        } catch (EmptyResultDataAccessException e) {
            return productId.toString();
        }
    }

    private static final UUID SYSTEM_TENANT = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private static UUID tid() {
        String tenantId = TenantContext.get();
        return (tenantId == null || tenantId.isBlank())
                ? SYSTEM_TENANT
                : UUID.fromString(tenantId);
    }
}
