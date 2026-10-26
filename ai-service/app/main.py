from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel, Field
from typing import Annotated, Optional, List, Any
import os
import asyncio
from datetime import datetime, date, timedelta, timezone
from uuid import uuid4

import httpx
from fastapi import Header

from . import auth
from .pricing import suggest_price
from .forecast import forecast_item
from . import ollama as ollama_client
from . import indexer as indexer_module
from . import embedder as embedder_module
from . import db
from . import conversation as conversation_module
from . import context_builder
from . import fallback as fallback_module
import types

logger = logging.getLogger(__name__)

TRAINING_FEATURES_AVAILABLE = True
try:
    from ml import prophet_trainer, xgboost_trainer, anomaly_trainer, model_inference, model_store
except ImportError:
    TRAINING_FEATURES_AVAILABLE = False
    async def _dummy_async(*args, **kwargs):
        await asyncio.sleep(0)
        return {}

    prophet_trainer = types.SimpleNamespace(train_sales_forecast_model=_dummy_async)
    xgboost_trainer = types.SimpleNamespace(
        train_quote_acceptance_model=_dummy_async,
        train_payment_risk_model=_dummy_async,
    )
    anomaly_trainer = types.SimpleNamespace(train_stock_anomaly_model=_dummy_async)
    model_inference = types.SimpleNamespace(
        predict_sales_forecast=_dummy_async,
        predict_quote_acceptance=_dummy_async,
        predict_payment_risk=_dummy_async,
        detect_stock_anomalies=_dummy_async,
    )
    model_store = types.SimpleNamespace(list_models=_dummy_async, get_latest_model=_dummy_async)

DB_URL = os.getenv("DATABASE_URL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.init_pool()
    indexer_module.start_background_indexer(interval_seconds=300)
    yield
    await db.close_pool()


class ConversationSummary(BaseModel):
    conversation_id: str
    created_at: str
    preview: str


class RetrievalRequest(BaseModel):
    tenant_id: Optional[str] = None
    query: str
    k: Optional[int] = 5


class RetrievalItem(BaseModel):
    document_id: str
    title: Optional[str] = None
    content: str
    distance: float


class RetrievalResponse(BaseModel):
    tenant_id: str
    results: List[RetrievalItem]

# Annotated dependency aliases (FastAPI best practice)
StaffUser = Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN", "EMPLOYER", "EMPLOYEE"))]

# Adapter dependency: call `auth.get_current_user` at request time so tests
# can monkeypatch `app.auth.get_current_user` and have it take effect.
async def _resolve_current_user(creds=Depends(auth._bearer)) -> dict:
    return await auth.get_current_user(creds)

AnyUser = Annotated[dict, Depends(_resolve_current_user)]

# Keep references to background tasks to avoid premature GC
_background_tasks: list[asyncio.Task] = []

def _schedule(coro: Any) -> asyncio.Task:
    t = asyncio.create_task(coro)
    _background_tasks.append(t)
    return t

app = FastAPI(
    title="ERP AI Service",
    version="1.0.0",
    docs_url="/api/v1/ai/docs",
    openapi_url="/api/v1/ai/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# ── Models ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    service: str


class SuggestPriceRequest(BaseModel):
    profile_series: Optional[str] = Field(None, examples=["T60"])
    width_mm: int = Field(..., ge=100, le=6000)
    height_mm: int = Field(..., ge=100, le=6000)
    glass_type: Optional[str] = Field(None, examples=["DV_4_16_4"])
    opening_type: Optional[str] = Field(None, examples=["COULISSANT"])
    quantity: int = Field(1, ge=1, le=500)


class SuggestPriceResponse(BaseModel):
    surface_m2: float
    base_price_per_m2: float
    glass_factor: float
    opening_surcharge: float
    unit_price_ht: float
    total_ht: float
    confidence: float
    currency: str = "TND"


class StockItemInput(BaseModel):
    product_id: str
    product_reference: str
    current_quantity: float
    reorder_point: float = 0.0
    daily_consumptions: list[float] = Field(
        default_factory=list,
        description="Daily SORTIE quantities ordered oldest→newest (max 90 days)"
    )


class StockForecastRequest(BaseModel):
    tenant_id: Optional[str] = None
    items: list[StockItemInput]


class StockForecastItem(BaseModel):
    product_id: str
    product_reference: str
    current_quantity: float
    avg_daily_consumption: float
    estimated_days_to_stockout: Optional[int] = None
    risk_score: float
    risk_level: str


class StockForecastResponse(BaseModel):
    tenant_id: str
    forecasts: list[StockForecastItem]
    critical_count: int
    high_count: int


# ── Ollama/LLM models ─────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000,
                         description="User message in French or Arabic")
    context: Optional[str] = Field(None, max_length=2000,
                                   description="Optional ERP context (devis lines, stock summary, etc.)")
    conversation_id: Optional[str] = Field(None, description="Optional existing conversation ID to append to")
    temperature: float = Field(0.7, ge=0.0, le=1.0)


class ChatResponse(BaseModel):
    reply: str
    model: str
    conversation_id: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class SourceDocument(BaseModel):
    document_id: str
    title: Optional[str] = None
    excerpt: str
    distance: float


class AssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    use_rag: bool = True
    top_k: int = Field(3, ge=1, le=10)
    model: Optional[str] = None
    temperature: float = Field(0.7, ge=0.0, le=1.0)


class AssistantResponse(BaseModel):
    conversation_id: str
    reply: str
    model: str
    sources: Optional[List[SourceDocument]] = None


class ModelStatusResponse(BaseModel):
    ollama_url: str
    configured_model: str
    model_available: bool
    available_models: list[str]


class TrainingTaskResponse(BaseModel):
    task_id: str
    tenant_id: str
    name: str
    status: str
    started_at: str
    finished_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Any] = None


class ModelRegistryItem(BaseModel):
    id: str
    tenant_id: str
    name: str
    version: Optional[str] = None
    artifact_path: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    created_at: str


# --- Additional public API models (stubs) ---------------------------------


class SalesForecastRequest(BaseModel):
    tenant_id: Optional[str] = None
    horizon_days: Optional[int] = 90


class SalesForecastPoint(BaseModel):
    date: str
    predicted_amount: float


class SalesForecastResponse(BaseModel):
    tenant_id: str
    predictions: List[SalesForecastPoint]


class CashflowForecastRequest(BaseModel):
    tenant_id: Optional[str] = None
    horizon_days: Optional[int] = 90


class CashflowPoint(BaseModel):
    date: str
    net_cashflow: float


