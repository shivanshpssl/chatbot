# chatbot/services.py
import requests
from django.conf import settings

def get_model_response(prompt, **kwargs):
    url = f"{settings.MODEL_API_CONFIG['BASE_URL']}{settings.MODEL_API_CONFIG['ENDPOINT']}"
    payload = {"prompt": prompt, **kwargs}
    try:
        response = requests.post(
            url,
            json=payload,
            timeout=settings.MODEL_API_CONFIG['TIMEOUT']
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        # log the error properly
        return {"error": str(e)}