# coding: utf-8
from django.db import models
from django.contrib.auth.models import User

class SingletonModel(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Settings(SingletonModel):
    suma_catalog_url = models.URLField(null=True, blank=True)
    infinity_catalog_url = models.URLField(null=True, blank=True)

    price_markup_percentage = models.FloatField()

    class Meta:
        verbose_name_plural = "Settings"

    def __str__(self):
        return "Settings for FareShares"

class Category(models.Model):
    name = models.CharField(max_length=100)
    sort_order = models.IntegerField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # if sort_order is changed to another value,
        # shift the sort order of the other categories accordingly
        if self.pk:
            old_category = Category.objects.get(pk=self.pk)
            if old_category.sort_order != self.sort_order:
                if self.sort_order is not None:
                    if old_category.sort_order is not None:
                        if self.sort_order < old_category.sort_order:
                            Category.objects.filter(sort_order__gte=self.sort_order, sort_order__lt=old_category.sort_order).update(sort_order=models.F('sort_order') + 1)
                        else:
                            Category.objects.filter(sort_order__gt=old_category.sort_order, sort_order__lte=self.sort_order).update(sort_order=models.F('sort_order') - 1)
                    else:
                        Category.objects.filter(sort_order__gte=self.sort_order).update(sort_order=models.F('sort_order') + 1)
                else:
                    Category.objects.filter(sort_order__gt=old_category.sort_order).update(sort_order=models.F('sort_order') - 1)

        super().save(*args, **kwargs)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Entry(models.Model):
    suma = models.CharField(max_length=16, null=True, blank=True, unique=True)
    infinity = models.CharField(max_length=16, null=True, blank=True, unique=True)
    
    suma_desc = models.CharField(max_length=255, null=True, blank=True)
    infinity_desc = models.CharField(max_length=255, null=True, blank=True)
    brand = models.CharField(max_length=100)

    n_items = models.IntegerField()
    item_size = models.FloatField()
    item_unit = models.CharField(max_length=16)

    suma_price = models.FloatField(null=True, blank=True)
    infinity_price = models.FloatField(null=True, blank=True)

    prev_fareshares_price = models.FloatField(null=True, blank=True)
    price_updatedAt = models.DateTimeField(null=True, blank=True)

    vat = models.BooleanField()
    organic = models.BooleanField()

    sort_order = models.IntegerField(null=True, blank=True)

    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='entries')

    preferred_supplier = models.CharField(max_length=255, null=True, blank=True)

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)

    updatedBy = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    @property
    def fareshares_price(self):
        # if n_items is 1, then use item_size as denominator
        denominator = self.n_items
        if denominator == 1:
            denominator = self.item_size
        # get the price markup percentage from the settings
        settings = Settings.load()
        price_markup_percentage = settings.price_markup_percentage
        fareshares_factor = 1 + price_markup_percentage / 100
        price = 0
        # if self.suma is not None and self.suma_price is None:
        #     print(f"Warning: Entry {self} has a Suma code {self.suma} but no Suma price.")
        # if self.infinity is not None and self.infinity_price is None:
        #     print(f"Warning: Entry {self} has an Infinity code {self.infinity} but no Infinity price.")
        if not self.suma_price or self.preferred_supplier == 'infinity':
            price = self.infinity_price / denominator * fareshares_factor
        elif not self.infinity_price or self.preferred_supplier == 'suma':
            price = self.suma_price / denominator * fareshares_factor
        else:
            price = (self.suma_price + self.infinity_price) / 2 / denominator * fareshares_factor
        if self.vat:
            price = price * 1.20
        if self.infinity is None and self.suma is None:
            price = 0
        return price

    class Meta:
        verbose_name_plural = "Entries"

    def __str__(self):
        return f"{self.brand} {self.category.name} ({self.n_items} x {self.item_size} {self.item_unit})"

class Order(models.Model):
    description = models.CharField(max_length=255, null=True, blank=True)
    supplier = models.CharField(max_length=255)

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    updatedBy = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')}, {self.description}"

class ItemOrdered(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    entry = models.ForeignKey(Entry, on_delete=models.SET_NULL, null=True, blank=True, related_name='items_ordered')
    n_items = models.IntegerField()

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    updatedBy = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

class Transaction(models.Model):
    amount = models.FloatField()
    date = models.DateTimeField()
    description = models.CharField(max_length=255)
    comments = models.CharField(max_length=255, null=True, blank=True)

    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    updatedBy = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.date.strftime('%Y-%m-%d')}, {self.amount}, {self.description}"
