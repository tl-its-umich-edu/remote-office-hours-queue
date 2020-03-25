from django.conf import settings


def feedback(request):
    return {'FEEDBACK_EMAIL': getattr(settings, 'FEEDBACK_EMAIL', None)}


def spa_globals(request):
    user_data = {
        'username': request.user.username,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    } if request.user.is_authenticated else None
    return {
        'spa_globals': {
            'user': user_data,
            'feedback_email': getattr(settings, 'FEEDBACK_EMAIL', None),
        }
    }
