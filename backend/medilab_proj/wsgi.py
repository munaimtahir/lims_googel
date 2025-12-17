"""
WSGI config for medilab_proj project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medilab_proj.settings')

application = get_wsgi_application()