class CashflowForecastResponse(BaseModel):
    tenant_id: str
    predictions: List[CashflowPoint]


class ClassificationRequest(BaseModel):
    tenant_id: Optional[str] = None
    entity_id: Optional[str] = None
    features: Optional[dict] = None


class ClassificationResponse(BaseModel):
    probability: float
    score: float
    explanation: Optional[str] = None


class RecommendationRequest(BaseModel):
    tenant_id: Optional[str] = None
    product_ids: Optional[List[str]] = None


class RecommendationItem(BaseModel):
    product_id: str
    suggested_qty: float
    reason: Optional[str] = None


class RecommendationResponse(BaseModel):
    tenant_id: str
    recommendations: List[RecommendationItem]


class AnomalyRequest(BaseModel):
    tenant_id: Optional[str] = None
    since_days: Optional[int] = 30


class AnomalyItem(BaseModel):
    product_id: str
    product_reference: str
    anomaly_score: float
    is_anomaly: bool = True
    reason: Optional[str] = None


class AnomalyResponse(BaseModel):
    tenant_id: str
    anomalies: List[AnomalyItem]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/ai/health", response_model=HealthResponse, tags=["health"])
async def health():
    return HealthResponse(status="UP", service="ai-service")


@app.post(
    "/api/v1/ai/suggest-price",
    response_model=SuggestPriceResponse,
    tags=["pricing"],
    summary="Suggest unit price HT for an aluminum joinery element",
)
async def suggest_price_endpoint(
    req: SuggestPriceRequest,
    _user: StaffUser,
):
    result = suggest_price(
        width_mm=req.width_mm,
        height_mm=req.height_mm,
        profile_series=req.profile_series,
        glass_type=req.glass_type,
        opening_type=req.opening_type,
        quantity=req.quantity,
    )
    return SuggestPriceResponse(
        surface_m2=result.surface_m2,
        base_price_per_m2=result.base_price_per_m2,
        glass_factor=result.glass_factor,
        opening_surcharge=result.opening_surcharge,
        unit_price_ht=result.unit_price_ht,
        total_ht=result.total_ht,
        confidence=result.confidence,
    )


@app.post(
    "/api/v1/ai/stock-forecast",
    response_model=StockForecastResponse,
    tags=["inventory"],
    summary="Forecast stock-out risk for a list of SKUs",
    responses={422: {"description": "Payload exceeds 200 items limit"}},
)
async def stock_forecast_endpoint(
    req: StockForecastRequest,
    _user: StaffUser,
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    if len(req.items) > 200:
        raise HTTPException(status_code=422, detail="Max 200 items per request")

    forecasts = [
        forecast_item(
            product_id=item.product_id,
            product_reference=item.product_reference,
            current_quantity=item.current_quantity,
            daily_consumptions=item.daily_consumptions[-90:],
            reorder_point=item.reorder_point,
        )
        for item in req.items
    ]
    forecasts.sort(key=lambda f: f.risk_score, reverse=True)

    resolved_tenant = resolve_tenant(_user, x_tenant_id)

    return StockForecastResponse(
        tenant_id=resolved_tenant,
        forecasts=[
            StockForecastItem(
                product_id=f.product_id,
                product_reference=f.product_reference,
                current_quantity=f.current_quantity,
                avg_daily_consumption=f.avg_daily_consumption,
                estimated_days_to_stockout=f.estimated_days_to_stockout,
                risk_score=f.risk_score,
                risk_level=f.risk_level,
            )
            for f in forecasts
        ],
        critical_count=sum(1 for f in forecasts if f.risk_level == "CRITICAL"),
        high_count=sum(1 for f in forecasts if f.risk_level == "HIGH"),
    )


# ── Ollama / LLM endpoints ────────────────────────────────────────────────────

@app.get(
    "/api/v1/ai/model-status",
    response_model=ModelStatusResponse,
    tags=["llm"],
    summary="Check which LLM models are available in the local Ollama instance",
)
async def model_status(_user: StaffUser):
    try:
        models = await ollama_client.list_models()
        names  = [m.get("name", "") for m in models]
        available = any(n.startswith(ollama_client.OLLAMA_MODEL) for n in names)
    except Exception:
        names, available = [], False

    return ModelStatusResponse(
        ollama_url=ollama_client.OLLAMA_URL,
        configured_model=ollama_client.OLLAMA_MODEL,
        model_available=available,
        available_models=names,
    )


async def _persist_chat_conversation(
    tenant_id: str,
    user_id: Optional[str],
    conversation_id: Optional[str],
    user_message: str,
    assistant_message: str,
) -> str:
    """Persist a chat turn to ai_conversations. Returns conversation_id."""
    if conversation_id:
        conversation = await conversation_module.get_conversation(tenant_id, conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
        await conversation_module.append_message(tenant_id, conversation_id, {"role": "user", "content": user_message})
        await conversation_module.append_message(tenant_id, conversation_id, {"role": "assistant", "content": assistant_message})
        return conversation_id

    return await conversation_module.create_conversation(
        tenant_id,
        user_id,
        [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message},
        ],
    )


@app.post(
    "/api/v1/ai/chat",
    response_model=ChatResponse,
    tags=["llm"],
    summary="Chat with the local Mistral LLM using ERP context",
    description=(
        "Sends a message to the locally-hosted Ollama model (default: mistral). "
        "Optionally supply a `context` string with ERP data (e.g. devis lines, "
        "stock report) to ground the model's response. "
        "**Requires Ollama to be running and the model to be pulled** "
        "(`docker exec erp-ollama ollama pull mistral`)."
    ),
    responses={
        503: {"description": "Ollama unavailable or model not yet pulled"},
        502: {"description": "Ollama returned an unexpected error"},
    },
)
async def chat_endpoint(req: ChatRequest, _user: StaffUser):
    if not await ollama_client.is_model_available():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model '{ollama_client.OLLAMA_MODEL}' is not available. "
                f"Run: docker exec erp-ollama ollama pull {ollama_client.OLLAMA_MODEL}"
            ),
        )

    resolved_tenant = resolve_tenant(_user, None)
    user_id = get_user_id(_user)
    user_message = req.message
    if req.context:
        user_message = f"[ERP Context]\n{req.context}\n\n[Question]\n{req.message}"

    try:
        result = await ollama_client.chat(user_message, temperature=req.temperature)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc

    msg = result.get("message", {})
    assistant_text = msg.get("content", "")
    conversation_id = await _persist_chat_conversation(
        resolved_tenant,
        user_id,
        req.conversation_id,
        req.message,
        assistant_text,
    )

    return ChatResponse(
        reply=assistant_text,
        model=result.get("model", ollama_client.OLLAMA_MODEL),
        conversation_id=conversation_id,
        prompt_tokens=result.get("prompt_eval_count"),
        completion_tokens=result.get("eval_count"),
    )


