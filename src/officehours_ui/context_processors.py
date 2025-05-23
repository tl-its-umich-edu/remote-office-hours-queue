from typing import List

from django.conf import settings

from officehours_api import backends
from officehours_api.backends import __all__ as IMPLEMENTED_BACKEND_NAMES
from officehours_api.backends.types import BackendDict

import os


def feedback(request):
    return {'FEEDBACK_EMAIL': getattr(settings, 'FEEDBACK_EMAIL', None)}


def login_url(request):
    return {'LOGIN_URL': getattr(settings, 'LOGIN_URL', None)}


def debug(request):
    return {'DEBUG': settings.DEBUG}


def spa_globals(request):
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    } if request.user.is_authenticated else None

    backend_dicts: List[BackendDict] = [
        getattr(getattr(backends, backend_name), 'Backend').get_public_data()
        for backend_name in IMPLEMENTED_BACKEND_NAMES
    ]

    return {
        'spa_globals': {
            'user': user_data,
            'feedback_email': getattr(settings, 'FEEDBACK_EMAIL', None),
            'debug': settings.DEBUG,
            'ga_tracking_id': settings.GA_TRACKING_ID,
            'login_url': settings.LOGIN_URL,
            'backends': backend_dicts,
            'default_backend': settings.DEFAULT_BACKEND,
            'otp_request_buffer': settings.OTP_REQUEST_BUFFER,
        }
    }

def format_github_url_using_https(github_url: str):
    ssh_base = "git@"
    https_base = "https://"
    # If the URL is formatted for SSH, convert, otherwise, replace .git extension with ""
    if ssh_base == github_url[:len(ssh_base)]:
        github_url = github_url.replace(":", "/").replace(".git", "").replace(ssh_base, https_base)
    else:
        github_url = github_url.replace(".git", "")
    return github_url

def get_git_version_info(request):
    # read git version info from environment variables
    # else, return None
    repo = os.getenv("GIT_REPO", None)
    branch = os.getenv("GIT_BRANCH", None)
    commit = os.getenv("GIT_COMMIT", None)

    if not repo or not branch or not commit:
        return {}

    # Only include the branch name and not remote info
    branch = branch.split('/')[-1]

    commit_abbrev = (
        commit[:settings.SHA_ABBREV_LENGTH]
        if len(commit) > settings.SHA_ABBREV_LENGTH else commit
    )

    return {
        'git_version': {
            "repo": format_github_url_using_https(repo),
            "branch": branch,
            "commit": commit,
            "commit_abbrev": commit_abbrev
        }
    }
