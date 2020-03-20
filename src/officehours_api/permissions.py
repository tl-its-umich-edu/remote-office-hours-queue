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
            return request.user.host in obj.hosts.all()
