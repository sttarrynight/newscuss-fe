'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import MessageList from '@/components/discussion/MessageList';
import ErrorHandler, { ERROR_TYPES } from '@/components/common/ErrorHandler';
import { useAppContext } from '@/context/AppContext';

export default function Discussion() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [inputMessage, setInputMessage] = useState('');
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showSummaryLoading, setShowSummaryLoading] = useState(false); // 요약 로딩 상태
    const [retryCount, setRetryCount] = useState(0);
    const textareaRef = useRef(null);

    // readonly 모드 확인
    const isReadOnly = searchParams.get('readonly') === 'true';

    const {
        sessionId,
        topic,
        topicDescription,
        keywords,
        userPosition,
        aiPosition,
        difficulty,
        sendMessage,
        isLoading,
        error,
        setError,
        resetSession,
        startBackgroundSummary,
        summaryStatus
    } = useAppContext();

    // 입장별 색상 결정 함수
    const getPositionColor = (position) => {
        return position === '찬성' ? 'text-blue-500' : 'text-red-500';
    };

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId || !topic || !userPosition) {
            router.push('/topic-selection');
        }
    }, [sessionId, topic, userPosition, router]);

    // textarea 자동 높이 조절 (readonly 모드가 아닐 때만)
    useEffect(() => {
        if (!isReadOnly && textareaRef.current) {
            // 높이 초기화
            textareaRef.current.style.height = 'auto';

            // 내용에 맞춰 높이 조절
            const scrollHeight = textareaRef.current.scrollHeight;
            const maxHeight = 120; // 최대 높이 (약 5-6줄)

            if (scrollHeight <= maxHeight) {
                textareaRef.current.style.height = scrollHeight + 'px';
                textareaRef.current.style.overflow = 'hidden';
            } else {
                textareaRef.current.style.height = maxHeight + 'px';
                textareaRef.current.style.overflow = 'auto';
            }
        }
    }, [inputMessage, isReadOnly]);

    // 엔터키 처리 (Shift+Enter는 줄바꿈, Enter는 전송) - readonly 모드가 아닐 때만
    const handleKeyDown = (e) => {
        if (!isReadOnly && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // 에러 처리 후 재시도 기능
    const handleRetry = () => {
        setError(null);
        setRetryCount(prev => prev + 1);
    };

    // 홈으로 돌아가기
    const handleGoHome = () => {
        resetSession();
        router.push('/');
    };

    // 메시지 제출 처리 (readonly 모드가 아닐 때만)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isReadOnly || inputMessage.trim() === '') return;

        try {
            await sendMessage(inputMessage);
            setInputMessage('');
        } catch (error) {
            console.error('메시지 전송 실패:', error);
        }
    };

    // 토론 종료 처리 (readonly 모드가 아닐 때만)
    const handleEndDiscussion = async () => {
        if (isReadOnly) {
            // readonly 모드에서는 Summary 페이지로 바로 이동
            router.push('/summary');
            return;
        }

        if (retryCount > 0) {
            // 이미 오류가 발생했던 경우 확인 없이 바로 이동
            router.push('/summary');
            return;
        }

        // AI와 사용자 메시지 수를 확인하여 충분한 토론이 이루어졌는지 확인
        const messageCount = { ai: 0, user: 0 };

        try {
            const storedSession = JSON.parse(localStorage.getItem('newscuss_session') || '{}');
            if (storedSession.messages && Array.isArray(storedSession.messages)) {
                storedSession.messages.forEach(msg => {
                    if (msg.sender === 'ai') messageCount.ai++;
                    if (msg.sender === 'user') messageCount.user++;
                });
            }
        } catch (err) {
            console.error('메시지 카운트 확인 오류:', err);
        }

        // 사용자 메시지가 1개 이하면 확인 모달 표시
        if (messageCount.user <= 1) {
            setShowEndConfirm(true);
        } else {
            // 백그라운드 요약 시작
            try {
                setShowSummaryLoading(true); // 로딩 화면 표시
                await startBackgroundSummary();
                router.push('/summary');
            } catch (error) {
                console.error('백그라운드 요약 시작 실패:', error);
                // 요약 실패해도 Summary 페이지로 이동
                router.push('/summary');
            } finally {
                setShowSummaryLoading(false);
            }
        }
    };

    // 토론 종료 확인 모달 (readonly 모드가 아닐 때만)
    const EndConfirmModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md mx-4">
                <h3 className="text-xl font-bold mb-4">토론을 끝내시겠습니까?</h3>
                <p className="text-gray-700 mb-4">
                    아직 충분한 토론이 이루어지지 않았습니다.
                    토론을 더 진행하시면 더 풍부한 요약을 받을 수 있습니다.
                </p>
                <div className="flex justify-end gap-4">
                    <Button
                        variant="secondary"
                        onClick={() => setShowEndConfirm(false)}
                    >
                        계속 토론하기
                    </Button>
                    <Button
                        variant="primary"
                        onClick={async () => {
                            setShowEndConfirm(false);
                            setShowSummaryLoading(true); // 로딩 화면 표시
                            // 백그라운드 요약 시작
                            try {
                                await startBackgroundSummary();
                                router.push('/summary');
                            } catch (error) {
                                console.error('백그라운드 요약 시작 실패:', error);
                                router.push('/summary');
                            } finally {
                                setShowSummaryLoading(false);
                            }
                        }}
                    >
                        토론 종료하기
                    </Button>
                </div>
            </div>
        </div>
    );

    // 토론 정보 컴포넌트 (색상 개선)
    const DiscussionInfo = () => (
        <Card className="mb-6">
            <h2 className="font-bold mb-2">토론 주제</h2>
            <p className="text-gray-700 mb-4">{topic}</p>

            <h2 className="font-bold mb-2">토론 핵심 키워드</h2>
            <ul className="mb-4">
                {keywords.map((keyword, index) => (
                    <li key={index} className="text-gray-700">{keyword}</li>
                ))}
            </ul>

            {topicDescription && (
                <>
                    <h2 className="font-bold mb-2">이 토론 주제에 대하여...</h2>
                    <p className="text-gray-700 mb-4">{topicDescription}</p>
                </>
            )}

            <div className="flex justify-between bg-gray-100 p-3 rounded-lg">
                <div>
                    <span className={`font-bold block ${getPositionColor(userPosition)}`}>
                        {userPosition}
                    </span>
                    <span className="text-sm">사용자</span>
                </div>
                <div className="text-right">
                    <span className={`font-bold block ${getPositionColor(aiPosition)}`}>
                        {aiPosition}
                    </span>
                    <span className="text-sm">AI</span>
                </div>
            </div>

            {/* readonly 모드 표시 */}
            {isReadOnly && (
                <div className="mt-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 text-center">
                        📖 읽기 전용 모드 - 대화 내역만 확인할 수 있습니다
                    </p>
                </div>
            )}
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header
                showNav={true}
                backUrl={isReadOnly ? "/summary" : "/topic-selection"}
                nextText={
                    isReadOnly
                        ? "요약으로 돌아가기"
                        : summaryStatus === 'SUMMARIZING'
                            ? '요약 중...'
                            : summaryStatus === 'COMPLETED'
                                ? '요약 완료 - 확인하기'
                                : '끝내기'
                }
                onNext={handleEndDiscussion}
            />

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 좌측 정보 패널 */}
                <div className="md:col-span-1">
                    <DiscussionInfo />
                </div>

                {/* 우측 채팅 인터페이스 */}
                <div className="md:col-span-3 flex flex-col">
                    <Card className="flex-1 mb-4 overflow-hidden flex flex-col">
                        {/* 메시지 목록 (페이지네이션 적용) */}
                        <MessageList />

                        {/* 입력 폼 (readonly 모드가 아닐 때만 표시) */}
                        {!isReadOnly && (
                            <div className="border-t border-gray-200 pt-4">
                                <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <textarea
                                            ref={textareaRef}
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="나의 토론 의견 작성... (Shift+Enter: 줄바꿈, Enter: 전송)"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4] resize-none transition-all duration-200 min-h-[48px]"
                                            disabled={isLoading}
                                            rows={1}
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            Shift + Enter로 줄바꿈, Enter로 전송
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={isLoading || inputMessage.trim() === ''}
                                        className="px-6 py-3 shrink-0"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                                전송 중
                                            </div>
                                        ) : (
                                            '보내기'
                                        )}
                                    </Button>
                                </form>
                            </div>
                        )}

                        {/* readonly 모드일 때 안내 메시지 */}
                        {isReadOnly && (
                            <div className="border-t border-gray-200 pt-4 text-center">
                                <p className="text-gray-500 text-sm">
                                    읽기 전용 모드입니다. 토론을 계속하려면 입장 바꾸기를 이용해주세요.
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* 에러 메시지 (readonly 모드가 아닐 때만) */}
                    {!isReadOnly && error && (
                        <ErrorHandler
                            error={error}
                            errorType={ERROR_TYPES.API}
                            onRetry={handleRetry}
                            onGoHome={handleGoHome}
                            className="mb-4"
                        />
                    )}
                </div>
            </main>

            {/* 토론 종료 확인 모달 (readonly 모드가 아닐 때만) */}
            {!isReadOnly && showEndConfirm && <EndConfirmModal />}

            {/* 요약 중 로딩 화면 (배경 오버레이 제거) */}
            {showSummaryLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                    {/* 모달 컨텐츠만 표시 (배경 오버레이 없음) */}
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200 pointer-events-auto">
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#4285F4] mx-auto mb-4"></div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">토론 요약 생성 중</h3>
                            <p className="text-gray-600 mb-4 text-sm">AI가 토론 내용을 분석하고 요약하고 있습니다...</p>
                            <p className="text-xs text-gray-500">
                                토론 내용이 길수록 더 오래 걸릴 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}