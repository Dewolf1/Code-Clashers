"""Firebase Admin SDK initialisation and Firestore client with local dev fallback."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger("firebase_admin")

_app = None
_db = None


class MockFirestoreDoc:
    def __init__(self, doc_id: str, data: dict, collection: MockFirestoreCollection):
        self.id = doc_id
        self._data = data
        self._collection = collection

    @property
    def exists(self) -> bool:
        return self._data is not None

    def to_dict(self) -> dict | None:
        return self._data.copy() if self._data is not None else None

    def set(self, data: dict, merge: bool = False):
        if merge and self._data:
            self._data.update(data)
        else:
            self._data = dict(data)
        self._collection._store[self.id] = self._data

    def update(self, data: dict):
        if self._data is None:
            self._data = {}
        self._data.update(data)
        self._collection._store[self.id] = self._data

    def get(self):
        return self

    def delete(self):
        self._collection._store.pop(self.id, None)
        self._data = None


class MockFirestoreCollection:
    def __init__(self, name: str, root_store: dict):
        self.name = name
        self._store = root_store.setdefault(name, {})

    def document(self, doc_id: str) -> MockFirestoreDoc:
        data = self._store.get(doc_id)
        return MockFirestoreDoc(doc_id, data, self)

    def stream(self):
        for doc_id, data in list(self._store.items()):
            yield MockFirestoreDoc(doc_id, data, self)

    def where(self, field: str, op: str, value: Any):
        filtered_store = {}
        for doc_id, data in self._store.items():
            if op == "==" and data.get(field) == value:
                filtered_store[doc_id] = data
            elif op == "in" and data.get(field) in value:
                filtered_store[doc_id] = data
        mock_col = MockFirestoreCollection(f"{self.name}_filtered", {})
        mock_col._store = filtered_store
        return mock_col

    def limit(self, count: int):
        mock_col = MockFirestoreCollection(f"{self.name}_limit", {})
        items = list(self._store.items())[:count]
        mock_col._store = dict(items)
        return mock_col

    def order_by(self, field: str, direction: str = "ASCENDING"):
        items = sorted(
            self._store.items(),
            key=lambda x: x[1].get(field, 0),
            reverse=(direction.upper() == "DESCENDING"),
        )
        mock_col = MockFirestoreCollection(f"{self.name}_ordered", {})
        mock_col._store = dict(items)
        return mock_col


class MockFirestoreClient:
    """In-memory Firestore-compatible mock client for local testing."""

    def __init__(self):
        self._store: dict[str, dict[str, dict]] = {}

    def collection(self, name: str) -> MockFirestoreCollection:
        return MockFirestoreCollection(name, self._store)


def init_firebase():
    """Initialise Firebase Admin SDK if credentials exist."""
    global _app
    if _app is not None:
        return _app

    try:
        import firebase_admin
        from firebase_admin import credentials

        if settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH:
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
            _app = firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
        elif settings.FIREBASE_PROJECT_ID:
            cred = credentials.ApplicationDefault()
            _app = firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
    except Exception as exc:
        logger.warning("Firebase Admin initialization skipped: %s. Using local memory mock.", exc)
        _app = None

    return _app


def verify_id_token(id_token: str) -> dict:
    """Verify a Firebase ID token or return mock user if in dev mode."""
    if _app is not None:
        from firebase_admin import auth
        return auth.verify_id_token(id_token)
    return {"uid": id_token, "email": f"{id_token}@clashofcodes.dev", "name": id_token}


def get_db():
    """Return live Firestore client if configured, otherwise in-memory mock client."""
    global _db
    if _db is not None:
        return _db

    app = init_firebase()
    if app is not None:
        try:
            from firebase_admin import firestore
            _db = firestore.client()
            return _db
        except Exception as exc:
            logger.warning("Firestore client connect failed: %s. Falling back to mock.", exc)

    _db = MockFirestoreClient()
    return _db
