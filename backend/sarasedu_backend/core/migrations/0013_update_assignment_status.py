# Generated migration for updating Assignment status field
# Allow both 'active' and 'overdue' statuses to be stored in database
# Use management command to automatically update status when assignments become overdue

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_courserating'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assignment',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('overdue', 'Overdue')],
                default='active',
                max_length=20,
                help_text="Status is automatically updated to 'overdue' when due_date passes. Use management command: python manage.py update_assignment_statuses"
            ),
        ),
        # Data migration: Update any existing 'draft' or 'archived' assignments to 'active'
        migrations.RunPython(
            code=lambda apps, schema_editor: (
                apps.get_model('core', 'Assignment')
                .objects.filter(status__in=['draft', 'archived'])
                .update(status='active')
            ),
            reverse_code=migrations.RunPython.noop,
        ),
    ]
