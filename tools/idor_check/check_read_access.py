import argparse
import sys
import time
from typing import Any

from testlib import ApiClient, expect_status, find_audit_events, require_login, summarize


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

    if not require_login(admin, failures, "admin"):
        return summarize(failures)

    if not require_login(employee, failures, "employee"):
        return summarize(failures)

    employee_me = employee.get("/api/auth/me")
    expect_status(employee_me, 200, "GET /api/auth/me employee", failures)
    if employee_me.status_code != 200:
        return summarize(failures)

    employee_public_id = employee_me.json()["public_id"]

    stamp = time.strftime("%Y%m%d%H%M%S")
    folder_name = f"idor-folder-{stamp}"
    document_title = f"idor-document-{stamp}"

    create_folder = admin.post(
        "/api/folders/",
        {"name": folder_name, "parent_public_id": None},
    )
    expect_status(create_folder, 201, "Создание тестовой папки", failures)
    if create_folder.status_code != 201:
        return summarize(failures)
    folder_public_id = create_folder.json()["public_id"]

    create_document = admin.post(
        "/api/documents/",
        {
            "title": document_title,
            "content": "IDOR test content",
            "folder_public_id": None,
        },
    )
    expect_status(create_document, 201, "Создание тестового документа", failures)
    if create_document.status_code != 201:
        return summarize(failures)
    document_public_id = create_document.json()["public_id"]

    employee_folder_before = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(employee_folder_before, 403, "Employee не читает чужую папку без права", failures)

    grant_folder = admin.post(
        f"/api/permissions/folders/{folder_public_id}",
        {
            "user_public_id": employee_public_id,
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    )
    expect_status(grant_folder, (200, 201), "Admin выдаёт can_read на папку", failures)

    employee_folder_after_grant = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(employee_folder_after_grant, 200, "Employee читает папку после grant", failures)

    revoke_folder = admin.delete(f"/api/permissions/folders/{folder_public_id}/{employee_public_id}")
    expect_status(revoke_folder, 204, "Admin отзывает право на папку", failures)

    employee_folder_after_revoke = employee.get(f"/api/folders/{folder_public_id}")
    expect_status(employee_folder_after_revoke, 403, "Employee снова не читает папку после revoke", failures)

    employee_document_before = employee.get(f"/api/documents/{document_public_id}")
    expect_status(employee_document_before, 403, "Employee не читает чужой документ без права", failures)

    grant_document = admin.post(
        f"/api/permissions/documents/{document_public_id}",
        {
            "user_public_id": employee_public_id,
            "can_read": True,
            "can_update": False,
            "can_delete": False,
            "can_manage_access": False,
        },
    )
    expect_status(grant_document, (200, 201), "Admin выдаёт can_read на документ", failures)

    employee_document_after_grant = employee.get(f"/api/documents/{document_public_id}")
    expect_status(employee_document_after_grant, 200, "Employee читает документ после grant", failures)

    revoke_document = admin.delete(
        f"/api/permissions/documents/{document_public_id}/{employee_public_id}"
    )
    expect_status(revoke_document, 204, "Admin отзывает право на документ", failures)

    employee_document_after_revoke = employee.get(f"/api/documents/{document_public_id}")
    expect_status(employee_document_after_revoke, 403, "Employee снова не читает документ после revoke", failures)

    if args.check_audit:
        audit_response = admin.get("/api/audit/?limit=200")
        expect_status(audit_response, 200, "Admin читает журнал аудита", failures)

        if audit_response.status_code == 200:
            audit_rows: list[dict[str, Any]] = audit_response.json()

            folder_events = find_audit_events(audit_rows, resource_public_id=folder_public_id)
            folder_actions = {row.get("action") for row in folder_events}

            document_events = find_audit_events(audit_rows, resource_public_id=document_public_id)
            document_actions = {row.get("action") for row in document_events}

            if not {"folder_permission_granted", "folder_permission_revoked", "access_denied"}.issubset(folder_actions):
                failures.append("Аудит по папке неполный")
                print(f"[FAIL] Аудит по папке неполный: {sorted(folder_actions)}")
            else:
                print("[OK]   Аудит по папке содержит grant/revoke/denied")

            if not {"document_permission_granted", "document_permission_revoked", "access_denied"}.issubset(document_actions):
                failures.append("Аудит по документу неполный")
                print(f"[FAIL] Аудит по документу неполный: {sorted(document_actions)}")
            else:
                print("[OK]   Аудит по документу содержит grant/revoke/denied")

    print()
    print(f"Тестовая папка: {folder_name} ({folder_public_id})")
    print(f"Тестовый документ: {document_title} ({document_public_id})")

    return summarize(failures)


if __name__ == "__main__":
    sys.exit(main())