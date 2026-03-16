# coding utf-8
import pandas as pd
from django.core.management.base import BaseCommand
from backend.models import Entry, Category
from backend.catalog_utils import get_product_info, load_catalog

class Command(BaseCommand):
    help = 'Import entries from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file to import')

    def handle(self, *args, **kwargs):
        csv_file = kwargs['csv_file']
        df = pd.read_csv(csv_file)
        print(df.head())

        Entry.objects.all().delete()
        Category.objects.all().delete()

        infinity_df = load_catalog('infinity')
        suma_df = load_catalog('suma')

        for _, row in df.iterrows():
            category_name = row['Category']
            category, _ = Category.objects.get_or_create(name=category_name, defaults={'sort_order': Category.objects.count() + 1})

            suma = row['Suma']
            infinity = row['Infinity']
            if pd.isna(infinity):
                infinity = None
            else:
                infinity = str(int(infinity))

            suma_info = {}
            if not pd.isna(suma):
                # TODO: get the suma info from the catalog
                suma_info = get_product_info(suma, 'suma', suma_df)
                print(f"Suma info for {suma}: {suma_info}\n")
            else:
                suma = None

            infinity_info = {}
            if not pd.isna(infinity):
                # TODO: get the infinity info from the catalog
                infinity_info = get_product_info(infinity, 'infinity', infinity_df)
                # print(f"Infinity info for {infinity}: {infinity_info}\n")
            else:
                infinity = None

            if not suma_info and not infinity_info:
                print(f"No info found for Suma {suma} and Infinity {infinity}, skipping entry.\n")
                continue

            combined_info = {**suma_info, **infinity_info}
            print(f"Combined info for Suma {suma} and Infinity {infinity}: {combined_info}\n")

            entry = Entry(
                category=category,
                suma=suma,
                infinity=infinity,
                suma_desc=combined_info.get('suma_desc'),
                infinity_desc=combined_info.get('infinity_desc'),
                brand=combined_info.get('brand'),
                n_items=combined_info.get('n_items'),
                item_size=combined_info.get('item_size'),
                item_unit=combined_info.get('item_unit'),
                suma_price=combined_info.get('suma_price'),
                infinity_price=combined_info.get('infinity_price'),
                vat=combined_info.get('vat', False),
                organic=combined_info.get('organic', False),
            )
            entry.save()

        self.stdout.write(self.style.SUCCESS(f'{Entry.objects.count()} entries imported successfully'))
