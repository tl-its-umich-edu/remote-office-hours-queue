from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        # ('rest_framework_tracking', '0007_merge_20180419_1646'),  # still commented out
        ('officehours_api', '0024_auto_20240323_1210'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE VIEW meeting_start_logs AS
                SELECT 'placeholder' AS dummy_column;
            """,
            reverse_sql="""
                DROP VIEW IF EXISTS meeting_start_logs;
            """
        ),
    ]
