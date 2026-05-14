#!/usr/bin/env python3
import json
import sys
from urllib.parse import urlencode

import requests


BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000/dashboard"

USERS = {
    "admin": {
        "username": "admin@vaultdoc.ru",
        "password": "AdminPass123!",
    },
    "employee": {
        "username": "employee1@vaultdoc.ru",
        "password": "EmployeePass123!",
    },
}


def login(role_key: str) -> dict:
    if role_key not in USERS:
        raise SystemExit(
            f"Неизвестная роль '{role_key}'. Используй: {', '.join(USERS.keys())}"
        )

    creds = USERS[role_key]

    response = requests.post(
        f"{BACKEND_URL}/api/auth/login",
        data=urlencode(
            {
                "username": creds["username"],
                "password": creds["password"],
            }
        ),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )

    if response.status_code != 200:
        raise SystemExit(
            f"Ошибка логина: HTTP {response.status_code}\n{response.text}"
        )

    data = response.json()

    if "access_token" not in data:
        raise SystemExit(f"В ответе нет access_token:\n{json.dumps(data, ensure_ascii=False, indent=2)}")

    return data


def build_browser_snippet(auth_data: dict) -> str:
    token = auth_data["access_token"]
    user = auth_data["user"]

    user_json = json.dumps(user, ensure_ascii=False)
    token_json = json.dumps(token, ensure_ascii=False)
    redirect_json = json.dumps(FRONTEND_URL, ensure_ascii=False)

    return f"""localStorage.setItem('access_token', {token_json});
localStorage.setItem('user', JSON.stringify({user_json}));
window.location.href = {redirect_json};"""


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Использование: python vaultdoc_quick_login.py [admin|employee]")

    role_key = sys.argv[1].strip().lower()
    auth_data = login(role_key)

    print("=" * 72)
    print(f"Успешный логин как: {role_key}")
    print("=" * 72)
    print()
    print("Скопируй этот код в консоль браузера на странице http://localhost:3000")
    print()
    print(build_browser_snippet(auth_data))
    print()
    print("=" * 72)


if __name__ == "__main__":
    main()