@app.post(
    "/api/v1/ai/chat/stream",
    response_class=StreamingResponse,
    tags=["llm"],
    summary="Chat with the local Mistral LLM using ERP context and SSE streaming",
    description=(
        "Streams chat responses using server-sent events. Each event contains a partial chunk of the assistant reply. "
        "The final events include `conversation_id` and `done` markers."
    ),
)
async def chat_stream_endpoint(req: ChatRequest, _user: StaffUser):
    if not await ollama_client.is_model_available():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model '{ollama_client.OLLAMA_MODEL}' is not available. "
                f"Run: docker exec erp-ollama ollama pull {ollama_client.OLLAMA_MODEL}"
            ),
        )

    resolved_tenant = resolve_tenant(_user, None)
    user_id = get_user_id(_user)
    user_message = req.message
    if req.context:
        user_message = f"[ERP Context]\n{req.context}\n\n[Question]\n{req.message}"

    async def event_generator():
        reply_parts: list[str] = []
        async for chunk in ollama_client.stream_chat(
            user_message,
            temperature=req.temperature,
        ):
            if chunk is None:
                continue
            reply_parts.append(chunk)
            yield f"data: {chunk}\n\n"

        assistant_text = "".join(reply_parts)
        conversation_id = await _persist_chat_conversation(
            resolved_tenant,
            user_id,
            req.conversation_id,
            req.message,
            assistant_text,
        )
        yield f"event: conversation_id\ndata: {conversation_id}\n\n"
        yield "event: done\ndata: true\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post(
    "/api/ai/chat/stream",
    response_class=StreamingResponse,
    tags=["llm"],
    summary="Chat with the local Mistral LLM using ERP context and SSE streaming (alias)",
)
async def chat_stream_alias(req: ChatRequest, _user: AnyUser):
    return await chat_stream_endpoint(req, _user)


@app.get(
    "/api/v1/ai/conversations",
    response_model=List[ConversationSummary],
    tags=["assistant"],
    summary="List chat conversations for the current user (most recent first)",
)
async def list_conversations(_user: StaffUser):
    tenant_id = resolve_tenant(_user, None)
    user_id   = get_user_id(_user)
    try:
        async with db.connection(tenant_id) as conn:
            rows = await conn.fetch(
                "SELECT id, created_at, messages "
                "FROM ai_conversations "
                "WHERE tenant_id = $1::uuid AND ($2::uuid IS NULL OR user_id = $2::uuid) "
                "ORDER BY created_at DESC LIMIT 50",
                tenant_id, user_id,
            )
        result = []
        for r in rows:
            msgs = r["messages"] if isinstance(r["messages"], list) else []
            first_user = next((m.get("text", "") for m in msgs if m.get("role") == "user"), "")
            result.append(ConversationSummary(
                conversation_id=str(r["id"]),
                created_at=r["created_at"].isoformat(),
                preview=first_user[:120],
            ))
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/api/v1/ai/documents/search",
    response_model=RetrievalResponse,
    tags=["documents"],
    summary="Search indexed documents (pgvector similarity)",
)
async def documents_search(req: RetrievalRequest, _user: AnyUser):
    tenant_id = req.tenant_id or resolve_tenant(_user, None)
    results = await indexer_module.search_documents(req.query, tenant_id, req.k or 5)
    return RetrievalResponse(
        tenant_id=tenant_id,
        results=[
            RetrievalItem(
                document_id=r["document_id"],
                title=r.get("title"),
                content=r.get("content"),
                distance=r.get("distance", 0.0),
            )
            for r in results
        ],
    )


# ---------------------- Backward-compatible /api/ai aliases -----------------
# These endpoints are non-intrusive stubs or simple delegations to existing logic.

AnyUser = Annotated[dict, Depends(auth.get_current_user)]

training_tasks: dict[str, dict[str, Any]] = {}


def get_user_id(user: Optional[dict]) -> Optional[str]:
    if not isinstance(user, dict):
        return None
    return user.get("sub") or user.get("user_id") or user.get("id")


def _create_training_task(tenant_id: str, name: str) -> str:
    task_id = str(uuid4())
    training_tasks[task_id] = {
        "task_id": task_id,
        "tenant_id": tenant_id,
        "name": name,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "finished_at": None,
        "error": None,
        "result": None,
    }
    return task_id


async def _run_training_task(task_id: str, coro: Any) -> None:
    try:
        result = await coro
        training_tasks[task_id]["status"] = "completed"
        training_tasks[task_id]["finished_at"] = datetime.now(timezone.utc).isoformat()
        training_tasks[task_id]["result"] = result
    except Exception as exc:
        training_tasks[task_id]["status"] = "failed"
        training_tasks[task_id]["finished_at"] = datetime.now(timezone.utc).isoformat()
        training_tasks[task_id]["error"] = str(exc)


def resolve_tenant(user: Optional[dict] = None, x_tenant_id: Optional[str] = None) -> str:
    tenant = None
    if isinstance(user, dict):
        tenant = user.get("tenant_id") or user.get("tenant") or user.get("tenantId")
    if not tenant and x_tenant_id:
        tenant = x_tenant_id
    if not tenant:
        raise HTTPException(status_code=403, detail="Tenant context missing")
    return tenant


def ensure_training_available() -> None:
    if not TRAINING_FEATURES_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI training and model inference dependencies are not installed. "
                "Install the full ai-service requirements or run in an environment with scikit-learn, xgboost, prophet, and pandas."
            ),
        )


