package com.erp.sales.domain;

public enum LivraisonStatus {
    PLANIFIEE, EN_COURS, LIVREE, ANNULEE;

    public boolean canTransitionTo(LivraisonStatus next) {
        return switch (this) {
            case PLANIFIEE -> next == EN_COURS || next == ANNULEE;
            case EN_COURS  -> next == LIVREE   || next == ANNULEE;
            default        -> false;
        };
    }
}
