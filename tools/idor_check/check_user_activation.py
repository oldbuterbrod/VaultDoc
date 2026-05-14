import argparse
import sys
from typing import Any

from testlib import ApiClient, check, expect_status, find_audit_events, require_login, summarize


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

    me_response = employee.get("/api/auth/me")
    expect_status(me_response, 200, "GET /api/auth/me employee", failures)
    if me_response.status_code != 200:
        return summarize(failures)

    employee_me: dict[str, Any] = me_response.json()
    employee_public_id = employee_me["public_id"]

    deactivate_response = admin.patch(
        f"/api/users/{employee_public_id}/activation",
        {"is_active": False},
    )
    expect_status(deactivate_response, 200, "Admin деактивирует employee", failures)

    employee_after_deactivate = ApiClient(args.base_url, args.employee_email, args.employee_password)
    login_after_deactivate = employee_after_deactivate.login()
    check(
        login_after_deactivate.status_code != 200,
        "Деактивированный employee не входит в систему",
        f"Получен статус {login_after_deactivate.status_code}, ответ: {login_after_deactivate.text}",
        failures,
    )

    activate_response = admin.patch(
        f"/api/users/{employee_public_id}/activation",
        {"is_active": True},
    )
    expect_status(activate_response, 200, "Admin активирует employee обратно", failures)

    employee_after_activate = ApiClient(args.base_url, args.employee_email, args.employee_password)
    login_after_activate = employee_after_activate.login()
    expect_status(login_after_activate, 200, "Повторный вход employee после активации", failures)

    if args.check_audit:
        audit_response = admin.get("/api/audit/?limit=100")
        expect_status(audit_response, 200, "Admin читает аудит для проверки активации", failures)

        if audit_response.status_code == 200:
            audit_rows: list[dict[str, Any]] = audit_response.json()
            actions = {
                row.get("action")
                for row in find_audit_events(audit_rows, resource_public_id=employee_public_id)
            }

            check(
                "user_deactivated" in actions,
                "Аудит содержит user_deactivated",
                f"Найдены действия: {sorted(actions)}",
                failures,
            )

            check(
                "user_activated" in actions,
                "Аудит содержит user_activated",
                f"Найдены действия: {sorted(actions)}",
                failures,
            )

    return summarize(failures)


if __name__ == "__main__":
    sys.exit(main())