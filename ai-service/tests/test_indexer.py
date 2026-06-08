from app.indexer import deterministic_embedding, EMBED_DIM
import math


def test_deterministic_embedding_properties():
    v1 = deterministic_embedding("hello world")
    v2 = deterministic_embedding("hello world")
    assert isinstance(v1, list)
    assert len(v1) == EMBED_DIM
    # Deterministic: same input yields same vector
    assert v1 == v2
    # Check normalization (unit vector)
    norm = math.sqrt(sum(x * x for x in v1))
    assert abs(norm - 1.0) < 1e-6
