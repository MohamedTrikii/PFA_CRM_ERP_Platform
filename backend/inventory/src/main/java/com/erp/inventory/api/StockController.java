package com.erp.inventory.api;

import com.erp.inventory.dto.StockDto;
import com.erp.inventory.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
public class StockController {

    private final StockService service;

    // ── Locations ─────────────────────────────────────────────────────────────

    @GetMapping("/locations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<StockDto.LocationResponse> listLocations() {
        return service.findAllLocations();
    }

    @PostMapping("/locations")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public StockDto.LocationResponse createLocation(@Valid @RequestBody StockDto.LocationCreate dto) {
        return service.createLocation(dto);
    }

    // ── Items ─────────────────────────────────────────────────────────────────

    @GetMapping("/items")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<StockDto.ItemResponse> listItems(Pageable pageable) {
        return service.findAllItems(pageable);
    }

    @GetMapping("/items/by-product/{productId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<StockDto.ItemResponse> itemsByProduct(@PathVariable UUID productId) {
        return service.findByProduct(productId);
    }

    @GetMapping("/items/low-stock")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public List<StockDto.ItemResponse> lowStock(
            @RequestParam(defaultValue = "5") BigDecimal threshold) {
        return service.findLowStock(threshold);
    }

    // ── Movements ─────────────────────────────────────────────────────────────

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public Page<StockDto.MovementResponse> listMovements(Pageable pageable) {
        return service.findAllMovements(pageable);
    }

    @GetMapping("/movements/by-product/{productId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER','EMPLOYEE')")
    public List<StockDto.MovementResponse> movementsByProduct(@PathVariable UUID productId) {
        return service.findMovementsByProduct(productId);
    }

    @PostMapping("/movements/adjust")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','EMPLOYER')")
    public StockDto.MovementResponse adjust(@Valid @RequestBody StockDto.AdjustRequest dto) {
        return service.adjust(dto);
    }
}
