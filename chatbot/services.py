# chatbot/services.py
import requests
import logging
from django.conf import settings
from langdetect import detect, DetectorFactory, LangDetectException

DetectorFactory.seed = 0  # consistent results
logger = logging.getLogger(__name__)


def detect_language(text):
    """
    Detects the user's language.
    langdetect can sometimes classify Hinglish (Hindi written in Roman script)
    as either 'en' or 'hi', so we also run an extra Hindi-word check.
    """
    hinglish_markers = [
        "hai", "kya", "kaise", "kyun", "nahi", "mujhe", "aap", "tum",
        "kar", "karo", "raha", "rahi", "rahe", "acha", "theek", "bhi",
        "sikhu", "batao", "chahiye", "haan", "meri", "mera", "tumhara"
    ]
    lower_text = text.lower()
    hinglish_hits = sum(1 for word in hinglish_markers if f" {word} " in f" {lower_text} ")

    try:
        detected = detect(text)
    except LangDetectException:
        detected = "en"

    # If Devanagari script is present (Hindi written natively)
    if any('\u0900' <= ch <= '\u097F' for ch in text):
        return "hindi_devanagari"

    # If enough Roman-script Hindi words are present -> Hinglish
    if hinglish_hits >= 1:
        return "hinglish"

    # If langdetect itself flagged it as Hindi
    if detected == "hi":
        return "hinglish"

    return "english"


LANGUAGE_INSTRUCTIONS = {
    "hindi_devanagari": "Reply ONLY in Hindi using Devanagari script.",
    "hinglish": "Reply ONLY in Hinglish (Hindi written in Roman/English script). Do NOT use Devanagari script, and do NOT translate to English.",
    "english": "Reply ONLY in English.",
}


def get_model_response(prompt,server, **kwargs):
    config = settings.MODEL_API_CONFIG
    url = config["ENDPOINT_URL"]

    headers = {"Content-Type": "application/json"}
    if config.get("API_KEY"):
        headers["Authorization"] = f"Bearer {config['API_KEY']}"

    lang = detect_language(prompt)
    lang_instruction = LANGUAGE_INSTRUCTIONS[lang]

    system_prompt = (
        "You are a helpful chatbot named Prakhar. "
        f"IMPORTANT LANGUAGE RULE: {lang_instruction} "
        "Never translate — always reply naturally in the same language the user used. "
        "Keep responses short, clear, and friendly."
    )

    payload = {
        "model": config["MODEL_NAME"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "server": server,"content": prompt}
        ],
        "temperature": 0.5,
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=config["TIMEOUT"])
        response.raise_for_status()
        data = response.json()
        reply_text = data["choices"][0]["message"]["content"]
        return {"reply": reply_text}
    except requests.exceptions.Timeout:
        logger.error("Model API timeout: %s", url)
        return {"reply": "The response is taking too long. Please try again."}
    except requests.exceptions.RequestException as e:
        logger.error("Model API error: %s", str(e))
        return {"reply": "Unable to connect to the model server."}
    except (KeyError, IndexError) as e:
        logger.error("Unexpected response format: %s | data: %s", str(e), data)
        return {"reply": "Sorry, the model returned the response in an unexpected format."}