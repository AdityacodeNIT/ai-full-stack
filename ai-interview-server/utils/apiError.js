class ApiError extends Error {
    constructor(statusCode, message, code) {
        super(message);   // Call the parent constructor with the message

        this.statusCode = statusCode;
        this.code = code;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
    }
}

export default ApiError;
