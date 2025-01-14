import logging

class CustomLogFormatter(logging.Formatter):
    def format(self, record):
        record.http_status = getattr(record, 'http_status', '-')
        record.x_forwarded_for = getattr(record, 'x_forwarded_for', '-')
        record.request_line = getattr(record, 'request_line', '-')
        record.response_time = getattr(record, 'response_time', '-')
        return super().format(record)

    log_format = '%(asctime)s [HTTP:%(http_status)s] [%(x_forwarded_for)s] "%(request_line)s" %(response_time)s'

def setup_logger():
    log_format = '%(asctime)s [HTTP:%(http_status)s] [%(x_forwarded_for)s] "%(request_line)s" %(response_time)s'
    logger = logging.getLogger('custom_logger')
    logger.setLevel(logging.DEBUG)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(CustomLogFormatter(log_format))
    logger.addHandler(console_handler)

    return logger