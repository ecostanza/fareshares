# coding: utf-8
from difflib import SequenceMatcher
from pathlib import Path
import sys
import re
from unittest import result

import pandas as pd
import requests

try:
    from backend.models import Settings
except ImportError as e:
    print(f"Error importing Settings: {e}")

def get_catalogue_filename(supplier):
    return f"{supplier}_catalogue.csv"

infinity_lut = {
    'Product code': 'infinity_code', 
    # 'Order Quantity', 
    # 'concatprodsize as text': 'item_size',
    'organic': 'organic',
    'product description': 'description',
    'RRP rounded to 2': 'rrp',
    'brand': 'brand',
    # 'Change Marker',
    'Case price': 'infinity_price', 
    'Vat Marker': 'vat', 
    # 'Vat per case', 
    # 'Barcode inner',
    'units case': 'n_items',
    'pk size': 'item_size',
    'unit': 'item_unit',
    # 'Vat rating', 
    # 'Active as a number'
}

suma_lut = {
    # 'CATEGORY NAME', 
    'BRAND': 'brand', 
    'PLCDE': 'suma_code',
    'PLDESC': 'suma_desc_1', 
    'PLTEXT': 'suma_desc_2', 
    'SIZE': 'item_size', 
    'PRICE': 'suma_price',
    # ' VAT': 'vat', 
    # '    RRP': 'rrp', 
    # 'B': 
    # 'F', 
    # 'G', 
    'O': 'organic', 
    # 'S', 
    'V': 'vat',
    # 'BARC - INNER',
    # 'BARC - OUTER', 
    # 'DONOTSPLIT', 
    # 'PRICE CHANGE SINCE CATALOGUE PUBLISHED'
}


def check_and_download_catalog(supplier):
    catalog_filename = get_catalogue_filename(supplier)

    catalog_path = Path(catalog_filename)
    if not catalog_path.exists():
        # if the catalog file does not exist, download it from the settings URL
        settings = Settings.load()
        # default to infinity
        catalog_url = settings.infinity_catalog_url
        if supplier == 'suma':
            catalog_url = settings.suma_catalog_url
            
        if catalog_url:
            response = requests.get(catalog_url)
            if response.status_code == 200:
                with open(catalog_filename, 'wb') as f:
                    # write the text of the response to the file
                    # as utf-8 text
                    f.write(response.text.encode('utf-8'))
                    return
            else:
                raise ValueError(f"Failed to download catalog from {catalog_url}")
                
        else:
            raise ValueError(f"No catalog URL configured for supplier {supplier}")
    else:
        # the catalog file already exists, do nothing
        return

def parse_item_size(item_size_str):
    # if item_size_str is NaN, return default values
    if pd.isna(item_size_str):
         return 1, 1, ''
    n_items = 1
    item_size = 1
    item_unit = ''
    item_size_str = item_size_str.lower()
    # try to match patterns like "6 x 500ml" or "12x1L"
    matches = re.findall(r'(\d+)\s?x\s?([.\d]+)(\w*)', item_size_str)
    if matches:
        n_items = int(matches[0][0])
        item_size = float(matches[0][1])
        item_unit = matches[0][2]
    else:
        # if that pattern does not match, try to match patterns like "500ml" or "1L"
        try:
            alt_matches = re.findall(r'([.\d]+)\s?(\w*)', item_size_str)[0]
            n_items = 1
            item_size = float(alt_matches[0])
            item_unit = alt_matches[1]
        except Exception as error:
            pass
    return n_items, item_size, item_unit

def parse_infinity_product_info(row):
    result = {}

    result['description'] = row['description'].lower().replace('\n', '')
    result['full description'] = result['description']
    result['infinity_desc'] = result['description']

    result['brand'] = row['brand'].lower()

    result['organic'] = bool(row['organic'])

    result['vat'] = bool(row['vat'])

    result['n_items'] = int(row['n_items'])
    try:
        result['item_size'] = float(row['item_size'])
    except ValueError:
        # if we cannot convert item_size to a float, it might be because it includes the number of items, so we try to parse it
        # there are some entries where item_size includes the number of items 
        # e.g. 4x400 so we need to convert that to the product 
        n_items, item_size, _ = parse_item_size(row['item_size'])
        # result['n_items'] = n_items
        result['item_size'] = n_items * item_size

    result['item_unit'] = row['item_unit']

    result['infinity_price'] = float(row['infinity_price'])

    return result

def parse_suma_product_info(row):
    result = {}

    result['description'] = row['description']
    result['suma_desc'] = row['description']
    result['full description'] = row['description']
    result['brand'] = row['brand'].lower()

    result['organic'] = bool(row['organic'])
    result['vat'] = bool(row['vat'])

    result['n_items'] = int(row['n_items'])
    result['item_size'] = float(row['item_size'])
    result['item_unit'] = row['item_unit']

    result['suma_price'] = float(row['suma_price'])

    return result

