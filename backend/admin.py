from django.contrib import admin
from .models import Entry, Transaction, Category, Settings

class EntryAdmin(admin.ModelAdmin):
    list_display = ('brand', 'category', 'n_items', 'item_size', 'item_unit', 'suma_price', 'infinity_price', 'prev_fareshares_price', 'price_updatedAt')
    search_fields = ('brand', 'category__name')
    list_filter = ('category',)

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'sort_order')
    list_editable = ('name', 'sort_order',)
    list_display_links = None
    search_fields = ('name',)

admin.site.register(Entry, EntryAdmin)
admin.site.register(Transaction)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Settings)
