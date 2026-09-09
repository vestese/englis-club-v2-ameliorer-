"""
Accra English Club — Google Drive Service Integration
Connects to Google Drive using the provided Service Account to fetch,
preview, and download English course documents & PDFs from the shared folder.

Includes a pure-Python zero-dependency RSA PKCS#1 v1.5 signer so that OAuth2
JWT authentication works 100% reliably on any Python environment without external dependencies.
"""

import os
import json
import time
import base64
import hashlib
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
CRED_FILE = BASE_DIR / 'google_service_account.json'
DEFAULT_FOLDER_ID = '1ZJQ3BmKeTyELWlOViCRWl0PoxY_fFWyc'

# In-memory cache for token & file listings
_TOKEN_CACHE = {'token': None, 'expires_at': 0}
_FILES_CACHE = {'files': [], 'synced_at': 0, 'last_error': None, 'folder_status': None}
CACHE_TTL = 180  # 3 minutes cache for drive file listings


def load_credentials():
    """Charge les identifiants du compte de service.

    Priorité :
    1. Variable d'environnement GOOGLE_SERVICE_ACCOUNT_JSON (utilisée sur Render)
    2. Fichier google_service_account.json (développement local)
    """
    # 1) Environment variable (Render / production)
    env_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if env_json:
        try:
            return json.loads(env_json)
        except Exception as e:
            print(f"[GDrive] Error parsing GOOGLE_SERVICE_ACCOUNT_JSON env var: {e}")

    # 2) Local file (dev)
    if not CRED_FILE.exists():
        return None
    try:
        with open(CRED_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[GDrive] Error loading credentials file: {e}")
        return None



# ---------------------------------------------------------------------------
# Pure Python Zero-Dependency RSA / ASN.1 DER Parser & RS256 JWT Signer
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    """Encode en Base64 URL-safe sans padding."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _parse_der_length(data: bytes, offset: int):
    """Lit la longueur d'un élément ASN.1 DER."""
    b = data[offset]
    if b < 0x80:
        return b, offset + 1
    num_bytes = b & 0x7f
    length = 0
    offset += 1
    for _ in range(num_bytes):
        length = (length << 8) | data[offset]
        offset += 1
    return length, offset


def _parse_der_integer(data: bytes, offset: int):
    """Lit un INTEGER ASN.1 DER et renvoie (valeur_int, new_offset)."""
    tag = data[offset]
    if tag != 0x02:
        raise ValueError(f"Expected INTEGER tag 0x02, got 0x{tag:02x}")
    length, offset = _parse_der_length(data, offset + 1)
    val = int.from_bytes(data[offset:offset + length], byteorder='big', signed=False)
    return val, offset + length


def _extract_rsa_private_key_numbers(pem_str: str):
    """
    Extrait les composants N (modulus) et D (private exponent) depuis une clé PEM
    PKCS#8 ('BEGIN PRIVATE KEY') ou PKCS#1 ('BEGIN RSA PRIVATE KEY').
    """
    lines = [l.strip() for l in pem_str.strip().splitlines() if not l.startswith('-----')]
    der = base64.b64decode(''.join(lines))

    offset = 0
    tag = der[offset]
    if tag != 0x30:  # SEQUENCE
        raise ValueError("Invalid DER: expected SEQUENCE")
    _, offset = _parse_der_length(der, offset + 1)

    # Check if PKCS#8: SEQUENCE { version, AlgorithmIdentifier, OCTET STRING }
    ver, offset = _parse_der_integer(der, offset)
    if der[offset] == 0x30:  # AlgorithmIdentifier SEQUENCE
        alg_len, offset = _parse_der_length(der, offset + 1)
        offset += alg_len
        if der[offset] != 0x04:  # OCTET STRING
            raise ValueError("Expected OCTET STRING in PKCS#8")
        oct_len, offset = _parse_der_length(der, offset + 1)
        # Inside the octet string is the PKCS#1 RSAPrivateKey SEQUENCE
        der = der[offset:offset + oct_len]
        offset = 0
        tag = der[offset]
        if tag != 0x30:
            raise ValueError("Expected RSAPrivateKey SEQUENCE inside OCTET STRING")
        _, offset = _parse_der_length(der, offset + 1)
        ver, offset = _parse_der_integer(der, offset)

    # Now we are in RSAPrivateKey: version, n, e, d, p, q, dmp1, dmq1, iqmp
    n, offset = _parse_der_integer(der, offset)
    e, offset = _parse_der_integer(der, offset)
    d, offset = _parse_der_integer(der, offset)
    return n, d


def _sign_rs256_pure_python(data_bytes: bytes, n: int, d: int) -> bytes:
    """
    Signature RSA PKCS#1 v1.5 avec SHA-256 en pur Python (sans aucune dépendance C).
    """
    sha256_hash = hashlib.sha256(data_bytes).digest()
    # DigestInfo prefix for SHA-256 (RFC 8017 / PKCS #1 v2.2)
    digest_info_prefix = b'\x30\x31\x30\x0d\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x01\x05\x00\x04\x20'
    t = digest_info_prefix + sha256_hash
    k = (n.bit_length() + 7) // 8  # 256 bytes for 2048-bit RSA

    if len(t) > k - 11:
        raise ValueError("Intention string too long for RSA key size")

    ps_len = k - len(t) - 3
    em = b'\x00\x01' + (b'\xff' * ps_len) + b'\x00' + t

    em_int = int.from_bytes(em, byteorder='big')
    sig_int = pow(em_int, d, n)
    return sig_int.to_bytes(k, byteorder='big')


def generate_jwt_assertion(cred: dict) -> str:
    """Crée un JWT OAuth2 signé avec la clé privée du compte de service."""
    now = int(time.time())
    header = {'alg': 'RS256', 'typ': 'JWT'}
    payload = {
        'iss': cred['client_email'],
        'scope': 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive',
        'aud': cred.get('token_uri', 'https://oauth2.googleapis.com/token'),
        'exp': now + 3600,
        'iat': now
    }

    h_b64 = _b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signing_input = f"{h_b64}.{p_b64}".encode('ascii')

    # Utiliser le signer pur Python
    n, d = _extract_rsa_private_key_numbers(cred['private_key'])
    sig_bytes = _sign_rs256_pure_python(signing_input, n, d)
    sig_b64 = _b64url_encode(sig_bytes)

    return f"{h_b64}.{p_b64}.{sig_b64}"


def get_access_token():
    """Génère ou réutilise un token OAuth2 pour l'API Google Drive."""
    now = time.time()
    if _TOKEN_CACHE['token'] and _TOKEN_CACHE['expires_at'] > (now + 60):
        return _TOKEN_CACHE['token']

    cred = load_credentials()
    if not cred:
        _FILES_CACHE['last_error'] = "Fichier 'google_service_account.json' manquant ou invalide."
        return None

    try:
        jwt_token = generate_jwt_assertion(cred)
        post_data = urllib.parse.urlencode({
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': jwt_token
        }).encode('utf-8')

        token_url = cred.get('token_uri', 'https://oauth2.googleapis.com/token')
        req = urllib.request.Request(
            token_url,
            data=post_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )

        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            token = data.get('access_token')
            if token:
                _TOKEN_CACHE['token'] = token
                _TOKEN_CACHE['expires_at'] = now + int(data.get('expires_in', 3600)) - 60
                _FILES_CACHE['last_error'] = None
                return token
            else:
                _FILES_CACHE['last_error'] = f"Token non reçu: {data}"
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='replace')
        print(f"[GDrive] OAuth2 HTTP Error {e.code}: {err_msg}")
        _FILES_CACHE['last_error'] = f"Erreur d'authentification Google ({e.code}): {err_msg}"
    except Exception as e:
        print(f"[GDrive] Access Token Error: {e}")
        _FILES_CACHE['last_error'] = f"Erreur de signature / connexion: {str(e)}"

    return None


