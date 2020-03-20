from datetime import datetime
import time

from django.contrib.auth.models import User
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.views.generic import View, TemplateView
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models.functions import TruncDate, TruncDay
from django.utils.timezone import make_aware

from .models import BluejeansMeeting


@staff_member_required
def usage(request):
    users = User.objects.annotate(
        date_joined_date=TruncDate('date_joined'),
        date_joined_day=TruncDay('date_joined'),
        ).order_by('date_joined')

    dates = (make_aware(datetime.fromtimestamp(d)).date() for d in range(
        int(users.first().date_joined_day.timestamp()),
        int(time.time()),
        60 * 60 * 24
    ))

    usage = ((d, users.filter(date_joined_date=d).count()) for d in dates)

    return HttpResponse(
        'date,new_users,\n' +
        '\n'.join(f'{h},{c},{" " * (5 - len(str(c)))}|{"*" * int(c / 10)}'
                  for h, c in usage),
        content_type='text/plain')


class IndexView(TemplateView):
    template_name = 'bluejeans_queue/index.html'


class MeetingSearchView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        username = request.GET['uniqname'].lower().strip()
        try:
            owner = User.objects.get(username=username)
        except ObjectDoesNotExist:
            return render(
                request, 'bluejeans_queue/search.html',
                context={
                    'search_term': request.GET['uniqname'],
                    'username': username,
                },
                status=404,
            )

        return HttpResponseRedirect(reverse('meeting', args=[owner.username]))


class MeetingView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):

        try:
            owner = User.objects.get(username=self.kwargs['owner'])
        except ObjectDoesNotExist:
            return render(
                request, 'bluejeans_queue/search.html',
                context={
                    'username': self.kwargs['owner'],
                },
                status=404,
            )

        try:
            meeting = BluejeansMeeting.objects.get(
                owner=owner, attendee=self.request.user, is_active=True)
        except ObjectDoesNotExist:
            meeting = None
        context = {}
        context['owner'] = owner
        queue = owner.owner.filter(is_active=True).order_by('id')
        i = 0
        for i in range(0, len(queue)):
            if queue[i].attendee == self.request.user:
                break

        context['queued_ahead'] = i
        context['queue_length'] = queue.count()
        context['meeting'] = meeting
        return render(
            request, 'bluejeans_queue/meeting.html',
            context=context,
        )

    def post(self, request, *args, **kwargs):
        if 'join' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            meeting, created = BluejeansMeeting.objects.get_or_create(
                owner=owner, attendee=request.user, is_active=True)
            meeting.save()
        elif 'leave' in request.POST['action']:
            owner = get_object_or_404(User, username=self.kwargs['owner'])
            try:
                meeting = BluejeansMeeting.objects.get(
                    owner=owner, attendee=request.user, is_active=True)
                meeting.deactivate()
            except ObjectDoesNotExist:
                pass
        return HttpResponseRedirect(reverse('meeting', args=[self.kwargs['owner']]))


class ManageView(LoginRequiredMixin, TemplateView):
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
