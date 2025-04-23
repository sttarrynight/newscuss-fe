/**
 * 에러 처리 유틸리티 함수 모음
 */

// 네트워크 에러 감지 함수
export const isNetworkError = (error) => {
    return !window.navigator.onLine ||
        error?.message?.includes('Network') ||
        error?.message?.includes('internet');
};

// API 응답에서 HTTP 상태 코드 추출 함수
export const getStatusCodeFromError = (error) => {
    if (!error) return null;

    // fetch API 에러의 경우
    if (error.status) return error.status;

    // Axios 에러의 경우
    if (error.response && error.response.status) return error.response.status;

    // 에러 메시지에서 상태 코드 추출 시도
    const statusMatch = error.message?.match(/(\d{3})/);
    if (statusMatch) return parseInt(statusMatch[1], 10);

    return null;
};

// 세션 만료 에러 감지 함수
export const isSessionExpiredError = (error) => {
    const statusCode = getStatusCodeFromError(error);
    return statusCode === 401 ||
        error?.message?.includes('session') ||
        error?.message?.includes('만료');
};

// 서버 에러 감지 함수
export const isServerError = (error) => {
    const statusCode = getStatusCodeFromError(error);
    return statusCode >= 500;
};

// 입력 검증 에러 감지 함수
export const isValidationError = (error) => {
    const statusCode = getStatusCodeFromError(error);
    return statusCode === 400 || statusCode === 422;
};

// 에러 로깅 함수 (개발 환경에서만 상세 로그, 프로덕션에서는 간소화)
export const logError = (error, componentName = 'Unknown') => {
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${componentName}] Error:`, error);
    } else {
        // 프로덕션 환경에서는 최소한의 정보만 로깅
        console.error(`[${componentName}] ${error.message || 'Unknown error'}`);

        // 여기에 외부 에러 추적 서비스(Sentry 등) 연동 코드를 추가할 수 있음
        // ex: Sentry.captureException(error);
    }
};

// 에러 객체를 표준화된 형식으로 변환
export const normalizeError = (error) => {
    if (!error) return { message: '알 수 없는 오류가 발생했습니다.' };

    // 이미 표준 형식인 경우
    if (error.message) return error;

    // 문자열인 경우
    if (typeof error === 'string') return { message: error };

    // API 응답 에러인 경우
    if (error.response && error.response.data) {
        return {
            message: error.response.data.message || error.response.data.error || '서버 오류가 발생했습니다.',
            statusCode: error.response.status,
            data: error.response.data
        };
    }

    // 기타 객체인 경우
    return { message: '예상치 못한 오류가 발생했습니다.' };
};

// 사용자 친화적인 에러 메시지 생성
export const getFriendlyErrorMessage = (error) => {
    const normalizedError = normalizeError(error);

    if (isNetworkError(error)) {
        return '인터넷 연결을 확인해주세요.';
    }

    if (isSessionExpiredError(error)) {
        return '세션이 만료되었습니다. 다시 로그인해주세요.';
    }

    if (isServerError(error)) {
        return '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    if (isValidationError(error)) {
        return '입력한 정보를 확인해주세요.';
    }

    return normalizedError.message;
};