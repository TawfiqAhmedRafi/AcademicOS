import httpx
from fastapi.testclient import TestClient
from aos_match.api import app

client = TestClient(app)

print('--- Health ---')
r = client.get('/match/health')
print(r.json())

print('\n--- Project Search ---')
r = client.post('/match/search', headers={'X-Internal-Key': 'testkey'}, json={'type': 'project', 'course': '2200', 'query': 'fingerprint attendance'})
print(r.status_code)
res = r.json().get('results', [])
if res:
    print(f"Found {len(res)} results. Top: {res[0]['title']}")

print('\n--- Thesis Search ---')
r = client.post('/match/search', headers={'X-Internal-Key': 'testkey'}, json={'type': 'thesis', 'query': 'autism'})
print(r.status_code)
res = r.json().get('results', [])
print(f"Found {len(res)} results.")
for i, x in enumerate(res[:2]):
    print(f"  {i+1}. {x['title']}")
