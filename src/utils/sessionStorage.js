/**
 * 세션 스토리지 유틸리티
 * 페이지 새로고침 시에도 상태를 유지하기 위한 로컬 스토리지 기반 세션 관리
 */

// 스토리지 키 상수
const STORAGE_KEY = process.env.NEXT_PUBLIC_SESSION_STORAGE_KEY || 'newscuss_session';

// 세션 만료 시간 (밀리초) - 기본 30분
const SESSION_EXPIRY = 30 * 60 * 1000;

/**
 * 로컬 스토리지에 세션 데이터 저장
 */
export const saveSessionToStorage = (sessionData) => {
    if (typeof window === 'undefined') return;

    try {
        // 만료 시간 추가
        const dataWithExpiry = {
            ...sessionData,
            expiresAt: Date.now() + SESSION_EXPIRY
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithExpiry));
    } catch (error) {
        console.error('Failed to save session data to storage:', error);
    }
};

/**
 * 로컬 스토리지에서 세션 데이터 로드
 */
export const loadSessionFromStorage = () => {
    if (typeof window === 'undefined') return null;

    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (!storedData) return null;

        const sessionData = JSON.parse(storedData);

        // 세션 만료 확인
        if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
            // 만료된 세션 정보 삭제
            clearSessionFromStorage();
            return null;
        }

        return sessionData;
    } catch (error) {
        console.error('Failed to load session data from storage:', error);
        return null;
    }
};

/**
 * 로컬 스토리지에서 세션 데이터 삭제
 */
export const clearSessionFromStorage = () => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to clear session data from storage:', error);
    }
};

/**
 * 세션 데이터 갱신 (일부 필드만 업데이트)
 */
export const updateSessionInStorage = (updates) => {
    if (typeof window === 'undefined') return;

    try {
        const currentData = loadSessionFromStorage() || {};
        const updatedData = { ...currentData, ...updates };

        saveSessionToStorage(updatedData);
    } catch (error) {
        console.error('Failed to update session data in storage:', error);
    }
};

/**
 * 세션이 유효한지 확인
 */
export const isSessionValid = () => {
    const sessionData = loadSessionFromStorage();
    return sessionData !== null && sessionData.sessionId;
};

/**
 * 세션 만료 시간 갱신
 */
export const refreshSessionExpiry = () => {
    if (typeof window === 'undefined') return;

    try {
        const sessionData = loadSessionFromStorage();
        if (sessionData) {
            sessionData.expiresAt = Date.now() + SESSION_EXPIRY;
            saveSessionToStorage(sessionData);
        }
    } catch (error) {
        console.error('Failed to refresh session expiry:', error);
    }
};