package com.erp.sales.command;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Invoker (Command) — exécute les commandes Devis et maintient
 * un historique permettant l'annulation (undo).
 */
@Component
public class DevisCommandInvoker {

    private final Deque<DevisCommand> history = new ArrayDeque<>();

    public void execute(DevisCommand command) {
        command.execute();
        history.push(command);
    }

    public void undoLast() {
        if (!history.isEmpty()) {
            DevisCommand last = history.pop();
            last.undo();
        }
    }

    public boolean canUndo() {
        return !history.isEmpty();
    }

    public String lastCommandDescription() {
        return history.isEmpty() ? "—" : history.peek().describe();
    }
}
