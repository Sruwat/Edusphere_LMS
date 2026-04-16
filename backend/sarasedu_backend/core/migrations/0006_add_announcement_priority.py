from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_remove_liveclass_created_by_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='priority',
            field=models.CharField(choices=[('normal', 'Normal'), ('important', 'Important'), ('urgent', 'Urgent')], default='normal', max_length=20),
        ),
    ]
