# skillgap_project/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer

# Wrap the DRF-provided view so the browsable API will show a form:
@api_view(["POST"])
@renderer_classes([JSONRenderer, BrowsableAPIRenderer])
def browsable_obtain_auth_token(request, *args, **kwargs):
    return obtain_auth_token(request, *args, **kwargs)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("catalog.urls")),
    path("api-auth/", include("rest_framework.urls")),
    # use our wrapped view here instead of the bare obtain_auth_token:
    path("api-token-auth/", browsable_obtain_auth_token),
]
