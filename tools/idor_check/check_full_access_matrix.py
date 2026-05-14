import csv
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


BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8080").rstrip("/")
PAUSE = float(os.environ.get("MATRIX_CHECK_PAUSE", "0.8"))
MAX_RETRIES = int(os.environ.get("MATRIX_CHECK_RETRIES", "8"))

ADMIN = {
    "email": os.environ.get("ADMIN_EMAIL", "admin@vaultdoc.ru"),
    "password": os.environ.get("ADMIN_PASSWORD", "AdminPass123!"),
    "role": "admin",
}

USERS = [
    {
        "email": "ivan.petrov@vaultdoc.ru",
        "password": "PetrovPass123!",
        "role": "manager",
    },
    {
        "email": "anna.smirnova@vaultdoc.ru",
        "password": "SmirnovaPass123!",
        "role": "employee",
    },
    {
        "email": "dmitry.volkov@vaultdoc.ru",
        "password": "VolkovPass123!",
        "role": "employee",
    },
    {
        "email": "elena.kuznetsova@vaultdoc.ru",
        "password": "KuznetsovaPass123!",
        "role": "employee",
    },
    {
        "email": "sergey.orlov@vaultdoc.ru",
        "password": "OrlovPass123!",
        "role": "employee",
    },
    {
        "email": "maria.fedorova@vaultdoc.ru",
        "password": "FedorovaPass123!",
        "role": "employee",
    },
    {
        "email": "alexey.novikov@vaultdoc.ru",
        "password": "NovikovPass123!",
        "role": "developer",
    },
    {
        "email": "olga.morozova@vaultdoc.ru",
        "password": "MorozovaPass123!",
        "role": "security_admin",
    },
]


def wait():
    time.sleep(PAUSE)


def request_with_retry(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})

    if token:
        headers["Authorization"] = f"Bearer {token}"

    last_response = None

    for attempt in range(MAX_RETRIES):
        response = requests.request(
            method,
            f"{BASE_URL}{path}",
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


def login(email, password):
    response = request_with_retry(
        "POST",
        "/api/auth/login",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "username": email,
            "password": password,
        },
    )

    wait()

    if response.status_code < 200 or response.status_code >= 300:
        return None, {
            "status": response.status_code,
            "body": response.text,
        }

    try:
        data = response.json()
    except Exception:
        return None, {
            "status": response.status_code,
            "body": response.text,
        }

    for key in ("access_token", "token", "accessToken"):
        value = data.get(key)
        if value:
            return value, None

    return None, {
        "status": response.status_code,
        "body": response.text,
    }


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
    wait()

    if response.status_code < 200 or response.status_code >= 300:
        return response.status_code, []

    try:
        return response.status_code, normalize_list(response.json())
    except Exception:
        return response.status_code, []


def public_id(item):
    return item.get("public_id") or item.get("id")


def object_key(item):
    value = public_id(item)
    return str(value) if value is not None else ""


def object_title(item):
    return (
        item.get("title")
        or item.get("name")
        or item.get("email")
        or str(public_id(item))
    )


def is_success(status_code):
    return 200 <= status_code < 300


def detail_path(resource_type, resource):
    value = object_key(resource)

    if resource_type == "folder":
        return f"/api/folders/{value}"

    return f"/api/documents/{value}"


def load_admin_objects(admin_token):
    folder_status, folders = get_list("/api/folders/", admin_token)
    document_status, documents = get_list("/api/documents/", admin_token)

    if folder_status < 200 or folder_status >= 300:
        raise RuntimeError(f"admin не получил список папок: {folder_status}")

    if document_status < 200 or document_status >= 300:
        raise RuntimeError(f"admin не получил список документов: {document_status}")

    if not folders:
        raise RuntimeError("admin получил пустой список папок")

    if not documents:
        raise RuntimeError("admin получил пустой список документов")

    folders = [item for item in folders if object_key(item)]
    documents = [item for item in documents if object_key(item)]

    return folders, documents


