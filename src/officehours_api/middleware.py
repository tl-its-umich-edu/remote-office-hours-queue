import logging
import re
from django.http import HttpResponseNotFound
from django.utils.deprecation import MiddlewareMixin
from django.middleware.common import BrokenLinkEmailsMiddleware

logger = logging.getLogger(__name__)

class FilteredBrokenLinkEmailsMiddleware(BrokenLinkEmailsMiddleware, MiddlewareMixin):
    ALLOWABLE_404_URLS = [
        # Add more regular expressions for allowable URLs as needed.
        re.compile(r'^/api/queues/.*$'),
        re.compile(r'^/api/meetings/.*$'),
    ]
    logger.info(f"inside FilteredBrokenLinkEmailsMiddleware")
    def process_response(self, request, response):
        # Only process 404 responses.
        if isinstance(response, HttpResponseNotFound):
            # Check if the requested URL path matches any allowable URL.
            if any(pattern.match(request.path) for pattern in self.ALLOWABLE_404_URLS):
                logger.info("Super class BrokenLinkEmailsMiddleware handling 404 broken link: {request.path}")
                # If it does, call the superclass method to process this response.
                return super().process_response(request, response)
            else:
                # If the URL path is ignored, log the event.
                logger.info(f'Ignored 404 broken link: {request.path}')

        # For 404 responses of other paths or non-404 responses, no further action is taken.
        return response