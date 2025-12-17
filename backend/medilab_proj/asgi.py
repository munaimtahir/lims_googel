"""
ASGI config for medilab_proj project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medilab_proj.settings')

application = get_asgi_application()