def deduce_category_and_level(filename):
    """Déduit intelligemment la catégorie et le niveau du cours selon son nom de fichier."""
    fn_lower = filename.lower()

    # Catégorie
    if any(w in fn_lower for w in ['preposition', 'prepositions', 'in on at']):
        category = 'Prépositions'
    elif any(w in fn_lower for w in ['phrasal', 'verb', 'phrasal_verb', 'phrasal verbs']):
        category = 'Phrasal Verbs'
    elif any(w in fn_lower for w in ['irregular', 'irregulier', 'irreguliers', 'verbs']):
        category = 'Verbes Irréguliers'
    elif any(w in fn_lower for w in ['pronunciation', 'prononciation', 'phonetic', 'accent', 'phonetique']):
        category = 'Prononciation'
    elif any(w in fn_lower for w in ['vocab', 'vocabulary', 'vocabulaire', 'mots', 'words', 'expressions']):
        category = 'Vocabulaire'
    elif any(w in fn_lower for w in ['business', 'pro', 'email', 'meeting', 'travail', 'entretien', 'negociation']):
        category = 'Business English'
    elif any(w in fn_lower for w in ['tenses', 'present', 'past', 'future', 'grammar', 'grammaire', 'gerund', 'conditionnel', 'modal']):
        category = 'Grammaire'
    else:
        category = 'Général'

    # Niveau
    if any(w in fn_lower for w in ['a1', 'a2', 'debutant', 'beginner', 'starter', 'base', 'bases']):
        level = 'Débutant (A1-A2)'
    elif any(w in fn_lower for w in ['b1', 'b2', 'intermediaire', 'intermediate']):
        level = 'Intermédiaire (B1-B2)'
    elif any(w in fn_lower for w in ['c1', 'c2', 'avance', 'advanced', 'expert', 'maitrise']):
        level = 'Avancé (C1)'
    else:
        level = 'Tous niveaux'

    return category, level


