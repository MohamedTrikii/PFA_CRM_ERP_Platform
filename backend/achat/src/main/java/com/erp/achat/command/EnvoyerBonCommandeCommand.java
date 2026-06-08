package com.erp.achat.command;

import com.erp.achat.domain.BonCommande;
import com.erp.achat.domain.BonCommandeStatus;
import com.erp.achat.memento.BonCommandeCaretaker;

/**
 * Concrete Command — transition BROUILLON → ENVOYE avec undo via Memento.
 */
public class EnvoyerBonCommandeCommand implements BonCommandeCommand {

    private final BonCommande bonCommande;
    private final BonCommandeCaretaker caretaker;

    public EnvoyerBonCommandeCommand(BonCommande bonCommande, BonCommandeCaretaker caretaker) {
        this.bonCommande = bonCommande;
        this.caretaker   = caretaker;
    }

    @Override
    public void execute() {
        if (!bonCommande.getStatus().canTransitionTo(BonCommandeStatus.ENVOYE)) {
            throw new IllegalStateException(
                    "Transition impossible : " + bonCommande.getStatus() + " → ENVOYE");
        }
        caretaker.save(bonCommande);
        bonCommande.setStatus(BonCommandeStatus.ENVOYE);
    }

    @Override
    public void undo() {
        caretaker.restore(bonCommande.getId())
                 .ifPresent(m -> caretaker.apply(bonCommande, m));
    }

    @Override
    public String describe() {
        return "Envoyer BonCommande " + bonCommande.getReference();
    }
}
