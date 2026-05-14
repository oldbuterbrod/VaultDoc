import argparse
import sys
import time
from typing import Any

from testlib import ApiClient, check, expect_status, require_login, summarize


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--admin-email", default="admin@vaultdoc.ru")
    parser.add_argument("--admin-password", default="AdminPass123!")
    args = parser.parse_args()

    failures: list[str] = []

    admin = ApiClient(args.base_url, args.admin_email, args.admin_password)

    if not require_login(admin, failures, "admin"):
        return summarize(failures)

    file_name = f"bad-upload-{time.strftime('%Y%m%d%H%M%S')}.txt"
    content = b"this file should be rejected"

    upload_response = admin.upload(
        "/api/documents/upload",
        file_name=file_name,
        content=content,
        content_type="text/plain",
        form_data={"title": "bad upload"},
    )
    expect_status(upload_response, 400, "Backend отклоняет недопустимый файл", failures)

    audit_response = admin.get("/api/audit/?limit=100")
    expect_status(audit_response, 200, "Admin читает аудит после rejected upload", failures)

    if audit_response.status_code == 200:
        rows: list[dict[str, Any]] = audit_response.json()

        matched = False
        for row in rows:
            if row.get("action") != "document_upload_rejected":
                continue

            details = row.get("details") or {}
            if details.get("file_name") == file_name:
                matched = True
                break

        check(
            matched,
            "Аудит содержит document_upload_rejected для недопустимого файла",
            f"В последних событиях не найден file_name={file_name}",
            failures,
        )

    return summarize(failures)


if __name__ == "__main__":
    sys.exit(main())