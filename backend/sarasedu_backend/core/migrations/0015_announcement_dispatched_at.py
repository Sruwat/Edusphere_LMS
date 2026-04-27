from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_merge_20251219_1337'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='dispatched_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
