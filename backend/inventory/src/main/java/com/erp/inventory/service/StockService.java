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
import com.erp.inventory.observer.StockLevelPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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

    // ── Locations ─────────────────────────────────────────────────────────────

    public List<StockDto.LocationResponse> findAllLocations() {
        return locationRepo.findAllActiveByTenant(tid())
                .stream().map(mapper::toLocationResponse).toList();
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "StockLocation")
    public StockDto.LocationResponse createLocation(StockDto.LocationCreate dto) {
        StockLocation loc = mapper.toLocation(dto);
        return mapper.toLocationResponse(locationRepo.save(loc));
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
    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "StockMovement")
    public StockDto.MovementResponse recordMovement(UUID productId,
                                                    String productReference,
                                                    UUID locationId,
                                                    MovementType type,
                                                    BigDecimal quantity,
                                                    String referenceType,
                                                    UUID referenceId,
                                                    String notes) {
        UUID tid = tid();

        StockMovement movement = new StockMovement();
        movement.setProductId(productId);
        movement.setProductReference(productReference);
        movement.setLocationId(locationId);
        movement.setMovementType(type);
        movement.setQuantity(quantity);
        movement.setReferenceType(referenceType);
        movement.setReferenceId(referenceId);
        movement.setNotes(notes);
        movement.setOccurredAt(Instant.now());

        movementRepo.save(movement);

        // Update StockItem balance
        StockItem item = itemRepo
                .findByTenantProductAndLocation(tid, productId, locationId)
                .orElseGet(() -> {
                    StockItem newItem = new StockItem();
                    newItem.setProductId(productId);
                    newItem.setProductReference(productReference);
                    newItem.setLocationId(locationId);
                    return newItem;
                });

        if (type == MovementType.ENTREE || type == MovementType.AJUSTEMENT) {
            item.setQuantity(item.getQuantity().add(quantity));
        } else if (type == MovementType.SORTIE) {
            BigDecimal newQty = item.getQuantity().subtract(quantity);
            if (newQty.compareTo(BigDecimal.ZERO) < 0) {
                newQty = BigDecimal.ZERO;
            }
            item.setQuantity(newQty);
        }

        itemRepo.save(item);
        // publish stock level change
        try {
            stockLevelPublisher.publish(productId, item.getQuantity().intValue());
        } catch (Exception e) { log.warn("Failed to publish stock level for {}", productId, e); }
        return mapper.toMovementResponse(movement);
    }

    @Transactional
    public StockDto.MovementResponse adjust(StockDto.AdjustRequest dto) {
        String ref = lookupProductReference(dto.productId());
        return recordMovement(
                dto.productId(), ref, dto.locationId(),
                dto.movementType(), dto.quantity(),
                "MANUAL", null, dto.notes());
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

    private static UUID tid() {
        return UUID.fromString(TenantContext.requireTenant());
    }
}
