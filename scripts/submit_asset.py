"""Example automated client using only Python's standard library."""
import argparse
import json
import mimetypes
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


def submit(base_url, asset_id, category, photo_path, source='automated'):
    photo = Path(photo_path)
    boundary = f'zeelinks-{uuid4().hex}'
    parts = []
    for name, value in [('assetId', asset_id), ('category', category), ('source', source)]:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    content_type = mimetypes.guess_type(photo.name)[0] or 'application/octet-stream'
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="asset-photo"\r\nContent-Type: {content_type}\r\n\r\n'.encode())
    parts.extend([photo.read_bytes(), f'\r\n--{boundary}--\r\n'.encode()])
    request = Request(f'{base_url.rstrip("/")}/api/assets', data=b''.join(parts), headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
    with urlopen(request, timeout=30) as response:
        return json.load(response)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Submit an asset from an automated source.')
    parser.add_argument('--url', default='http://127.0.0.1:3001')
    parser.add_argument('--id', required=True)
    parser.add_argument('--category', required=True)
    parser.add_argument('--photo', type=Path, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(submit(args.url, args.id, args.category, args.photo), indent=2))
    except HTTPError as error:
        parser.exit(1, f'API error {error.code}: {error.read().decode()}\n')
    except (URLError, OSError) as error:
        parser.exit(1, f'Could not submit asset: {error}\n')
