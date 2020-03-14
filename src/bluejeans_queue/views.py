from django.contrib.auth.models import User
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views.generic import View, TemplateView
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from .models import BluejeansMeeting


class IndexView(TemplateView):
    template_name = 'bluejeans_queue/index.html'


class MeetingSearchView(View):
    def get(self, request, *args, **kwargs):
        try:
            owner = User.objects.get(username=request.GET['uniqname'].lower())
        except ObjectDoesNotExist:
            return render(
                request, 'bluejeans_queue/search.html',
                context={
                    'search_term': request.GET['uniqname'],
                },
            )

        return HttpResponseRedirect(reverse('meeting', args=[owner.username]))


class MeetingView(TemplateView):
    template_name = 'bluejeans_queue/meeting.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        owner = get_object_or_404(User, username=self.kwargs['owner'])
        try:
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=self.request.user, is_active=True)
        except ObjectDoesNotExist:
            meeting = None
        context['owner'] = owner
        context['queue_length'] = owner.owner.filter(is_active=True).count()
        context['meeting'] = meeting
        return context

    def post(self, request, *args, **kwargs):
        if 'join' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting, created = BluejeansMeeting.objects.get_or_create(
                owner=owner, attendee=request.user, is_active=True)
            meeting.save()
        elif 'leave' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=request.user, is_active=True)
            meeting.deactivate()
        return HttpResponseRedirect(reverse('meeting', args=[self.kwargs['owner']]))


class ManageView(TemplateView):
    template_name = 'bluejeans_queue/manage.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['queue'] = BluejeansMeeting.objects.filter(owner=self.request.user, is_active=True).order_by('id')
        context['all_emails'] = ','.join(filter(None, [meeting.attendee.email for meeting in context['queue']]))
        return context

    def post(self, request, *args, **kwargs):
        if request.POST['meeting'].isdigit():
            meeting_id = int(request.POST['meeting'])
            meeting = BluejeansMeeting.objects.get(id=meeting_id)
            if meeting.owner != request.user:
                return HttpResponse('Unauthorized', status=403)
            meeting.deactivate()
        else:  # Remove All
            meetings = BluejeansMeeting.objects.filter(owner=request.user, is_active=True)
            for m in meetings:
                m.deactivate()
        return HttpResponseRedirect(reverse('manage'))
