package com.erp.achat.command;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Invoker — exécute des commandes et gère un historique pour undo.
 */
public class BonCommandeInvoker {

    private final Deque<BonCommandeCommand> history = new ArrayDeque<>();

    public void executeCommand(BonCommandeCommand cmd) {
        cmd.execute();
        history.push(cmd);
    }

    public boolean undoLast() {
        if (history.isEmpty()) return false;
        BonCommandeCommand cmd = history.pop();
        cmd.undo();
        return true;
    }

    public void clearHistory() {
        history.clear();
    }
}
