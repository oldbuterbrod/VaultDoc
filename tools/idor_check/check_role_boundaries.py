import argparse
import sys

from testlib import ApiClient, expect_status, require_login, summarize


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--admin-email", default="admin@vaultdoc.ru")
    parser.add_argument("--admin-password", default="AdminPass123!")
    parser.add_argument("--security-email", default="securityadmin@vaultdoc.ru")
    parser.add_argument("--security-password", default="SecurityAdmin123!")
    parser.add_argument("--developer-email", default="developer1@vaultdoc.ru")
    parser.add_argument("--developer-password", default="Developer123!")
    parser.add_argument("--manager-email", default="manager1@vaultdoc.ru")
    parser.add_argument("--manager-password", default="Manager123!")
    parser.add_argument("--employee-email", default="employee1@vaultdoc.ru")
    parser.add_argument("--employee-password", default="EmployeePass123!")
    args = parser.parse_args()

    failures: list[str] = []

    clients = {
        "admin": ApiClient(args.base_url, args.admin_email, args.admin_password),
        "security_admin": ApiClient(args.base_url, args.security_email, args.security_password),
        "developer": ApiClient(args.base_url, args.developer_email, args.developer_password),
        "manager": ApiClient(args.base_url, args.manager_email, args.manager_password),
        "employee": ApiClient(args.base_url, args.employee_email, args.employee_password),
    }

    for label, client in clients.items():
        if not require_login(client, failures, label):
            return summarize(failures)

    checks = [
        ("admin", "/api/users/", 200, "admin видит пользователей"),
        ("admin", "/api/audit/?limit=10", 200, "admin видит аудит"),
        ("admin", "/api/documents/", 200, "admin видит документы"),

        ("security_admin", "/api/users/", 200, "security_admin видит пользователей"),
        ("security_admin", "/api/audit/?limit=10", 200, "security_admin видит аудит"),
        ("security_admin", "/api/documents/", 403, "security_admin не видит документы"),

        ("developer", "/api/users/", 403, "developer не видит пользователей"),
        ("developer", "/api/audit/?limit=10", 403, "developer не видит аудит"),
        ("developer", "/api/documents/", 403, "developer не видит документы"),

        ("manager", "/api/users/", 403, "manager не видит пользователей"),
        ("manager", "/api/audit/?limit=10", 403, "manager не видит аудит"),
        ("manager", "/api/documents/", 200, "manager видит документы"),

        ("employee", "/api/users/", 403, "employee не видит пользователей"),
        ("employee", "/api/audit/?limit=10", 403, "employee не видит аудит"),
        ("employee", "/api/documents/", 200, "employee видит документы"),
    ]

    for role, path, expected_status, title in checks:
        response = clients[role].get(path)
        expect_status(response, expected_status, title, failures)

    return summarize(failures)


if __name__ == "__main__":
    sys.exit(main())