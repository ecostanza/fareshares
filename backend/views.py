# coding: utf-8
from decimal import Decimal

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from backend.models import Entry, Category
from django.contrib.auth.models import User
from django.db import models
from django.db.models.fields.files import ImageFieldFile
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import datetime

# these datetime formats are compatible with Javascript
LOCALE_DATE_FMT = "%Y-%m-%d %H:%M:%S"
DATE_FMTS = (LOCALE_DATE_FMT, '%Y-%m-%dT%H:%M:%S.%fZ',
             '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
             '%a %b %d %Y %H:%M:%S')

def to_dict(instance, transverse=False):
    result = {}
    try:
        hidden_fields = instance.hidden_fields
    except:
        hidden_fields = []
    for field in instance._meta.fields:
        name = field.name
        value = getattr(instance, name)
        if name not in hidden_fields and name[0] != '_':
            if issubclass(value.__class__, User):
                result[name] = str(value)
            elif issubclass(value.__class__, models.Model):
                if transverse:
                    try:
                        result[name] = to_dict(value, transverse)
                    except:
                        result[name] = value.pk
                else:
                    result[name] = value.pk
            elif issubclass(value.__class__, datetime):
                result[name] = value.strftime(LOCALE_DATE_FMT)
                # result[name] = int(mktime(value.timetuple()))

            elif issubclass(value.__class__, Decimal):
                result[name] = float(value)
                # result[name] = int(mktime(value.timetuple()))
            elif issubclass(value.__class__, ImageFieldFile):
                if value:
                    # get relative URL
                    path = value.path
                    # path = path[path.index('uploads'):]
                    # path = path.replace('uploads', 'media')
                    result[name] = path
                    # result[name] = value.get_filename()
            else:
                result[name] = value

    # hack for properties
    extra_fields = [name for name in dir(type(instance)) if isinstance(getattr(type(instance), name), property)]

    for name in extra_fields:
        value = getattr(instance, name)
        if name not in hidden_fields and name[0] != '_':
            if issubclass(value.__class__, User):
                result[name] = str(value)
#            elif issubclass(value.__class__, models.Model):
#                try:
#                    result[name] = to_dict(value)
#                except:
#                    result[name] = value.pk
            elif issubclass(value.__class__, datetime):
                result[name] = value.strftime(LOCALE_DATE_FMT)
            elif issubclass(value.__class__, ImageFieldFile):
                # get relative URL
                path = value.path
                path = path[path.index('uploads'):]
                path = path.replace('uploads', 'media')
                result[name] = path
            else:
                result[name] = value

    # many-to-many field hack
    for field in instance._meta.many_to_many:
        if field.name not in hidden_fields:
            try:
                result[field.name] = [to_dict(obj) for obj in getattr(
                    instance, field.attname).all()]
            except:
                result[name] = [rel.pk for rel in getattr(
                    instance, field.attname).all()]

    return result

# matching_products
@require_GET
def matching_products_view(request):
    code = request.GET.get('product_id')
    supplier = request.GET.get('supplier').lower()

    other_supplier = 'suma' if supplier == 'infinity' else 'infinity'
    
    from backend.catalog_utils import get_product_info, load_catalog, find_matches
    other_df = load_catalog(other_supplier)
    product_info = get_product_info(code, supplier, load_catalog(supplier))
    matches = find_matches(product_info, other_supplier, other_df)

    result = {
        'product_details': product_info,
        'matches': matches
    }
    return JsonResponse(result, safe=False)

