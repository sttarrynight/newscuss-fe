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
 * 스트리밍 메시지 전송 함수 (누적 관리 강화 버전)
 */
const sendMessageStream = (sessionId, message, onChunk, onComplete, onError) => {
    console.log('🚀 스트리밍 시작 (누적 관리 강화):', { sessionId, message });

    return new Promise((resolve, reject) => {
        let isCompleted = false;
        let accumulatedMessage = ''; // 여기서 직접 관리

        // 타임아웃 설정
        const timeoutId = setTimeout(() => {
            if (!isCompleted) {
                isCompleted = true;
                console.error('⏰ 스트리밍 타임아웃');
                const timeoutError = new Error('스트리밍 요청 시간이 초과되었습니다.');
                logError(timeoutError, 'sendMessageStream.timeout');
                if (onError) onError(timeoutError);
                reject(timeoutError);
            }
        }, API_CONFIG.STREAM_TIMEOUT);

        // fetch를 사용한 스트리밍
        console.log('📡 fetch 요청 시작:', `${API_CONFIG.BASE_URL}/discussion/message/stream`);

        fetch(`${API_CONFIG.BASE_URL}/discussion/message/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: message
            })
        })
            .then(response => {
                console.log('📥 응답 받음:', response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                if (!response.body) {
                    throw new Error('응답 본문이 없습니다.');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                function readStream() {
                    return reader.read().then(({ done, value }) => {
                        if (done || isCompleted) {
                            console.log('✅ 스트림 완료 (done):', done, 'isCompleted:', isCompleted);
                            if (!isCompleted) {
                                isCompleted = true;
                                clearTimeout(timeoutId);
                                console.log('📝 최종 누적 메시지:', accumulatedMessage);
                                if (onComplete) onComplete(accumulatedMessage);
                                resolve(accumulatedMessage);
                            }
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        console.log('📦 청크 받음:', chunk);

                        // 각 라인 처리
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.trim() === '') continue;

                            console.log('📄 라인 처리:', line);

                            // JSON 데이터 추출 (data: 접두사 있든 없든)
                            let jsonData = '';
                            if (line.startsWith('data: ')) {
                                jsonData = line.substring(6).trim();
                            } else if (line.startsWith('{') && line.includes('"type"')) {
                                jsonData = line.trim();
                            } else if (line.startsWith('event:')) {
                                console.log('📡 이벤트 라인 스킵:', line);
                                continue;
                            } else {
                                console.log('❓ 알 수 없는 라인:', line);
                                continue;
                            }

                            if (jsonData === '' || jsonData === '{}') {
                                console.log('⚪ 빈 데이터, 스킵');
                                continue;
                            }

                            try {
                                const data = JSON.parse(jsonData);
                                console.log('✅ 파싱된 데이터:', data);

                                if (data.type === 'chunk') {
                                    console.log('🔤 청크 내용:', data.content);
                                    // 여기서 직접 누적 관리
                                    accumulatedMessage += data.content;
                                    console.log('📝 현재 누적:', accumulatedMessage);
                                    console.log('🎯 onChunk 콜백 호출 시도...', typeof onChunk);

                                    if (onChunk) {
                                        console.log('✅ onChunk 콜백 호출!');
                                        onChunk(data.content, accumulatedMessage);
                                        console.log('✅ onChunk 콜백 완료!');
                                    } else {
                                        console.error('❌ onChunk 콜백이 없습니다!');
                                    }
                                } else if (data.type === 'end') {
                                    console.log('🏁 종료 신호 받음');
                                    isCompleted = true;
                                    clearTimeout(timeoutId);

                                    // final_message가 있으면 사용, 없으면 누적된 메시지 사용
                                    const finalMessage = data.final_message || accumulatedMessage;
                                    console.log('📝 최종 메시지:', finalMessage);

                                    if (onComplete) {
                                        onComplete(finalMessage);
                                    }
                                    resolve(finalMessage);
                                    return;
                                } else if (data.type === 'error') {
                                    console.error('❌ 에러 신호 받음:', data);
                                    isCompleted = true;
                                    clearTimeout(timeoutId);

                                    const error = new Error(data.message || '스트리밍 중 오류가 발생했습니다.');
                                    logError(error, 'sendMessageStream.streamError');
                                    if (onError) onError(error);
                                    reject(error);
                                    return;
                                } else {
                                    console.log('❓ 알 수 없는 타입:', data.type);
                                }
                            } catch (parseError) {
                                console.error('🚫 JSON 파싱 오류:', parseError, '원본:', jsonData);
                            }
                        }

                        return readStream();
                    });
                }

                return readStream();
            })
            .catch(error => {
                console.error('💥 fetch 에러:', error);
                if (!isCompleted) {
                    isCompleted = true;
                    clearTimeout(timeoutId);

                    const streamError = new Error(`스트리밍 연결 오류: ${error.message}`);
                    logError(streamError, 'sendMessageStream.connectionError');
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
     * 토론 메시지 전송 (스트리밍 방식) - 새로 추가
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