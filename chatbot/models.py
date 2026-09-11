
from django.db import models

class ChatConfig(models.Model):
    bot_messages = models.JSONField(default=list, help_text="List of opening bot messages")
    quick_questions = models.JSONField(default=list, help_text="List of quick reply chips")
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"ChatConfig ({'active' if self.is_active else 'inactive'})"