from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    SECURITY_ADMIN = "security_admin"
    DEVELOPER = "developer"
    MANAGER = "manager"
    EMPLOYEE = "employee"