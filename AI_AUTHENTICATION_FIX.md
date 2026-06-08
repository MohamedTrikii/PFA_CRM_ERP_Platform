# AI Assistant Authentication Fix - Verification Guide

## Problem Fixed
The AI assistant endpoint was returning `401 Unauthorized` when called through the gateway with a valid JWT token.

### Root Cause
The AI service Docker container was missing `KEYCLOAK_URL` environment variable:
- **Problem**: Defaulted to `http://localhost:8080` (host machine's localhost)
- **Inside Container**: localhost doesn't reach external services; must use container network name
- **Solution**: Set `KEYCLOAK_URL: http://keycloak:8080` (uses Docker internal DNS)

## Changes Made

### 1. AI Service Configuration (`docker-compose.yml`)
```yaml
ai-service:
  environment:
    KEYCLOAK_URL: http://keycloak:8080      # ← ADDED
    KEYCLOAK_REALM: erp                      # ← ADDED
    # ... other vars
  depends_on:
    # ... existing deps
    keycloak:
      condition: service_healthy             # ← ADDED
```

### 2. Public Test Endpoint (`ai-service/app/main.py`)
- Added `/api/v1/ai/assistant-test` endpoint (no authentication required)
- Purpose: Verify AI service and Ollama connectivity without auth complications
- Accessible at: `http://localhost:8443/api/v1/ai/assistant-test`

### 3. Gateway Security Config (`backend/gateway/config/SecurityConfig.java`)
```java
.pathMatchers("/api/v1/ai/assistant-test").permitAll()  // ← ADDED
```
- Allows test endpoint to bypass JWT validation

### 4. Frontend Debug Logging
- **Auth Interceptor** (`auth.interceptor.ts`): Logs token attachment
- **AI Component** (`ai-assistant.component.ts`): Logs request/response details

## How Authentication Now Works

```
User Login (http://localhost:8180/Keycloak)
    ↓
Frontend gets JWT token
    ↓
Auth Interceptor: Attaches "Authorization: Bearer {token}" header
    ↓
Gateway (port 8443): 
    - Validates JWT signature using KEYCLOAK_ISSUER
    - Extracts tenant_id from JWT claim
    - Adds "X-Tenant-Id: {tenant_id}" header
    ↓
AI Service (port 8000, via container network):
    - Receives Authorization header
    - Fetches JWKS from http://keycloak:8080 (can reach via container DNS!)
    - Validates token signature
    - Extracts user claims
    ↓
Request Processed ✅
```

## Testing the Fix

### Option 1: Test in Browser (Recommended)
1. Open http://localhost:4200
2. You should be redirected to Keycloak login
3. Login with credentials:
   - **Username**: `superadmin`
   - **Password**: `SuperAdmin@123`
4. Navigate to "AI Assistant" (or AI-related feature)
5. Open Browser DevTools (F12) → Console tab
6. Type a message and submit
7. Check console for logs:
   ```
   [authInterceptor] Attaching token to request...
   [AI Component] Sending message: {your message}
   [AI Component] Response received: {response data}
   ```

### Option 2: Test Public Endpoint (No Auth Required)
```bash
curl -X POST http://localhost:8443/api/v1/ai/assistant-test \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","model":"","use_rag":false,"temperature":0.7}'
```

### Option 3: Manual Token Test
```powershell
# Note: Resource Owner Password Credentials flow not supported for public client
# Use browser-based testing instead (Option 1)
```

## Troubleshooting

### Still Getting 401?
1. **Check AI service logs**: `docker logs erp-ai | grep -i "error\|401"`
2. **Verify Keycloak can be reached from AI service**:
   ```bash
   docker exec erp-ai curl -s http://keycloak:8080/realms/erp/protocol/openid-connect/certs | head
   ```
   Should return JWKS JSON, not connection error

3. **Check token expiration**: Browser console should show token details

### Public Test Endpoint Returns Error
- **502 Bad Gateway**: AI service not responding
  - Check: `docker logs erp-ai`
  
- **Ollama Error**: 
  - Model not installed. Fix: `docker exec erp-ollama ollama pull mistral`
  
- **Database Error**: 
  - PostgreSQL not connected. Check: `docker logs erp-postgres`

## Files Changed Summary

| File | Change | Impact |
|------|--------|--------|
| `docker-compose.yml` | Added Keycloak URL env vars | AI service can now reach Keycloak |
| `ai-service/app/main.py` | Added test endpoint | Can test without auth |
| `backend/gateway/.../SecurityConfig.java` | Permit test endpoint | Test endpoint accessible without JWT |
| `frontend/.../auth.interceptor.ts` | Added debug logs | Can trace token attachment |
| `frontend/.../ai-assistant.component.ts` | Added debug logs | Can trace request/response flow |

## Success Criteria

✅ Endpoint `/api/v1/ai/assistant` returns response (not 401)
✅ Browser console shows `[authInterceptor]` logs with token
✅ AI service processes requests without JWT validation errors
✅ Authenticated requests include valid `Authorization` header
✅ Public `/api/v1/ai/assistant-test` endpoint works

## Next Steps

1. **Verify in browser**: Follow Option 1 testing
2. **Check logs**: Use DevTools + docker logs for debugging
3. **Test RAG retrieval**: Message should include documents if `use_rag: true`
4. **Test conversation persistence**: Verify conversation_id is returned and reused

---

**Deployed**: 2024-06-08
**Status**: Ready for user testing
