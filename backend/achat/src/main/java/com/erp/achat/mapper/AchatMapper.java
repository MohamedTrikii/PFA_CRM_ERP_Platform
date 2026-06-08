package com.erp.achat.mapper;

import com.erp.achat.domain.*;
import com.erp.achat.dto.AchatDto;
import org.mapstruct.*;

import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface AchatMapper {

    // ── Fournisseur ──────────────────────────────────────────────────────────

    @BeanMapping(builder = @Builder(disableBuilder = true))
    Fournisseur toEntity(AchatDto.FournisseurCreateRequest req);

    @BeanMapping(builder = @Builder(disableBuilder = true))
    void updateEntity(AchatDto.FournisseurUpdateRequest req, @MappingTarget Fournisseur f);

    AchatDto.FournisseurResponse toFournisseurResponse(Fournisseur f);

    AchatDto.FournisseurSummary toFournisseurSummary(Fournisseur f);

    List<AchatDto.FournisseurSummary> toFournisseurSummaryList(List<Fournisseur> list);

    // ── BonCommande ──────────────────────────────────────────────────────────

    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "lignes", ignore = true)
    @Mapping(target = "fournisseur", ignore = true)
    @Mapping(target = "totalHt",  ignore = true)
    @Mapping(target = "totalTva", ignore = true)
    @Mapping(target = "totalTtc", ignore = true)
    BonCommande toBonCommandeEntity(AchatDto.BonCommandeCreateRequest req);

    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "bonCommande", ignore = true)
    BonCommandeLigne toBonCommandeLigneEntity(AchatDto.BonCommandeLigneRequest req);

    @Mapping(target = "fournisseur", expression = "java(bc.getFournisseur() != null ? toFournisseurSummary(bc.getFournisseur()) : null)")
    AchatDto.BonCommandeResponse toBonCommandeResponse(BonCommande bc);

    @Mapping(target = "prixUnitaire", source = "prixUnitaireHt")
    @Mapping(target = "taxPct", source = "tvaRate")
    @Mapping(target = "remisePct", ignore = true)
    @Mapping(target = "montantHt", source = "totalHt")
    @Mapping(target = "montantTtc", expression = "java(l.getTotalHt().multiply(java.math.BigDecimal.ONE.add(l.getTvaRate().divide(java.math.BigDecimal.valueOf(100), 6, java.math.RoundingMode.HALF_UP))).setScale(2, java.math.RoundingMode.HALF_UP))")
    AchatDto.BonCommandeLigneResponse toBonCommandeLigneResponse(BonCommandeLigne l);

    @Mapping(target = "fournisseurNom", source = "fournisseur.nom")
    AchatDto.BonCommandeSummary toBonCommandeSummary(BonCommande bc);

    List<AchatDto.BonCommandeSummary> toBonCommandeSummaryList(List<BonCommande> list);

    // ── BonReception ─────────────────────────────────────────────────────────

    @BeanMapping(builder = @Builder(disableBuilder = true))
    @Mapping(target = "lignes", ignore = true)
    BonReception toBonReceptionEntity(AchatDto.BonReceptionCreateRequest req);

    @BeanMapping(builder = @Builder(disableBuilder = true))
    BonReceptionLigne toBonReceptionLigneEntity(AchatDto.BonReceptionLigneRequest req);

    AchatDto.BonReceptionResponse toBonReceptionResponse(BonReception br);

    AchatDto.BonReceptionLigneResponse toBonReceptionLigneResponse(BonReceptionLigne l);

    AchatDto.BonReceptionSummary toBonReceptionSummary(BonReception br);

    List<AchatDto.BonReceptionSummary> toBonReceptionSummaryList(List<BonReception> list);
}
