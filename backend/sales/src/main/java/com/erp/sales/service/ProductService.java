package com.erp.sales.service;

import com.erp.common.audit.Auditable;
import com.erp.common.audit.AuditAction;
import com.erp.common.tenant.TenantContext;
import com.erp.sales.domain.CatalogProduct;
import com.erp.sales.dto.ProductDto;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.repository.CatalogProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final CatalogProductRepository productRepo;
    private final SalesMapper mapper;

    public Page<ProductDto.Response> findAll(Pageable pageable) {
        return productRepo.findAllByTenant(tid(), pageable)
                .map(mapper::toProductResponse);
    }

    public List<ProductDto.Response> findAllActive() {
        return productRepo.findAllActiveByTenant(tid())
                .stream().map(mapper::toProductResponse).toList();
    }

    public ProductDto.Response findById(UUID id) {
        return mapper.toProductResponse(loadProduct(id));
    }

    @Transactional
    @Auditable(action = AuditAction.CREATE, entityType = "CatalogProduct")
    public ProductDto.Response create(ProductDto.Create dto) {
        if (productRepo.existsByTenantIdAndReference(tid(), dto.reference())) {
            throw new IllegalArgumentException("Product reference already exists: " + dto.reference());
        }
        CatalogProduct product = mapper.toProduct(dto);
        return mapper.toProductResponse(productRepo.save(product));
    }

    @Transactional
    @Auditable(action = AuditAction.UPDATE, entityType = "CatalogProduct")
    public ProductDto.Response update(UUID id, ProductDto.Update dto) {
        CatalogProduct product = loadProduct(id);
        mapper.updateProduct(dto, product);
        return mapper.toProductResponse(productRepo.save(product));
    }

    @Transactional
    @Auditable(action = AuditAction.DELETE, entityType = "CatalogProduct")
    public void deactivate(UUID id) {
        CatalogProduct product = loadProduct(id);
        product.setActive(false);
        productRepo.save(product);
    }

    private CatalogProduct loadProduct(UUID id) {
        return productRepo.findByTenantAndId(tid(), id)
                .orElseThrow(() -> new EntityNotFoundException("Product not found: " + id));
    }

    private static UUID tid() {
        return UUID.fromString(TenantContext.requireTenant());
    }
}