def list_drive_courses(folder_id=DEFAULT_FOLDER_ID, force_refresh=False):
    """
    Récupère la liste des cours (PDFs et documents) stockés dans le dossier Google Drive.
    Gère aussi la recherche globale si le dossier parent spécifique n'a pas encore de fichiers.
    """
    now = time.time()
    if not force_refresh and _FILES_CACHE['files'] and (now - _FILES_CACHE['synced_at']) < CACHE_TTL:
        return _FILES_CACHE['files']

    token = get_access_token()
    if not token:
        print("[GDrive] Warning: No access token available to fetch Google Drive files.")
        return _FILES_CACHE['files'] or []

    try:
        # Requête 1 : Chercher d'abord dans le dossier spécifié
        query = f"'{folder_id}' in parents and trashed = false"
        fields = "files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink)"
        url = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(query)}&fields={urllib.parse.quote(fields)}&pageSize=100&orderBy=name"

        items = []
        try:
            req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                items = data.get('files', [])
                _FILES_CACHE['folder_status'] = 'accessible'
        except urllib.error.HTTPError as he:
            print(f"[GDrive] Folder query HTTP Error {he.code}: {he.reason}")
            _FILES_CACHE['folder_status'] = f'error_{he.code}'
            # Si le dossier est 404 (non partagé), chercher tous les fichiers partagés avec le compte de service
            if he.code in (404, 403, 400):
                fallback_query = "trashed = false and mimeType != 'application/vnd.google-apps.folder'"
                fb_url = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(fallback_query)}&fields={urllib.parse.quote(fields)}&pageSize=100"
                try:
                    fb_req = urllib.request.Request(fb_url, headers={'Authorization': f'Bearer {token}'})
                    with urllib.request.urlopen(fb_req, timeout=12) as fb_resp:
                        fb_data = json.loads(fb_resp.read().decode('utf-8'))
                        items = fb_data.get('files', [])
                except Exception:
                    pass

        lessons = []
        for item in items:
            mime = item.get('mimeType', '')
            # Ignore subfolders in the files listing
            if mime == 'application/vnd.google-apps.folder':
                continue

            name = item.get('name', 'Sans titre')
            file_id = item.get('id')
            size_bytes = int(item.get('size', 0)) if item.get('size') else 0
            size_kb = round(size_bytes / 1024, 1) if size_bytes > 0 else 0
            size_str = f"{size_kb} Ko" if size_kb < 1024 else f"{round(size_kb/1024, 2)} Mo"

            created_str = ''
            if item.get('createdTime'):
                try:
                    dt = datetime.fromisoformat(item['createdTime'].replace('Z', '+00:00'))
                    created_str = dt.strftime('%d/%m/%Y %H:%M')
                except Exception:
                    created_str = item.get('createdTime')

            cat, lvl = deduce_category_and_level(name)
            clean_title = name
            for ext in ['.pdf', '.PDF', '.docx', '.doc', '.pptx', '.ppt']:
                if clean_title.endswith(ext):
                    clean_title = clean_title[:-len(ext)]
            clean_title = clean_title.replace('_', ' ').replace('-', ' ').strip()

            lessons.append({
                'id': f"gdrive_{file_id}",
                'driveFileId': file_id,
                'isGoogleDrive': True,
                'filename': name,
                'title': clean_title or name,
                'category': cat,
                'level': lvl,
                'size': size_str if size_bytes > 0 else 'Cloud Drive',
                'mimeType': mime,
                'webViewLink': item.get('webViewLink') or f"https://drive.google.com/file/d/{file_id}/view",
                'downloadUrl': f"/api/gdrive/download/{file_id}?name={urllib.parse.quote(name)}",
                'previewUrl': f"/api/gdrive/preview/{file_id}",
                'createdAt': created_str,
                'source': 'Google Drive Officiel'
            })

        _FILES_CACHE['files'] = lessons
        _FILES_CACHE['synced_at'] = now
        _FILES_CACHE['last_error'] = None
        return lessons
    except Exception as e:
        print(f"[GDrive] Error listing drive files: {e}")
        _FILES_CACHE['last_error'] = str(e)
        return _FILES_CACHE['files'] or []


