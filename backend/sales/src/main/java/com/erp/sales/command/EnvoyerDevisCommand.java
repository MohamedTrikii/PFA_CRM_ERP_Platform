package com.erp.sales.command;

import com.erp.sales.domain.Devis;
import com.erp.sales.domain.DevisStatus;
import com.erp.sales.memento.DevisCaretaker;

/**
 * Concrete Command — transition BROUILLON → ENVOYE avec undo via Memento.
 */
public class EnvoyerDevisCommand implements DevisCommand {

    private final Devis devis;
    private final DevisCaretaker caretaker;

    public EnvoyerDevisCommand(Devis devis, DevisCaretaker caretaker) {
        this.devis = devis;
        this.caretaker = caretaker;
    }

    @Override
    public void execute() {
        if (!devis.getStatus().canTransitionTo(DevisStatus.ENVOYE)) {
            throw new IllegalStateException(
                    "Transition impossible : " + devis.getStatus() + " → ENVOYE");
        }
        caretaker.save(devis);
        devis.setStatus(DevisStatus.ENVOYE);
    }

    @Override
    public void undo() {
        caretaker.restore(devis.getId())
                 .ifPresent(m -> caretaker.apply(devis, m));
    }

    @Override
    public String describe() {
        return "Envoyer Devis " + devis.getReference();
    }
}
