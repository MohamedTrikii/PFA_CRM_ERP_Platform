package com.erp.test;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

public class DockerAvailableCondition implements ExecutionCondition {
    private static final ConditionEvaluationResult ENABLED = ConditionEvaluationResult.enabled("Docker is available");
    private static final ConditionEvaluationResult DISABLED = ConditionEvaluationResult.disabled("Docker is not available; skipping Docker-based tests");

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            boolean available = DockerClientFactory.instance().isDockerAvailable();
            return available ? ENABLED : DISABLED;
        } catch (Throwable t) {
            return DISABLED;
        }
    }
}
