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
    STREAM_TIMEOUT: 120000, // 스트리밍은 더 긴 타임아웃 적용

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
 * 최적화된 스트리밍 메시지 전송 함수 - 청크만 처리
 */
const sendMessageStream = (sessionId, message, onChunk, onComplete, onError) => {
    console.log('🚀 스트리밍 시작:', sessionId);

    return new Promise((resolve, reject) => {
        let isCompleted = false;
        let accumulatedMessage = '';
        let controller = new AbortController();
        let buffer = '';

        const timeoutId = setTimeout(() => {
            if (!isCompleted) {
                isCompleted = true;
                controller.abort();
                const timeoutError = new Error('스트리밍 요청 시간이 초과되었습니다.');
                if (onError) onError(timeoutError);
                reject(timeoutError);
            }
        }, API_CONFIG.STREAM_TIMEOUT);

        fetch(`${API_CONFIG.BASE_URL}/discussion/message/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({ sessionId, message }),
            signal: controller.signal
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                if (!response.body) {
                    throw new Error('응답 본문이 없습니다.');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                function processSSEData(data) {
                    buffer += data;

                    const events = buffer.split('\n\n');
                    buffer = events.pop() || '';

                    for (const event of events) {
                        if (event.trim() === '') continue;

                        const lines = event.split('\n');
                        let eventData = '';

                        for (const line of lines) {
                            if (line.startsWith('data:')) {
                                eventData = line.substring(5).trim();
                                break;
                            }
                        }

                        if (eventData && eventData !== '{}') {
                            try {
                                const data = JSON.parse(eventData);

                                if (data.type === 'chunk') {
                                    const chunkContent = data.content || '';
                                    accumulatedMessage += chunkContent;

                                    // 간단한 로깅
                                    console.log('📝', chunkContent);

                                    if (onChunk && typeof onChunk === 'function') {
                                        onChunk(chunkContent, accumulatedMessage);
                                    }

                                } else if (data.type === 'end') {
                                    console.log('🏁 스트리밍 완료');
                                    isCompleted = true;
                                    clearTimeout(timeoutId);

                                    if (onComplete && typeof onComplete === 'function') {
                                        onComplete(accumulatedMessage);
                                    }
                                    resolve(accumulatedMessage);
                                    return;

                                } else if (data.type === 'error') {
                                    console.error('❌ 스트리밍 에러:', data.message);
                                    isCompleted = true;
                                    clearTimeout(timeoutId);

                                    const error = new Error(data.message || '스트리밍 중 오류가 발생했습니다.');
                                    if (onError) onError(error);
                                    reject(error);
                                    return;
                                } else {
                                    console.log('❓ 알 수 없는 타입:', data.type);
                                }
                            } catch (parseError) {
                                console.warn('🚫 JSON 파싱 오류 (무시):', parseError);
                                // 파싱 에러는 무시하고 계속 진행
                            }
                        }
                    }
                }

                function readStream() {
                    return reader.read().then(({ done, value }) => {
                        if (done || isCompleted) {
                            if (buffer.trim() && !isCompleted) {
                                processSSEData('\n\n');
                            }

                            if (!isCompleted) {
                                isCompleted = true;
                                clearTimeout(timeoutId);
                                if (onComplete) onComplete(accumulatedMessage);
                                resolve(accumulatedMessage);
                            }
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        processSSEData(chunk);
                        return readStream();
                    });
                }

                return readStream();
            })
            .catch(error => {
                if (!isCompleted) {
                    isCompleted = true;
                    clearTimeout(timeoutId);

                    if (error.name === 'AbortError') {
                        return;
                    }

                    const streamError = new Error(`스트리밍 연결 오류: ${error.message}`);
                    if (onError) onError(streamError);
                    reject(streamError);
                }
            });
    });
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
     * 토론 메시지 전송 (기존 방식 - 백업용)
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
     * 토론 메시지 전송 (스트리밍 방식) - 최종 수정 버전
     */
    sendMessageStream: sendMessageStream,

    /**
     * 토론 요약 요청
     */
    getSummary: async (sessionId) => {
        const timeout = API_CONFIG.SUMMARY_TIMEOUT; // 요약 전용 타임아웃 적용 (60000ms = 60초)

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
                // 오류가 API 속도 제한(rate limit)과 관련된 경우 특별 처리
                if (data.error.includes('rate limit') || data.error.includes('토큰') || data.error.includes('토큰 한도')) {
                    throw {
                        message: '요약 생성 중 API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
                        statusCode: 429, // Rate Limit Exceeded
                        isRateLimit: true
                    };
                }

                throw {
                    message: `요약 생성 중 오류: ${data.error}`,
                    statusCode: 200,
                    data: data
                };
            }

            // 요약이 너무 짧거나 예상치 못한 형식인 경우 검증
            if (!data.summary ||
                data.summary.length < 30 ||
                data.summary.includes('오류가 발생했습니다') ||
                data.summary.includes('실패했습니다')) {

                throw {
                    message: '요약 생성 중 문제가 발생했습니다. 토론 내용이 너무 길거나 복잡할 수 있습니다.',
                    statusCode: 500,
                    isParsing: true
                };
            }

            return data.summary;
        } catch (error) {
            // 타임아웃 오류 특수 처리
            if (error.message && error.message.includes('시간이 초과되었습니다')) {
                throw {
                    message: '요약 생성 시간이 초과되었습니다. 토론 내용이 너무 길 경우 시간이 더 걸릴 수 있습니다.',
                    statusCode: 408, // Request Timeout
                    isTimeout: true
                };
            }

            // API 속도 제한(rate limit) 오류 특수 처리
            if (error.isRateLimit ||
                (error.message && (error.message.includes('rate limit') || error.message.includes('Rate limit')))) {
                throw {
                    message: '요약 생성 중 API 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
                    statusCode: 429, // Rate Limit Exceeded
                    isRateLimit: true
                };
            }

            // 그 외 오류는 일반 오류 처리
            throw normalizeError(error);
        }
    },

    /**
     * 토론 피드백 요청
     */
    getFeedback: async (sessionId) => {
        return apiRequest(`/discussion/feedback/${sessionId}`);
    },

    /**
     * 세션 상태 확인 (디버깅용)
     */
    checkSession: async (sessionId) => {
        return apiRequest(`/session/${sessionId}`);
    }
};

export default apiService;