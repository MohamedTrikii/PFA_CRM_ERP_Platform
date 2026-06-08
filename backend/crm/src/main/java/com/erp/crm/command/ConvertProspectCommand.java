package com.erp.crm.command;

import com.erp.crm.domain.Client;
import com.erp.crm.domain.Prospect;
import com.erp.crm.factory.CrmEntityFactory;
/**
 * Command to convert a Prospect into a Client entity.
 */
public class ConvertProspectCommand implements Runnable {

    private final Prospect prospect;
    private final CrmEntityFactory factory;
    private Client result;

    public ConvertProspectCommand(Prospect prospect, CrmEntityFactory factory) {
        this.prospect = prospect;
        this.factory = factory;
    }

    @Override
    public void run() {
        this.result = factory.prospectToClient(prospect);
    }

    public Client getResult() {
        return result;
    }
}
