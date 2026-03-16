# coding:utf-8
from django.urls import path, re_path
from backend.views import all_entries_view, matching_products_view, entry_view

urlpatterns = [
    path('matching_products/', matching_products_view, name='matching_products'),
    path('entries/<int:entry_id>/', entry_view, name='entry'),
    path('entries/', all_entries_view, name='all_entries'),
]