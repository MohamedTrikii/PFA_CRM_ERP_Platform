package com.erp.cms.service;

import com.erp.cms.domain.ReferenceCategory;
import com.erp.cms.domain.ReferenceValue;
import com.erp.cms.dto.CmsDto;
import com.erp.cms.repository.ReferenceCategoryRepository;
import com.erp.cms.repository.ReferenceValueRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReferenceService {

    private final ReferenceCategoryRepository catRepo;
    private final ReferenceValueRepository    valRepo;

    // ── Categories ────────────────────────────────────────────────────────────

    public List<CmsDto.RefCategoryResponse> listCategories() {
        return catRepo.findAll().stream()
                .sorted(Comparator.comparingInt(ReferenceCategory::getSortOrder))
                .map(this::toCatResponse)
                .toList();
    }

    @Transactional
    public CmsDto.RefCategoryResponse createCategory(CmsDto.RefCategoryCreateRequest req) {
        String code = req.code().toUpperCase().replace(' ', '_');
        if (catRepo.existsByCode(code)) {
            throw new IllegalArgumentException("Code de catégorie déjà existant : " + code);
        }
        ReferenceCategory cat = ReferenceCategory.builder()
                .code(code)
                .name(req.name())
                .description(req.description())
                .icon(req.icon())
                .system(false)
                .sortOrder((int) (catRepo.count() + 1) * 10)
                .build();
        return toCatResponse(catRepo.save(cat));
    }

    @Transactional
    public CmsDto.RefCategoryResponse updateCategory(UUID id, CmsDto.RefCategoryCreateRequest req) {
        ReferenceCategory cat = findCat(id);
        cat.setName(req.name());
        cat.setDescription(req.description());
        cat.setIcon(req.icon());
        return toCatResponse(catRepo.save(cat));
    }

    @Transactional
    public void deleteCategory(UUID id) {
        ReferenceCategory cat = findCat(id);
        if (cat.isSystem()) {
            throw new IllegalStateException("Impossible de supprimer une catégorie système");
        }
        catRepo.delete(cat);
    }

    // ── Values ────────────────────────────────────────────────────────────────

    public List<CmsDto.RefValueResponse> listValues(UUID categoryId, boolean activeOnly) {
        List<ReferenceValue> rows = activeOnly
                ? valRepo.findByCategoryIdAndActiveTrueOrderBySortOrderAscLabelAsc(categoryId)
                : valRepo.findByCategoryIdOrderBySortOrderAscLabelAsc(categoryId);
        return rows.stream().map(this::toValResponse).toList();
    }

    public List<CmsDto.RefValueResponse> listValuesByCode(String categoryCode, boolean activeOnly) {
        ReferenceCategory cat = catRepo.findByCode(categoryCode.toUpperCase())
                .orElseThrow(() -> new EntityNotFoundException("Catégorie inconnue : " + categoryCode));
        return listValues(cat.getId(), activeOnly);
    }

    @Transactional
    public CmsDto.RefValueResponse createValue(UUID categoryId, CmsDto.RefValueCreateRequest req) {
        ReferenceCategory cat = findCat(categoryId);
        String code = req.code().toUpperCase().replace(' ', '_');
        if (valRepo.existsByCategoryIdAndCode(categoryId, code)) {
            throw new IllegalArgumentException("Code déjà existant dans cette catégorie : " + code);
        }
        ReferenceValue val = ReferenceValue.builder()
                .category(cat)
                .code(code)
                .label(req.label())
                .labelFr(req.labelFr())
                .labelAr(req.labelAr())
                .labelEn(req.labelEn())
                .color(req.color())
                .icon(req.icon())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : (int) (valRepo.countByCategoryId(categoryId) + 1) * 10)
                .active(req.active() == null || req.active())
                .defaultValue(Boolean.TRUE.equals(req.defaultValue()))
                .build();
        ReferenceValue saved = valRepo.save(val);
        if (saved.isDefaultValue()) {
            valRepo.clearDefaultForCategory(categoryId, saved.getId());
        }
        return toValResponse(saved);
    }

    @Transactional
    public CmsDto.RefValueResponse updateValue(UUID id, CmsDto.RefValueUpdateRequest req) {
        ReferenceValue val = findVal(id);
        val.setLabel(req.label());
        val.setLabelFr(req.labelFr());
        val.setLabelAr(req.labelAr());
        val.setLabelEn(req.labelEn());
        val.setColor(req.color());
        val.setIcon(req.icon());
        if (req.sortOrder() != null) val.setSortOrder(req.sortOrder());
        if (req.active() != null)    val.setActive(req.active());
        if (Boolean.TRUE.equals(req.defaultValue())) {
            val.setDefaultValue(true);
            valRepo.clearDefaultForCategory(val.getCategory().getId(), val.getId());
        } else if (Boolean.FALSE.equals(req.defaultValue())) {
            val.setDefaultValue(false);
        }
        return toValResponse(valRepo.save(val));
    }

    @Transactional
    public CmsDto.RefValueResponse toggleValue(UUID id) {
        ReferenceValue val = findVal(id);
        val.setActive(!val.isActive());
        return toValResponse(valRepo.save(val));
    }

    @Transactional
    public void deleteValue(UUID id) {
        valRepo.deleteById(id);
    }

    @Transactional
    public void reorderValues(UUID categoryId, CmsDto.ReorderRequest req) {
        AtomicInteger order = new AtomicInteger(10);
        req.orderedIds().forEach(valId ->
            valRepo.findById(valId).ifPresent(v -> {
                v.setSortOrder(order.getAndAdd(10));
                valRepo.save(v);
            })
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private ReferenceCategory findCat(UUID id) {
        return catRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Catégorie introuvable : " + id));
    }

    private ReferenceValue findVal(UUID id) {
        return valRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Valeur introuvable : " + id));
    }

    private CmsDto.RefCategoryResponse toCatResponse(ReferenceCategory c) {
        return new CmsDto.RefCategoryResponse(
                c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getIcon(),
                c.isSystem(), c.getSortOrder(), (int) valRepo.countByCategoryId(c.getId()),
                c.getUpdatedAt()
        );
    }

    private CmsDto.RefValueResponse toValResponse(ReferenceValue v) {
        return new CmsDto.RefValueResponse(
                v.getId(), v.getCategory().getId(), v.getCategory().getCode(),
                v.getCode(), v.getLabel(), v.getLabelFr(), v.getLabelAr(), v.getLabelEn(),
                v.getColor(), v.getIcon(), v.getSortOrder(),
                v.isActive(), v.isDefaultValue(), v.getUpdatedAt()
        );
    }
}
