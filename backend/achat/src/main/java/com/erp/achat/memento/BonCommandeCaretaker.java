package com.erp.achat.memento;

import com.erp.achat.domain.BonCommande;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Caretaker (Memento) — gère l'historique des états des BonCommande.
 */
@Component
public class BonCommandeCaretaker {

    private final Map<UUID, Deque<BonCommandeMemento>> history = new ConcurrentHashMap<>();

    public void save(BonCommande bc) {
        BonCommandeMemento memento = new BonCommandeMemento(
                bc.getStatus(),
                bc.getNotes(),
                bc.getDateLivraisonPrevue(),
                bc.getTotalHt(),
                bc.getTotalTva(),
                bc.getTotalTtc(),
                Instant.now()
        );
        history.computeIfAbsent(bc.getId(), k -> new ArrayDeque<>()).push(memento);
    }

    public Optional<BonCommandeMemento> restore(UUID id) {
        Deque<BonCommandeMemento> stack = history.get(id);
        if (stack == null || stack.isEmpty()) return Optional.empty();
        return Optional.of(stack.pop());
    }

    public void apply(BonCommande bc, BonCommandeMemento m) {
        bc.setStatus(m.status());
        bc.setNotes(m.notes());
        bc.setDateLivraisonPrevue(m.dateLivraisonPrevue());
        bc.setTotalHt(m.totalHt());
        bc.setTotalTva(m.totalTva());
        bc.setTotalTtc(m.totalTtc());
    }

    public void clear(UUID id) {
        history.remove(id);
    }
}
