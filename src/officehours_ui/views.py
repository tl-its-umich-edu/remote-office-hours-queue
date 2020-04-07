from django.views.generic import TemplateView


class SpaView(TemplateView):
    template_name = 'officehours_ui/spa_index.html'
