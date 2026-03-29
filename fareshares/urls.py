"""
URL configuration for fareshares project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings

from django.contrib.auth import views as auth_views

from django.conf.urls.static import static
# from django.contrib.staticfiles.views import serve

urlpatterns = [
    path('admin/', admin.site.urls),
]

if settings.LIVE:
    urlpatterns += [
        # add login and logout views
        path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
        path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),   

        path('', include('frontend.urls')),
        path('', include('backend.urls')),
    ]
else:
    urlpatterns += [
        # add login and logout views
        path('fs/accounts/login/', auth_views.LoginView.as_view(), name='login'),
        path('fs/accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),   

        path('fs/', include('frontend.urls')),
        path('fs/', include('backend.urls')),
    ]
    
    urlpatterns += static('fs/static/', document_root=settings.BASE_DIR / 'frontend' / 'static')