@app.post("/api/v1/ai/assistant-test", response_model=AssistantResponse, tags=["assistant"])
async def assistant_endpoint_test(
    req: AssistantRequest,
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    """Test endpoint without authentication requirement (dev only)."""
    # Use a default tenant for testing
    resolved_tenant = x_tenant_id or "00000000-0000-0000-0000-000000000001"
    user_id = "test-user"
    
    sources = []
    if req.use_rag:
        sources = await indexer_module.search_documents(req.message, resolved_tenant, req.top_k)

    user_message = req.message
    if sources:
        context_text = "\n\n".join(
            f"Document {idx + 1}: {doc['title']}\n{doc['content']}"
            for idx, doc in enumerate(sources)
        )
        user_message = f"[Retrieved documents]\n{context_text}\n\n[User question]\n{req.message}"

    try:
        result = await ollama_client.chat(
            user_message,
            temperature=req.temperature,
            model=req.model,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc

    msg = result.get("message", {})
    reply_text = msg.get("content", "")
    model_name = result.get("model", req.model or ollama_client.OLLAMA_MODEL)

    conversation_payload = [
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": reply_text},
    ]

    conversation_id = await conversation_module.create_conversation(
        resolved_tenant,
        user_id,
        conversation_payload,
        metadata={"source_documents": [doc["document_id"] for doc in sources]} if sources else None,
    )

    return AssistantResponse(
        conversation_id=conversation_id,
        reply=reply_text,
        model=model_name,
        sources=[
            SourceDocument(
                document_id=doc["document_id"],
                title=doc["title"],
                excerpt=(doc["content"][:400] + "...") if len(doc["content"]) > 400 else doc["content"],
                distance=doc["distance"],
            )
            for doc in sources
        ] if sources else None,
    )


@app.post("/api/v1/ai/assistant", response_model=AssistantResponse, tags=["assistant"])
async def assistant_endpoint(
    req: AssistantRequest,
    _user: AnyUser,
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    resolved_tenant = resolve_tenant(_user, x_tenant_id)
    user_id = get_user_id(_user)
    conversation = None
    if req.conversation_id:
        conversation = await conversation_module.get_conversation(resolved_tenant, req.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")

    sources = []
    if req.use_rag:
        sources = await indexer_module.search_documents(req.message, resolved_tenant, req.top_k)

    user_message = req.message
    if sources:
        context_text = "\n\n".join(
            f"Document {idx + 1}: {doc['title']}\n{doc['content']}"
            for idx, doc in enumerate(sources)
        )
        user_message = f"[Retrieved documents]\n{context_text}\n\n[User question]\n{req.message}"

    try:
        result = await ollama_client.chat(
            user_message,
            temperature=req.temperature,
            model=req.model,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc

    msg = result.get("message", {})
    reply_text = msg.get("content", "")
    model_name = result.get("model", req.model or ollama_client.OLLAMA_MODEL)

    conversation_payload = [
        {"role": "user", "content": req.message},
        {"role": "assistant", "content": reply_text},
    ]

    if conversation is None:
        conversation_id = await conversation_module.create_conversation(
            resolved_tenant,
            user_id,
            conversation_payload,
            metadata={"source_documents": [doc["document_id"] for doc in sources]} if sources else None,
        )
    else:
        conversation_id = req.conversation_id
        await conversation_module.append_message(resolved_tenant, conversation_id, conversation_payload[0])
        await conversation_module.append_message(resolved_tenant, conversation_id, conversation_payload[1])

    return AssistantResponse(
        conversation_id=conversation_id,
        reply=reply_text,
        model=model_name,
        sources=[
            SourceDocument(
                document_id=doc["document_id"],
                title=doc["title"],
                excerpt=(doc["content"][:400] + "...") if len(doc["content"]) > 400 else doc["content"],
                distance=doc["distance"],
            )
            for doc in sources
        ] if sources else None,
    )


@app.post(
    "/api/v1/ai/assistant/stream",
    response_class=StreamingResponse,
    tags=["assistant"],
    summary="Streaming assistant with RAG, conversation history and role-aware context",
    responses={503: {"description": "Model unavailable or Ollama unreachable"}},
)
async def assistant_stream_endpoint(req: AssistantRequest, _user: AnyUser):
    """Full-featured streaming assistant:
    - Fetches live ERP summary for the user's role
    - Retrieves relevant documents via pgvector (RAG)
    - Loads conversation history for multi-turn context
    - Builds a proper Ollama messages array (system + history + user)
    - Streams tokens as SSE; sends sources, conversation_id and done events at the end
    """
    model_available = await ollama_client.is_model_available()

    resolved_tenant = resolve_tenant(_user, None)
    user_id   = get_user_id(_user)
    user_roles: list[str] = _user.get("realm_access", {}).get("roles", []) if isinstance(_user, dict) else []

    if not model_available:
        return StreamingResponse(
            _fallback_event_generator(resolved_tenant, user_id, user_roles, req),
            media_type="text/event-stream",
        )

    # 1. Build role-aware system prompt with live ERP data
    system_prompt = await context_builder.build_system_prompt(resolved_tenant, user_roles, user_id)

    # 2. Load or start conversation
    history_messages: list[dict] = []
    conversation_id_existing: str | None = req.conversation_id
    if conversation_id_existing:
        conv = await conversation_module.get_conversation(resolved_tenant, conversation_id_existing)
        if conv:
            raw = conv.get("messages") or []
            # Normalize: stored as {role, content} or {role, text}
            for m in raw:
                role    = m.get("role", "user")
                content = m.get("content") or m.get("text", "")
                if role in ("user", "assistant") and content:
                    history_messages.append({"role": role, "content": content})
        # Keep last 10 turns (20 messages) to avoid context overflow
        history_messages = history_messages[-20:]

    # 3. RAG — retrieve relevant documents
    sources: list[dict] = []
    if req.use_rag:
        try:
            sources = await indexer_module.search_documents(req.message, resolved_tenant, req.top_k)
        except Exception as exc:
            logger.warning("RAG search failed: %s", exc)

    # 4. Build user message with RAG context injected
    user_content = req.message
    if sources:
        doc_context = "\n\n".join(
            f"[Document {i+1}: {doc['title']}]\n{doc['content'][:600]}"
            for i, doc in enumerate(sources)
        )
        user_content = (
            f"[Documents pertinents de la base de données]\n{doc_context}\n\n"
            f"[Question de l'utilisateur]\n{req.message}"
        )

    # 5. Assemble messages array: system + history + current user message
    messages = [
        {"role": "system", "content": system_prompt},
        *history_messages,
        {"role": "user", "content": user_content},
    ]

    # Delegate streaming logic to a helper to keep endpoint simple
    return StreamingResponse(
        _assistant_event_generator(messages, req, resolved_tenant, conversation_id_existing, sources, user_id),
        media_type="text/event-stream",
    )


async def _fallback_event_generator(resolved_tenant: str, user_id: Optional[str], user_roles: list[str], req: AssistantRequest):
    import json as _json
    reply_parts: list[str] = []
    async for token in fallback_module.stream_fallback(req.message, tenant_id=resolved_tenant, roles=user_roles, user_id=user_id):
        reply_parts.append(token)
        yield f"data: {_json.dumps(token)}\n\n"

    full_reply = "".join(reply_parts)
    try:
        conv_id = await conversation_module.create_conversation(
            resolved_tenant, user_id,
            [{"role": "user", "content": req.message}, {"role": "assistant", "content": full_reply}],
        )
    except Exception:
        conv_id = ""
    yield f"event: conversation_id\ndata: {_json.dumps(conv_id)}\n\n"
    yield "event: done\ndata: true\n\n"


async def _assistant_event_generator(messages: list[dict], req: AssistantRequest, resolved_tenant: str, conversation_id_existing: Optional[str], sources: list[dict], user_id: Optional[str]):
    import json as _json
    reply_parts: list[str] = []
    try:
        async for token in ollama_client.stream_chat_messages(
            messages,
            temperature=req.temperature,
            model=req.model,
        ):
            reply_parts.append(token)
            # Escape newlines inside SSE data field
            yield f"data: {_json.dumps(token)}\n\n"
    except Exception as exc:
        yield f"event: error\ndata: {_json.dumps(str(exc))}\n\n"
        return

    full_reply = "".join(reply_parts)

    # Persist conversation
    try:
        new_messages = [
            {"role": "user",      "content": req.message},
            {"role": "assistant", "content": full_reply},
        ]
        if conversation_id_existing:
            for m in new_messages:
                await conversation_module.append_message(resolved_tenant, conversation_id_existing, m)
            conv_id = conversation_id_existing
        else:
            conv_id = await conversation_module.create_conversation(
                resolved_tenant, user_id, new_messages,
                metadata={"source_documents": [d["document_id"] for d in sources]} if sources else None,
            )
    except Exception as exc:
        logger.warning("Failed to persist conversation: %s", exc)
        conv_id = conversation_id_existing or ""

    # Send sources, conversation_id and done
    if sources:
        sources_payload = [
            {
                "document_id": d["document_id"],
                "title":       d.get("title", ""),
                "excerpt":     d["content"][:300],
                "distance":    round(float(d["distance"]), 4),
            }
            for d in sources
        ]
        yield f"event: sources\ndata: {_json.dumps(sources_payload)}\n\n"

    yield f"event: conversation_id\ndata: {_json.dumps(conv_id)}\n\n"
    yield "event: done\ndata: true\n\n"


@app.post("/api/ai/chat", response_model=ChatResponse, tags=["llm"])
async def chat_alias(req: ChatRequest, _user: AnyUser):
    # allow any authenticated user to chat; reuse Ollama call
    if not await ollama_client.is_model_available():
        raise HTTPException(
            status_code=503,
            detail=(f"Model '{ollama_client.OLLAMA_MODEL}' is not available."),
        )
    user_message = req.message
    if req.context:
        user_message = f"[ERP Context]\n{req.context}\n\n[Question]\n{req.message}"
    try:
        result = await ollama_client.chat(user_message, temperature=req.temperature)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama error: {exc.response.text}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc
    msg = result.get("message", {})
    return ChatResponse(reply=msg.get("content", ""), model=result.get("model", ollama_client.OLLAMA_MODEL))


@app.post("/api/ai/forecast/stock", response_model=StockForecastResponse, tags=["inventory"])
async def stock_forecast_alias(req: StockForecastRequest, _user: AnyUser):
    # delegate to existing logic (same validations)
    return await stock_forecast_endpoint(req, _user)


@app.post("/api/ai/forecast/sales", response_model=SalesForecastResponse, tags=["forecast"])
async def forecast_sales(req: SalesForecastRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    horizon_days = req.horizon_days or 90
    if not TRAINING_FEATURES_AVAILABLE:
        return SalesForecastResponse(tenant_id=tenant_id, predictions=[])
    try:
        predictions = await model_inference.predict_sales_forecast(tenant_id, horizon_days)
    except ValueError:
        predictions = []
    return SalesForecastResponse(
        tenant_id=tenant_id,
        predictions=[SalesForecastPoint(date=p["date"], predicted_amount=p["predicted_amount"]) for p in predictions],
    )


@app.post("/api/ai/forecast/cashflow", response_model=CashflowForecastResponse, tags=["forecast"])
async def forecast_cashflow(req: CashflowForecastRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    horizon_days = req.horizon_days or 90
    predictions = await _cashflow_heuristic(tenant_id, horizon_days)
    return CashflowForecastResponse(tenant_id=tenant_id, predictions=predictions)


async def _cashflow_heuristic(tenant_id: str, horizon_days: int) -> list[dict]:
    """Simple cashflow projection based on historical encaissements (90-day average)."""
    query = (
        "SELECT SUM(amount)::float as total FROM encaissements "
        "WHERE payment_date >= NOW() - INTERVAL '90 days'"
    )
    try:
        async with db.connection(tenant_id) as conn:
            row = await conn.fetchrow(query)
        total_90 = float(row["total"] or 0)
        avg_daily = round(total_90 / 90, 2)
        today = date.today()
        return [
            {"date": (today + timedelta(days=i)).isoformat(), "net_cashflow": avg_daily}
            for i in range(1, horizon_days + 1)
        ]
    except Exception:
        return []


@app.post("/api/ai/classification/quote-success", response_model=ClassificationResponse, tags=["classification"])
async def classify_quote_success(req: ClassificationRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    if not req.features:
        raise HTTPException(status_code=422, detail="Quote classification features are required")
    if not TRAINING_FEATURES_AVAILABLE:
        return ClassificationResponse(
            probability=0.5,
            score=0.5,
            explanation="Quote classification unavailable: training dependencies are not installed.",
        )
    try:
        prediction = await model_inference.predict_quote_acceptance(tenant_id, req.features)
        return ClassificationResponse(
            probability=prediction["probability"],
            score=prediction["score"],
            explanation=prediction["explanation"],
        )
    except ValueError:
        return ClassificationResponse(
            probability=0.5,
            score=0.5,
            explanation=f"No quote acceptance model available for tenant {tenant_id}",
        )


@app.post("/api/ai/classification/payment-risk", response_model=ClassificationResponse, tags=["classification"])
async def classify_payment_risk(req: ClassificationRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    if not req.features:
        raise HTTPException(status_code=422, detail="Payment risk classification features are required")
    if not TRAINING_FEATURES_AVAILABLE:
        return ClassificationResponse(
            probability=0.2,
            score=0.2,
            explanation="Payment risk classification unavailable: training dependencies are not installed.",
        )
    try:
        prediction = await model_inference.predict_payment_risk(tenant_id, req.features)
        return ClassificationResponse(
            probability=prediction["probability"],
            score=prediction["score"],
            explanation=prediction["explanation"],
        )
    except ValueError:
        return ClassificationResponse(
            probability=0.2,
            score=0.2,
            explanation=f"No payment risk model available for tenant {tenant_id}",
        )


@app.post("/api/ai/recommendations/purchase", response_model=RecommendationResponse, tags=["recommendations"])
async def recommend_purchase(req: RecommendationRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    recommendations = await _purchase_recommendations(tenant_id)
    return RecommendationResponse(tenant_id=tenant_id, recommendations=recommendations)


async def _purchase_recommendations(tenant_id: str) -> list[dict]:
    """Recommend replenishment for stock items below min_quantity."""
    query = (
        "SELECT si.product_id::text, si.product_reference, "
        "si.quantity::float as quantity, si.min_quantity::float as min_quantity, "
        "COALESCE(("
        "  SELECT AVG(sm.quantity)::float FROM stock_movements sm "
        "  WHERE sm.product_id = si.product_id AND sm.tenant_id = si.tenant_id "
        "  AND sm.movement_type = 'SORTIE' AND sm.created_at >= NOW() - INTERVAL '30 days'"
        "), 0) as avg_daily_sortie "
        "FROM stock_items si "
        "WHERE si.quantity <= si.min_quantity AND si.min_quantity > 0 "
        "LIMIT 20"
    )
    try:
        async with db.connection(tenant_id) as conn:
            rows = await conn.fetch(query)
        result = []
        for r in rows:
            avg_daily = float(r["avg_daily_sortie"] or 0)
            qty_needed = max(float(r["min_quantity"]) * 3 - float(r["quantity"]), avg_daily * 30, 1.0)
            result.append({
                "product_id": r["product_id"],
                "suggested_qty": round(qty_needed, 2),
                "reason": (
                    f"Stock {r['product_reference']}: {r['quantity']:.1f} unités "
                    f"(seuil min: {r['min_quantity']:.1f})"
                ),
            })
        return result
    except Exception:
        return []


@app.post("/api/ai/anomalies", response_model=AnomalyResponse, tags=["anomalies"])
async def detect_anomalies(req: AnomalyRequest, _user: AnyUser):
    tenant_id = resolve_tenant(_user, None)
    if not TRAINING_FEATURES_AVAILABLE:
        return AnomalyResponse(tenant_id=tenant_id, anomalies=[])
    try:
        anomalies = await model_inference.detect_stock_anomalies(tenant_id, req.since_days or 30)
    except ValueError:
        anomalies = []
    return AnomalyResponse(
        tenant_id=tenant_id,
        anomalies=[
            AnomalyItem(
                product_id=a["entity_id"],
                product_reference=a.get("details", {}).get("movement_type") or a["entity"],
                anomaly_score=round(a["score"], 4),
                is_anomaly=True,
                reason=a.get("details", {}).get("created_at", "")[:10] if a.get("details") else None,
            )
            for a in anomalies
        ],
    )


@app.post("/api/v1/ai/anomalies", response_model=AnomalyResponse, tags=["anomalies"])
async def detect_anomalies_v1(req: AnomalyRequest, _user: AnyUser):
    return await detect_anomalies(req, _user)


@app.post("/api/v1/ai/recommendations/purchase", response_model=RecommendationResponse, tags=["recommendations"])
async def recommend_purchase_v1(req: RecommendationRequest, _user: AnyUser):
    return await recommend_purchase(req, _user)


@app.post("/api/ai/index/devis", tags=["admin"], summary="Index recent devis into ai_documents/ai_embeddings")
async def index_devis_endpoint(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))]):
    _schedule(indexer_module.index_devis(200))
    return {"status": "accepted", "message": "Devis indexing started (background)"}


@app.post("/api/ai/index/factures", tags=["admin"], summary="Index recent factures into ai_documents/ai_embeddings")
async def index_factures_endpoint(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))]):
    _schedule(indexer_module.index_factures(200))
    return {"status": "accepted", "message": "Factures indexing started (background)"}


@app.post("/api/ai/index/commandes", tags=["admin"], summary="Index recent commandes into ai_documents/ai_embeddings")
async def index_commandes_endpoint(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))]):
    _schedule(indexer_module.index_commandes(200))
    return {"status": "accepted", "message": "Commandes indexing started (background)"}


@app.post("/api/ai/index/all", tags=["admin"], summary="Index all sources (devis, factures, commandes) in background")
async def index_all_legacy_endpoint(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))]):
    _schedule(indexer_module.index_all(limit=200))
    return {"status": "accepted", "message": "Full indexing started (background)"}


