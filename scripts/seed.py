"""Optional demo records. The running API generates their real creation times."""
import argparse
from pathlib import Path
from urllib.error import HTTPError, URLError

from submit_asset import submit

ROOT = Path(__file__).resolve().parent.parent
DEMO_ASSETS = [
    ('DEMO-WH-001', 'Equipment', 'crate'),
    ('DEMO-WH-002', 'Electronics', 'laptop'),
    ('DEMO-WH-003', 'Tools', 'tools'),
    ('DEMO-WH-004', 'Furniture', 'chair'),
    ('DEMO-WH-005', 'Electronics', 'camera'),
    ('DEMO-WH-006', 'Tools', 'drill'),
]


def main():
    parser = argparse.ArgumentParser(description='Add six sample assets. Existing demo IDs are skipped.')
    parser.add_argument('--url', default='http://127.0.0.1:3001')
    args = parser.parse_args()
    for asset_id, category, illustration in DEMO_ASSETS:
        try:
            asset = submit(args.url, asset_id, category, ROOT / 'docs' / 'demo' / f'{illustration}.jpg', 'manual')
            print(f'Created {asset["assetId"]}')
        except HTTPError as error:
            if error.code == 409:
                print(f'Skipped existing {asset_id}')
            else:
                parser.exit(1, f'API error {error.code}: {error.read().decode()}\n')
        except (URLError, OSError) as error:
            parser.exit(1, f'Could not seed records: {error}\nStart the FastAPI server first.\n')


if __name__ == '__main__':
    main()