def add_entry(request):
    # get category_name, suma and infinity from json body
    import json
    data = json.loads(request.body)
    category_name = data.get('category_name')
    suma_code = data.get('suma', None)
    if suma_code == 'none':
        suma_code = None
    infinity_code = data.get('infinity', None)
    if infinity_code == 'none':
        infinity_code = None
    print('infinity_code:', infinity_code)
    if suma_code is None and infinity_code is None:
        return JsonResponse({'status': 'error', 'message': 'At least one of Suma or Infinity code must be provided'}, status=400)

    # get product info from the catalogs
    from backend.catalog_utils import get_product_info, load_catalog
    product_info = None
    if suma_code:
        suma_info = get_product_info(suma_code, 'suma', load_catalog('suma'))
    if infinity_code:
        infinity_info = get_product_info(infinity_code, 'infinity', load_catalog('infinity'))

    # combine the info, giving preference to infinity if both are available
    if suma_code and infinity_code:
        product_info = infinity_info
        for key, value in suma_info.items():
            if key not in product_info or not product_info[key]:
                product_info[key] = value
        product_info['infinity_desc'] = infinity_info['description']
        product_info['infinity_price'] = infinity_info['infinity_price']
        product_info['suma_desc'] = suma_info['description']
        product_info['suma_price'] = suma_info['suma_price']
    elif suma_code:
        product_info = suma_info
        product_info['suma_desc'] = suma_info['description']
        product_info['suma_price'] = suma_info['suma_price']
        product_info['infinity_desc'] = None
        product_info['infinity_price'] = None
    elif infinity_code:
        product_info = infinity_info
        product_info['infinity_desc'] = infinity_info['description']
        product_info['infinity_price'] = infinity_info['infinity_price']
        product_info['suma_desc'] = None
        product_info['suma_price'] = None

    category, _ = Category.objects.get_or_create(name=category_name)
    entry = Entry.objects.create(
        category=category,
        brand=product_info['brand'],
        infinity_desc=product_info['infinity_desc'],
        infinity_price=product_info['infinity_price'],
        suma_desc=product_info['suma_desc'],
        suma_price=product_info['suma_price'],
        organic=product_info['organic'],
        vat=product_info['vat'],
        n_items=product_info['n_items'],
        item_size=product_info['item_size'],
        item_unit=product_info['item_unit'],
        suma=suma_code,
        infinity=infinity_code,
        # updatedBy=request.user
    )
    return JsonResponse({'status': 'success', 'entry': to_dict(entry)}, status=201)

# get all entries or add entry
@csrf_exempt
@require_http_methods(["GET", "POST"])
def all_entries_view(request):
    if request.method == "GET":
        # get all entries and fetch related category and return as json
        entries = Entry.objects.all().select_related('category')
        # return entries as json
        entry_dicts = [to_dict(entry, transverse=True) for entry in entries]
        # add dbid for backwards compatibility with frontend, which expects a dbid field for each entry
        # TODO: fix this properly in the frontend and remove this hack
        # entry_dicts = [{**entry_dict, 'dbid': entry_dict['id']} for entry_dict in entry_dicts]
        return JsonResponse(entry_dicts, safe=False)
    elif request.method == "POST":
        # Handle POST request for adding a new entry
        return add_entry(request)


# edit or delete entry
@csrf_exempt
@require_http_methods(["DELETE", "POST"])
def entry_view(request, entry_id):
    try:
        entry = Entry.objects.get(id=entry_id)
    except Entry.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Entry not found'}, status=404)

    if request.method == "DELETE":
        entry.delete()
        return JsonResponse({'status': 'success'})
    elif request.method == "POST":
        # Handle POST request for editing an existing entry
        import json
        data = json.loads(request.body)

        for field in ['infinity', 'suma', 'preferred_supplier']:
            if field in data:
                setattr(entry, field, data[field])

        # deal separately with category
        category_name = data['category_name']
        category, _ = Category.objects.get_or_create(name=category_name)
        entry.category = category

        # entry.updatedBy = request.user

        # no need to recalculate price, because it is a property that calculates 
        # it on the fly 

        entry.save()
        return JsonResponse({'status': 'success', 'entry': to_dict(entry)}, status=200)

# get all transactions
# add transaction
# edit transaction
# delete transaction
