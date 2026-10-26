package com.erp.common.config;

import com.erp.common.tenant.TenantContext;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.*;
import java.util.logging.Logger;

/**
 * Wires two DataSources:
 *
 * rawDataSource        – plain HikariCP; Flyway auto-config is redirected here
 *                        so migrations run without a tenant_id in context.
 *                        (PostgreSQL table owner bypasses RLS by default.)
 *
 * dataSource (@Primary) – TenantAwareDataSource wrapping raw; JPA uses this.
 *                         Every connection checkout calls
 *                         set_config('app.tenant_id', <value>, FALSE)
 *                         so PostgreSQL RLS policies see the current tenant.
 */
@Configuration
public class TenantDataSourceConfig {

    /** Raw pool – Flyway and internal admin tasks use this directly. */
    @Bean(name = "rawDataSource")
    public HikariDataSource rawDataSource(DataSourceProperties props) {
        return props.initializeDataSourceBuilder()
                    .type(HikariDataSource.class)
                    .build();
    }

    /** JPA-facing pool – wraps raw and stamps every connection with tenant. */
    @Primary
    @Bean(name = "dataSource")
    public DataSource dataSource(@Qualifier("rawDataSource") HikariDataSource raw) {
        return new TenantAwareDataSource(raw);
    }

    /**
     * Redirect Spring Boot Flyway auto-config to rawDataSource.
     * ConditionalOnClass ensures this bean only registers when flyway-core is present.
     */
    @Bean
    @ConditionalOnClass(Flyway.class)
    public FlywayConfigurationCustomizer flywayUseRawDataSource(
            @Qualifier("rawDataSource") DataSource rawDataSource) {
        return config -> config.dataSource(rawDataSource);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Inner DataSource wrapper
    // ─────────────────────────────────────────────────────────────────────────
    public static class TenantAwareDataSource implements DataSource {

        private final DataSource delegate;

        public TenantAwareDataSource(DataSource delegate) {
            this.delegate = delegate;
        }

        @Override
        public Connection getConnection() throws SQLException {
            return tenanted(delegate.getConnection());
        }

        @Override
        public Connection getConnection(String user, String pass) throws SQLException {
            return tenanted(delegate.getConnection(user, pass));
        }

        private Connection tenanted(Connection conn) throws SQLException {
            String tenantId = TenantContext.get();
            // Empty string → PostgreSQL current_tenant_id() returns NULL → RLS blocks all rows
            String tenantValue = (tenantId != null && !tenantId.isBlank()) ? tenantId : "";
            String superAdminValue = TenantContext.isSuperAdmin() ? "true" : "false";
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT set_config('app.tenant_id', ?, FALSE); SELECT set_config('app.is_super_admin', ?, FALSE);")) {
                ps.setString(1, tenantValue);
                ps.setString(2, superAdminValue);
                ps.execute();
            }
            return conn;
        }

        @Override public PrintWriter getLogWriter() throws SQLException { return delegate.getLogWriter(); }
        @Override public void setLogWriter(PrintWriter pw) throws SQLException { delegate.setLogWriter(pw); }
        @Override public void setLoginTimeout(int s) throws SQLException { delegate.setLoginTimeout(s); }
        @Override public int getLoginTimeout() throws SQLException { return delegate.getLoginTimeout(); }
        @Override public Logger getParentLogger() throws SQLFeatureNotSupportedException { return delegate.getParentLogger(); }
        @Override public <T> T unwrap(Class<T> iface) throws SQLException { return delegate.unwrap(iface); }
        @Override public boolean isWrapperFor(Class<?> iface) throws SQLException { return delegate.isWrapperFor(iface); }
    }
}
