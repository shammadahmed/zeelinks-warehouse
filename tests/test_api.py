import io
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from server.app import create_app


@pytest.fixture
def storage(tmp_path):
    return tmp_path / 'data'


@pytest.fixture
def client(storage, tmp_path):
    with TestClient(create_app(storage, tmp_path / 'no-frontend')) as test_client:
        yield test_client


def photograph(format='PNG', size=(200, 120)):
    output = io.BytesIO()
    Image.new('RGB', size, '#76975e').save(output, format)
    return output.getvalue()


def create(client, asset_id='WH-001', category='Tools', source='manual', content=None):
    return client.post('/api/assets', data={'assetId': asset_id, 'category': category, 'source': source},
                       files={'photo': ('asset.png', photograph() if content is None else content, 'image/png')})


def test_empty_register_and_health(client):
    assert client.get('/api/health').json() == {'status': 'ok'}
    result = client.get('/api/assets').json()
    assert result['items'] == []
    assert result['total'] == result['totalPages'] == 0
    assert result['stats'] == {'totalAssets': 0, 'totalCategories': 0, 'addedToday': 0}


def test_create_detail_and_photograph(client, storage):
    before = datetime.now(timezone.utc)
    response = create(client, ' WH-001 ', ' Tools ')
    assert response.status_code == 201
    asset = response.json()
    assert asset['assetId'] == 'WH-001'
    assert asset['category'] == 'Tools'
    assert asset['source'] == 'manual'
    assert before <= datetime.fromisoformat(asset['createdAt']) <= datetime.now(timezone.utc)
    assert response.headers['location'] == f'/api/assets/{asset["id"]}'
    assert client.get(response.headers['location']).json() == asset
    photo = client.get(asset['photoUrl'])
    assert photo.status_code == 200
    assert photo.headers['content-type'] == 'image/jpeg'
    assert photo.headers['x-content-type-options'] == 'nosniff'
    with Image.open(io.BytesIO(photo.content)) as image:
        assert image.format == 'JPEG'
        assert image.size == (200, 120)
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_duplicate_ids_are_case_insensitive_and_leave_no_orphans(client, storage):
    assert create(client, 'WH-001').status_code == 201
    assert create(client, ' wh-001 ').status_code == 409
    assert client.get('/api/assets').json()['total'] == 1
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_search_category_sort_and_pagination(client):
    for asset_id, category in [('WH-001', 'Tools'), ('WH-002', 'Electronics'), ('LAB-003', 'Tools')]:
        assert create(client, asset_id, category).status_code == 201
    result = client.get('/api/assets?q=wh-&limit=1&sort=oldest').json()
    assert result['total'] == 2
    assert result['totalPages'] == 2
    assert result['items'][0]['assetId'] == 'WH-001'
    assert result['stats'] == {'totalAssets': 3, 'totalCategories': 2, 'addedToday': 3}
    assert client.get('/api/assets?q=wh-&limit=1&sort=oldest&page=2').json()['items'][0]['assetId'] == 'WH-002'
    assert client.get('/api/assets?category=Tools').json()['total'] == 2
    assert client.get('/api/assets?q=WH-&category=Tools').json()['total'] == 1
    assert client.get('/api/assets').json()['items'][0]['assetId'] == 'LAB-003'
    assert client.get('/api/assets?q=unknown').json()['total'] == 0


def test_literal_search_and_sql_injection(client):
    create(client, 'WH_001')
    create(client, 'WH-002')
    assert client.get('/api/assets', params={'q': '_'}).json()['total'] == 1
    assert client.get('/api/assets', params={'q': '%'}).json()['total'] == 0
    assert client.get('/api/assets', params={'q': "' OR 1=1 --"}).json()['total'] == 0
    assert client.get('/api/assets').json()['total'] == 2


@pytest.mark.parametrize('asset_id,category', [('', 'Tools'), ('?', 'Tools'), ('A' * 81, 'Tools'), ('WH-001', ''), ('WH-001', 'A' * 61), ('WH-001', 'Tools\x00')])
def test_invalid_fields(client, storage, asset_id, category):
    assert create(client, asset_id, category).status_code in {400, 422}
    assert client.get('/api/assets').json()['total'] == 0
    assert not list((storage / 'uploads').iterdir())


