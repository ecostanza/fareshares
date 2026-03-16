# coding:utf-8
from django.urls import path, re_path
from frontend.views import (pricelist_view, manage_pricelist_view, 
                            order_pricelist_view, add_entry_view, 
                            finances_log_view, home_view
                            )

urlpatterns = [
    path('pricelist/', pricelist_view, name='pricelist'),
    path('manage_pricelist/', manage_pricelist_view, name='manage_pricelist'),
    path('order_pricelist/', order_pricelist_view, name='order_pricelist'),
    path('add/', add_entry_view, name='add_entry'),
    path('finances_log/', finances_log_view, name='finances_log'),
    path('', home_view, name='home'),
]
