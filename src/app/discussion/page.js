'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import MessageList from '@/components/discussion/MessageList';
import ErrorHandler, { ERROR_TYPES } from '@/components/common/ErrorHandler';
import { useAppContext } from '@/context/AppContext';

export default function Discussion() {
    const router = useRouter();
    const [inputMessage, setInputMessage] = useState('');
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

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
        resetSession
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId || !topic || !userPosition) {
            router.push('/topic-selection');
        }
    }, [sessionId, topic, userPosition, router]);

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

    // 메시지 제출 처리
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (inputMessage.trim() === '') return;

        try {
            await sendMessage(inputMessage);
            setInputMessage('');
        } catch (error) {
            console.error('메시지 전송 실패:', error);
        }
    };

    // 토론 종료 처리
    const handleEndDiscussion = () => {
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
            router.push('/summary');
        }
    };

    // 토론 종료 확인 모달
    const EndConfirmModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md">
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
                        onClick={() => router.push('/summary')}
                    >
                        토론 종료하기
                    </Button>
                </div>
            </div>
        </div>
    );

    // 토론 정보 컴포넌트
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
                    <span className="font-bold text-blue-500 block">{userPosition}</span>
                    <span className="text-sm">사용자</span>
                </div>
                <div className="text-right">
                    <span className="font-bold text-red-500 block">{aiPosition}</span>
                    <span className="text-sm">AI</span>
                </div>
            </div>
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header
                showNav={true}
                backUrl="/topic-selection"
                nextText="끝내기"
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

                        {/* 입력 폼 */}
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="나의 토론 의견 작성:"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isLoading || inputMessage.trim() === ''}
                            >
                                {isLoading ? '전송 중...' : '보내기'}
                            </Button>
                        </form>
                    </Card>

                    {/* 에러 메시지 */}
                    {error && (
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

            {/* 토론 종료 확인 모달 */}
            {showEndConfirm && <EndConfirmModal />}
        </div>
    );
}