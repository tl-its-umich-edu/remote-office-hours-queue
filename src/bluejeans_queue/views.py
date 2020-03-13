from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = 'bluejeans_queue/index.html'


class QueueView(TemplateView):
    template_name = 'bluejeans_queue/queue.html'
