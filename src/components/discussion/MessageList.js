'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';

/**
 * 메시지 페이지네이션을 지원하는 메시지 목록 컴포넌트 (스트리밍 지원)
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
    const [lastScrollPosition, setLastScrollPosition] = useState(0);

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

        // 현재 스크롤 위치 저장
        setLastScrollPosition(scrollTop);
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

    // 스트리밍 메시지의 타이핑 효과 컴포넌트
    const StreamingMessage = ({ message }) => {
        const [displayedText, setDisplayedText] = useState('');
        const [showCursor, setShowCursor] = useState(true);

        useEffect(() => {
            if (message.isStreaming) {
                setDisplayedText(message.text);

                // 커서 깜빡임 효과
                const cursorInterval = setInterval(() => {
                    setShowCursor(prev => !prev);
                }, 500);

                return () => clearInterval(cursorInterval);
            } else {
                setDisplayedText(message.text);
                setShowCursor(false);
            }
        }, [message.text, message.isStreaming]);

        return (
            <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                <p className="text-gray-800 whitespace-pre-wrap">
                    {displayedText}
                    {message.isStreaming && (
                        <span
                            className={`inline-block w-2 h-5 bg-gray-600 ml-1 ${showCursor ? 'opacity-100' : 'opacity-0'}`}
                            style={{ animation: 'blink 1s infinite' }}
                        >
                            |
                        </span>
                    )}
                </p>
                {message.isStreaming && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                        <div className="flex space-x-1 mr-2">
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <span>AI가 답변하고 있습니다...</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <style jsx>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>

            <div
                ref={listContainerRef}
                className="flex-1 overflow-y-auto mb-4 max-h-[60vh] p-2"
                onScroll={handleScroll}
            >
                {/* 이전 메시지 로드 버튼/인디케이터 */}
                {hasMoreMessages && (
                    <div className="text-center my-2">
                        {isLoadingMore ? (
                            <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#4285F4]"></div>
                        ) : (
                            <button
                                onClick={loadOlderMessages}
                                className="text-[#4285F4] text-sm hover:underline"
                            >
                                이전 메시지 더 보기
                            </button>
                        )}
                    </div>
                )}

                {/* 메시지 목록 */}
                {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-32">
                        <div className="text-gray-400">
                            토론이 아직 시작되지 않았습니다.
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`mb-4 flex ${
                                message.sender === 'user'
                                    ? 'justify-end'
                                    : message.sender === 'system'
                                        ? 'justify-center'
                                        : 'justify-start'
                            }`}
                        >
                            {/* AI 메시지 - 좌측 정렬 */}
                            {message.sender === 'ai' && (
                                <div className="flex items-start max-w-3/4">
                                    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                                        AI
                                    </div>
                                    <div className="flex flex-col">
                                        {message.isStreaming ? (
                                            <StreamingMessage message={message} />
                                        ) : (
                                            <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                                                <p className="text-gray-800 whitespace-pre-wrap">{message.text}</p>
                                            </div>
                                        )}
                                        <span className="message-time text-left mt-1">{message.time}</span>
                                    </div>
                                </div>
                            )}

                            {/* 사용자 메시지 - 우측 정렬 */}
                            {message.sender === 'user' && (
                                <div className="flex items-start max-w-3/4">
                                    <div className="flex flex-col">
                                        <div className="bg-[#4285F4] text-white p-3 rounded-lg rounded-tr-none">
                                            <p className="whitespace-pre-wrap text-left">{message.text}</p>
                                        </div>
                                        <span className="message-time text-right mt-1">{message.time}</span>
                                    </div>
                                    <div className="bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center ml-3 flex-shrink-0">
                                        나
                                    </div>
                                </div>
                            )}

                            {/* 시스템 메시지 - 중앙 정렬 */}
                            {message.sender === 'system' && (
                                <div className="flex flex-col items-center max-w-2/3">
                                    <div className="bg-gray-200 text-gray-700 p-2 rounded-lg text-center">
                                        <p className="text-sm">{message.text}</p>
                                    </div>
                                    <span className="message-time mt-1">{message.time}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* AI 답변 대기 중 표시 (스트리밍이 아닌 일반 로딩) */}
                {isLoading && !isStreaming && (
                    <div className="mb-4 flex justify-start">
                        <div className="flex items-start max-w-3/4">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                                AI
                            </div>
                            <div className="flex flex-col">
                                <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                                    <div className="flex items-center space-x-1">
                                        <span className="text-gray-600">입력중</span>
                                        <div className="flex space-x-1">
                                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 자동 스크롤을 위한 참조 요소 */}
                <div ref={messageEndRef} />

                {/* 맨 아래로 스크롤 버튼 */}
                {!autoScrollEnabled && messages.length > 5 && (
                    <button
                        className="fixed bottom-24 right-8 bg-[#4285F4] text-white rounded-full p-3 shadow-lg hover:bg-[#3367d6] transition-colors z-10"
                        onClick={() => {
                            messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            setAutoScrollEnabled(true);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                )}
            </div>
        </>
    );
};

export default MessageList;