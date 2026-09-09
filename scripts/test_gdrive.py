import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

# Check if google-auth or cryptography or pyjwt is available, or use pure python/standard library if possible
BASE_DIR = Path(__file__).resolve().parent.parent
CRED_FILE = BASE_DIR / 'google_service_account.json'
FOLDER_ID = '1ZJQ3BmKeTyELWlOViCRWl0PoxY_fFWyc'

def get_access_token():
    with open(CRED_FILE, 'r', encoding='utf-8') as f:
        cred = json.load(f)
    
    # Try importing google.oauth2.service_account if available
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests
        
        scopes = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive']
        credentials = service_account.Credentials.from_service_account_file(
            str(CRED_FILE), scopes=scopes
        )
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        print("Obtained token via google-auth:", credentials.token[:15] + "...")
        return credentials.token
    except ImportError:
        print("google-auth not installed, trying cryptography / PyJWT / manual JWT")
    
    # Try pyjwt / cryptography
    try:
        import jwt
        from cryptography.hazmat.primitives import serialization
        
        now = int(time.time())
        payload = {
            'iss': cred['client_email'],
            'scope': 'https://www.googleapis.com/auth/drive.readonly',
            'aud': cred['token_uri'],
            'exp': now + 3600,
            'iat': now
        }
        
        encoded_jwt = jwt.encode(payload, cred['private_key'], algorithm='RS256')
        
        data = urllib.parse.urlencode({
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': encoded_jwt
        }).encode('utf-8')
        
        req = urllib.request.Request(cred['token_uri'], data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req) as resp:
            token_data = json.loads(resp.read().decode('utf-8'))
            token = token_data.get('access_token')
            print("Obtained token via PyJWT/cryptography:", token[:15] + "...")
            return token
    except Exception as e:
        print("Error with PyJWT:", e)

    return None

def list_folder_files(token):
    query = f"'{FOLDER_ID}' in parents and trashed = false"
    url = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(query)}&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink)&pageSize=100"
    
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            files = data.get('files', [])
            print(f"Successfully retrieved {len(files)} files from Google Drive folder:")
            for f in files:
                print(f" - {f['name']} (ID: {f['id']}, Type: {f['mimeType']}, Size: {f.get('size', 'N/A')} bytes)")
            return files
    except Exception as e:
        print("Error listing files:", e)
        return []

if __name__ == '__main__':
    tok = get_access_token()
    if tok:
        list_folder_files(tok)
    else:
        print("Could not obtain access token.")
