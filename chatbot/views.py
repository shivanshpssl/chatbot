# chatbot/views.py
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from .services import get_model_response
from .models import ChatConfig


def home(request):
    return render(request, "index.html")


@csrf_protect
@require_http_methods(["POST"])
def chat_view(request):
    try:
        data = json.loads(request.body)
        user_message = data.get("message", "").strip()
    except json.JSONDecodeError:
        return JsonResponse({"reply": "Invalid request format."}, status=400)

    if not user_message:
        return JsonResponse({"reply": "Message khaali nahi ho sakta."}, status=400)

    result = get_model_response(user_message)
    return JsonResponse(result)


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