@app.post("/api/v1/ai/train/forecast", tags=["training"], summary="Train or retrain the sales forecast model")
async def train_forecast(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))], x_tenant_id: Annotated[Optional[str], Header()] = None):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    task_id = _create_training_task(tenant_id, "sales_forecast_prophet")
    _schedule(_run_training_task(task_id, prophet_trainer.train_sales_forecast_model(tenant_id)))
    return {"status": "accepted", "message": "Sales forecast training started", "task_id": task_id}


@app.post("/api/v1/ai/train/classifier/quote", tags=["training"], summary="Train or retrain the quote acceptance classifier")
async def train_quote_classifier(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))], x_tenant_id: Annotated[Optional[str], Header()] = None):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    task_id = _create_training_task(tenant_id, "quote_acceptance_xgboost")
    _schedule(_run_training_task(task_id, xgboost_trainer.train_quote_acceptance_model(tenant_id)))
    return {"status": "accepted", "message": "Quote acceptance training started", "task_id": task_id}


@app.post("/api/v1/ai/train/classifier/payment-risk", tags=["training"], summary="Train or retrain the payment risk classifier")
async def train_payment_risk(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))], x_tenant_id: Annotated[Optional[str], Header()] = None):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    task_id = _create_training_task(tenant_id, "payment_risk_xgboost")
    _schedule(_run_training_task(task_id, xgboost_trainer.train_payment_risk_model(tenant_id)))
    return {"status": "accepted", "message": "Payment risk training started", "task_id": task_id}


