package com.erp.sales.command;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import com.erp.sales.memento.DevisCaretaker;

/**
 * Concrete Command — transition ENVOYE → ACCEPTE avec undo via Memento.
 */
public class AccepterDevisCommand implements DevisCommand {

    private final Devis devis;
    private final DevisCaretaker caretaker;

    public AccepterDevisCommand(Devis devis, DevisCaretaker caretaker) {
        this.devis = devis;
        this.caretaker = caretaker;
    }

    @Override
    public void execute() {
        if (!devis.getStatus().canTransitionTo(DevisStatus.ACCEPTE)) {
            throw new IllegalStateException(
                    "Transition impossible : " + devis.getStatus() + " → ACCEPTE");
        }
        caretaker.save(devis);
        devis.setStatus(DevisStatus.ACCEPTE);
    }

    @Override
    public void undo() {
        caretaker.restore(devis.getId())
                 .ifPresent(m -> caretaker.apply(devis, m));
    }

    @Override
    public String describe() {
        return "Accepter Devis " + devis.getReference();
    }
}
