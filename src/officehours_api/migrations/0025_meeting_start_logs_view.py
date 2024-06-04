from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('rest_framework_tracking', '0007_merge_20180419_1646'),
        ('officehours_api', '0024_auto_20240323_1210'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE VIEW meeting_start_logs AS
                SELECT rfta.id,
                    (rfta.response::jsonb ->> 'queue')::int AS queue, 
                    to_timestamp(rfta.response::jsonb ->> 'created_at'::text, 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) AS created_at,
                    rfta.response::jsonb -> 'attendees'::text AS attendees,
                    rfta.response::jsonb -> 'assignee'::text AS assignee,
                    rfta.response::jsonb -> 'backend_metadata' AS backend_metadata,
                    (rfta.response::jsonb ->> 'backend_type')::text AS backend_type,
                    (rfta.response::jsonb ->> 'agenda')::text AS agenda,
                    rfta.view
                FROM rest_framework_tracking_apirequestlog rfta
                WHERE rfta.view::text = 'officehours_api.views.MeetingStart'::text
                    AND (rfta.response::jsonb ->> 'created_at'::text) IS NOT NULL
                ORDER BY (to_timestamp(rfta.response::jsonb ->> 'created_at'::text, 'YYYY-MM-DD"T"HH24:MI:SS.US'::text)) DESC
            """,
            reverse_sql="""
                DROP VIEW IF EXISTS meeting_start_logs;
            """
        ),
    ]