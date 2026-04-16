from rest_framework.throttling import SimpleRateThrottle


class AIChatRateThrottle(SimpleRateThrottle):
    scope = 'ai_chat'
    
    def get_cache_key(self, request, view):
        """Return a unique cache key for throttling.

        Use authenticated user's id when available, otherwise fallback to IP.
        """
        if request.user and request.user.is_authenticated:
            ident = getattr(request.user, 'pk', None) or getattr(request.user, 'id', None)
            if ident is None:
                ident = self.get_ident(request)
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }
