package com.erp.sales.service;

// removed unused TenantContext import
import com.erp.sales.domain.*;
import com.erp.sales.dto.*;
import com.erp.sales.mapper.SalesMapper;
import com.erp.sales.repository.*;
import com.erp.sales.service.PdfGeneratorService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

/**
 * All methods enforce clientId == authenticated subject.
 * A CLIENT can only see their own documents.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortalService {

    private final DevisRepository devisRepo;
    private final FactureRepository factureRepo;
    private final DevisRequestRepository requestRepo;
    private final SalesMapper mapper;
    private final PdfGeneratorService pdfGenerator;

    public List<DevisDto.Summary> myDevis() {
        UUID clientId = requireClientId();
        return devisRepo.findByTenantAndClient(tid(), clientId)
                .stream().map(mapper::toDevisSummary).toList();
    }

    public List<FactureDto.Summary> myFactures() {
        UUID clientId = requireClientId();
        return factureRepo.findByTenantAndClient(tid(), clientId)
                .stream().map(mapper::toFactureSummary).toList();
    }

    public List<DevisRequestDto.Summary> myRequests() {
        String email = currentEmail();
        if (email == null) return List.of();
        return requestRepo.findByTenantAndClientEmail(tid(), email)
                .stream().map(r -> new DevisRequestDto.Summary(
                        r.getId(), r.getClientName(), r.getClientEmail(),
                        r.getProjectType(), r.getStatus(), r.getConvertedDevisId(),
                        r.getItems().size(), r.getCreatedAt()))
                .toList();
    }

    public byte[] downloadDevisPdf(UUID devisId) {
        UUID clientId = requireClientId();
        Devis devis = devisRepo.findByTenantAndIdWithLines(tid(), devisId)
                .filter(d -> clientId.equals(d.getClientId()))
                .orElseThrow(() -> new SecurityException("Access denied to devis: " + devisId));

        List<LineData> lines = devis.getLines().stream().map(l -> new LineData(
                snapshotStr(l.getProductSnapshot(), "name"),
                l.getQuantity(),
                snapshotStr(l.getProductSnapshot(), "unit"),
                l.getUnitPrice(), l.getTvaRate(),
                l.getTotalHt().add(calcTva(l.getTotalHt(), l.getTvaRate()))
        )).toList();

        return pdfGenerator.generateDevis(new DevisData(
                devis.getReference(), "Client", null,
                devis.getCreatedAt() != null
                        ? java.time.LocalDate.ofInstant(devis.getCreatedAt(),
                            java.time.ZoneOffset.UTC)
                        : java.time.LocalDate.now(),
                devis.getValidUntil(), devis.getNotes(),
                lines, devis.getTotalHt(), devis.getTotalTva(), devis.getTotalTtc()));
    }

    public byte[] downloadFacturePdf(UUID factureId) {
        UUID clientId = requireClientId();
        Facture facture = factureRepo.findByTenantAndIdWithLines(tid(), factureId)
                .filter(f -> clientId.equals(f.getClientId()))
                .orElseThrow(() -> new SecurityException("Access denied to facture: " + factureId));

        List<LineData> lines = facture.getLines().stream().map(l -> new LineData(
                l.getDescription(), l.getQuantity(), null,
                l.getUnitPrice(), l.getTvaRate(), l.getTotalTtc()
        )).toList();

        return pdfGenerator.generateFacture(new FactureData(
                facture.getReference(), "Client", null,
                facture.getIssueDate(), facture.getDueDate(), facture.getNotes(),
                lines, facture.getTotalHt(), facture.getTotalTva(),
                facture.getTotalTtc(), facture.getAmountPaid()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static UUID requireClientId() {
        try {
            Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            String sub = jwt.getSubject();
            if (sub == null) throw new SecurityException("No subject in JWT");
            return UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            throw new SecurityException("Invalid subject in JWT");
        }
    }

    private static String currentEmail() {
        try {
            Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return jwt.getClaimAsString("email");
        } catch (Exception e) {
            return null;
        }
    }

    private static UUID tid() {
        return com.erp.common.tenant.TenantUtils.safeTenantUuid();
    }

    private static String snapshotStr(Map<String, Object> snap, String key) {
        if (snap == null) return null;
        Object v = snap.get(key);
        return v != null ? v.toString() : null;
    }

    private static BigDecimal calcTva(BigDecimal ht, BigDecimal rate) {
        if (ht == null || rate == null) return BigDecimal.ZERO;
        return ht.multiply(rate).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
    }
}