def download_drive_file(file_id):
    """Télécharge le binaire d'un fichier Drive pour le streamer ou le prévisualiser."""
    token = get_access_token()
    if not token:
        return None, None

    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        resp = urllib.request.urlopen(req, timeout=20)
        content_type = resp.headers.get('Content-Type', 'application/pdf')
        content = resp.read()
        return content, content_type
    except urllib.error.HTTPError as e:
        if e.code in (403, 400):
            try:
                export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=application/pdf"
                export_req = urllib.request.Request(export_url, headers={'Authorization': f'Bearer {token}'})
                export_resp = urllib.request.urlopen(export_req, timeout=20)
                return export_resp.read(), 'application/pdf'
            except Exception:
                pass
        print(f"[GDrive] HTTP error downloading file {file_id}: {e}")
        return None, None
    except Exception as e:
        print(f"[GDrive] Error downloading file {file_id}: {e}")
        return None, None


def diagnose():
    """Effectue un diagnostic complet de la connexion Google Drive."""
    cred = load_credentials()
    diag = {
        'credentials_loaded': bool(cred),
        'client_email': cred.get('client_email') if cred else None,
        'project_id': cred.get('project_id') if cred else None,
        'folder_id': DEFAULT_FOLDER_ID,
        'folder_url': f"https://drive.google.com/drive/folders/{DEFAULT_FOLDER_ID}",
        'token_generated': False,
        'token_error': None,
        'folder_accessible': False,
        'folder_files_count': 0,
        'total_shared_files_count': 0,
        'action_required': None
    }

    if not cred:
        diag['token_error'] = "Fichier credentials introuvable."
        diag['action_required'] = "Vérifier le fichier google_service_account.json"
        return diag

    token = get_access_token()
    if not token:
        diag['token_error'] = _FILES_CACHE.get('last_error') or "Impossible d'obtenir un access token."
        diag['action_required'] = "Vérifier la validité de la clé privée et que l'API Google Drive est activée sur Google Cloud Console."
        return diag

    diag['token_generated'] = True

    # Tester l'accès au dossier
    query_folder = f"'{DEFAULT_FOLDER_ID}' in parents and trashed = false"
    url_folder = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(query_folder)}&pageSize=50"
    try:
        req = urllib.request.Request(url_folder, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            files = data.get('files', [])
            diag['folder_accessible'] = True
            diag['folder_files_count'] = len(files)
    except urllib.error.HTTPError as he:
        diag['folder_error'] = f"HTTP {he.code}: {he.reason}"
        if he.code == 404:
            diag['action_required'] = (
                f"Le dossier Google Drive n'est pas encore partagé avec votre compte de service. "
                f"Veuillez ouvrir votre dossier Google Drive ({diag['folder_url']}), "
                f"cliquer sur 'Partager' (Share) et ajouter l'adresse email : {cred.get('client_email')} en tant que 'Lecteur' ou 'Éditeur'."
            )
    except Exception as e:
        diag['folder_error'] = str(e)

    # Tester la liste globale de tous les fichiers partagés
    query_all = "trashed = false"
    url_all = f"https://www.googleapis.com/drive/v3/files?q={urllib.parse.quote(query_all)}&pageSize=50"
    try:
        req_all = urllib.request.Request(url_all, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req_all, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            diag['total_shared_files_count'] = len(data.get('files', []))
    except Exception:
        pass

    if diag['folder_accessible'] and diag['folder_files_count'] == 0:
        diag['action_required'] = f"Le dossier est accessible mais vide. Déposez des fichiers PDF dans le dossier Google Drive ({diag['folder_url']})."
    elif diag['folder_accessible'] and diag['folder_files_count'] > 0:
        diag['action_required'] = "Tout est parfaitement configuré et fonctionnel !"

    return diag