@pytest.mark.parametrize('content', [b'', b'not an image', b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', photograph()[:25]])
def test_invalid_images(client, content):
    assert create(client, content=content).status_code == 400
    assert client.get('/api/assets').json()['total'] == 0


def test_missing_image_and_large_file(client):
    assert client.post('/api/assets', data={'assetId': 'WH-001', 'category': 'Tools'}).status_code == 422
    assert create(client, content=b'x' * (8 * 1024 * 1024 + 1)).status_code == 400


def test_large_dimensions_rejected_and_supported_formats_resized(client):
    assert create(client, content=photograph(size=(5001, 5000))).status_code == 400
    for format in ['JPEG', 'PNG', 'WEBP']:
        response = create(client, asset_id=f'FORMAT-{format}', content=photograph(format, (2000, 1000)))
        assert response.status_code == 201
        with Image.open(io.BytesIO(client.get(response.json()['photoUrl']).content)) as image:
            assert image.size == (1600, 800)


def test_animated_image_is_rejected(client):
    output = io.BytesIO()
    Image.new('RGB', (20, 20), 'red').save(output, 'PNG', save_all=True, append_images=[Image.new('RGB', (20, 20), 'blue')])
    assert create(client, content=output.getvalue()).status_code == 400


def test_automated_source_and_server_controlled_timestamp(client):
    response = client.post('/api/assets', data={'assetId': 'AUTO-001', 'category': 'Equipment', 'source': 'automated', 'createdAt': '1900-01-01T00:00:00Z'}, files={'photo': ('photo.jpg', photograph(), 'image/jpeg')})
    assert response.status_code == 201
    assert response.json()['source'] == 'automated'
    assert response.json()['createdAt'].startswith(datetime.now(timezone.utc).date().isoformat())
    assert create(client, 'AUTO-002', source='unknown').status_code == 422


def test_persistence_across_app_restart(client, storage, tmp_path):
    asset = create(client).json()
    with TestClient(create_app(storage, tmp_path / 'no-frontend')) as restarted:
        assert restarted.get(f'/api/assets/{asset["id"]}').json() == asset
        assert restarted.get(asset['photoUrl']).status_code == 200


def test_concurrent_duplicate_requests(client, storage):
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: create(client, 'RACE-001').status_code, range(2)))
    assert sorted(statuses) == [201, 409]
    assert client.get('/api/assets').json()['total'] == 1
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_query_limits_and_not_found(client):
    for url in ['/api/assets?page=0', '/api/assets?limit=101', '/api/assets?sort=wrong']:
        assert client.get(url).status_code == 422
    assert client.get('/api/assets/9999').status_code == 404
    assert client.get('/api/missing').status_code == 404
    assert client.get('/uploads/missing.jpg').status_code == 404
    assert client.get('/uploads/../assets.sqlite').status_code == 404


def test_frontend_and_openapi(storage, tmp_path):
    dist = tmp_path / 'dist'
    dist.mkdir()
    (dist / 'index.html').write_text('<html><title>Zee Links</title></html>')
    with TestClient(create_app(storage, dist)) as client:
        assert client.get('/').status_code == 200
        assert 'Zee Links' in client.get('/').text
        assert client.get('/docs').status_code == 200
        assert '/api/assets' in client.get('/openapi.json').json()['paths']
        assert client.get('/api/missing').status_code == 404


def edit(client, record_id, asset_id='WH-EDITED', category='Equipment', content=None):
    files = {'photo': ('replacement.png', content, 'image/png')} if content is not None else None
    return client.put(f'/api/assets/{record_id}', data={'assetId': asset_id, 'category': category}, files=files)


