from django.urls import path
from django.http import HttpResponse
from . import views

urlpatterns = [
    path('', views.generate_questions, name='generate_questions'),
    path("favicon.ico", lambda request: HttpResponse(status=204)),
]