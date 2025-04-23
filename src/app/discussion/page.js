'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useAppContext } from '@/context/AppContext';

export default function Discussion() {
    const router = useRouter();
    const messageEndRef = useRef(null);
    const [inputMessage, setInputMessage] = useState('');
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    const {
        sessionId,
        topic,
        topicDescription,
        keywords,
        userPosition,
        aiPosition,
        difficulty,
        messages,
        sendMessage,
        isLoading,
        error
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId || !topic || !userPosition) {
            router.push('/topic-selection');
        }
    }, [sessionId, topic, userPosition, router]);

    // 새 메시지가 추가될 때마다 스크롤 아래로 이동
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
        if (messages.length < 4) {
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
                        <div className="flex-1 overflow-y-auto mb-4 max-h-[60vh]">
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
                                        className={`mb-4 ${
                                            message.sender === 'user'
                                                ? 'text-right'
                                                : message.sender === 'system'
                                                    ? 'text-center'
                                                    : ''
                                        }`}
                                    >
                                        {message.sender === 'ai' && (
                                            <div className="flex items-start">
                                                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-2">
                                                    AI
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="bg-gray-100 p-3 rounded-lg max-w-3/4 inline-block text-left">
                                                        {message.text}
                                                    </div>
                                                    <span className="message-time text-left">{message.time}</span>
                                                </div>
                                            </div>
                                        )}

                                        {message.sender === 'user' && (
                                            <div className="flex flex-col items-end">
                                                <div className="bg-[#4285F4] text-white p-3 rounded-lg max-w-3/4 inline-block">
                                                    {message.text}
                                                </div>
                                                <span className="message-time">{message.time}</span>
                                            </div>
                                        )}

                                        {message.sender === 'system' && (
                                            <div className="flex flex-col items-center">
                                                <div className="bg-gray-200 text-gray-700 p-2 rounded-lg inline-block">
                                                    {message.text}
                                                </div>
                                                <span className="message-time">{message.time}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <div ref={messageEndRef} />
                        </div>

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
                        <div className="text-red-500 text-center mb-4 p-2 bg-red-50 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>
            </main>

            {/* 토론 종료 확인 모달 */}
            {showEndConfirm && <EndConfirmModal />}
        </div>
    );
}