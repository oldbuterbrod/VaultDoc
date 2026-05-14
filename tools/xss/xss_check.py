import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


TARGET_URL = os.environ.get("TARGET_URL", "http://127.0.0.1:8080").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@vaultdoc.ru")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "AdminPass123!")

SCRIPT_DIR = Path(__file__).resolve().parent
STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_DIR = SCRIPT_DIR / "security-reports" / "xss" / STAMP
OUT_DIR.mkdir(parents=True, exist_ok=True)

PAYLOADS = [
    "<img src=x onerror=\"window.__vaultdoc_xss=1;alert('xss')\">",
    "<svg onload=\"window.__vaultdoc_xss=1;alert('xss')\"></svg>",
    "<script>window.__vaultdoc_xss=1;alert('xss')</script>",
    "\"><img src=x onerror=\"window.__vaultdoc_xss=1;alert('xss')\">",
]


def request_json(method, path, token=None, body=None):
    url = f"{TARGET_URL}{path}"
    data = None
    headers = {}

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(raw) if raw else None
            except Exception:
                payload = raw
            return response.status, payload
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else raw
        except Exception:
            payload = raw
        return exc.code, payload


def login_api():
    url = f"{TARGET_URL}/api/auth/login"
    body = urllib.parse.urlencode({
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode("utf-8"))

    for key in ("access_token", "token", "accessToken"):
        value = data.get(key)
        if value:
            return value

    raise RuntimeError("JWT не найден в ответе login")


def create_xss_folders(token):
    created = []

    for index, payload in enumerate(PAYLOADS, start=1):
        name = f"xss-test-{STAMP}-{index}-{payload}"
        variants = [
            {"name": name},
            {"name": name, "parent_id": None},
            {"title": name},
        ]

        success = False

        for path in ("/api/folders", "/api/folders/"):
            for body in variants:
                status, response = request_json("POST", path, token=token, body=body)
                if 200 <= status < 300:
                    created.append({
                        "path": path,
                        "status": status,
                        "body": body,
                        "response": response,
                    })
                    success = True
                    break
            if success:
                break

        if not success:
            created.append({
                "status": "failed",
                "payload": payload,
            })

    return created


def login_ui(page):
    page.goto(f"{TARGET_URL}/login", wait_until="networkidle")

    selectors_email = [
        "input[type='email']",
        "input[name='email']",
        "input[name='username']",
        "input:first-of-type",
    ]

    filled_email = False

    for selector in selectors_email:
        try:
            page.locator(selector).first.fill(ADMIN_EMAIL, timeout=2000)
            filled_email = True
            break
        except Exception:
            pass

    if not filled_email:
        raise RuntimeError("Не найдено поле логина")

    selectors_password = [
        "input[type='password']",
        "input[name='password']",
    ]

    filled_password = False

    for selector in selectors_password:
        try:
            page.locator(selector).first.fill(ADMIN_PASSWORD, timeout=2000)
            filled_password = True
            break
        except Exception:
            pass

    if not filled_password:
        raise RuntimeError("Не найдено поле пароля")

    clicked = False

    for selector in ("button[type='submit']", "button"):
        try:
            page.locator(selector).first.click(timeout=2000)
            clicked = True
            break
        except Exception:
            pass

    if not clicked:
        raise RuntimeError("Не найдена кнопка входа")

    page.wait_for_load_state("networkidle", timeout=10000)


def check_pages():
    dialogs = []
    js_hits = []
    pages_checked = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(ignore_https_errors=True)
        page = context.new_page()

        page.on("dialog", lambda dialog: (dialogs.append(dialog.message), dialog.accept()))
        page.add_init_script("window.__vaultdoc_xss = 0")

        login_ui(page)

        routes = [
            "/",
            "/dashboard",
            "/documents",
            "/users",
            "/permissions",
            "/audit",
        ]

        for route in routes:
            url = f"{TARGET_URL}{route}"
            try:
                page.goto(url, wait_until="networkidle", timeout=15000)
                time.sleep(1)
                marker = page.evaluate("window.__vaultdoc_xss")
                pages_checked.append(url)
                if marker:
                    js_hits.append(url)
                page.screenshot(path=str(OUT_DIR / f"{route.strip('/').replace('/', '_') or 'root'}.png"), full_page=True)
            except PlaywrightTimeoutError:
                pages_checked.append(f"{url} timeout")
            except Exception as exc:
                pages_checked.append(f"{url} error: {exc}")

        browser.close()

    return {
        "dialogs": dialogs,
        "js_hits": js_hits,
        "pages_checked": pages_checked,
    }


def main():
    result = {
        "target": TARGET_URL,
        "created": [],
        "browser_check": {},
        "status": "unknown",
    }

    try:
        token = login_api()
        created = create_xss_folders(token)
        result["created"] = created
        browser_check = check_pages()
        result["browser_check"] = browser_check

        failed = bool(browser_check["dialogs"] or browser_check["js_hits"])

        if failed:
            result["status"] = "failed"
        else:
            result["status"] = "passed"

    except Exception as exc:
        result["status"] = "error"
        result["error"] = str(exc)

    report_json = OUT_DIR / "xss_report.json"
    report_txt = OUT_DIR / "xss_summary.txt"

    report_json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "Итоговая сводка XSS-проверки",
        f"Цель: {TARGET_URL}",
        f"Папка отчёта: {OUT_DIR}",
        f"Статус: {result['status']}",
        "",
        "Создание тестовых объектов:",
    ]

    for item in result.get("created", []):
        lines.append(str(item.get("status")))

    browser_check = result.get("browser_check") or {}

    lines.extend([
        "",
        "Проверенные страницы:",
    ])

    for item in browser_check.get("pages_checked", []):
        lines.append(str(item))

    lines.extend([
        "",
        f"Dialog/alert срабатывания: {len(browser_check.get('dialogs', []))}",
        f"JS marker срабатывания: {len(browser_check.get('js_hits', []))}",
    ])

    if result["status"] == "passed":
        lines.append("Выполнение XSS-payload-ов не обнаружено.")
    elif result["status"] == "failed":
        lines.append("Обнаружено выполнение XSS-payload-а.")
    else:
        lines.append(f"Ошибка: {result.get('error')}")

    report_txt.write_text("\n".join(lines), encoding="utf-8")

    print("\n".join(lines))

    if result["status"] == "failed":
        sys.exit(1)

    if result["status"] == "error":
        sys.exit(2)


if __name__ == "__main__":
    main()
