"""AI generation provider abstraction (§137/§138, docs/ROADMAP.md Phase 7).
Swap `MockAiProvider` for a real LLM provider (e.g. a chat-completions API)
once credentials exist — nothing outside `get_ai_provider` should need to
change. The provider is deliberately pure text-in/text-out: no tool-calling,
no function-calling, no ability to take actions or read anything beyond what
the caller puts in `system_prompt`/`messages` — containment against prompt
injection from document-derived content (see app/core/ai_prompt_safety.py).
"""

import logging
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("healthy.ai")


class AiProvider(Protocol):
    async def generate(self, *, system_prompt: str, messages: list[dict[str, str]]) -> str: ...


class MockAiProvider:
    """⚠️ MOCK — no real language model is called (AI_PROVIDER=mock, Phase 7).
    Returns a deterministic, clearly-labeled template built from the caller's
    own last message, so callers/tests can see exactly what was sent without a
    real model attached — same honesty bar as MockOtpProvider. This is the
    only AI provider implemented so far; it must never be selected when
    `settings.environment == "production"`.
    """

    async def generate(self, *, system_prompt: str, messages: list[dict[str, str]]) -> str:
        logger.info("MOCK AI generate() called — no real model is connected")
        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        return (
            "[Mock AI response — AI_PROVIDER=mock, no real language model is connected in "
            "this environment. This is a deterministic placeholder, not real medical "
            "analysis.]\n\nHere is what was asked:\n" + last_user.strip()
        )


def get_ai_provider() -> AiProvider:
    settings = get_settings()
    if settings.ai_provider == "mock":
        if settings.is_production:
            raise RuntimeError("AI_PROVIDER=mock must not be used in production.")
        return MockAiProvider()
    raise NotImplementedError(f"AI provider '{settings.ai_provider}' is not implemented.")
