package com.erp.sales.domain;

public enum CommandeStatus {
    EN_ATTENTE, CONFIRMEE, EN_COURS, LIVREE, ANNULEE;

    public boolean canTransitionTo(CommandeStatus next) {
        return switch (this) {
            case EN_ATTENTE -> next == CONFIRMEE || next == ANNULEE;
            case CONFIRMEE  -> next == EN_COURS  || next == ANNULEE;
            case EN_COURS   -> next == LIVREE    || next == ANNULEE;
            default         -> false;
        };
    }
}
