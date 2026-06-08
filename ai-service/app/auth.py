"""JWT verification against Keycloak public key."""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import httpx

_bearer = HTTPBearer()

KEYCLOAK_URL    = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM  = os.getenv("KEYCLOAK_REALM", "erp")
_JWKS_URI       = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            r = await client.get(_JWKS_URI, timeout=10)
            r.raise_for_status()
            _jwks_cache = r.json()
    return _jwks_cache


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    token = creds.credentials
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except (JWTError, Exception) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc


def require_roles(*roles: str):
    async def _check(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
        user = await get_current_user(creds)
        user_roles: list[str] = user.get("realm_access", {}).get("roles", [])
        if not any(r in user_roles for r in roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return _check
