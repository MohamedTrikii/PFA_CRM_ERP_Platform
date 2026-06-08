package com.erp.achat.command;

/**
 * Command — interface pour encapsuler une opération sur un BonCommande
 * avec support undo.
 */
public interface BonCommandeCommand {
    void execute();
    void undo();
    String describe();
}
