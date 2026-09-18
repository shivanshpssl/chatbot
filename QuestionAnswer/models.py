from django.db import models

# Create your models here.
class PDFUpload(models.Model):
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    num_mcqs = models.IntegerField(default=5)
    num_questions = models.IntegerField(default=5)

    def __str__(self):
        return f"{self.file.name} ({self.uploaded_at.strftime('%Y-%m-%d %H:%M')})"


class GeneratedResult(models.Model):
    pdf = models.ForeignKey(PDFUpload, on_delete=models.CASCADE, related_name='results')
    result_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Result for {self.pdf.file.name}"