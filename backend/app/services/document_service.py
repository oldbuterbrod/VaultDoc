import hashlib
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_CONTENT_TYPES = {
    ".pdf": {
        "application/pdf",
        "application/octet-stream",
    },
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
        "application/zip",
    },
}
CHUNK_SIZE = 1024 * 1024


def _get_storage_root() -> Path:
    root = Path(settings.document_storage_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _build_storage_name(extension: str) -> str:
    return f"{uuid.uuid4().hex}{extension}"


def resolve_stored_file_path(storage_path: str) -> Path:
    path = Path(storage_path)
    if path.is_absolute():
        return path
    return Path.cwd() / path


def delete_stored_file(storage_path: str | None) -> None:
    if not storage_path:
        return

    path = resolve_stored_file_path(storage_path)

    try:
        if path.exists() and path.is_file():
            path.unlink()
    except FileNotFoundError:
        pass


async def save_uploaded_document_file(upload_file: UploadFile) -> dict[str, str | int]:
    original_file_name = (upload_file.filename or "").strip()
    if not original_file_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл не выбран",
        )

    extension = Path(original_file_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Разрешены только файлы PDF и DOCX",
        )

    content_type = (upload_file.content_type or "application/octet-stream").lower()
    if content_type not in ALLOWED_CONTENT_TYPES[extension]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недопустимый MIME-тип файла",
        )

    storage_root = _get_storage_root()
    storage_name = _build_storage_name(extension)
    storage_path = storage_root / storage_name

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    total_size = 0
    checksum = hashlib.sha256()

    try:
        with storage_path.open("wb") as output_file:
            while True:
                chunk = await upload_file.read(CHUNK_SIZE)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Размер файла превышает {settings.max_upload_size_mb} МБ",
                    )

                output_file.write(chunk)
                checksum.update(chunk)
    except HTTPException:
        storage_path.unlink(missing_ok=True)
        raise
    except Exception:
        storage_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось сохранить файл",
        )
    finally:
        await upload_file.close()

    return {
        "original_file_name": original_file_name,
        "mime_type": content_type,
        "storage_path": str(storage_path),
        "file_size": total_size,
        "checksum": checksum.hexdigest(),
    }