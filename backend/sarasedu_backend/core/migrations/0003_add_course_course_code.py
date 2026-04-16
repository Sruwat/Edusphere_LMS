# Generated manually to add course_code field to Course model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='course_code',
            field=models.CharField(blank=True, max_length=20, null=True, unique=True),
        ),
    ]
