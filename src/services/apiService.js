import { logError, normalizeError, isNetworkError } from '@/utils/errorUtils';

/**
* API 서비스 설정
*/
const API_CONFIG = {
    // 기본 URL (환경 변수에서 가져오거나 기본값 사용)
    BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api',

    // 타임아웃 설정 (밀리초)
    TIMEOUT: 30000,
    SUMMARY_TIMEOUT: 60000, // 요약 요청은 더 긴 타임아웃 적용

    // 재시도 설정
    RETRY: {
        MAX_ATTEMPTS: 3,    // 최대 재시도 횟수
        DELAY: 1000,        // 재시도 간 지연 시간 (밀리초)
        BACKOFF_FACTOR: 2,  // 지수 백오프 인자
    },

    // 헤더 설정
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
};

/**
 * 요청 타임아웃 프로미스 생성 함수
 */
const createTimeoutPromise = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`요청 시간이 초과되었습니다 (${ms}ms)`));
        }, ms);
    });
};

/**
 * 지연 함수 (비동기)
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * API 요청 함수 (재시도 로직 포함)
 */
const apiRequest = async (endpoint, options = {}, retryCount = 0) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    // 요청 옵션 구성
    const requestOptions = {
        ...options,
        headers: {
            ...API_CONFIG.HEADERS,
            ...options.headers,
        },
    };

    try {
        // 타임아웃 처리
        const fetchPromise = fetch(url, requestOptions);
        const response = await Promise.race([
            fetchPromise,
            createTimeoutPromise(API_CONFIG.TIMEOUT)
        ]);

        // 응답 상태 확인
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                message: errorData.error || `API 요청 실패: ${response.status} ${response.statusText}`,
                statusCode: response.status,
                data: errorData
            };
        }

        // 응답 데이터 파싱
        const data = await response.json();
        return data;
    } catch (error) {
        // 에러 로깅
        logError(error, 'apiRequest');

        // 재시도 로직
        const shouldRetry =
            (isNetworkError(error) || (error.statusCode >= 500)) &&
            retryCount < API_CONFIG.RETRY.MAX_ATTEMPTS;

        if (shouldRetry) {
            // 지수 백오프로 대기 시간 계산
            const delayTime = API_CONFIG.RETRY.DELAY * Math.pow(API_CONFIG.RETRY.BACKOFF_FACTOR, retryCount);

            // 지연 후 재시도
            await delay(delayTime);
            return apiRequest(endpoint, options, retryCount + 1);
        }

        // 재시도 불가능하거나 최대 시도 횟수 초과 시 에러 전파
        throw normalizeError(error);
    }
};

/**
 * API 서비스 객체 - 애플리케이션에서 사용할 API 함수들을 포함
 */
const apiService = {
    /**
     * 뉴스 URL 제출 및 분석 요청
     */
    submitUrl: async (url) => {
        return apiRequest('/url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    },

    /**
     * 토론 주제 생성 요청
     */
    generateTopic: async (sessionId, summary, keywords) => {
        return apiRequest('/topic', {
            method: 'POST',
            body: JSON.stringify({ sessionId, summary, keywords }),
        });
    },

    /**
     * 토론 시작 요청
     */
    startDiscussion: async (sessionId, topic, userPosition, difficulty) => {
        return apiRequest('/discussion/start', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                topic,
                userPosition,
                difficulty
            }),
        });
    },

    /**
     * 토론 메시지 전송
     */
    sendMessage: async (sessionId, message) => {
        return apiRequest('/discussion/message', {
            method: 'POST',
            body: JSON.stringify({
                sessionId,
                message
            }),
        });
    },

    /**
     * 토론 요약 요청
     */
    getSummary: async (sessionId) => {
        const timeout = API_CONFIG.SUMMARY_TIMEOUT; // 요약 전용 타임아웃 적용

        try {
            // 타임아웃 처리
            const fetchPromise = fetch(`${API_CONFIG.BASE_URL}/discussion/summary/${sessionId}`, {
                method: 'GET',
                headers: API_CONFIG.HEADERS,
            });

            const response = await Promise.race([
                fetchPromise,
                createTimeoutPromise(timeout)
            ]);

            // 응답 상태 확인
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw {
                    message: errorData.error || `요약 요청 실패: ${response.status} ${response.statusText}`,
                    statusCode: response.status,
                    data: errorData
                };
            }

            // 응답 데이터 파싱
            const data = await response.json();

            // 서버 측 오류 메시지 확인 (Flask API에서 200 상태 코드와 함께 오류 메시지를 보낼 수 있음)
            if (data.error) {
                throw {
                    message: `요약 생성 중 오류: ${data.error}`,
                    statusCode: 200,
                    data: data
                };
            }

            return data;
        } catch (error) {
            // 타임아웃 오류 특수 처리
            if (error.message && error.message.includes('시간이 초과되었습니다')) {
                throw {
                    message: '요약 생성 시간이 초과되었습니다. 토론 내용이 너무 긴 경우 시간이 더 걸릴 수 있습니다.',
                    statusCode: 408, // Request Timeout
                    isTimeout: true
                };
            }

            // 그 외 오류는 일반 오류 처리
            throw normalizeError(error);
        }
    },

    /**
     * 세션 상태 확인 (디버깅용)
     */
    checkSession: async (sessionId) => {
        return apiRequest(`/session/${sessionId}`);
    }
};

export default apiService;