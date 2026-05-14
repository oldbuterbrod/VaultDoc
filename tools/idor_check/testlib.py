import sys
from typing import Any

import requests


class ApiClient:
    def __init__(self, base_url: str, email: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.token: str | None = None

    def login(self) -> requests.Response:
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            data={"username": self.email, "password": self.password},
            timeout=20,
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
        return response

    def headers(self) -> dict[str, str]:
        if not self.token:
            raise RuntimeError(f"Нет токена для {self.email}")
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

    def patch(self, path: str, payload: dict[str, Any]) -> requests.Response:
        return self.session.patch(
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

    def upload(
        self,
        path: str,
        file_name: str,
        content: bytes,
        content_type: str,
        form_data: dict[str, str | None] | None = None,
    ) -> requests.Response:
        data = {}
        if form_data:
            data = {k: v for k, v in form_data.items() if v is not None}

        files = {
            "file": (file_name, content, content_type),
        }

        return self.session.post(
            f"{self.base_url}{path}",
            data=data,
            files=files,
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
        if details:
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


def summarize(failures: list[str]) -> int:
    print()
    if failures:
        print(f"Итог: FAIL ({len(failures)})")
        for item in failures:
            print(f"- {item}")
        return 1

    print("Итог: OK")
    return 0


def require_login(client: ApiClient, failures: list[str], label: str) -> bool:
    response = client.login()
    expect_status(response, 200, f"login {label}", failures)
    return response.status_code == 200


def find_audit_events(
    audit_rows: list[dict[str, Any]],
    action: str | None = None,
    resource_public_id: str | None = None,
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for row in audit_rows:
        if action is not None and row.get("action") != action:
            continue
        if resource_public_id is not None and str(row.get("resource_public_id")) != resource_public_id:
            continue
        result.append(row)
    return result


def fail_and_exit(message: str) -> int:
    print(f"[FAIL] {message}")
    return 1