def load_catalog(supplier):
    # check and download the catalog if necessary
    check_and_download_catalog(supplier)

    # after calling check_and_download_catalog, we know the catalog is available
    catalog_filename = get_catalogue_filename(supplier)
    df = pd.read_csv(catalog_filename)

    # print(f'{supplier} columns: {df.columns}')
    if supplier == 'infinity':
        df = df.rename(columns=infinity_lut)
        # keep only the columns we need
        df = df[list(infinity_lut.values())]

        df['organic'] = df['organic'] == 'organic'

        df['vat'] = df['vat'] == 'V'

        # df['tmp'] = df['item_size'].apply(parse_item_size)
        # df['n_items'] = df['tmp'].apply(lambda x: x[0])
        # df['item_size'] = df['tmp'].apply(lambda x: x[1])
        # df['item_unit'] = df['tmp'].apply(lambda x: x[2])
        # df = df.drop(columns=['tmp'])
        # fill na values in n_items with 1
        df['n_items'] = df['n_items'].fillna(1)
        
    elif supplier == 'suma':
        df = df.rename(columns=suma_lut)
        # keep only the columns we need
        df = df[list(suma_lut.values())]
        # create a description column by concatenating the desc_1 and desc_2 columns
        df['description'] = df['suma_desc_1'].fillna('').str.lower() + ' ' + df['suma_desc_2'].fillna('').str.lower()
        # drop the original desc_1 and desc_2 columns
        df = df.drop(columns=['suma_desc_1', 'suma_desc_2'])

        # result['n_items'], result['item_size'], result['item_unit'] = parse_item_size(result['item_size'])
        df['tmp'] = df['item_size'].apply(parse_item_size)
        df['n_items'] = df['tmp'].apply(lambda x: x[0])
        df['item_size'] = df['tmp'].apply(lambda x: x[1])
        df['item_unit'] = df['tmp'].apply(lambda x: x[2])
        df = df.drop(columns=['tmp'])

        df['organic'] = df['organic'] == 'O'
        df['vat'] = df['vat'] == 'V'

    else:
        raise ValueError(f"Unknown supplier: {supplier}")

    df.to_csv(f"{supplier}_catalogue_parsed.csv", index=False)

    return df


def get_product_info(product_id, supplier, df):
    # Implementation for fetching product info based on ID and supplier
    result = {}

    # print(f"\nGetting product info for product_id: {product_id}, supplier: {supplier}")

    result = {}
    selected_row = None
    if supplier == 'infinity':
        selected_row = df[df['infinity_code'] == int(product_id)]
        if not selected_row.empty:
            row = selected_row.iloc[0]
            # print('row:', row)
            try:
                result = parse_infinity_product_info(row)
            except ValueError:
                print(f"Error parsing product info for product_id: {product_id}, supplier: {supplier}")
                raise
    elif supplier == 'suma':
        selected_row = df[df['suma_code'].str.lower() == product_id.lower()]
        if not selected_row.empty:
            row = selected_row.iloc[0]
            # print('row:', row)
            result = parse_suma_product_info(row)

    return result

def find_matches(product_info, other_supplier, other_df):
    # Implementation for finding matching products in the other supplier's catalog
    # print(other_df.head())
    idx = other_df['brand'].str.lower() == product_info['brand'].lower()
    selected = other_df[idx]

    # filter the selected dataframe to only include rows where the item size is the same as the product info item size
    idx = selected['item_size'] == product_info['item_size']
    selected = selected[idx]
    # filter based on organic
    idx = selected['organic'] == product_info['organic']
    selected = selected[idx]

    def levenshtein_ratio(s1, s2):
        return SequenceMatcher(None, s1, s2).ratio()

    df = selected.copy()
    df['similarity'] = df['description'].apply(lambda x: levenshtein_ratio(x, product_info['description']))
    df = df.sort_values(by='similarity', ascending=False)

    matches = []
    # ${d['brand']}: ${d['full description']} (organic: ${d['organic']})
    for _, d in df.iterrows():
        match = {'item': 
            {
                'code': d['infinity_code'] if other_supplier == 'infinity' else d['suma_code'],
                'brand': d['brand'],
                'description': d['description'],
                'full description': d['description'],
                'organic': bool(d['organic']),
                'similarity': d['similarity'],
            }
        }
        matches.append(match)

    return matches

if __name__ == "__main__":
    # 'SY016', 'suma'
    # '724660', 'infinity'
    infinity_df = load_catalog('infinity')
    suma_df = load_catalog('suma')
    # print(get_product_info('724605', 'infinity', infinity_df))
    # infinity_p_i = get_product_info('724601', 'infinity', infinity_df)
    # infinity_p_i = get_product_info('724605', 'infinity', infinity_df)
    # infinity_p_i = get_product_info('445603', 'infinity', infinity_df)
    # infinity_p_i = get_product_info('100545', 'infinity', infinity_df)
    infinity_p_i = get_product_info('390189', 'infinity', infinity_df)
    
    print(infinity_p_i)

    # matches = find_matches(infinity_p_i, 'suma', suma_df)
    # print('matches:')
    # print(matches)
    # print('=====')

    # # print()
    # suma_p_i = get_product_info('SY016', 'suma', suma_df)
    # print(suma_p_i)
    # matches = find_matches(suma_p_i, 'infinity', infinity_df)
    # print('matches:')
    # print(matches)
    
