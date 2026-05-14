import argparse
import sys
import time
from typing import Any

import requests


class ApiClient:
    def __init__(self, base_url: str, email: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.token: str | None = None

    def login(self) -> dict[str, Any]:
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            data={
                "username": self.email,
                "password": self.password,
            },
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        return data

    def headers(self) -> dict[str, str]:
        if not self.token:
            raise RuntimeError("Токен не получен")
        return {"Authorization": f"Bearer {self.token}"}

    def get(self, path: str) -> requests.Response:
        return self.session.get(
            f"{self.base_url}{path}",
            headers=self.headers(),
            timeout=20,
        )

    def post(self, path: str, payload: dict[str, Any]) -> requests.Response:
        return self.session.post(
            f"{self.base_url}{path}",
            json=payload,
            headers=self.headers(),
            timeout=20,
        )

    def delete(self, path: str) -> requests.Response:
        return self.session.delete(
            f"{self.base_url}{path}",
            headers=self.headers(),
            timeout=20,
        )


def response_text(response: requests.Response) -> str:
    try:
        return response.text.strip()
    except Exception:
        return "<no body>"


def check(condition: bool, title: str, details: str, failures: list[str]) -> None:
    if condition:
        print(f"[OK]   {title}")
    else:
        print(f"[FAIL] {title}")
        print(details)
        failures.append(title)


def expect_status(
    response: requests.Response,
    expected: int | tuple[int, ...],
    title: str,
    failures: list[str],
) -> None:
    expected_values = expected if isinstance(expected, tuple) else (expected,)
    details = (
        f"Ожидался статус {expected_values}, получен {response.status_code}\n"
        f"URL: {response.request.method} {response.request.url}\n"
        f"Ответ: {response_text(response)}"
    )
    check(response.status_code in expected_values, title, details, failures)


def find_audit_actions(
    audit_rows: list[dict[str, Any]],
    resource_public_id: str,
) -> set[str]:
    result: set[str] = set()
    for row in audit_rows:
        if str(row.get("resource_public_id")) == resource_public_id:
            action = row.get("action")
            if isinstance(action, str):
                result.add(action)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--admin-email", default="admin@vaultdoc.ru")
    parser.add_argument("--admin-password", default="AdminPass123!")
    parser.add_argument("--employee-email", default="employee1@vaultdoc.ru")
    parser.add_argument("--employee-password", default="EmployeePass123!")
    parser.add_argument("--check-audit", action="store_true")
    args = parser.parse_args()

    failures: list[str] = []

    admin = ApiClient(args.base_url, args.admin_email, args.admin_password)
    employee = ApiClient(args.base_url, args.employee_email, args.employee_password)

    try:
        admin.login()
        print(f"[OK]   login admin: {args.admin_email}")
    except Exception as exc:
        print(f"[FAIL] login admin: {args.admin_email}")
        print(str(exc))
        return 1

    try:
        employee.login()
        print(f"[OK]   login employee: {args.employee_email}")
    except Exception as exc:
        print(f"[FAIL] login employee: {args.employee_email}")
        print(str(exc))
        return 1

    admin_me_response = admin.get("/api/auth/me")
    expect_status(admin_me_response, 200, "GET /api/auth/me для admin", failures)
    employee_me_response = employee.get("/api/auth/me")
    expect_status(employee_me_response, 200, "GET /api/auth/me для employee", failures)

    if failures:
        return 1

    admin_me = admin_me_response.json()
    employee_me = employee_me_response.json()
    employee_public_id = employee_me["public_id"]

    stamp = time.strftime("%Y%m%d%H%M%S")
    folder_name = f"idor-folder-{stamp}"
    document_title = f"idor-document-{stamp}"

    create_folder_response = admin.post(
        "/api/folders/",
        {
            "name": folder_name,
            "parent_public_id": None,
        },
    )
    expect_status(create_folder_response, 201, "Создание тестовой папки admin", failures)

    if failures:
        return 1

    folder = create_folder_response.json()
    folder_public_id = folder["public_id"]

    create_document_response = admin.post(
        "/api/documents/",
        {
            "title": document_title,
            "content": "IDOR test content",
            "folder_public_id": None,
        },
    )
    expect_status(create_document_response, 201, "Создание тестового документа admin", failures)

    if failures:
        return 1

    document = create_document_response.json()
    document_public_id = document["public_id"]

    employee_folder_before = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(
        employee_folder_before,
        403,
        "Employee не читает чужую папку без права",
        failures,
    )

    grant_folder_response = admin.post(
        f"/api/permissions/folders/{folder_public_id}",
        {
            "user_public_id": employee_public_id,
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    )
    expect_status(
        grant_folder_response,
        (200, 201),
        "Admin выдаёт can_read на папку",
        failures,
    )

    employee_folder_after_grant = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(
        employee_folder_after_grant,
        200,
        "Employee читает папку после grant",
        failures,
    )

    revoke_folder_response = admin.delete(
        f"/api/permissions/folders/{folder_public_id}/{employee_public_id}"
    )
    expect_status(
        revoke_folder_response,
        204,
        "Admin отзывает право на папку",
        failures,
    )

    employee_folder_after_revoke = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(
        employee_folder_after_revoke,
        403,
        "Employee снова не читает папку после revoke",
        failures,
    )

    employee_document_before = employee.get(f"/api/documents/{document_public_id}")
    expect_status(
        employee_document_before,
        403,
        "Employee не читает чужой документ без права",
        failures,
    )

    grant_document_response = admin.post(
        f"/api/permissions/documents/{document_public_id}",
        {
            "user_public_id": employee_public_id,
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    )
    expect_status(
        grant_document_response,
        (200, 201),
        "Admin выдаёт can_read на документ",
        failures,
    )

    employee_document_after_grant = employee.get(f"/api/documents/{document_public_id}")
    expect_status(
        employee_document_after_grant,
        200,
        "Employee читает документ после grant",
        failures,
    )

    revoke_document_response = admin.delete(
        f"/api/permissions/documents/{document_public_id}/{employee_public_id}"
    )
    expect_status(
        revoke_document_response,
        204,
        "Admin отзывает право на документ",
        failures,
    )

    employee_document_after_revoke = employee.get(f"/api/documents/{document_public_id}")
    expect_status(
        employee_document_after_revoke,
        403,
        "Employee снова не читает документ после revoke",
        failures,
    )

    if args.check_audit:
        audit_response = admin.get("/api/audit/?limit=200")
        expect_status(
            audit_response,
            200,
            "Admin читает журнал аудита",
            failures,
        )

        if audit_response.status_code == 200:
            audit_rows = audit_response.json()

            folder_actions = find_audit_actions(audit_rows, folder_public_id)
            document_actions = find_audit_actions(audit_rows, document_public_id)

            check(
                "folder_permission_granted" in folder_actions
                and "folder_permission_revoked" in folder_actions
                and "access_denied" in folder_actions,
                "Аудит содержит grant/revoke/denied для папки",
                f"Найдены действия по папке: {sorted(folder_actions)}",
                failures,
            )

            check(
                "document_permission_granted" in document_actions
                and "document_permission_revoked" in document_actions
                and "access_denied" in document_actions,
                "Аудит содержит grant/revoke/denied для документа",
                f"Найдены действия по документу: {sorted(document_actions)}",
                failures,
            )

    print()
    print(f"Тестовая папка: {folder_name} ({folder_public_id})")
    print(f"Тестовый документ: {document_title} ({document_public_id})")
    print()

    if failures:
        print(f"Итог: FAIL ({len(failures)})")
        for item in failures:
            print(f"- {item}")
        return 1

    print("Итог: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())