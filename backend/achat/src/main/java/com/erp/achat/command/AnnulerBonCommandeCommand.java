package com.erp.achat.command;

import com.erp.achat.domain.BonCommande;
import com.erp.achat.domain.BonCommandeStatus;
import com.erp.achat.memento.BonCommandeCaretaker;

/**
 * Concrete Command — annule un bon de commande (transition vers ANNULE).
 */
public class AnnulerBonCommandeCommand implements BonCommandeCommand {

    private final BonCommande bonCommande;
    private final BonCommandeCaretaker caretaker;

    public AnnulerBonCommandeCommand(BonCommande bonCommande, BonCommandeCaretaker caretaker) {
        this.bonCommande = bonCommande;
        this.caretaker   = caretaker;
    }

    @Override
    public void execute() {
        if (!bonCommande.getStatus().canTransitionTo(BonCommandeStatus.ANNULE)) {
            throw new IllegalStateException(
                    "Transition impossible : " + bonCommande.getStatus() + " → ANNULE");
        }
        caretaker.save(bonCommande);
        bonCommande.setStatus(BonCommandeStatus.ANNULE);
    }

    @Override
    public void undo() {
        caretaker.restore(bonCommande.getId())
                 .ifPresent(m -> caretaker.apply(bonCommande, m));
    }

    @Override
    public String describe() {
        return "Annuler BonCommande " + bonCommande.getReference();
    }
}

