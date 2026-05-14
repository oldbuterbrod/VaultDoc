import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import requests
except Exception as exc:
    print(f"Не хватает зависимости: {exc}")
    print("Установи: python3 -m pip install requests")
    sys.exit(1)


TARGET_URL = os.environ.get("TARGET_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@vaultdoc.ru")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")
PAUSE = float(os.environ.get("SEED_PAUSE", "2.5"))

SCRIPT_DIR = Path(__file__).resolve().parent
STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_DIR = SCRIPT_DIR / "generated_users_permissions" / STAMP
OUT_DIR.mkdir(parents=True, exist_ok=True)

USERS = [
    {
        "email": "ivan.petrov@vaultdoc.ru",
        "password": "PetrovPass123!",
        "full_name": "Иван Петров",
        "role": "manager",
        "is_active": True,
    },
    {
        "email": "anna.smirnova@vaultdoc.ru",
        "password": "SmirnovaPass123!",
        "full_name": "Анна Смирнова",
        "role": "employee",
        "is_active": True,
    },
    {
        "email": "dmitry.volkov@vaultdoc.ru",
        "password": "VolkovPass123!",
        "full_name": "Дмитрий Волков",
        "role": "employee",
        "is_active": True,
    },
    {
        "email": "elena.kuznetsova@vaultdoc.ru",
        "password": "KuznetsovaPass123!",
        "full_name": "Елена Кузнецова",
        "role": "employee",
        "is_active": True,
    },
    {
        "email": "sergey.orlov@vaultdoc.ru",
        "password": "OrlovPass123!",
        "full_name": "Сергей Орлов",
        "role": "employee",
        "is_active": True,
    },
    {
        "email": "maria.fedorova@vaultdoc.ru",
        "password": "FedorovaPass123!",
        "full_name": "Мария Фёдорова",
        "role": "employee",
        "is_active": True,
    },
    {
        "email": "alexey.novikov@vaultdoc.ru",
        "password": "NovikovPass123!",
        "full_name": "Алексей Новиков",
        "role": "developer",
        "is_active": True,
    },
    {
        "email": "olga.morozova@vaultdoc.ru",
        "password": "MorozovaPass123!",
        "full_name": "Ольга Морозова",
        "role": "security_admin",
        "is_active": True,
    },
]

