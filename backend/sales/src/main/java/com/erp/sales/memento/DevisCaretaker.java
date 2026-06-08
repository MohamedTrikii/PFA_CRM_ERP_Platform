package com.erp.sales.memento;

import com.erp.sales.domain.Devis;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Caretaker (Memento) — gère l'historique des états des Devis.
 * Chaque Devis peut avoir plusieurs sauvegardes empilées (LIFO).
 */
@Component
public class DevisCaretaker {

    private final Map<UUID, Deque<DevisMemento>> history = new ConcurrentHashMap<>();

    public void save(Devis devis) {
        DevisMemento memento = new DevisMemento(
                devis.getStatus(),
                devis.getNotes(),
                devis.getDiscountPct(),
                devis.getValidUntil(),
                devis.getTotalHt(),
                devis.getTotalTva(),
                devis.getTotalTtc(),
                Instant.now()
        );
        history.computeIfAbsent(devis.getId(), k -> new ArrayDeque<>()).push(memento);
    }

    public Optional<DevisMemento> restore(UUID devisId) {
        Deque<DevisMemento> stack = history.get(devisId);
        if (stack == null || stack.isEmpty()) return Optional.empty();
        return Optional.of(stack.pop());
    }

    public void apply(Devis devis, DevisMemento memento) {
        devis.setStatus(memento.status());
        devis.setNotes(memento.notes());
        devis.setDiscountPct(memento.discountPct());
        devis.setValidUntil(memento.validUntil());
        devis.setTotalHt(memento.totalHt());
        devis.setTotalTva(memento.totalTva());
        devis.setTotalTtc(memento.totalTtc());
    }

    public void clear(UUID devisId) {
        history.remove(devisId);
    }
}
