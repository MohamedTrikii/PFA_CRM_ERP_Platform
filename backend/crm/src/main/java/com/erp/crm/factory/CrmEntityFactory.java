package com.erp.crm.factory;

import com.erp.crm.domain.Client;
import com.erp.crm.domain.Prospect;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class CrmEntityFactory {

    public Client prospectToClient(Prospect p) {
        Client c = new Client();
        c.setId(UUID.randomUUID());
        c.setProspectId(p.getId());
        c.setName(p.getName());
        c.setEmail(p.getEmail());
        c.setPhone(p.getPhone());
        c.setNotes(p.getNotes());
        return c;
    }
}
