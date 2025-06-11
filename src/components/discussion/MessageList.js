'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';

/**
 * 메시지 페이지네이션을 지원하는 메시지 목록 컴포넌트 (스트리밍 시각적 피드백 개선)
 */
const MessageList = () => {
    const {
        messages,
        hasMoreMessages,
        loadMoreMessages,
        isLoading,
        isStreaming,
        streamingMessageId
    } = useAppContext();

    const messageEndRef = useRef(null);
    const listContainerRef = useRef(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

    // 스크롤 이벤트 핸들러 - 상단으로 스크롤 시 이전 메시지 로드
    const handleScroll = () => {
        if (!listContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;

        // 스크롤이 상단에 가까우면 이전 메시지 로드
        if (scrollTop < 50 && hasMoreMessages && !isLoadingMore) {
            loadOlderMessages();
        }

        // 스크롤 위치에 따라 자동 스크롤 활성화/비활성화
        const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 100;
        setAutoScrollEnabled(isScrolledToBottom);
    };

    // 이전 메시지 로드 함수
    const loadOlderMessages = async () => {
        if (isLoadingMore || !hasMoreMessages) return;

        try {
            setIsLoadingMore(true);

            // 현재 스크롤 위치와 높이 저장
            const scrollContainer = listContainerRef.current;
            const scrollHeightBefore = scrollContainer.scrollHeight;

            // 이전 메시지 로드
            await loadMoreMessages();

            // 스크롤 위치 조정 (새로 로드된 콘텐츠 높이만큼 아래로 스크롤)
            setTimeout(() => {
                if (scrollContainer) {
                    const newScrollHeight = scrollContainer.scrollHeight;
                    const heightDifference = newScrollHeight - scrollHeightBefore;
                    scrollContainer.scrollTop = heightDifference;
                }
            }, 10);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // 새 메시지가 추가되거나 스트리밍 상태가 변할 때마다 스크롤 아래로 이동
    useEffect(() => {
        if (autoScrollEnabled && messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScrollEnabled, isStreaming]);

    // 개선된 스트리밍 메시지 컴포넌트
    const StreamingMessage = ({ message }) => {
        const [showCursor, setShowCursor] = useState(true);
        const [dotCount, setDotCount] = useState(0);

        useEffect(() => {
            if (message.isStreaming) {
                // 커서 깜빡임 효과 (더 부드럽게)
                const cursorInterval = setInterval(() => {
                    setShowCursor(prev => !prev);
                }, 400);

                // 점 애니메이션 효과
                const dotInterval = setInterval(() => {
                    setDotCount(prev => (prev + 1) % 4);
                }, 300);

                return () => {
                    clearInterval(cursorInterval);
                    clearInterval(dotInterval);
                };
            } else {
                // 스트리밍이 완료되면 커서와 점 애니메이션 숨김
                setShowCursor(false);
                setDotCount(0);
            }
        }, [message.isStreaming]);

        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg rounded-tl-none border border-blue-100 shadow-sm">
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    <span className="inline-block">{message.text}</span>
                    {message.isStreaming && (
                        <span className="inline-flex items-center ml-1">
                            <span
                                className={`inline-block w-0.5 h-5 bg-gradient-to-b from-blue-500 to-blue-600 transition-opacity duration-300 ${
                                    showCursor ? 'opacity-100' : 'opacity-30'
                                }`}
                                style={{
                                    animation: showCursor ? 'pulse 0.8s ease-in-out infinite' : 'none'
                                }}
                            >
                            </span>
                        </span>
                    )}
                </div>
                {message.isStreaming && (
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                            <div className="flex space-x-1 mr-2">
                                <div
                                    className="w-1.5 h-1.5 bg-blue-500 rounded-full transition-all duration-300"
                                    style={{
                                        transform: dotCount >= 1 ? 'scale(1.2)' : 'scale(0.8)',
                                        opacity: dotCount >= 1 ? 1 : 0.4
                                    }}
                                ></div>
                                <div
                                    className="w-1.5 h-1.5 bg-blue-500 rounded-full transition-all duration-300"
                                    style={{
                                        transform: dotCount >= 2 ? 'scale(1.2)' : 'scale(0.8)',
                                        opacity: dotCount >= 2 ? 1 : 0.4
                                    }}
                                ></div>
                                <div
                                    className="w-1.5 h-1.5 bg-blue-500 rounded-full transition-all duration-300"
                                    style={{
                                        transform: dotCount >= 3 ? 'scale(1.2)' : 'scale(0.8)',
                                        opacity: dotCount >= 3 ? 1 : 0.4
                                    }}
                                ></div>
                            </div>
                            <span className="font-medium">AI가 입력하는 중</span>
                        </div>
                        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            실시간 응답
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                        transform: scaleY(1);
                    }
                    50% {
                        opacity: 0.7;
                        transform: scaleY(0.9);
                    }
                }

                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes streamingGlow {
                    0%, 100% {
                        box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 15px rgba(59, 130, 246, 0.5), 0 0 25px rgba(59, 130, 246, 0.2);
                    }
                }

                .message-bubble {
                    animation: fadeInUp 0.4s ease-out;
                }

                .message-bubble.user {
                    animation: slideInRight 0.4s ease-out;
                }

                .message-bubble.ai {
                    animation: slideInLeft 0.4s ease-out;
                }

                .streaming-message {
                    animation: streamingGlow 2s ease-in-out infinite;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #c1c1c1, #a8a8a8);
                    border-radius: 3px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #a8a8a8, #888);
                }
            `}</style>

            <div
                ref={listContainerRef}
                className="flex-1 overflow-y-auto mb-4 max-h-[60vh] p-2 custom-scrollbar"
                onScroll={handleScroll}
            >
                {/* 이전 메시지 로드 버튼/인디케이터 */}
                {hasMoreMessages && (
                    <div className="text-center my-3">
                        {isLoadingMore ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#4285F4]"></div>
                                <span className="text-sm text-gray-500">이전 메시지 로딩 중...</span>
                            </div>
                        ) : (
                            <button
                                onClick={loadOlderMessages}
                                className="text-[#4285F4] text-sm hover:underline px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200 border border-blue-200 hover:border-blue-300"
                            >
                                📜 이전 메시지 더 보기
                            </button>
                        )}
                    </div>
                )}

                {/* 메시지 목록 */}
                {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="text-gray-400 text-center">
                            <div className="mb-3 text-4xl">💬</div>
                            <div className="text-lg font-medium mb-1">토론이 아직 시작되지 않았습니다</div>
                            <div className="text-sm text-gray-500">첫 번째 메시지를 보내서 AI와 토론을 시작해보세요!</div>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`mb-5 flex message-bubble ${message.sender} ${
                                message.sender === 'user'
                                    ? 'justify-end'
                                    : message.sender === 'system'
                                        ? 'justify-center'
                                        : 'justify-start'
                            }`}
                        >
                            {/* AI 메시지 - 좌측 정렬 */}
                            {message.sender === 'ai' && (
                                <div className="flex items-start max-w-4/5">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold shadow-lg">
                                        AI
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className={message.isStreaming ? 'streaming-message' : ''}>
                                            {message.isStreaming ? (
                                                <StreamingMessage message={message} />
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg rounded-tl-none border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{message.text}</p>
                                                </div>
                                            )}
                                        </div>
                                        <span className="message-time text-left mt-2 text-xs text-gray-500 ml-1">
                                            🤖 {message.time}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 사용자 메시지 - 우측 정렬 */}
                            {message.sender === 'user' && (
                                <div className="flex items-start max-w-4/5">
                                    <div className="flex flex-col min-w-0">
                                        <div className="bg-gradient-to-r from-[#4285F4] to-[#3367d6] text-white p-4 rounded-lg rounded-tr-none shadow-md hover:shadow-lg transition-shadow duration-200">
                                            <p className="whitespace-pre-wrap text-left leading-relaxed">{message.text}</p>
                                        </div>
                                        <span className="message-time text-right mt-2 text-xs text-gray-500 mr-1">
                                            👤 {message.time}
                                        </span>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center ml-3 flex-shrink-0 text-sm font-bold shadow-lg">
                                        나
                                    </div>
                                </div>
                            )}

                            {/* 시스템 메시지 - 중앙 정렬 */}
                            {message.sender === 'system' && (
                                <div className="flex flex-col items-center max-w-2/3">
                                    <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg text-center border border-yellow-200 shadow-sm">
                                        <p className="text-sm font-medium">{message.text}</p>
                                    </div>
                                    <span className="message-time mt-2 text-xs text-gray-500">
                                        ℹ️ {message.time}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* AI 답변 대기 중 표시 (스트리밍이 아닌 일반 로딩) */}
                {isLoading && !isStreaming && (
                    <div className="mb-5 flex justify-start">
                        <div className="flex items-start max-w-4/5">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0 text-sm font-bold shadow-lg">
                                AI
                            </div>
                            <div className="flex flex-col">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg rounded-tl-none border border-blue-100 shadow-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                        <span className="text-blue-600 text-sm font-medium">AI가 생각하고 있습니다...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 자동 스크롤을 위한 참조 요소 */}
                <div ref={messageEndRef} />

                {/* 맨 아래로 스크롤 버튼 - 개선된 디자인 */}
                {!autoScrollEnabled && messages.length > 5 && (
                    <button
                        className="fixed bottom-28 right-8 bg-gradient-to-r from-[#4285F4] to-[#3367d6] text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-10 hover:scale-110 border-2 border-white"
                        onClick={() => {
                            messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            setAutoScrollEnabled(true);
                        }}
                        title="맨 아래로 스크롤"
                        style={{
                            animation: 'pulse 2s ease-in-out infinite'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    </button>
                )}
            </div>
        </>
    );
};

export default MessageList;