def allowed_sets_for_user(user, token, admin_folders, admin_documents):
    if user["role"] == "admin":
        return {
            "folder_status": 200,
            "document_status": 200,
            "folders": {object_key(item) for item in admin_folders},
            "documents": {object_key(item) for item in admin_documents},
        }

    if user["role"] in {"developer", "security_admin"}:
        folder_status, folder_list = get_list("/api/folders/", token)
        document_status, document_list = get_list("/api/documents/", token)

        return {
            "folder_status": folder_status,
            "document_status": document_status,
            "folders": set(),
            "documents": set(),
            "observed_folder_list_count": len(folder_list),
            "observed_document_list_count": len(document_list),
        }

    folder_status, folder_list = get_list("/api/folders/", token)
    document_status, document_list = get_list("/api/documents/", token)

    return {
        "folder_status": folder_status,
        "document_status": document_status,
        "folders": {object_key(item) for item in folder_list if object_key(item)},
        "documents": {object_key(item) for item in document_list if object_key(item)},
    }


def expected_access(user, resource_type, resource, allowed):
    if user["role"] == "admin":
        return True

    if user["role"] in {"developer", "security_admin"}:
        return False

    key = object_key(resource)

    if resource_type == "folder":
        return key in allowed["folders"]

    return key in allowed["documents"]


def check_detail(user, token, resource_type, resource, allowed):
    path = detail_path(resource_type, resource)
    response = request_with_retry("GET", path, token=token)
    wait()

    expected = expected_access(user, resource_type, resource, allowed)
    actual = is_success(response.status_code)

    return {
        "user": user["email"],
        "role": user["role"],
        "resource_type": resource_type,
        "resource_public_id": object_key(resource),
        "resource_title": object_title(resource),
        "expected_access": expected,
        "actual_access": actual,
        "status_code": response.status_code,
        "passed": expected == actual,
    }


def read_audit(admin_token):
    response = request_with_retry("GET", "/api/audit/?limit=100", token=admin_token)
    wait()

    if response.status_code < 200 or response.status_code >= 300:
        return []

    try:
        return normalize_list(response.json())
    except Exception:
        return []


def count_access_denied(audit):
    result = 0

    for event in audit:
        action = str(event.get("action", ""))
        success = event.get("success")

        if action == "access_denied" or success is False:
            result += 1

    return result


