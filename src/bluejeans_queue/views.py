from django.views.generic import TemplateView


class SpaView(TemplateView):
    template_name = 'bluejeans_queue/spa_index.html'
