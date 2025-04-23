'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import apiService from '@/services/api';

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

    // URL 제출 및 분석
    const submitUrl = async (url) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.submitUrl(url);

            setSessionId(response.sessionId);
            setKeywords(response.keywords);
            setSummary(response.summary);

            return response;
        } catch (err) {
            setError(err.message || '뉴스 URL 분석 중 오류가 발생했습니다.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // 토론 주제 생성
    const generateTopic = async () => {
        if (!sessionId) {
            setError('세션이 유효하지 않습니다. 다시 시도해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.generateTopic(sessionId, summary, keywords);

            setTopic(response.topic);
            setTopicDescription(response.description);

            return response;
        } catch (err) {
            setError(err.message || '토론 주제 생성 중 오류가 발생했습니다.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // 토론 시작
    const startDiscussion = async (selectedPosition, selectedDifficulty) => {
        if (!sessionId || !topic) {
            setError('세션 또는 토론 주제가 유효하지 않습니다.');
            return;
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

            return response;
        } catch (err) {
            setError(err.message || '토론 시작 중 오류가 발생했습니다.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // 메시지 전송
    const sendMessage = async (text) => {
        if (!sessionId) {
            setError('세션이 유효하지 않습니다.');
            return;
        }

        setIsLoading(true);
        setError(null);

        // 사용자 메시지 추가
        const userMessage = {
            id: messages.length + 1,
            sender: 'user',
            text,
            time: getCurrentTime()
        };

        setMessages(prev => [...prev, userMessage]);

        try {
            const response = await apiService.sendMessage(sessionId, text);

            // AI 응답 메시지 추가
            const aiMessage = {
                id: messages.length + 2,
                sender: 'ai',
                text: response.aiMessage,
                time: getCurrentTime()
            };

            setMessages(prev => [...prev, aiMessage]);

            return response;
        } catch (err) {
            setError(err.message || '메시지 전송 중 오류가 발생했습니다.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // 토론 요약 가져오기
    const getSummary = async () => {
        if (!sessionId) {
            setError('세션이 유효하지 않습니다.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiService.getSummary(sessionId);
            return response.summary;
        } catch (err) {
            setError(err.message || '토론 요약을 가져오는 중 오류가 발생했습니다.');
            throw err;
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
    };

    // 현재 시간 문자열 반환
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
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

        // 액션 함수
        submitUrl,
        generateTopic,
        startDiscussion,
        sendMessage,
        getSummary,
        resetSession,

        // 상태 설정 함수
        setUserPosition,
        setDifficulty
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