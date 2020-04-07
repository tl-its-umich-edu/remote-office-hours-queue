from rest_framework import permissions


class IsCurrentUser(permissions.BasePermission):
    '''
    Custom permission to only allow users to view themselves.
    '''

    def has_object_permission(self, request, view, obj):
        return obj == request.user


class IsHostOrReadOnly(permissions.BasePermission):
    '''
    Custom permission to only allow hosts to edit queues
    '''

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        else:
            return request.user in obj.hosts.all()


class IsHostOrAttendee(permissions.BasePermission):
    '''
    Custom permission to only allow meeting owners or
    hosts of the meeting's queue to edit the meeting.
    '''

    def has_object_permission(self, request, view, obj):
        for attendee in obj.attendee_set.all():
            if request.user == attendee.user:
                return True

        if hasattr(obj, 'queue') and hasattr(obj.queue, 'hosts'):
            is_host = request.user in obj.queue.hosts.all()
        else:
            is_host = False

        return is_host
