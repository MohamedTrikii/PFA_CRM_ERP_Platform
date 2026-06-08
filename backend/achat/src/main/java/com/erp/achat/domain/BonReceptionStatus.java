package com.erp.achat.domain;

public enum BonReceptionStatus {
    EN_COURS, CONFIRME, ANNULE;

    public boolean canTransitionTo(BonReceptionStatus next) {
        return switch (this) {
            case EN_COURS -> next == CONFIRME || next == ANNULE;
            default       -> false;
        };
    }
}
