# coding: utf-8
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.conf import settings

from backend.models import Category, Entry


# pricelist
# manage_pricelist
# order_pricelist
# pricelist_csv # maybe no need

menu_items = [
    # {'admin_only': False, 'url': '/finances_log', 'label': 'Finances Log'},
    {'admin_only': False, 'url': f'{settings.ROOT_URL}/pricelist/', 'label': 'Printable Pricelist'},
    {'admin_only': True, 'url': f'{settings.ROOT_URL}/order_pricelist/', 'label': 'Ordering'},
    {'admin_only': True, 'url': f'{settings.ROOT_URL}/manage_pricelist/', 'label': 'Manage Pricelist'},
    {'admin_only': True, 'url': f'{settings.ROOT_URL}/add/', 'label': 'Add Entry'},
    {'admin_only': True, 'url': f'{settings.ROOT_URL}/admin/', 'label': 'Admin'},
    # {'admin_only': True, 'url': f'{settings.ROOT_URL}/batch_add', 'label': 'Batch Add Entries'},
    # {'admin_only': True, 'url': f'{settings.ROOT_URL}/categories', 'label': 'Manage Categories'},
    # {'admin_only': True, 'url': f'{settings.ROOT_URL}/users', 'label': 'Manage Users'},
]


def render_pricelist(request, interactive, ordering):
    nav_url = f'{settings.ROOT_URL}/pricelist/'
    if ordering == True:
        nav_url = f'{settings.ROOT_URL}/order_pricelist/'
    elif interactive == True:
        nav_url = f'{settings.ROOT_URL}/manage_pricelist/'
    if request.user.is_superuser:
        menu_items_filtered = menu_items
    else:
        menu_items_filtered = [item for item in menu_items if not item['admin_only']]
    return render(request, 'pricelist.html', 
                context={ 
                    'title': 'Pricelist',
                    'interactive': interactive,
                    'ordering': ordering,
                    'username': request.user.username,
                    'menu_items': menu_items_filtered,
                    'nav_url': nav_url
                })

@login_required
def pricelist_view(request):
    return render_pricelist(request, interactive=False, ordering=False)

@login_required
def manage_pricelist_view(request):
    if not request.user.is_superuser:
        return redirect('pricelist')
    return render_pricelist(request, interactive=True, ordering=False)

@login_required
def order_pricelist_view(request):
    if not request.user.is_superuser:
        return redirect('pricelist')
    return render_pricelist(request, interactive=False, ordering=True)

# batch_add # maybe no need

# add (entry)
@login_required
def add_entry_view(request):
    if not request.user.is_superuser:
        return redirect('pricelist')
    categories = Category.objects.all().order_by('sort_order')

    return render(request, 'add.html', 
                context={ 
                    'title': 'Add Product',
                    'nav_url': f'{settings.ROOT_URL}/add/',
                    'menu_items': menu_items,
                    'username': request.user.username,
                    'categories': categories
                })

# finances_log

# client_order
@login_required
def finances_log_view(request):
    return render(request, 'finances_log.html', 
                context={ 
                    'title': 'finances_log',
                    'nav_url': '/finances_log',
                    'username': request.user.username,
                    'categories': []
                })

@login_required
def home_view(request):
    # redirect to pricelist
    return redirect('pricelist')