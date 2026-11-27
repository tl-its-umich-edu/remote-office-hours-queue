from django.conf import settings
import logging

class CustomLogFormatter(logging.Formatter):
    # Define a custom log format that matches the Gunicorn access log format
    # uvicorn access log args: (client_addr, method, path, http_version, status_code)
    log_format = '%(asctime)s [%(status)s] [%(client)s] "%(request)s" %(msecs)dms'

    def __init__(self, fmt=None, *args, **kwargs):
        fmt = fmt or self.log_format
        super().__init__(fmt, *args, **kwargs)

    def format(self, record):
        if len(getattr(record, 'args', [])) == 5:
            # HTTP request from uvicorn
            client_addr, method, path, http_version, status = record.args
            record.client = client_addr
            record.request = f"{method} {path} HTTP/{http_version}"
            record.status = status
        else:
            # Regular Python log
            record.client = '-'
            record.request = record.msg
            record.status = record.levelname
        return super().format(record)