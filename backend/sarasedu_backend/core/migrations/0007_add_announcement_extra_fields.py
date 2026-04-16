from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_add_announcement_priority'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='channels',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='announcement',
            name='scheduled_for',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='announcement',
            name='expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='announcement',
            name='is_pinned',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='announcement',
            name='require_ack',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='announcement',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='announcement',
            name='views',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='announcement',
            name='acknowledged',
            field=models.IntegerField(default=0),
        ),
    ]
