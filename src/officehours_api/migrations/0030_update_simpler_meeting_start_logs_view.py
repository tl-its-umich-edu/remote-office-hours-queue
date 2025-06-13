from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('officehours_api', '0029_update_meeting_start_logs_view'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                DROP VIEW meeting_start_logs;

                CREATE VIEW meeting_start_logs AS
                WITH parsed_response AS (
                    SELECT
                        response::jsonb AS response
                    FROM
                        rest_framework_tracking_apirequestlog
                    WHERE
                        view::text = 'officehours_api.views.MeetingStart'
                        AND (response::jsonb ->> 'created_at') IS NOT NULL
                )
                SELECT DISTINCT
                    (response -> 'queue')::int AS queue_id,
                    q.name AS queue_name,
                    q.status AS queue_status,
                    (response -> 'attendees' -> 0 ->> 'id')::int AS attendee_id,
                    (response -> 'attendees' -> 0 ->> 'user_id')::int AS attendee_user_id,
                    response -> 'attendees' -> 0 ->> 'username' AS attendee_uniqname,
                    response -> 'attendees' -> 0 ->> 'last_name' AS attendee_last_name,
                    response -> 'attendees' -> 0 ->> 'first_name' AS attendee_first_name,
                    (response -> 'assignee' ->> 'id')::int AS host_id,
                    response -> 'assignee' ->> 'username' AS host_uniqname,
                    response -> 'assignee' ->> 'last_name' AS host_last_name,
                    response -> 'assignee' ->> 'first_name' AS host_first_name,
                    response -> 'backend_type' AS meeting_type,
                    response -> 'backend_metadata' ->> 'meeting_url' AS meeting_url,
                    response -> 'agenda' AS agenda,
                    to_timestamp(response::jsonb ->> 'created_at'::text, 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) AS meeting_created_at
                FROM
                    parsed_response
                JOIN officehours_api_queue q ON (response -> 'queue')::int = q.id
            """,
            # NOTE: This SQL reverts the view to its state BEFORE migration 0029.
            reverse_sql="""
                DROP VIEW meeting_start_logs;

                CREATE VIEW meeting_start_logs AS
                WITH parsed_response AS (
                    SELECT
                        response::jsonb AS response
                    FROM
                        rest_framework_tracking_apirequestlog
                    WHERE
                        view::text = 'officehours_api.views.MeetingStart'
                        AND (response::jsonb ->> 'created_at') IS NOT NULL
                )
                SELECT
                    (response -> 'queue')::int AS queue_id,
                    (response -> 'attendees' -> 0 ->> 'id')::int AS attendee_id,
                    (response -> 'attendees' -> 0 ->> 'user_id')::int AS attendee_user_id,
                    response -> 'attendees' -> 0 ->> 'username' AS attendee_uniqname,
                    response -> 'attendees' -> 0 ->> 'last_name' AS attendee_last_name,
                    response -> 'attendees' -> 0 ->> 'first_name' AS attendee_first_name,
                    (response -> 'assignee' ->> 'id')::int AS host_id,
                    response -> 'assignee' ->> 'username' AS host_uniqname,
                    response -> 'assignee' ->> 'last_name' AS host_last_name,
                    response -> 'assignee' ->> 'first_name' AS host_first_name,
                    response -> 'backend_type' AS meeting_type,
                    response -> 'backend_metadata' ->> 'meeting_url' AS meeting_url,
                    response -> 'agenda' AS agenda,
                    to_timestamp(response::jsonb ->> 'created_at'::text, 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) AS meeting_created_at
                FROM
                    parsed_response
            """
        ),
    ]
