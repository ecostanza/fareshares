# coding utf-8
import shutil
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone

from backend.models import Entry
from backend.catalog_utils import get_product_info, load_catalog

class Command(BaseCommand):
    help = 'Update prices of all products in the db'

    # def add_arguments(self, parser):
    #     parser.add_argument('csv_file', type=str, help='Path to the CSV file to import')

    def handle(self, *args, **kwargs):
        # rename the catalog files to have a backup of the old ones
        # print(settings.BASE_DIR)
        
        # get the current date in YYYYMMDD format timezone-aware
        date_str = timezone.now().strftime('%Y%m%d')

        for supplier in ['infinity', 'suma']:
            catalog_filename = f'{supplier}_catalogue.csv'
            catalog_path = Path(settings.BASE_DIR) / catalog_filename
            print(f"Checking for catalogue file {catalog_path}")
            if catalog_path.exists():
                dest = Path(settings.BASE_DIR) / f'{supplier}_catalogue_{date_str}.csv'
                print(f"Renaming {catalog_path} to {dest}")
                shutil.move(catalog_path, dest)

        infinity_df = load_catalog('infinity')
        suma_df = load_catalog('suma')

        update_count = 0
        all_entries = Entry.objects.all()
        for entry in all_entries:
            update_flag = False
            prev_price = entry.fareshares_price
            if entry.suma:
                suma_info = get_product_info(entry.suma, 'suma', suma_df)

                if suma_info:
                    if suma_info.get('suma_price') != entry.suma_price:
                        # print(f"Updating Suma price for {entry} from {entry.suma_price} to {suma_info.get('suma_price')}")
                        entry.suma_price = suma_info.get('suma_price')
                        update_flag = True
                    
            if entry.infinity:
                infinity_info = get_product_info(entry.infinity, 'infinity', infinity_df)
                if infinity_info:
                    if infinity_info.get('infinity_price') != entry.infinity_price:
                        # print(f"Updating Infinity price for {entry} from {entry.infinity_price} to {infinity_info.get('infinity_price')}")
                        entry.infinity_price = infinity_info.get('infinity_price')
                        update_flag = True
            
            if update_flag:
                entry.prev_fareshares_price = prev_price
                entry.price_updatedAt = timezone.now()

                entry.save()
                update_count += 1
            
            # TODO: deal with entries where both infinity and suma prices are missing
            if not entry.suma_price and not entry.infinity_price:
                print(f"Warning: Entry {entry} has no price information from either supplier.")
        
        # TODO create a report and email it out
        # filter all entries where price_updatedAt is within the last day, and create a report of the changes
        recent_updates = Entry.objects.filter(price_updatedAt__gte=timezone.now() - timezone.timedelta(days=1))
        report_text = ""
        for entry in recent_updates:
            report_text += f"{entry} updated: {round(entry.prev_fareshares_price, 2)} -> {round(entry.fareshares_price, 2)}\n"

        self.stdout.write(self.style.SUCCESS(f'{update_count} entries updated successfully'))
        self.stdout.write(self.style.NOTICE("Recent updates report:"))
        self.stdout.write(self.style.NOTICE(report_text))