package com.erp.achat.adapter;

import java.math.BigDecimal;

/**
 * Adaptee (Adapter) — représente le format externe d'un fournisseur
 * (ex. export CSV d'un ERP tiers, API EDI, fichier Excel).
 */
public record ExternalFournisseurData(
        String supplierCode,
        String companyName,
        String contactEmail,
        String phoneNumber,
        String streetAddress,
        String country,
        String taxId,
        String tradeRegisterNumber,
        String bankAccountNumber,
        BigDecimal paymentTermsDays
) {}
