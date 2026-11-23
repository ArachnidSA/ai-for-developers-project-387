from fastapi import APIRouter

router = APIRouter()


@router.get("/healthcheck")
def healthcheck() -> dict[str, str]:
    """Проверка живости сервиса."""
    return {"status": "success"}
