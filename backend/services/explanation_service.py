"""
MindMitra - Explainable AI Service for Caregivers
3-Tier Architecture:
1. Gemini (Primary)
2. Nemotron 3 Ultra via OpenRouter (Fallback)
3. Deterministic Template (Final Fallback)

Strictly enforces medical guardrails: never claims dementia, Alzheimer's, or medical decline.
Always appends: 'Prototype behavioral insight — not a medical diagnosis.'
"""

import os
import json
import aiohttp
from typing import Dict, Any
from dotenv import load_dotenv
from .config import MEDICAL_DISCLAIMER

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-70b-instruct:free")

SYSTEM_PROMPT = """You are a supportive, calm healthcare communication assistant for MindMitra.
Your task is to explain structured cognitive behavioral observations to caregivers in simple, respectful, and transparent language.

STRICT SAFETY RULES:
1. NEVER diagnose, infer, or mention dementia, Alzheimer's, or clinical cognitive decline.
2. NEVER invent numbers or dates. Use ONLY the exact numbers provided in the structured evidence.
3. NEVER express medical certainty. Describe changes strictly as 'behavioral performance changes from recent baseline'.
4. Highlight why the observation occurred (e.g. accuracy delta, latency increase, error count).
5. Always advise continuing observations and discussing persistent concerns with a qualified healthcare professional.
6. Keep explanation under 130 words.
7. Always end with: 'Prototype behavioral insight — not a medical diagnosis.'"""

def sanitize_explanation(text: str) -> str:
    """Removes prohibited diagnostic phrasing and ensures disclaimer presence."""
    forbidden = ["dementia", "alzheimer", "cognitive decline", "deterioration", "brain disease"]
    sanitized = text
    for word in forbidden:
        sanitized = sanitized.replace(word, "behavioral variation")
        sanitized = sanitized.replace(word.capitalize(), "Behavioral variation")

    if MEDICAL_DISCLAIMER not in sanitized:
        sanitized = f"{sanitized.rstrip()} {MEDICAL_DISCLAIMER}"
    return sanitized

def generate_deterministic_explanation(trend_data: Dict[str, Any]) -> str:
    """Deterministic, guaranteed fallback explanation layer."""
    domain_label = trend_data.get("domain_label", "Activity")
    status = trend_data.get("status", "stable")
    baseline = trend_data.get("baseline") or {}
    current = trend_data.get("current") or {}
    changes = trend_data.get("changes") or {}

    base_acc_val = baseline.get("accuracy", 0.8) if isinstance(baseline, dict) else (baseline if isinstance(baseline, (int, float)) else 0.8)
    curr_acc_val = current.get("accuracy", 0.8) if isinstance(current, dict) else (current if isinstance(current, (int, float)) else 0.8)
    lat_val = changes.get("latency_percent_change", 0) if isinstance(changes, dict) else 0

    base_acc = round(float(base_acc_val) * 100)
    curr_acc = round(float(curr_acc_val) * 100)
    latency_pct = round(float(lat_val) * 100)
    
    if status == "recent_change":
        evidence = f"Across recent sessions, performance dropped from a baseline median of {base_acc}% to {curr_acc}%"
        if latency_pct > 10:
            evidence += f", with a {latency_pct}% increase in average response time"
        evidence += "."
        return (
            f"Recent performance in {domain_label} differs from the user's established baseline. "
            f"{evidence} Difficulty level was maintained. This indicates a change in recent game performance and does not determine a clinical cause. "
            f"Continue observing future sessions and discuss persistent patterns with a healthcare professional. {MEDICAL_DISCLAIMER}"
        )
    elif status == "improving":
        return (
            f"Performance in {domain_label} shows positive progression, increasing from baseline {base_acc}% to {curr_acc}%. "
            f"Recall was steady and response times remained prompt. {MEDICAL_DISCLAIMER}"
        )
    elif status == "variable":
        return (
            f"Performance in {domain_label} shows normal session-to-session variation around the {base_acc}% baseline. "
            f"No persistent directional change is observed. {MEDICAL_DISCLAIMER}"
        )
    elif status == "insufficient_history" or status == "observation_available":
        return (
            f"Personal baseline for {domain_label} is currently being calibrated. "
            f"Additional regular sessions will provide longitudinal trend clarity. {MEDICAL_DISCLAIMER}"
        )
    else:
        return (
            f"Recent performance in {domain_label} ({curr_acc}%) is consistent with the established baseline of {base_acc}%. "
            f"Response speed and accuracy remain well-aligned with personal historical ranges. {MEDICAL_DISCLAIMER}"
        )

async def explain_with_gemini(trend_data: Dict[str, Any]) -> str:
    """Calls Gemini API (Primary Model)."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{
            "parts": [{
                "text": f"Generate a caregiver explanation based ONLY on this structured observation:\n{json.dumps(trend_data, indent=2)}"
            }]
        }],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200}
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status == 200:
                data = await resp.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                return sanitize_explanation(raw_text)
            else:
                raise RuntimeError(f"Gemini API returned status {resp.status}")

async def explain_with_nemotron(trend_data: Dict[str, Any]) -> str:
    """Calls Nemotron 3 Ultra via OpenRouter (Secondary Fallback)."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not configured")

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mindmitra.local",
        "X-Title": "MindMitra Explainable AI"
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Explain this cognitive behavioral observation for a caregiver:\n{json.dumps(trend_data, indent=2)}"}
        ],
        "temperature": 0.2,
        "max_tokens": 200
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status == 200:
                data = await resp.json()
                raw_text = data["choices"][0]["message"]["content"]
                return sanitize_explanation(raw_text)
            else:
                raise RuntimeError(f"OpenRouter Nemotron API returned status {resp.status}")

async def generate_caregiver_insight(trend_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes 3-tier explanation cascade:
    1. If insufficient history -> deterministic baseline rule immediately (no LLM call)
    2. Gemini (Primary)
    3. Nemotron (Fallback)
    4. Deterministic template (Final Fallback)
    """
    status = trend_data.get("status", "stable")
    sessions_used = trend_data.get("sessions_used", 0)
    total_recorded = trend_data.get("total_recorded", 0)

    if status in ["insufficient_history", "no_history"] or (sessions_used < 3 and total_recorded < 3):
        explanation = generate_deterministic_explanation(trend_data)
        return {
            "explanation": explanation,
            "provider": "deterministic_baseline_engine",
            "tier": 3,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

    # 1. Try Gemini
    try:
        explanation = await explain_with_gemini(trend_data)
        return {
            "explanation": explanation,
            "provider": "gemini-2.0-flash",
            "tier": 1,
            "disclaimer": MEDICAL_DISCLAIMER,
        }
    except Exception as gemini_err:
        pass

    # 2. Try Nemotron via OpenRouter
    try:
        explanation = await explain_with_nemotron(trend_data)
        return {
            "explanation": explanation,
            "provider": "nemotron-via-openrouter",
            "tier": 2,
            "disclaimer": MEDICAL_DISCLAIMER,
        }
    except Exception as nemotron_err:
        pass

    # 3. Deterministic Template Fallback
    explanation = generate_deterministic_explanation(trend_data)
    return {
        "explanation": explanation,
        "provider": "deterministic_template",
        "tier": 3,
        "disclaimer": MEDICAL_DISCLAIMER,
    }
