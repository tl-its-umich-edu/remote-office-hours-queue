# Generated by Django 3.0.6 on 2020-05-14 15:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('officehours_api', '0013_add_queue_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='meeting',
            name='agenda',
            field=models.CharField(blank=True, default='', max_length=100, null=True),
        ),
    ]