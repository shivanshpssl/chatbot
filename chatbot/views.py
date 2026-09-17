# chatbot/views.py
import hmac
import json
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .services import get_model_response
from .models import ChatConfig

logger = logging.getLogger(__name__)


def home(request):
    return render(request, "index.html")


@csrf_exempt
@require_http_methods(["POST"])
def chat_view(request):
    # ===== STEP 1: TOKEN CHECK (sirf .env wale CHATBOT_API_TOKEN se match) =====
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip()
    print("=" * 50)
    print("Authorization header received:", repr(auth_header))
    print("Extracted token:", repr(token))
    print("Expected token:", repr(settings.CHATBOT_API_TOKEN))
    print("Match?", token == settings.CHATBOT_API_TOKEN)
    print("=" * 50)

    if token != settings.CHATBOT_API_TOKEN:
        logger.warning("Chat request rejected: invalid or missing token")
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=401)
    # ===== TOKEN VALID — yahan se aage ka code chalega =====

    # ===== STEP 2: Body parse karo =====
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Invalid request format."}, status=400)

    user_message = (data.get("message") or "").strip()
    user_id = data.get("user_id")
    user_email = data.get("user_email")
    user_role = data.get("user_role")

    if not user_message:
        return JsonResponse({"success": False, "message": "Message khaali nahi ho sakta."}, status=400)

    # ===== STEP 3: Model se response lo =====
    result = get_model_response(
        user_message,
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
    )

    return JsonResponse({"success": True, **result})

@require_http_methods(["GET"])
def chat_config(request):
    config = ChatConfig.objects.filter(is_active=True).first()

    if not config:
        return JsonResponse({
            "bot_messages": ["Namaste! Main aapki kaise madad kar sakta hoon?"],
            "quick_questions": [],
            "contact_phone": "",
            "contact_email": "",
        })

    return JsonResponse({
        "bot_messages": config.bot_messages,
        "quick_questions": config.quick_questions,
        "contact_phone": config.contact_phone or "",
        "contact_email": config.contact_email or "",
    })