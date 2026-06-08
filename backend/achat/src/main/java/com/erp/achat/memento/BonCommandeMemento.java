package com.erp.achat.memento;

import com.erp.achat.domain.BonCommandeStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Memento — capture l'état d'un BonCommande avant une transition.
 */
public record BonCommandeMemento(
        BonCommandeStatus status,
        String notes,
        LocalDate dateLivraisonPrevue,
        BigDecimal totalHt,
        BigDecimal totalTva,
        BigDecimal totalTtc,
        Instant savedAt
) {}
