from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView, DetailView
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from .models import BluejeansMeeting


class IndexView(TemplateView):
    template_name = 'bluejeans_queue/index.html'


class MeetingView(TemplateView):
    template_name = 'bluejeans_queue/meeting.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        owner = get_object_or_404(User, username=self.kwargs['owner'])
        try:
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=self.request.user)
        except ObjectDoesNotExist:
            meeting = None
        context['owner'] = owner
        context['meeting'] = meeting
        return context

    def post(self, request, *args, **kwargs):
        if 'join' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting, created = BluejeansMeeting.objects.get_or_create(
                owner=owner, attendee=request.user)
            meeting.save()
        elif 'leave' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=request.user)
            meeting.delete()
        return HttpResponseRedirect(reverse('meeting', args=[self.kwargs['owner']]))
