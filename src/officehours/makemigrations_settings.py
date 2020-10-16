from officehours.settings import *

from officehours_api.backends.bluejeans import BluejeansBackend
from officehours_api.backends.inperson import InPersonBackend

BACKENDS = {
    'inperson': InPersonBackend(),
    'bluejeans': BluejeansBackend('id', 'secret'),
}