def test_edit_details_keeps_photo_timestamp_and_source(client, storage):
    original = create(client, source='automated').json()
    response = edit(client, original['id'], ' WH-EDITED ', ' Equipment ')
    assert response.status_code == 200
    updated = response.json()
    assert updated == {**original, 'assetId': 'WH-EDITED', 'category': 'Equipment'}
    assert client.get(f'/api/assets/{original["id"]}').json() == updated
    assert client.get('/api/assets?q=WH-001').json()['total'] == 0
    assert client.get('/api/assets?q=WH-EDITED&category=Equipment').json()['total'] == 1
    assert client.get(original['photoUrl']).status_code == 200
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_edit_replaces_photo_and_removes_previous_file(client, storage):
    original = create(client).json()
    response = edit(client, original['id'], content=photograph(size=(400, 300)))
    assert response.status_code == 200
    updated = response.json()
    assert updated['photoUrl'] != original['photoUrl']
    assert updated['createdAt'] == original['createdAt']
    assert client.get(original['photoUrl']).status_code == 404
    with Image.open(io.BytesIO(client.get(updated['photoUrl']).content)) as image:
        assert image.size == (400, 300)
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_edit_own_id_is_allowed_and_duplicate_other_id_is_rejected(client, storage):
    original = create(client, 'WH-001').json()
    create(client, 'WH-002')
    assert edit(client, original['id'], 'wh-001', 'Tools').status_code == 200
    before = client.get(f'/api/assets/{original["id"]}').json()
    assert edit(client, original['id'], 'wh-002', content=photograph()).status_code == 409
    assert client.get(f'/api/assets/{original["id"]}').json() == before
    assert client.get(before['photoUrl']).status_code == 200
    assert len(list((storage / 'uploads').iterdir())) == 2


@pytest.mark.parametrize('asset_id,category', [('?', 'Tools'), ('X' * 81, 'Tools'), ('WH-001', ''), ('WH-001', 'X' * 61)])
def test_invalid_edit_fields_leave_record_unchanged(client, asset_id, category):
    original = create(client).json()
    assert edit(client, original['id'], asset_id, category).status_code in {400, 422}
    assert client.get(f'/api/assets/{original["id"]}').json() == original


@pytest.mark.parametrize('kind', ['corrupt', 'oversized'])
def test_invalid_replacement_leaves_original_photo(client, storage, kind):
    original = create(client).json()
    content = b'not an image' if kind == 'corrupt' else b'x' * (8 * 1024 * 1024 + 1)
    assert edit(client, original['id'], content=content).status_code == 400
    assert client.get(f'/api/assets/{original["id"]}').json() == original
    assert client.get(original['photoUrl']).status_code == 200
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_delete_removes_record_photo_and_updates_summary(client, storage):
    removed = create(client, 'WH-001', 'Tools').json()
    kept = create(client, 'WH-002', 'Electronics').json()
    response = client.delete(f'/api/assets/{removed["id"]}')
    assert response.status_code == 204
    assert response.content == b''
    assert client.get(f'/api/assets/{removed["id"]}').status_code == 404
    assert client.get(removed['photoUrl']).status_code == 404
    assert client.get(f'/api/assets/{kept["id"]}').json() == kept
    assert client.get(kept['photoUrl']).status_code == 200
    listing = client.get('/api/assets').json()
    assert listing['stats'] == {'totalAssets': 1, 'totalCategories': 1, 'addedToday': 1}
    assert listing['categories'] == [{'category': 'Electronics', 'count': 1}]
    assert len(list((storage / 'uploads').iterdir())) == 1
    assert client.delete(f'/api/assets/{kept["id"]}').status_code == 204
    assert client.get('/api/assets').json()['total'] == 0
    assert not list((storage / 'uploads').iterdir())


def test_edit_and_delete_missing_records_are_not_found(client, storage):
    kept = create(client).json()
    assert edit(client, 9999, content=photograph()).status_code == 404
    assert client.delete('/api/assets/9999').status_code == 404
    assert client.get(f'/api/assets/{kept["id"]}').json() == kept
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_concurrent_photo_replacements_keep_only_current_photo(client, storage):
    original = create(client).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda i: edit(client, original['id'], f'WH-{i}', content=photograph(size=(200 + i, 120))), range(2)))
    assert all(response.status_code == 200 for response in responses)
    current = client.get(f'/api/assets/{original["id"]}').json()
    assert current['createdAt'] == original['createdAt']
    assert client.get(current['photoUrl']).status_code == 200
    assert len(list((storage / 'uploads').iterdir())) == 1


def test_concurrent_edit_and_delete_do_not_leave_photographs(client, storage):
    original = create(client).json()
    with ThreadPoolExecutor(max_workers=2) as pool:
        update = pool.submit(edit, client, original['id'], content=photograph(size=(300, 200)))
        remove = pool.submit(client.delete, f'/api/assets/{original["id"]}')
        assert update.result().status_code in {200, 404}
        assert remove.result().status_code == 204
    assert client.get('/api/assets').json()['total'] == 0
    assert not list((storage / 'uploads').iterdir())
