from fastapi import status


class UserFacingError(Exception):
    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class DocumentValidationError(UserFacingError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY)

class DocumentProcessingError(UserFacingError):
    def __init__(self) -> None:
        super().__init__(
            "We couldn't process that document. Please verify the file is valid and try again.",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

class SessionNotFoundError(UserFacingError):
    def __init__(self, session_id: str) -> None:
        super().__init__(
            f"Session '{session_id}' not found.",
            status.HTTP_404_NOT_FOUND,
        )

class RetrievalError(UserFacingError):
    def __init__(self) -> None:
        super().__init__(
            "We couldn't search your documents right now. Please try again.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

class ResponseGenerationError(UserFacingError):
    def __init__(self) -> None:
        super().__init__(
            "We couldn't generate a response right now. Please try again.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
