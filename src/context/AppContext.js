'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

    // 피드백 관련 상태 추가
    const [feedbackData, setFeedbackData] = useState(null);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
    const [feedbackError, setFeedbackError] = useState(null);

    // 스트리밍 관련 상태 추가
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState(null);
    const [, forceUpdate] = useState({});
    const forceUpdateRef = useRef(() => forceUpdate({}));

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

            // AI의 첫 메시지 추가 (현재 시간 사용)
            const now = new Date();
            const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

            const aiMessage = {
                id: Date.now(),
                sender: 'ai',
                text: response.aiMessage,
                time: timeString
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

    // 메시지 전송 (스트리밍 방식으로 변경)
    const sendMessage = async (text) => {
        if (!sessionId) {
            const error = new Error('세션이 유효하지 않습니다.');
            setError(error.message);
            throw error;
        }

        setIsLoading(true);
        setError(null);

        // 현재 시간 생성
        const now = new Date();
        const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        // 사용자 메시지 추가
        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text,
            time: timeString
        };

        // 스트리밍 AI 메시지 placeholder 추가
        const aiMessageId = Date.now() + 1;
        const streamingAiMessage = {
            id: aiMessageId,
            sender: 'ai',
            text: '',
            time: timeString,
            isStreaming: true
        };

        // 메시지 목록 업데이트
        const updatedMessages = [...messages, userMessage, streamingAiMessage];
        setMessages(updatedMessages);
        setStreamingMessageId(aiMessageId);
        setIsStreaming(true);

        // 세션 스토리지 메시지 업데이트 (스트리밍 메시지 제외)
        updateSessionInStorage({
            messages: [...messages, userMessage]
        });

        try {
            console.log('🚀 간단 스트리밍 시작');

            // 스트리밍 방식으로 메시지 전송
            await apiService.sendMessageStream(
                sessionId,
                text,
                // onChunk: 청크 데이터가 올 때마다 호출
                (chunk, accumulated) => {
                    console.log('🎯 AppContext onChunk 호출됨!');
                    console.log('✅ 청크 받음:', chunk);
                    console.log('📝 누적 메시지:', accumulated);
                    console.log('🆔 AI 메시지 ID:', aiMessageId);

                    setMessages(prevMessages => {
                        console.log('🔄 메시지 상태 업데이트 시작...');
                        const newMessages = prevMessages.map(msg => {
                            if (msg.id === aiMessageId) {
                                console.log('🎯 타겟 메시지 찾음, 업데이트!');
                                return { ...msg, text: accumulated, isStreaming: true };
                            }
                            return msg;
                        });
                        console.log('✅ 메시지 상태 업데이트 완료');
                        return newMessages;
                    });
                },
                // onComplete: 스트리밍 완료 시 호출
                (finalMessage) => {
                    console.log('🏁 스트리밍 완료:', finalMessage);

                    const completedAiMessage = {
                        id: aiMessageId,
                        sender: 'ai',
                        text: finalMessage,
                        time: timeString,
                        isStreaming: false
                    };

                    setMessages(prevMessages =>
                        prevMessages.map(msg =>
                            msg.id === aiMessageId
                                ? completedAiMessage
                                : msg
                        )
                    );

                    // 최종 메시지로 세션 스토리지 업데이트
                    const finalMessages = [...messages, userMessage, completedAiMessage];
                    updateSessionInStorage({
                        messages: finalMessages
                    });

                    setIsStreaming(false);
                    setStreamingMessageId(null);
                },
                // onError: 에러 발생 시 호출
                (error) => {
                    console.error('💥 스트리밍 에러:', error);

                    // 스트리밍 실패 시 기존 방식으로 fallback
                    fallbackToRegularMessage(text, userMessage, aiMessageId, timeString);
                }
            );
        } catch (err) {
            console.error('💥 스트리밍 초기화 에러:', err);

            // 스트리밍 실패 시 기존 방식으로 fallback
            await fallbackToRegularMessage(text, userMessage, aiMessageId, timeString);
        } finally {
            setIsLoading(false);
        }
    };

    // 스트리밍 실패 시 기존 방식으로 fallback하는 함수
    const fallbackToRegularMessage = async (text, userMessage, aiMessageId, timeString) => {
        try {
            console.log('스트리밍 실패, 기존 방식으로 전환...');

            const response = await apiService.sendMessage(sessionId, text);

            const aiMessage = {
                id: aiMessageId,
                sender: 'ai',
                text: response.aiMessage,
                time: timeString,
                isStreaming: false
            };

            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === aiMessageId
                        ? aiMessage
                        : msg
                )
            );

            // 세션 스토리지 업데이트
            const finalMessages = [...messages, userMessage, aiMessage];
            updateSessionInStorage({
                messages: finalMessages
            });

            setIsStreaming(false);
            setStreamingMessageId(null);
        } catch (fallbackError) {
            const normalizedError = normalizeError(fallbackError);
            setError(normalizedError.message);

            // 실패한 AI 메시지 제거
            setMessages(prevMessages =>
                prevMessages.filter(msg => msg.id !== aiMessageId)
            );

            setIsStreaming(false);
            setStreamingMessageId(null);

            if (isSessionExpiredError(fallbackError)) {
                resetSession();
            }

            logError(fallbackError, 'AppContext.fallbackToRegularMessage');
            throw normalizedError;
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

    // 토론 피드백 가져오기
    const getFeedback = async () => {
        if (!sessionId) {
            const error = new Error('세션이 유효하지 않습니다.');
            setFeedbackError(error.message);
            throw error;
        }

        setIsFeedbackLoading(true);
        setFeedbackError(null);

        try {
            const response = await apiService.getFeedback(sessionId);

            // 피드백 데이터 검증
            if (!response.feedback) {
                throw new Error('피드백 데이터를 받지 못했습니다.');
            }

            setFeedbackData(response.feedback);
            return response.feedback;
        } catch (err) {
            const normalizedError = normalizeError(err);
            setFeedbackError(normalizedError.message);

            if (isSessionExpiredError(err)) {
                resetSession();
            }

            logError(err, 'AppContext.getFeedback');
            throw normalizedError;
        } finally {
            setIsFeedbackLoading(false);
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
        setSummaryStatus('PENDING');
        setSummaryProgress(0);
        setCachedSummary('');

        // 피드백 관련 상태 초기화
        setFeedbackData(null);
        setIsFeedbackLoading(false);
        setFeedbackError(null);

        // 스트리밍 관련 상태 초기화
        setIsStreaming(false);
        setStreamingMessageId(null);

        // 세션 스토리지 초기화
        clearSessionFromStorage();
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
        feedbackData,
        isFeedbackLoading,
        feedbackError,
        isStreaming,
        streamingMessageId,

        // 액션 함수
        submitUrl,
        generateTopic,
        startDiscussion,
        sendMessage,
        loadMoreMessages,
        resetSession,
        startBackgroundSummary,
        getCachedSummary,
        getFeedback,

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