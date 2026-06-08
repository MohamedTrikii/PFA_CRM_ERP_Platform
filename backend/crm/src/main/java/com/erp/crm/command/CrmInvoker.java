package com.erp.crm.command;

import java.util.ArrayDeque;
import java.util.Deque;

public class CrmInvoker {

    private final Deque<Runnable> history = new ArrayDeque<>();

    public void execute(Runnable cmd) {
        cmd.run();
        history.push(cmd);
    }

    public boolean undoLast() {
        if (history.isEmpty()) return false;
        // Runnable can't undo; in a richer implementation use a Command interface with undo
        history.pop();
        return true;
    }
}
