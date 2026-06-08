package com.erp.achat.dto;

import com.erp.achat.domain.BonCommandeStatus;
import com.erp.achat.domain.BonReceptionStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AchatDto {

    private AchatDto() {}

    // ── Fournisseur ──────────────────────────────────────────────────────────

    public record FournisseurCreateRequest(
            @NotBlank @Size(max = 32)  String code,
            @NotBlank @Size(max = 255) String nom,
            @Size(max = 255) String adresse,
            @Size(max = 32)  String telephone,
            @Email @Size(max = 255) String email,
            @Size(max = 20)  String ice,
            @Size(max = 20)  String rc,
            @Size(max = 20)  String rib,
            BigDecimal delaiPaiementJours
    ) {}

    public record FournisseurUpdateRequest(
            @NotBlank @Size(max = 255) String nom,
            @Size(max = 255) String adresse,
            @Size(max = 32)  String telephone,
            @Email @Size(max = 255) String email,
            @Size(max = 20)  String ice,
            @Size(max = 20)  String rc,
            @Size(max = 20)  String rib,
            BigDecimal delaiPaiementJours,
            boolean actif
    ) {}

    public record FournisseurResponse(
            UUID id,
            String code,
            String nom,
            String adresse,
            String telephone,
            String email,
            String ice,
            String rc,
            String rib,
            BigDecimal delaiPaiementJours,
            boolean actif,
            Instant createdAt
    ) {}

    public record FournisseurSummary(UUID id, String code, String nom, String telephone, boolean actif) {}

    // ── BonCommande ──────────────────────────────────────────────────────────

    public record BonCommandeCreateRequest(
            @NotNull UUID fournisseurId,
            @NotBlank @Size(max = 64) String reference,
            @NotNull LocalDate dateLivraison,
            @Size(max = 2000) String notes,
            @NotEmpty @Valid List<BonCommandeLigneRequest> lignes
    ) {}

    public record BonCommandeLigneRequest(
            UUID productId,
            @NotBlank @Size(max = 255) String designation,
            @NotBlank @Size(max = 64)  String reference,
            @NotNull @DecimalMin("0.001") BigDecimal quantite,
            @NotNull @DecimalMin("0.00") BigDecimal prixUnitaire,
            @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal remisePct,
            @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal taxPct,
            @Min(0) int position
    ) {}

    public record BonCommandeResponse(
            UUID id,
            String reference,
            BonCommandeStatus status,
            FournisseurSummary fournisseur,
            LocalDate dateLivraison,
            BigDecimal totalHt,
            BigDecimal totalTva,
            BigDecimal totalTtc,
            String notes,
            Instant createdAt,
            List<BonCommandeLigneResponse> lignes
    ) {}

    public record BonCommandeLigneResponse(
            UUID id,
            UUID productId,
            String designation,
            String reference,
            BigDecimal quantite,
            BigDecimal prixUnitaire,
            BigDecimal remisePct,
            BigDecimal taxPct,
            BigDecimal montantHt,
            BigDecimal montantTtc,
            int position
    ) {}

    public record BonCommandeSummary(
            UUID id,
            String reference,
            BonCommandeStatus status,
            String fournisseurNom,
            LocalDate dateLivraison,
            BigDecimal totalTtc,
            Instant createdAt
    ) {}

    public record BonCommandeTransitionRequest(@NotNull BonCommandeStatus targetStatus) {}

    // ── BonReception ─────────────────────────────────────────────────────────

    public record BonReceptionCreateRequest(
            @NotNull UUID bonCommandeId,
            @NotBlank @Size(max = 64) String reference,
            @NotNull LocalDate dateReception,
            @Size(max = 2000) String notes,
            @NotEmpty @Valid List<BonReceptionLigneRequest> lignes
    ) {}

    public record BonReceptionLigneRequest(
            UUID bonCommandeLigneId,
            @NotNull UUID productId,
            @NotBlank @Size(max = 255) String designation,
            @NotNull @DecimalMin("0.001") BigDecimal quantiteRecue,
            BigDecimal quantiteCommandee,
            UUID locationId,
            @Min(0) int position
    ) {}

    public record BonReceptionResponse(
            UUID id,
            UUID bonCommandeId,
            String reference,
            BonReceptionStatus status,
            LocalDate dateReception,
            String notes,
            Instant createdAt,
            List<BonReceptionLigneResponse> lignes
    ) {}

    public record BonReceptionLigneResponse(
            UUID id,
            UUID bonCommandeLigneId,
            UUID productId,
            String designation,
            BigDecimal quantiteCommandee,
            BigDecimal quantiteRecue,
            UUID locationId,
            int position
    ) {}

    public record BonReceptionSummary(
            UUID id,
            String reference,
            BonReceptionStatus status,
            UUID bonCommandeId,
            LocalDate dateReception,
            Instant createdAt
    ) {}

    public record BonReceptionTransitionRequest(@NotNull BonReceptionStatus targetStatus) {}
}
