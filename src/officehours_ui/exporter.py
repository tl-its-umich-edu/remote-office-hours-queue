import logging
from itertools import groupby

from django.contrib import messages
from django.contrib.admin import ModelAdmin
from django.db.models import F
from django.db.models.query import QuerySet
from django.http import HttpResponse
from django.urls import path
from urllib.parse import quote


# from main.models import Volume, ItemPage

logger = logging.getLogger(__name__)


class ExportFormatter:
    def __init__(self):
        self.meetingData = 'fubar'
        # self.meetingData: QuerySet = (
        #     ItemPage.objects.filter(volume__id=volumeId)
        #     .order_by('item__topic__name', F('page') * 1, 'item__name'))

    def format(self) -> tuple[str, str]:
        """
        Format the meeting data as CSV.
        """
        # TODO: take self.meetingData and format it as CSV
        exportCSV: str = 'col1,col2,col3\n'
        return exportCSV


class ModelAdminExporter(ModelAdmin):
    change_form_template = 'admin/export.html'

    @staticmethod
    def download_export(request):
        (formattedIndex, volumeTitle) = ExportFormatter().format()

        response = HttpResponse(formattedIndex, content_type='text/csv')
        filename = quote(f'export.csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def get_urls(self):
        custom_urls = [
            path('download-export/',
                 self.download_export, name='download-export'),
        ]
        return custom_urls + super().get_urls()
