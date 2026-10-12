# skillgap_project/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.renderers import JSONRenderer, BrowsableAPIRenderer
from rest_framework.authtoken import views as drf_views
from catalog.views import (
    RegisterView, EmailAuthToken, FacultyEmailAuthToken,
    PasswordResetRequest, PasswordResetConfirm, PasswordChange,
)
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.urls import re_path
from django.views.static import serve

# Wrap the DRF-provided view so the browsable API will show a form:
@api_view(["POST"])
@renderer_classes([JSONRenderer, BrowsableAPIRenderer])
def browsable_obtain_auth_token(request, *args, **kwargs):
    return obtain_auth_token(request, *args, **kwargs)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("catalog.urls")),
    path("api-auth/", include("rest_framework.urls")),    
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/email-token-auth/", EmailAuthToken.as_view(), name="email_token_auth"), 
    path("api/faculty-token-auth/", FacultyEmailAuthToken.as_view(),  name="faculty-token-auth"),
    path("api/password-reset/", PasswordResetRequest.as_view(), name="password-reset"),
    path("api/password-reset/confirm/", PasswordResetConfirm.as_view(), name="password-reset-confirm"),
    path("api/password-change/", PasswordChange.as_view(), name="password-change"),
]

# serve uploaded profile pictures (static() only works with DEBUG, so use the view directly)
if settings.SERVE_MEDIA:
    urlpatterns += [
        re_path(rf"^{settings.MEDIA_URL.strip('/')}/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
    ]

##path("api-token-auth/", browsable_obtain_auth_token),
##path("api-token-auth/", drf_views.obtain_auth_token),
##path('api-token-auth/', csrf_exempt(obtain_auth_token), name='api_token_auth'),
##path('api-token-auth/', EmailAuthToken.as_view(), name='api_token_auth'),