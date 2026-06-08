package com.erp.sales.command;

/**
 * Command — interface pour encapsuler une opération sur un Devis
 * avec support undo/redo.
 */
public interface DevisCommand {
    void execute();
    void undo();
    String describe();
}
