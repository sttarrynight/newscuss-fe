'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '@/services/apiService';
import {
    saveSessionToStorage,
    loadSessionFromStorage,
    clearSessionFromStorage,
    updateSessionInStorage,
    refreshSessionExpiry
} from '@/utils/sessionStorage';
import {
    normalizeError,
    logError,
    isSessionExpiredError
} from '@/utils/errorUtils';

// 애플리케이션 컨텍스트 생성
const AppContext = createContext();

// 컨텍스트 제공자 컴포넌트
export function AppProvider({ children }) {
    // 애플리케이션 상태
    const [sessionId, setSessionId] = useState(null);
    const [keywords, setKeywords] = useState([]);
    const [summary, setSummary] = useState('');
    const [topic, setTopic] = useState('');
    const [topicDescription, setTopicDescription] = useState('');
    const [userPosition, setUserPosition] = useState(null);
    const [aiPosition, setAiPosition] = useState(null);
    const [difficulty, setDifficulty] = useState('medium');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1); // 메시지 페이지네이션 상태
    const [hasMoreMessages, setHasMoreMessages] = useState(false); // 더 불러올 메시지 존재 여부
    const [summaryStatus, setSummaryStatus] = useState('PENDING'); // 'PENDING' | 'SUMMARIZING' | 'COMPLETED' | 'FAILED'
    const [summaryProgress, setSummaryProgress] = useState(0); // 0-100
    const [cachedSummary, setCachedSummary] = useState(''); // 캐시된 요약

    // 세션 복원 (컴포넌트 마운트 시)
    useEffect(() => {
        const restoreSession = () => {
            try {
                const storedSession = loadSessionFromStorage();

                if (storedSession) {
                    // 세션 데이터 복원
                    setSessionId(storedSession.sessionId || null);
                    setKeywords(storedSession.keywords || []);
                    setSummary(storedSession.summary || '');
                    setTopic(storedSession.topic || '');
                    setTopicDescription(storedSession.topicDescription || '');
                    setUserPosition(storedSession.userPosition || null);
                    setAiPosition(storedSession.aiPosition || null);
                    setDifficulty(storedSession.difficulty || 'medium');

                    // 메시지 복원 (최신 10개만)
                    if (storedSession.messages && Array.isArray(storedSession.messages)) {
                        // 총 메시지 수가 10개 이상이면 페이지네이션 사용
                        if (storedSession.messages.length > 10) {
                            const latestMessages = storedSession.messages.slice(-10);
                            setMessages(latestMessages);
                            setHasMoreMessages(true);
                        } else {
                            setMessages(storedSession.messages);
                            setHasMoreMessages(false);
                        }
                    }

                    // 요약 상태 복원 추가
                    if (storedSession.summaryStatus) {
                        setSummaryStatus(storedSession.summaryStatus);
                    }
                    if (storedSession.discussionSummary) {
                        setCachedSummary(storedSession.discussionSummary);
                    }
                }
            } catch (err) {
                logError(err, 'AppContext.restoreSession');
                clearSessionFromStorage();
            }
        };

        restoreSession();
    }, []);

    // 세션 상태 변경 시 스토리지 업데이트
    useEffect(() => {
        if (sessionId) {
            // 세션이 존재하는 경우에만 스토리지 업데이트
            const sessionData = {
                sessionId,
                keywords,
                summary,
                topic,
                topicDescription,
                userPosition,
                aiPosition,
                difficulty,
                messages
            };

            saveSessionToStorage(sessionData);

            // 주기적으로 세션 만료 시간 갱신
            const intervalId = setInterval(() => {
                refreshSessionExpiry();
            }, 5 * 60 * 1000); // 5분마다 갱신

            return () => clearInterval(intervalId);
        }
    }, [sessionId, keywords, summary, topic, topicDescription, userPosition, aiPosition, difficulty, messages]);

    // URL 제출 및 분석
    const submitUrl = async (url) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.submitUrl(url);

            setSessionId(response.sessionId);
            setKeywords(response.keywords);
            setSummary(response.summary);

            // 세션 스토리지 업데이트
            updateSessionInStorage({
                sessionId: response.sessionId,
                keywords: response.keywords,
                summary: response.summary
            });

            return response;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setError(normalizedError.message);
            logError(err, 'AppContext.submitUrl');
            throw normalizedError;
        } finally {
            setIsLoading(false);
        }
    };

    // 토론 주제 생성
    const generateTopic = async () => {
        if (!sessionId) {
            const error = new Error('세션이 유효하지 않습니다. 다시 시도해주세요.');
            setError(error.message);
            throw error;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.generateTopic(sessionId, summary, keywords);

            setTopic(response.topic);
            setTopicDescription(response.description);

            // 세션 스토리지 업데이트
            updateSessionInStorage({
                topic: response.topic,
                topicDescription: response.description
            });

            return response;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setError(normalizedError.message);

            // 세션 만료 에러 처리
            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.generateTopic');
            throw normalizedError;
        } finally {
            setIsLoading(false);
        }
    };

    // 토론 시작
    const startDiscussion = async (selectedPosition, selectedDifficulty) => {
        if (!sessionId || !topic) {
            const error = new Error('세션 또는 토론 주제가 유효하지 않습니다.');
            setError(error.message);
            throw error;
        }

        setIsLoading(true);
        setError(null);

        try {
            setUserPosition(selectedPosition);
            setDifficulty(selectedDifficulty);

            const response = await apiService.startDiscussion(
                sessionId,
                topic,
                selectedPosition,
                selectedDifficulty
            );

            setAiPosition(response.aiPosition);

            // AI의 첫 메시지 추가
            const aiMessage = {
                id: 1,
                sender: 'ai',
                text: response.aiMessage,
                time: getCurrentTime()
            };

            setMessages([aiMessage]);

            // 세션 스토리지 업데이트
            updateSessionInStorage({
                userPosition: selectedPosition,
                difficulty: selectedDifficulty,
                aiPosition: response.aiPosition,
                messages: [aiMessage]
            });

            return response;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setError(normalizedError.message);

            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.startDiscussion');
            throw normalizedError;
        } finally {
            setIsLoading(false);
        }
    };

    // 메시지 전송
    const sendMessage = async (text) => {
        if (!sessionId) {
            const error = new Error('세션이 유효하지 않습니다.');
            setError(error.message);
            throw error;
        }

        setIsLoading(true);
        setError(null);

        // 사용자 메시지 추가
        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text,
            time: getCurrentTime()
        };

        // 메시지 목록 업데이트
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // 세션 스토리지 메시지 업데이트
        updateSessionInStorage({
            messages: updatedMessages
        });

        try {
            const response = await apiService.sendMessage(sessionId, text);

            // AI 응답 메시지 추가
            const aiMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                text: response.aiMessage,
                time: getCurrentTime()
            };

            // 최종 메시지 목록 업데이트
            const finalMessages = [...updatedMessages, aiMessage];
            setMessages(finalMessages);

            // 세션 스토리지 메시지 업데이트
            updateSessionInStorage({
                messages: finalMessages
            });

            return response;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setError(normalizedError.message);

            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.sendMessage');
            throw normalizedError;
        } finally {
            setIsLoading(false);
        }
    };

    // 이전 메시지 로드 (페이지네이션)
    const loadMoreMessages = useCallback(() => {
        try {
            // 로컬 스토리지에서 전체 메시지 가져오기
            const storedSession = loadSessionFromStorage();
            if (!storedSession || !storedSession.messages) return;

            const allMessages = storedSession.messages;

            // 이미 모든 메시지를 로드한 경우
            if (messages.length >= allMessages.length) {
                setHasMoreMessages(false);
                return;
            }

            // 다음 페이지 로드 (10개씩)
            const nextPage = currentPage + 1;
            const messagesPerPage = 10;
            const startIndex = Math.max(0, allMessages.length - (nextPage * messagesPerPage));

            // 새로운 메시지 목록 생성
            const newMessages = allMessages.slice(startIndex);

            setMessages(newMessages);
            setCurrentPage(nextPage);
            setHasMoreMessages(startIndex > 0);
        } catch (err) {
            logError(err, 'AppContext.loadMoreMessages');
        }
    }, [currentPage, messages.length]);

    // 토론 요약 가져오기 - 단순화된 버전
    const getSummary = async () => {
        if (!sessionId) {
            const error = new Error('세션이 유효하지 않습니다.');
            setError(error.message);
            throw error;
        }

        setIsLoading(true);
        setError(null);

        try {
            const summary = await apiService.getSummary(sessionId);

            // 요약 결과 검증
            if (!summary || summary.trim().length < 20) {
                throw new Error('생성된 요약이 너무 짧습니다. 다시 시도해주세요.');
            }

            // 요약 결과 저장
            updateSessionInStorage({
                discussionSummary: summary
            });

            return summary;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setError(normalizedError.message);

            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.getSummary');
            throw normalizedError;
        } finally {
            setIsLoading(false);
        }
    };

    // 세션 초기화
    const resetSession = () => {
        setSessionId(null);
        setKeywords([]);
        setSummary('');
        setTopic('');
        setTopicDescription('');
        setUserPosition(null);
        setAiPosition(null);
        setDifficulty('medium');
        setMessages([]);
        setError(null);
        setCurrentPage(1);
        setHasMoreMessages(false);

        // 세션 스토리지 초기화
        clearSessionFromStorage();
    };

    // 현재 시간 문자열 반환
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    };

    // 백그라운드 요약 시작 함수
    const startBackgroundSummary = async () => {
        if (!sessionId || summaryStatus === 'SUMMARIZING' || summaryStatus === 'COMPLETED') {
            return;
        }

        setSummaryStatus('SUMMARIZING');
        setSummaryProgress(10);
        setError(null);

        try {
            // 요약 시작 알림
            setSummaryProgress(30);

            const summary = await apiService.getSummary(sessionId);

            // 요약 완료
            setSummaryProgress(100);
            setCachedSummary(summary);
            setSummaryStatus('COMPLETED');

            // 세션 스토리지에 저장
            updateSessionInStorage({
                discussionSummary: summary,
                summaryStatus: 'COMPLETED'
            });

            return summary;
        } catch (err) {
            setSummaryStatus('FAILED');
            setSummaryProgress(0);

            const normalizedError = normalizeError(err);
            setError(normalizedError.message);

            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.startBackgroundSummary');
            throw normalizedError;
        }
    };

    // 캐시된 요약 가져오기 함수
    const getCachedSummary = () => {
        if (summaryStatus === 'COMPLETED' && cachedSummary) {
            return cachedSummary;
        }

        // 세션 스토리지에서 확인
        try {
            const storedSession = loadSessionFromStorage();
            if (storedSession?.discussionSummary && storedSession?.summaryStatus === 'COMPLETED') {
                setCachedSummary(storedSession.discussionSummary);
                setSummaryStatus('COMPLETED');
                return storedSession.discussionSummary;
            }
        } catch (err) {
            logError(err, 'AppContext.getCachedSummary');
        }

        return null;
    };

    // 제공할 컨텍스트 값
    const contextValue = {
        // 상태
        sessionId,
        keywords,
        summary,
        topic,
        topicDescription,
        userPosition,
        aiPosition,
        difficulty,
        messages,
        isLoading,
        error,
        hasMoreMessages,
        summaryStatus,
        summaryProgress,
        cachedSummary,

        // 액션 함수
        submitUrl,
        generateTopic,
        startDiscussion,
        sendMessage,
        loadMoreMessages,
        getSummary,
        resetSession,
        startBackgroundSummary,
        getCachedSummary,

        // 상태 설정 함수
        setUserPosition,
        setDifficulty,
        setError
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

// 컨텍스트 사용 훅
export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext는 AppProvider 내부에서만 사용해야 합니다.');
    }
    return context;
}