class TrainAllRequest(BaseModel):
    models: Optional[List[str]] = Field(
        None,
        description="Optional list of model training targets to execute. If omitted, all training pipelines are scheduled.",
        examples=["forecast", "quote", "payment-risk", "stock"],
    )


@app.post("/api/v1/ai/train/anomaly/stock", tags=["training"], summary="Train or retrain the stock anomaly detection model")
async def train_stock_anomaly(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))], x_tenant_id: Annotated[Optional[str], Header()] = None):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    task_id = _create_training_task(tenant_id, "stock_anomaly_iforest")
    _schedule(_run_training_task(task_id, anomaly_trainer.train_stock_anomaly_model(tenant_id)))
    return {"status": "accepted", "message": "Stock anomaly model training started", "task_id": task_id}


@app.post("/api/v1/ai/train/all", tags=["training"], summary="Schedule all available AI model training pipelines")
async def train_all_models(
    req: TrainAllRequest,
    _user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN", "EMPLOYER"))],
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    requested = set((req.models or ["forecast", "quote", "payment-risk", "stock"]).copy())
    jobs: dict[str, str] = {}

    if "forecast" in requested:
        task_id = _create_training_task(tenant_id, "sales_forecast_prophet")
        _schedule(_run_training_task(task_id, prophet_trainer.train_sales_forecast_model(tenant_id)))
        jobs["forecast"] = task_id

    if "quote" in requested:
        task_id = _create_training_task(tenant_id, "quote_acceptance_xgboost")
        _schedule(_run_training_task(task_id, xgboost_trainer.train_quote_acceptance_model(tenant_id)))
        jobs["quote"] = task_id

    if "payment-risk" in requested:
        task_id = _create_training_task(tenant_id, "payment_risk_xgboost")
        _schedule(_run_training_task(task_id, xgboost_trainer.train_payment_risk_model(tenant_id)))
        jobs["payment-risk"] = task_id

    if "stock" in requested:
        task_id = _create_training_task(tenant_id, "stock_anomaly_iforest")
        _schedule(_run_training_task(task_id, anomaly_trainer.train_stock_anomaly_model(tenant_id)))
        jobs["stock"] = task_id

    return {"status": "accepted", "jobs": jobs}


@app.get("/api/v1/ai/train/status/{task_id}", response_model=TrainingTaskResponse, tags=["training"], summary="Check the status of a background training job")
async def training_status(task_id: str, _user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN"))]):
    entry = training_tasks.get(task_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Training task not found")
    return TrainingTaskResponse(**entry)


@app.get("/api/v1/ai/train/tasks", response_model=List[TrainingTaskResponse], tags=["training"], summary="List background training jobs for the current tenant")
async def list_training_tasks(_user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN", "EMPLOYER"))], x_tenant_id: Annotated[Optional[str], Header()] = None):
    tenant_id = resolve_tenant(_user, x_tenant_id)
    tasks = [TrainingTaskResponse(**task) for task in training_tasks.values() if task["tenant_id"] == tenant_id]
    return tasks


@app.get("/api/v1/ai/models", response_model=List[ModelRegistryItem], tags=["models"], summary="List persisted AI models for the current tenant")
async def list_models(_user: AnyUser, x_tenant_id: Annotated[Optional[str], Header()] = None):
    if not TRAINING_FEATURES_AVAILABLE:
        return []
    tenant_id = resolve_tenant(_user, x_tenant_id)
    models = await model_store.list_models(tenant_id)
    return [ModelRegistryItem(**m) for m in models]


@app.get("/api/v1/ai/models/{model_name}/latest", response_model=ModelRegistryItem, tags=["models"], summary="Get the most recent persisted model metadata")
async def get_latest_model(model_name: str, _user: AnyUser, x_tenant_id: Annotated[Optional[str], Header()] = None):
    ensure_training_available()
    tenant_id = resolve_tenant(_user, x_tenant_id)
    model_row = await model_store.get_latest_model(tenant_id, model_name)
    if model_row is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return ModelRegistryItem(**model_row)


@app.post(
    "/api/v1/ai/retrieval",
    response_model=RetrievalResponse,
    tags=["rag"],
    responses={
        500: {"description": "DATABASE_URL not configured"},
        503: {"description": "Embedding or Ollama error"},
    },
)
@app.post(
    "/api/ai/retrieval",
    response_model=RetrievalResponse,
    tags=["rag"],
)
async def retrieval(req: RetrievalRequest, _user: AnyUser, x_tenant_id: Annotated[Optional[str], Header()] = None):
    if not DB_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    resolved_tenant = resolve_tenant(_user, x_tenant_id)

    try:
        query_embedding = await ollama_client.embed(req.query)
    except Exception:
        query_embedding = None

    if not query_embedding:
        query_embedding = embedder_module.deterministic_embedding(req.query)

    vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in query_embedding) + "]"

    sql = (
        "SELECT d.id as document_id, d.title, d.content, "
        f"(e.embedding <-> '{vec_literal}'::vector) as distance "
        "FROM ai_embeddings e JOIN ai_documents d ON d.id = e.document_id "
        "WHERE e.tenant_id = $1 ORDER BY distance ASC LIMIT $2"
    )

    async with db.connection(resolved_tenant) as conn:
        rows = await conn.fetch(sql, resolved_tenant, req.k)
        results = [RetrievalItem(document_id=str(r["document_id"]), title=r["title"], content=r["content"], distance=float(r["distance"])) for r in rows]
        return RetrievalResponse(tenant_id=resolved_tenant, results=results)


@app.post(
    "/api/ai/retrieval_noauth",
    response_model=RetrievalResponse,
    tags=["rag"],
    responses={403: {"description": "DEV_AUTH_BYPASS not enabled"}, 500: {"description": "DATABASE_URL not configured"}},
)
async def retrieval_noauth(req: RetrievalRequest):
    """Development-only retrieval endpoint that bypasses authentication when
    `DEV_AUTH_BYPASS=true` is set. This is intended for local testing only.
    """
    if os.getenv("DEV_AUTH_BYPASS", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="DEV_AUTH_BYPASS not enabled")

    if not DB_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

    vec = embedder_module.deterministic_embedding(req.query)
    vec_literal = "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"

    sql = (
        "SELECT d.id as document_id, d.title, d.content, "
        f"(e.embedding <-> '{vec_literal}'::vector) as distance "
        "FROM ai_embeddings e JOIN ai_documents d ON d.id = e.document_id "
        "WHERE e.tenant_id = $1 ORDER BY distance ASC LIMIT $2"
    )

    async with db.connection(req.tenant_id or "") as conn:
        rows = await conn.fetch(sql, req.tenant_id, req.k)
        results = [RetrievalItem(document_id=str(r["document_id"]), title=r["title"], content=r["content"], distance=float(r["distance"])) for r in rows]
        return RetrievalResponse(tenant_id=req.tenant_id or "", results=results)


# ── Dashboard Insights ────────────────────────────────────────────────────────

class MonthlyRevenue(BaseModel):
    month: str
    revenue: float
    count: int


class StockRiskDistribution(BaseModel):
    critical: int
    high: int
    medium: int
    low: int


class QuoteConversion(BaseModel):
    month: str
    total: int
    accepted: int
    rate: float


class DashboardInsightsResponse(BaseModel):
    tenant_id: str
    monthly_revenue: List[MonthlyRevenue]
    revenue_forecast: List[SalesForecastPoint]
    stock_risk: StockRiskDistribution
    quote_conversion: List[QuoteConversion]
    docs_indexed: int
    upcoming_due_invoices: list[dict] = []


async def _get_monthly_revenue(tenant_id: str, months: int = 12) -> List[MonthlyRevenue]:
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(
            """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                   COALESCE(SUM(total_ttc), 0)::float                   AS revenue,
                   COUNT(*)::int                                         AS count
            FROM devis
            WHERE status = 'ACCEPTE'
              AND created_at >= NOW() - ($1 * INTERVAL '1 month')
              AND total_ttc IS NOT NULL
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
            """,
            months,
        )
    return [MonthlyRevenue(month=r["month"], revenue=r["revenue"], count=r["count"]) for r in rows]


async def _get_upcoming_due_invoices(tenant_id: str, days: int = 7) -> list[dict]:
    try:
        async with db.connection(tenant_id) as conn:
            rows = await conn.fetch(
                """
                SELECT f.reference, c.name AS client_name, f.total_ttc::numeric(14,2) AS montant, f.due_date
                FROM factures f
                LEFT JOIN clients c ON c.id = f.client_id AND c.tenant_id = f.tenant_id
                WHERE f.due_date IS NOT NULL
                  AND f.due_date <= CURRENT_DATE + ($1 * INTERVAL '1 day')
                  AND f.status IN ('EMISE','PARTIELLEMENT_PAYEE')
                  AND f.tenant_id = $2::uuid
                ORDER BY f.due_date ASC
                LIMIT 20
                """,
                days, tenant_id,
            )
        result = []
        from datetime import date
        today = date.today()
        for r in rows:
            due = r['due_date']
            days_to_due = (due.date() - today).days if hasattr(due, 'date') else None
            result.append({
                'reference': r['reference'],
                'client_name': r['client_name'],
                'montant': float(r['montant'] or 0),
                'due_date': r['due_date'].isoformat() if r['due_date'] else None,
                'days_to_due': days_to_due,
            })
        return result
    except Exception:
        return []


async def _get_quote_conversion(tenant_id: str, months: int = 6) -> List[QuoteConversion]:
    async with db.connection(tenant_id) as conn:
        rows = await conn.fetch(
            """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                   COUNT(*)::int                                         AS total,
                   COUNT(*) FILTER (WHERE status = 'ACCEPTE')::int      AS accepted
            FROM devis
            WHERE created_at >= NOW() - ($1 * INTERVAL '1 month')
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
            """,
            months,
        )
    result = []
    for r in rows:
        total = r["total"] or 0
        accepted = r["accepted"] or 0
        rate = round(accepted / total, 3) if total > 0 else 0.0
        result.append(QuoteConversion(month=r["month"], total=total, accepted=accepted, rate=rate))
    return result


async def _get_stock_risk(tenant_id: str) -> StockRiskDistribution:
    try:
        async with db.connection(tenant_id) as conn:
            rows = await conn.fetch(
                """
                SELECT quantity::float                          AS qty,
                       COALESCE(reorder_point, 0)::float       AS reorder
                FROM stock_items
                WHERE product_reference IS NOT NULL
                LIMIT 200
                """
            )
        dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for r in rows:
            qty = float(r["qty"] or 0)
            reorder = float(r["reorder"] or 0)
            if qty == 0:
                dist["critical"] += 1
            elif qty <= reorder:
                dist["high"] += 1
            elif qty <= reorder * 2:
                dist["medium"] += 1
            else:
                dist["low"] += 1
        return StockRiskDistribution(**dist)
    except Exception:
        return StockRiskDistribution(critical=0, high=0, medium=0, low=0)


async def _count_indexed_docs(tenant_id: str) -> int:
    try:
        async with db.connection(tenant_id) as conn:
            return await conn.fetchval("SELECT COUNT(*) FROM ai_documents WHERE tenant_id = $1", tenant_id) or 0
    except Exception:
        return 0


@app.get(
    "/api/v1/ai/dashboard-insights",
    response_model=DashboardInsightsResponse,
    tags=["dashboard"],
    summary="AI-computed insights for the employer dashboard (revenue trend, stock risk, funnel)",
)
async def dashboard_insights(
    _user: AnyUser,
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    tenant_id = resolve_tenant(_user, x_tenant_id)

    monthly_revenue, quote_conversion, stock_risk, docs_indexed = await asyncio.gather(
        _get_monthly_revenue(tenant_id),
        _get_quote_conversion(tenant_id),
        _get_stock_risk(tenant_id),
        _count_indexed_docs(tenant_id),
    )
    upcoming_due_invoices = await _get_upcoming_due_invoices(tenant_id, 7)

    # Try Prophet forecast (requires trained model) — silent fallback to empty
    revenue_forecast: List[SalesForecastPoint] = []
    if TRAINING_FEATURES_AVAILABLE:
        try:
            raw = await model_inference.predict_sales_forecast(tenant_id, 30)
            revenue_forecast = [SalesForecastPoint(date=p["date"], predicted_amount=p["predicted_amount"]) for p in raw]
        except Exception:
            pass

    return DashboardInsightsResponse(
        tenant_id=tenant_id,
        monthly_revenue=monthly_revenue,
        revenue_forecast=revenue_forecast,
        stock_risk=stock_risk,
        quote_conversion=quote_conversion,
        docs_indexed=docs_indexed,
        upcoming_due_invoices=upcoming_due_invoices,
    )


@app.post(
    "/api/v1/ai/index/all",
    tags=["admin"],
    summary="Trigger a full re-indexing of all business data (devis, factures, stock, clients)",
)
async def index_all_endpoint(
    _user: Annotated[dict, Depends(auth.require_roles("SUPER_ADMIN", "EMPLOYER"))],
    x_tenant_id: Annotated[Optional[str], Header()] = None,
):
    tenant_id = resolve_tenant(_user, x_tenant_id)
    _schedule(indexer_module.index_all(tenant_id))
    return {"status": "accepted", "message": "Full re-indexing started in background", "tenant_id": tenant_id}
