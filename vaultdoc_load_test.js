import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.TARGET_URL || "http://127.0.0.1:8080";

const USERS = {
  admin: {
    email: __ENV.ADMIN_EMAIL || "admin@vaultdoc.ru",
    password: __ENV.ADMIN_PASSWORD || "AdminPass123!",
  },
  employee: {
    email: __ENV.EMPLOYEE_EMAIL || "employee1@vaultdoc.ru",
    password: __ENV.EMPLOYEE_PASSWORD || "EmployeePass123!",
  },
};

export const options = {
  scenarios: {
    health: {
      executor: "constant-vus",
      vus: 2,
      duration: "1m",
      exec: "healthScenario",
    },
    login: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "1s",
      duration: "1m",
      preAllocatedVUs: 2,
      maxVUs: 4,
      exec: "loginScenario",
    },
    admin_api: {
      executor: "ramping-vus",
      stages: [
        { duration: "20s", target: 5 },
        { duration: "40s", target: 5 },
        { duration: "20s", target: 0 },
      ],
      exec: "adminScenario",
    },
    employee_api: {
      executor: "ramping-vus",
      stages: [
        { duration: "20s", target: 5 },
        { duration: "40s", target: 5 },
        { duration: "20s", target: 0 },
      ],
      exec: "employeeScenario",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.95"],
  },
};

function formBody(data) {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function login(email, password) {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    formBody({ username: email, password }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      tags: {
        endpoint: "login",
      },
    }
  );

  check(response, {
    "login status is 200": (r) => r.status === 200,
    "login has token": (r) => {
      try {
        const data = r.json();
        return Boolean(data.access_token || data.token || data.accessToken);
      } catch {
        return false;
      }
    },
  });

  const data = response.json();
  return data.access_token || data.token || data.accessToken;
}

function authParams(token, endpoint) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    tags: {
      endpoint,
    },
  };
}

export function setup() {
  const adminToken = login(USERS.admin.email, USERS.admin.password);
  const employeeToken = login(USERS.employee.email, USERS.employee.password);

  if (!adminToken) {
    throw new Error("admin token not received");
  }

  if (!employeeToken) {
    throw new Error("employee token not received");
  }

  return {
    adminToken,
    employeeToken,
  };
}

function getOk(url, params, name) {
  const response = http.get(url, params);

  check(response, {
    [`${name} status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  return response;
}

export function healthScenario() {
  getOk(`${BASE_URL}/health`, { tags: { endpoint: "health" } }, "health");
  sleep(1);
}

export function loginScenario() {
  login(USERS.employee.email, USERS.employee.password);
  sleep(1);
}

export function adminScenario(data) {
  group("admin api", () => {
    getOk(`${BASE_URL}/api/auth/me`, authParams(data.adminToken, "admin_me"), "admin_me");
    getOk(`${BASE_URL}/api/users`, authParams(data.adminToken, "admin_users"), "admin_users");
    getOk(`${BASE_URL}/api/folders`, authParams(data.adminToken, "admin_folders"), "admin_folders");
    getOk(`${BASE_URL}/api/documents`, authParams(data.adminToken, "admin_documents"), "admin_documents");
    getOk(`${BASE_URL}/api/permissions`, authParams(data.adminToken, "admin_permissions"), "admin_permissions");
    getOk(`${BASE_URL}/api/audit?limit=10`, authParams(data.adminToken, "admin_audit"), "admin_audit");
  });

  sleep(1);
}

export function employeeScenario(data) {
  group("employee api", () => {
    getOk(`${BASE_URL}/api/auth/me`, authParams(data.employeeToken, "employee_me"), "employee_me");
    getOk(`${BASE_URL}/api/folders`, authParams(data.employeeToken, "employee_folders"), "employee_folders");
    getOk(`${BASE_URL}/api/documents`, authParams(data.employeeToken, "employee_documents"), "employee_documents");
  });

  sleep(1);
}

export function handleSummary(data) {
  const reportPath = __ENV.K6_SUMMARY_TXT || "/reports/k6_summary.txt";

  const failedRate = data.metrics.http_req_failed?.values?.rate ?? 0;
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? 0;
  const checksRate = data.metrics.checks?.values?.rate ?? 0;
  const requests = data.metrics.http_reqs?.values?.count ?? 0;
  const iterations = data.metrics.iterations?.values?.count ?? 0;

  const text = [
    "Итоговая сводка k6-нагрузочного тестирования",
    `Цель: ${BASE_URL}`,
    `Всего HTTP-запросов: ${requests}`,
    `Всего итераций: ${iterations}`,
    `Доля HTTP-ошибок: ${(failedRate * 100).toFixed(2)}%`,
    `p95 времени ответа: ${p95.toFixed(2)} ms`,
    `Доля успешных checks: ${(checksRate * 100).toFixed(2)}%`,
    "",
    failedRate < 0.05 && p95 < 1500 && checksRate > 0.95
      ? "Статус: passed"
      : "Статус: failed",
  ].join("\n");

  return {
    stdout: `${text}\n`,
    [reportPath]: `${text}\n`,
  };
}
