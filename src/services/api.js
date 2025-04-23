/**
 * Newscuss API 클라이언트
 * 백엔드 API와의 통신을 담당합니다.
 */

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 공통 API 요청 함수
 * @param {string} endpoint - API 엔드포인트 경로
 * @param {Object} options - fetch 옵션
 * @returns {Promise<any>} API 응답 데이터
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // 기본 헤더 설정
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // 요청 옵션 병합
    const fetchOptions = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, fetchOptions);

        // 응답 상태 확인
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API 요청 실패: ${response.status} ${response.statusText}`);
        }

        // 응답 데이터 파싱
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API 요청 중 오류 발생:', error);
        throw error;
    }
}

// API 서비스 객체
const apiService = {
    /**
     * 뉴스 URL 제출 및 분석 요청
     * @param {string} url - 뉴스 기사 URL
     * @returns {Promise<Object>} 키워드 및 요약 정보
     */
    submitUrl: async (url) => {
        return apiRequest('/url', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    },

    /**
     * 토론 주제 생성 요청
     * @param {string} sessionId - 세션 ID
     * @param {string} summary - 기사 요약
     * @param {Array<string>} keywords - 키워드 배열
     * @returns {Promise<Object>} 생성된 토론 주제 정보
     */
    generateTopic: async (sessionId, summary, keywords) => {
        return apiRequest('/topic', {
            method: 'POST',
            body: JSON.stringify({ sessionId, summary, keywords }),
        });
    },

    /**
     * 토론 시작 요청
     * @param {string} sessionId - 세션 ID
     * @param {string} topic - 토론 주제
     * @param {string} userPosition - 사용자 입장 ('찬성' 또는 '반대')
     * @param {string} difficulty - 토론 난이도 ('초급', '중급', '고급')
     * @returns {Promise<Object>} AI의 첫 번째 메시지 정보
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
     * @param {string} sessionId - 세션 ID
     * @param {string} message - 사용자 메시지
     * @returns {Promise<Object>} AI 응답 메시지
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
     * @param {string} sessionId - 세션 ID
     * @returns {Promise<Object>} 토론 요약 정보
     */
    getSummary: async (sessionId) => {
        return apiRequest(`/discussion/summary/${sessionId}`);
    }
};

export default apiService;