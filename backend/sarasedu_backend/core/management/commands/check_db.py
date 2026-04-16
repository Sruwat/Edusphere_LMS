from django.core.management.base import BaseCommand
from django.db import connections


class Command(BaseCommand):
    help = 'Check database connectivity and run a simple test query.'

    def handle(self, *args, **options):
        self.stdout.write('Checking default database connection...')
        conn = connections['default']
        try:
            with conn.cursor() as cursor:
                cursor.execute('SELECT 1')
                row = cursor.fetchone()
                if row and row[0] == 1:
                    self.stdout.write(self.style.SUCCESS('Database connection OK (SELECT 1 returned 1).'))
                else:
                    self.stdout.write(self.style.WARNING('Database connected but SELECT 1 returned unexpected result: %r' % (row,)))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Database connectivity failed: {e}'))
            raise
