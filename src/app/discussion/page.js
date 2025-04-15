'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

export default function Discussion() {
    const router = useRouter();
    const messageEndRef = useRef(null);

    // 토론 정보 (실제로는 이전 페이지에서 받아올 데이터)
    const [discussionInfo, setDiscussionInfo] = useState({
        topic: '이 공에 토론 주제가 표시됩니다.',
        keywords: ['키워드1', '키워드2', '키워드3'],
        description: '이 토론 주제에 대한 간단한 설명이 이 곳에 표시됩니다.',
        userPosition: '찬성', // 사용자가 선택한 입장
        aiPosition: '반대' // AI의 입장
    });

    // 현재 시간을 반환하는 함수
    const getCurrentTime = () => {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    };

    // 채팅 메시지
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: 'AI 반박 논점 생성중..',
            time: getCurrentTime()
        }
    ]);

    // 입력 메시지
    const [inputMessage, setInputMessage] = useState('');

    // 메시지 제출 처리
    const handleSubmit = (e) => {
        e.preventDefault();

        if (inputMessage.trim() === '') return;

        // 사용자 메시지 추가
        const newUserMessage = {
            id: messages.length + 1,
            sender: 'user',
            text: inputMessage,
            time: getCurrentTime()
        };

        setMessages([...messages, newUserMessage]);
        setInputMessage('');

        // AI 응답 시뮬레이션 (실제로는 API 호출)
        setTimeout(() => {
            const newAiMessage = {
                id: messages.length + 2,
                sender: 'ai',
                text: '이것은 AI의 응답입니다. 실제 구현에서는 API를 통해 받아온 응답이 표시될 예정입니다.',
                time: getCurrentTime()
            };

            setMessages(prev => [...prev, newAiMessage]);

            // 토론이 충분히 진행되었다면 요약 페이지로 이동 (실제로는 더 복잡한 로직)
            if (messages.length > 6) {
                // 토론 종료 메시지
                setTimeout(() => {
                    const endMessage = {
                        id: messages.length + 3,
                        sender: 'system',
                        text: '토론이 종료되었습니다. 토론 요약 페이지로 이동합니다.',
                        time: getCurrentTime()
                    };

                    setMessages(prev => [...prev, endMessage]);

                    // 요약 페이지로 이동
                    setTimeout(() => {
                        router.push('/summary');
                    }, 2000);
                }, 1000);
            }
        }, 1000);
    };

    // 새 메시지가 추가될 때마다 스크롤 아래로 이동
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={true} backUrl="/topic-selection" nextText="끝내기" nextUrl="/summary" />

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 좌측 정보 패널 */}
                <div className="md:col-span-1">
                    <Card className="mb-6">
                        <h2 className="font-bold mb-2">토론 주제</h2>
                        <p className="text-gray-700 mb-4">{discussionInfo.topic}</p>

                        <h2 className="font-bold mb-2">토론 핵심 키워드</h2>
                        <ul className="mb-4">
                            {discussionInfo.keywords.map((keyword, index) => (
                                <li key={index} className="text-gray-700">{keyword}</li>
                            ))}
                        </ul>

                        <h2 className="font-bold mb-2">이 토론 주제에 대하여...</h2>
                        <p className="text-gray-700 mb-4">{discussionInfo.description}</p>

                        <div className="flex justify-between bg-gray-100 p-3 rounded-lg">
                            <div>
                                <span className="font-bold text-blue-500 block">{discussionInfo.userPosition}</span>
                                <span className="text-sm">사용자</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-red-500 block">{discussionInfo.aiPosition}</span>
                                <span className="text-sm">AI</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 우측 채팅 인터페이스 */}
                <div className="md:col-span-3 flex flex-col">
                    <Card className="flex-1 mb-4 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto mb-4 max-h-[60vh]">
                            {messages.map((message) => (
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
                            ))}
                            <div ref={messageEndRef} />
                        </div>

                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="나의 토론 의견 작성:"
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
                            />
                            <Button type="submit" variant="primary">
                                보내기
                            </Button>
                        </form>
                    </Card>
                </div>
            </main>
        </div>
    );
}