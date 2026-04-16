from django.core.management import call_command
from django.db import connection
from django.test import TestCase


class MigrationsTest(TestCase):
    def test_migrations_apply_and_core_tables_exist(self):
        call_command('migrate', verbosity=0)
        tables = connection.introspection.table_names()
        self.assertIn('core_user', tables)
        self.assertIn('core_course', tables)
        self.assertIn('core_assignment', tables)
