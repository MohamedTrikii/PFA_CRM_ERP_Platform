package com.erp.inventory.domain;

public enum MovementType {
    ENTREE,   // stock in (purchase, return)
    SORTIE,   // stock out (delivery, loss)
    AJUSTEMENT // manual correction
}
