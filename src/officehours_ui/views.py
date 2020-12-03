from django.views.generic import TemplateView
from django.conf import settings
from django.http import Http404
from django.urls import reverse

from officehours_api import backends

BACKEND_CLASSES = {
    backend_name: getattr(getattr(backends, backend_name), 'Backend')
    for backend_name in settings.ENABLED_BACKENDS
}


class SpaView(TemplateView):
    template_name = 'officehours_ui/spa_index.html'


class AuthPromptView(TemplateView):
    template_name = 'officehours_ui/auth_prompt.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        backend_name = kwargs['backend_name']
        state = self.request.GET.get('state', '/')
        try:
            redirect_uri = self.request.build_absolute_uri(
                reverse('auth_callback', kwargs={'backend_name': backend_name})
            )
            context['auth_url'] = BACKEND_CLASSES[backend_name].get_auth_url(redirect_uri, state)
        except KeyError:
            raise Http404(f"Backend {backend_name} does not exist.")
        except AttributeError:
            raise Http404(f"Backend {backend_name} does not use three-legged OAuth2.")
        context['backend_name'] = backend_name
        return context


def auth_callback_view(request, backend_name: str):
    try:
        auth_callback = BACKEND_CLASSES[backend_name].auth_callback
    except KeyError:
        raise Http404(f"Backend {backend_name} does not exist.")
    except AttributeError:
        raise Http404(f"Backend {backend_name} does not use three-legged OAuth2.")
    return auth_callback(request)
