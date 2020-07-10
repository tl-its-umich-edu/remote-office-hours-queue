from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('officehours_api', '0014_meeting_assignee'),
    ]

    operations = [
        migrations.AddField(
            model_name='meeting',
            name='agenda',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
