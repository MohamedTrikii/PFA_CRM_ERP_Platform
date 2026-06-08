package com.erp.common.logging;

import com.erp.common.tenant.TenantContext;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1)
public class MdcRequestFilter implements Filter {

    private static final String REQUEST_ID = "requestId";
    private static final String TENANT_ID  = "tenantId";

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  httpReq  = (HttpServletRequest)  req;
        HttpServletResponse httpResp = (HttpServletResponse) resp;

        String requestId = httpReq.getHeader("X-Request-Id");
        if (requestId == null || requestId.isBlank()) requestId = UUID.randomUUID().toString();

        MDC.put(REQUEST_ID, requestId);
        String tenant = TenantContext.get();
        if (tenant != null) MDC.put(TENANT_ID, tenant);

        httpResp.setHeader("X-Request-Id", requestId);

        try {
            chain.doFilter(req, resp);
        } finally {
            MDC.remove(REQUEST_ID);
            MDC.remove(TENANT_ID);
        }
    }
}
