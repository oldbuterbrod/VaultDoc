#!/usr/bin/env python3
import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

FRONTEND_URL = "http://localhost:3000"

USERS = {
    "admin": {
        "email": "admin@vaultdoc.ru",
        "password": "AdminPass123!",
    },
    "employee": {
        "email": "employee1@vaultdoc.ru",
        "password": "EmployeePass123!",
    },
}

TARGETS = {
    "dashboard": "/dashboard",
    "documents": "/documents",
    "permissions": "/permissions",
    "audit": "/audit",
}


def main() -> None:
    role = sys.argv[1].strip().lower() if len(sys.argv) > 1 else "admin"
    target = sys.argv[2].strip().lower() if len(sys.argv) > 2 else "dashboard"

    if role not in USERS:
        raise SystemExit("Использование: python3 vaultdoc_browser_login.py [admin|employee] [dashboard|documents|permissions|audit]")

    if target not in TARGETS:
        raise SystemExit("Целевая страница: dashboard | documents | permissions | audit")

    creds = USERS[role]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=120)
        context = browser.new_context()
        page = context.new_page()

        page.goto(FRONTEND_URL, wait_until="networkidle")

        page.get_by_placeholder("Введите Email").fill(creds["email"])
        page.get_by_placeholder("Введите пароль").fill(creds["password"])
        page.get_by_role("button", name="Войти").click()

        try:
            page.wait_for_url("**/dashboard", timeout=10000)
        except PlaywrightTimeoutError:
            browser.close()
            raise SystemExit("Не удалось дождаться логина. Проверь, что frontend и backend запущены.")

        if target != "dashboard":
            page.goto(f"{FRONTEND_URL}{TARGETS[target]}", wait_until="networkidle")

        print(f"Открыто как {role}: {FRONTEND_URL}{TARGETS[target]}")
        print("Окно браузера оставлено открытым. Нажми Enter в терминале, чтобы закрыть его.")
        input()

        browser.close()


if __name__ == "__main__":
    main()
