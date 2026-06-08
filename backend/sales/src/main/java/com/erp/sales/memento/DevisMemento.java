package com.erp.sales.memento;

import com.erp.sales.domain.DevisStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Memento — capture l'état d'un Devis avant une transition
 * pour permettre un retour arrière (undo).
 */
public record DevisMemento(
        DevisStatus status,
        String notes,
        BigDecimal discountPct,
        LocalDate validUntil,
        BigDecimal totalHt,
        BigDecimal totalTva,
        BigDecimal totalTtc,
        Instant savedAt
) {}