def main():
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = Path(__file__).resolve().parent / "security-reports" / "matrix" / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Цель: {BASE_URL}")
    print("Логин admin")

    admin_token, error = login(ADMIN["email"], ADMIN["password"])

    if not admin_token:
        print("Не удалось войти под admin")
        print(error)
        sys.exit(1)

    print("Получение объектов через admin")
    admin_folders, admin_documents = load_admin_objects(admin_token)

    print(f"Папок найдено: {len(admin_folders)}")
    print(f"Документов найдено: {len(admin_documents)}")

    users = [
        {
            "email": ADMIN["email"],
            "password": ADMIN["password"],
            "role": ADMIN["role"],
        }
    ] + USERS

    tokens = {}
    login_errors = []

    print("Логин пользователей")

    for user in users:
        token, error = login(user["email"], user["password"])

        if token:
            tokens[user["email"]] = token
            print(f"  ok {user['email']}")
        else:
            login_errors.append({
                "user": user["email"],
                "role": user["role"],
                "error": error,
            })
            print(f"  fail {user['email']}")

        wait()

    allowed_by_user = {}
    list_checks = []

    print("Формирование ожидаемой матрицы доступа")

    for user in users:
        token = tokens.get(user["email"])

        if not token:
            continue

        allowed = allowed_sets_for_user(user, token, admin_folders, admin_documents)
        allowed_by_user[user["email"]] = allowed

        list_checks.append({
            "user": user["email"],
            "role": user["role"],
            "folder_status": allowed["folder_status"],
            "document_status": allowed["document_status"],
            "allowed_folders": len(allowed["folders"]),
            "allowed_documents": len(allowed["documents"]),
        })

        print(
            f"  {user['email']} folders={len(allowed['folders'])} documents={len(allowed['documents'])} "
            f"folder_status={allowed['folder_status']} document_status={allowed['document_status']}"
        )

    cases = []

    print("Проверка детального доступа к папкам")

    for user in users:
        token = tokens.get(user["email"])
        allowed = allowed_by_user.get(user["email"])

        if not token or not allowed:
            continue

        for folder in admin_folders:
            item = check_detail(user, token, "folder", folder, allowed)
            cases.append(item)

            marker = "OK" if item["passed"] else "FAIL"
            print(
                f"  {marker} {item['user']} folder {item['status_code']} "
                f"expected={item['expected_access']} actual={item['actual_access']} {item['resource_title']}"
            )

    print("Проверка детального доступа к документам")

    for user in users:
        token = tokens.get(user["email"])
        allowed = allowed_by_user.get(user["email"])

        if not token or not allowed:
            continue

        for document in admin_documents:
            item = check_detail(user, token, "document", document, allowed)
            cases.append(item)

            marker = "OK" if item["passed"] else "FAIL"
            print(
                f"  {marker} {item['user']} document {item['status_code']} "
                f"expected={item['expected_access']} actual={item['actual_access']} {item['resource_title']}"
            )

    audit = read_audit(admin_token)
    access_denied_count = count_access_denied(audit)

    total = len(cases)
    passed = sum(1 for item in cases if item["passed"])
    failed = total - passed
    kqda = passed / total if total else 0

    folder_cases = [item for item in cases if item["resource_type"] == "folder"]
    document_cases = [item for item in cases if item["resource_type"] == "document"]

    folder_passed = sum(1 for item in folder_cases if item["passed"])
    document_passed = sum(1 for item in document_cases if item["passed"])

    report = {
        "target": BASE_URL,
        "generated_at": stamp,
        "users_total": len(users),
        "login_errors": login_errors,
        "folders_total": len(admin_folders),
        "documents_total": len(admin_documents),
        "list_checks": list_checks,
        "cases_total": total,
        "cases_passed": passed,
        "cases_failed": failed,
        "kqda": kqda,
        "folder_cases_total": len(folder_cases),
        "folder_cases_passed": folder_passed,
        "document_cases_total": len(document_cases),
        "document_cases_passed": document_passed,
        "access_denied_events_in_last_100": access_denied_count,
        "cases": cases,
    }

    json_path = out_dir / "full_access_matrix_report.json"
    csv_path = out_dir / "full_access_matrix_cases.csv"
    summary_path = out_dir / "full_access_matrix_summary.txt"

    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    with csv_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "user",
                "role",
                "resource_type",
                "resource_public_id",
                "resource_title",
                "expected_access",
                "actual_access",
                "status_code",
                "passed",
            ],
        )
        writer.writeheader()
        writer.writerows(cases)

    lines = [
        "Итоговая сводка расширенной проверки матрицы доступа",
        f"Цель: {BASE_URL}",
        f"Папка отчёта: {out_dir}",
        f"Пользователей в проверке: {len(users)}",
        f"Ошибок входа пользователей: {len(login_errors)}",
        f"Папок проверено: {len(admin_folders)}",
        f"Документов проверено: {len(admin_documents)}",
        f"Всего проверок доступа: {total}",
        f"Успешных проверок: {passed}",
        f"Ошибочных проверок: {failed}",
        f"ККДА: {kqda:.4f}",
        f"Проверок папок: {folder_passed}/{len(folder_cases)}",
        f"Проверок документов: {document_passed}/{len(document_cases)}",
        f"Событий отказа доступа в последних 100 событиях аудита: {access_denied_count}",
        "",
        "Проверенные пользователи:",
    ]

    for user in users:
        lines.append(f"{user['email']} / {user['role']}")

    lines.extend([
        "",
        "Проверка списков доступных объектов:",
    ])

    for item in list_checks:
        lines.append(
            f"{item['user']} / {item['role']} / folders={item['allowed_folders']} "
            f"/ documents={item['allowed_documents']} / folder_status={item['folder_status']} "
            f"/ document_status={item['document_status']}"
        )

    summary_path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("\n".join(lines))
    print()
    print(summary_path)

    if login_errors or failed:
        sys.exit(2)


if __name__ == "__main__":
    main()
