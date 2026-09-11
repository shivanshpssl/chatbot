from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("api/chat/", views.chat_view, name="chat_view"),
    path("api/chat/config/", views.chat_config, name="chat_config"),
]