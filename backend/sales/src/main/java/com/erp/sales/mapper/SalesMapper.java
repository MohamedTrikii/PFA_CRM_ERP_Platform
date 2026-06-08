package com.erp.sales.mapper;

import com.erp.sales.domain.*;
import com.erp.sales.dto.*;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SalesMapper {

    // ── CatalogProduct ────────────────────────────────────────────────────────

    ProductDto.Response toProductResponse(CatalogProduct product);

    // Disable Lombok builder so MapStruct uses no-args constructor + setters.
    // Lombok @Builder only generates builder methods for own fields, not
    // inherited ones (id, tenantId, createdAt) → "Unknown property in builder".
    @BeanMapping(builder = @Builder(disableBuilder = true))
    CatalogProduct toProduct(ProductDto.Create dto);

    @BeanMapping(builder = @Builder(disableBuilder = true),
                 nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateProduct(ProductDto.Update dto, @MappingTarget CatalogProduct product);

    // ── Devis ─────────────────────────────────────────────────────────────────

    DevisDto.Summary toDevisSummary(Devis devis);

    @Mapping(target = "lines", source = "lines")
    DevisDto.Response toDevisResponse(Devis devis);

    @Mapping(target = "productReference",
             expression = "java(snapshotString(line.getProductSnapshot(), \"reference\"))")
    @Mapping(target = "productName",
             expression = "java(snapshotString(line.getProductSnapshot(), \"name\"))")
    @Mapping(target = "totalTva",
             expression = "java(calcTva(line.getTotalHt(), line.getTvaRate()))")
    @Mapping(target = "totalTtc",
             expression = "java(line.getTotalHt().add(calcTva(line.getTotalHt(), line.getTvaRate())))")
    DevisDto.LineResponse toDevisLineResponse(DevisLine line);

    // ── Commande ──────────────────────────────────────────────────────────────

    CommandeDto.Response toCommandeResponse(Commande commande);

    // ── Livraison ─────────────────────────────────────────────────────────────

    LivraisonDto.Summary toLivraisonSummary(Livraison livraison);

    @Mapping(target = "lines", source = "lines")
    LivraisonDto.Response toLivraisonResponse(Livraison livraison);

    LivraisonDto.LineResponse toLivraisonLineResponse(LivraisonLine line);

    // ── Facture ───────────────────────────────────────────────────────────────

    FactureDto.Summary toFactureSummary(Facture facture);

    @Mapping(target = "remainingAmount", expression = "java(facture.remainingAmount())")
    @Mapping(target = "lines", source = "lines")
    @Mapping(target = "encaissements", source = "encaissements")
    FactureDto.Response toFactureResponse(Facture facture);

    FactureDto.LineResponse toFactureLineResponse(FactureLine line);

    FactureDto.EncaissementResponse toEncaissementResponse(Encaissement encaissement);

    List<FactureDto.EncaissementResponse> toEncaissementResponseList(List<Encaissement> encaissements);

    // ── Helpers (called from MapStruct expressions) ───────────────────────────

    default String snapshotString(Map<String, Object> snapshot, String key) {
        if (snapshot == null) return null;
        Object val = snapshot.get(key);
        return val != null ? val.toString() : null;
    }

    default BigDecimal calcTva(BigDecimal totalHt, BigDecimal tvaRate) {
        if (totalHt == null || tvaRate == null) return BigDecimal.ZERO;
        return totalHt.multiply(tvaRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
    }
}
