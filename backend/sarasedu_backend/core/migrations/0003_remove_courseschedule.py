from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            # MySQL raises 1051 if table doesn't exist; use IF EXISTS
            database_operations=[
                migrations.RunSQL(
                    sql="DROP TABLE IF EXISTS `core_courseschedule`;",
                    reverse_sql=migrations.RunSQL.noop,
                )
            ],
            state_operations=[
                migrations.DeleteModel(
                    name='CourseSchedule',
                )
            ],
        )
    ]