PERMISSION_TARGETS = [
    {
        "email": "ivan.petrov@vaultdoc.ru",
        "folder_slice": (0, 8),
        "document_slice": (0, 20),
        "rights": {
            "can_read": True,
            "can_update": True,
            "can_delete": False,
            "can_manage_access": True,
        },
    },
    {
        "email": "anna.smirnova@vaultdoc.ru",
        "folder_slice": (0, 4),
        "document_slice": (0, 15),
        "rights": {
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    },
    {
        "email": "dmitry.volkov@vaultdoc.ru",
        "folder_slice": (4, 8),
        "document_slice": (15, 30),
        "rights": {
            "can_read": True,
            "can_update": True,
            "can_delete": False,
            "can_manage_access": False,
        },
    },
    {
        "email": "elena.kuznetsova@vaultdoc.ru",
        "folder_slice": (8, 12),
        "document_slice": (30, 45),
        "rights": {
            "can_read": True,
            "can_update": False,
            "can_delete": True,
            "can_manage_access": False,
        },
    },
    {
        "email": "sergey.orlov@vaultdoc.ru",
        "folder_slice": (12, 16),
        "document_slice": (45, 60),
        "rights": {
            "can_read": True,
            "can_update": True,
            "can_delete": True,
            "can_manage_access": False,
        },
    },
    {
        "email": "maria.fedorova@vaultdoc.ru",
        "folder_slice": (16, 20),
        "document_slice": (60, 80),
        "rights": {
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    },
]


def sleep_pause():
    time.sleep(PAUSE)


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def request_with_retry(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})

    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_response = None

    for attempt in range(6):
        response = requests.request(
            method,
            f"{TARGET_URL}{path}",
            headers=headers,
            timeout=60,
            allow_redirects=False,
            **kwargs,
        )

        last_response = response

        if response.status_code != 503:
            return response

        time.sleep(3 + attempt)

    return last_response


def login():
    response = requests.post(
        f"{TARGET_URL}/api/auth/login",
        data={
            "username": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=30,
        allow_redirects=False,
    )

    if response.status_code < 200 or response.status_code >= 300:
        print("Не удалось войти под admin")
        print(response.status_code)
        print(response.text)
        sys.exit(1)

    data = response.json()

    for key in ("access_token", "token", "accessToken"):
        value = data.get(key)
        if value:
            return value

    print("JWT не найден")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    sys.exit(1)


def normalize_list(data):
    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        for key in ("items", "data", "results", "users", "folders", "documents"):
            value = data.get(key)
            if isinstance(value, list):
                return value

    return []


def get_list(path, token):
    response = request_with_retry("GET", path, token=token)

    if response.status_code < 200 or response.status_code >= 300:
        print(f"Ошибка GET {path}")
        print(response.status_code)
        print(response.text)
        return []

    try:
        return normalize_list(response.json())
    except Exception:
        return []


def create_or_get_users(token):
    existing = get_list("/api/users/", token)
    by_email = {item.get("email", "").lower(): item for item in existing}
    result = []

    for payload in USERS:
        email = payload["email"].lower()

        if email in by_email:
            user = by_email[email]
            result.append(user)
            print(f"  exists {email}")
            sleep_pause()
            continue

        response = request_with_retry(
            "POST",
            "/api/users/",
            token=token,
            headers={"Content-Type": "application/json"},
            json=payload,
        )

        if response.status_code >= 200 and response.status_code < 300:
            user = response.json()
            result.append(user)
            print(f"  created {email}")
        else:
            print(f"  failed {email}")
            print(response.status_code)
            print(response.text)

        sleep_pause()

    updated_existing = get_list("/api/users/", token)
    updated_by_email = {item.get("email", "").lower(): item for item in updated_existing}

    final_result = []

    for payload in USERS:
        user = updated_by_email.get(payload["email"].lower())
        if user:
            final_result.append(user)

    return final_result


def public_id(item):
    return item.get("public_id") or item.get("id")


def display_name(item):
    return (
        item.get("title")
        or item.get("name")
        or item.get("email")
        or item.get("full_name")
        or str(public_id(item))
    )


def user_by_email(users, email):
    email = email.lower()

    for user in users:
        if user.get("email", "").lower() == email:
            return user

    return None


def grant_permission(method, path, token, payload):
    response = request_with_retry(
        method,
        path,
        token=token,
        headers={"Content-Type": "application/json"},
        json=payload,
    )

    if response.status_code >= 200 and response.status_code < 300:
        try:
            return True, response.json()
        except Exception:
            return True, {}

    return False, {
        "status": response.status_code,
        "body": response.text,
    }


def grant_folder_permission(token, folder, user, rights):
    folder_public_id = public_id(folder)
    user_public_id = public_id(user)

    if not folder_public_id or not user_public_id:
        return False, "missing public_id"

    payload = {
        "user_public_id": str(user_public_id),
        "can_read": rights.get("can_read", False),
        "can_update": rights.get("can_update", False),
        "can_delete": rights.get("can_delete", False),
        "can_manage_access": rights.get("can_manage_access", False),
    }

    path = f"/api/permissions/folders/{folder_public_id}"

    for method in ("POST", "PUT", "PATCH"):
        ok, response = grant_permission(method, path, token, payload)

        if ok:
            return True, response

        if isinstance(response, dict) and response.get("status") not in (400, 404, 405, 409, 422):
            return False, response

    return False, response


def grant_document_permission(token, document, user, rights):
    document_public_id = public_id(document)
    user_public_id = public_id(user)

    if not document_public_id or not user_public_id:
        return False, "missing public_id"

    payload = {
        "user_public_id": str(user_public_id),
        "can_read": rights.get("can_read", False),
        "can_update": rights.get("can_update", False),
        "can_delete": rights.get("can_delete", False),
        "can_manage_access": rights.get("can_manage_access", False),
    }

    path = f"/api/permissions/documents/{document_public_id}"

    for method in ("POST", "PUT", "PATCH"):
        ok, response = grant_permission(method, path, token, payload)

        if ok:
            return True, response

        if isinstance(response, dict) and response.get("status") not in (400, 404, 405, 409, 422):
            return False, response

    return False, response


def apply_permissions(token, users, folders, documents):
    report = {
        "folder_permissions": [],
        "document_permissions": [],
    }

    for target in PERMISSION_TARGETS:
        user = user_by_email(users, target["email"])

        if not user:
            print(f"Пользователь не найден: {target['email']}")
            continue

        folder_start, folder_end = target["folder_slice"]
        document_start, document_end = target["document_slice"]

        selected_folders = folders[folder_start:folder_end]
        selected_documents = documents[document_start:document_end]

        print(f"Права для {target['email']}")

        for folder in selected_folders:
            ok, response = grant_folder_permission(token, folder, user, target["rights"])

            item = {
                "user": target["email"],
                "folder": display_name(folder),
                "ok": ok,
                "rights": target["rights"],
                "response": response,
            }

            report["folder_permissions"].append(item)

            if ok:
                print(f"  folder ok {item['folder']}")
            else:
                print(f"  folder fail {item['folder']}")

            sleep_pause()

        for document in selected_documents:
            ok, response = grant_document_permission(token, document, user, target["rights"])

            item = {
                "user": target["email"],
                "document": display_name(document),
                "ok": ok,
                "rights": target["rights"],
                "response": response,
            }

            report["document_permissions"].append(item)

            if ok:
                print(f"  document ok {item['document']}")
            else:
                print(f"  document fail {item['document']}")

            sleep_pause()

    return report


def main():
    print(f"Цель: {TARGET_URL}")
    print("Логин под admin")

    token = login()

    print("Создание пользователей")
    users = create_or_get_users(token)

    print("Получение папок")
    folders = get_list("/api/folders/", token)
    print(f"  найдено папок: {len(folders)}")

    print("Получение документов")
    documents = get_list("/api/documents/", token)
    print(f"  найдено документов: {len(documents)}")

    if len(folders) == 0:
        print("Нет папок для выдачи прав")
        sys.exit(1)

    if len(documents) == 0:
        print("Нет документов для выдачи прав")
        sys.exit(1)

    report = {
        "target": TARGET_URL,
        "generated_at": STAMP,
        "users": users,
        "folders_total": len(folders),
        "documents_total": len(documents),
    }

    permissions_report = apply_permissions(token, users, folders, documents)
    report.update(permissions_report)

    folder_ok = sum(1 for item in report["folder_permissions"] if item["ok"])
    folder_fail = sum(1 for item in report["folder_permissions"] if not item["ok"])
    document_ok = sum(1 for item in report["document_permissions"] if item["ok"])
    document_fail = sum(1 for item in report["document_permissions"] if not item["ok"])

    report_path = OUT_DIR / "seed_users_permissions_report.json"
    summary_path = OUT_DIR / "seed_users_permissions_summary.txt"

    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "Итоговая сводка наполнения пользователями и правами",
        f"Цель: {TARGET_URL}",
        f"Папка отчёта: {OUT_DIR}",
        f"Пользователей обработано: {len(users)}",
        f"Папок найдено: {len(folders)}",
        f"Документов найдено: {len(documents)}",
        f"Прав на папки выдано/обновлено: {folder_ok}",
        f"Ошибок прав на папки: {folder_fail}",
        f"Прав на документы выдано/обновлено: {document_ok}",
        f"Ошибок прав на документы: {document_fail}",
        "",
        "Тестовые учётные записи:",
    ]

    for user in USERS:
        lines.append(f"{user['email']} / {user['password']} / {user['role']} / {user['full_name']}")

    summary_path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("\n".join(lines))
    print()
    print(summary_path)

    if folder_fail or document_fail:
        sys.exit(2)


if __name__ == "__main__":
    main()
