from django.contrib.auth.models import User
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.generic import TemplateView
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
            meeting = BluejeansMeeting.objects.create(
                owner=owner, attendee=request.user)
            meeting.save()
        elif 'leave' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=request.user)
            meeting.delete()
        return HttpResponseRedirect('')


class ManageView(TemplateView):
    template_name = 'bluejeans_queue/manage.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['queue'] = BluejeansMeeting.objects.filter(owner=self.request.user).order_by('id')
        context['all_emails'] = ','.join(filter(None, [meeting.attendee.email for meeting in context['queue']]))
        return context

    def post(self, request, *args, **kwargs):
        if request.POST['meeting'].isdigit():
            meeting_id = int(request.POST['meeting'])
            meeting = BluejeansMeeting.objects.get(id=meeting_id)
            if meeting.owner != request.user:
                return HttpResponse('Unauthorized', status=403)
            meeting.delete()
        else:  # Remove All
            meetings = BluejeansMeeting.objects.filter(owner=request.user)
            for m in meetings:
                m.delete()
        return HttpResponseRedirect(reverse('manage'))
