'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Home() {
    const [url, setUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();
    const { submitUrl, isLoading, error } = useAppContext();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            setErrorMessage('URL을 입력해주세요.');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage('');

            // URL 유효성 검사
            let validUrl = url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                validUrl = 'https://' + url;
            }

            // API 호출
            await submitUrl(validUrl);

            // 키워드 및 요약 페이지로 이동
            router.push('/keyword-summary');
        } catch (error) {
            console.error('URL 제출 오류:', error);
            setErrorMessage(error.message || 'URL 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            {/* 헤더 */}
            <header className="w-full py-3 px-6 text-left bg-white border-b border-gray-200 text-sm text-gray-700">
                서울과학기술대학교 캡스톤디자인 Newscuss | contact: kyb20102010@seoultech.ac.kr
            </header>

            {/* 메인 콘텐츠 */}
            <main className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="bg-white rounded-3xl border-2 border-[#4285F4] p-10 w-full max-w-4xl shadow-md">
                    {/* 로고 */}
                    <h1 className="text-center text-7xl font-bold mb-10 text-[#4285F4]">
                        <span className="text-[#0052CC]">N</span>ews<span className="text-[#0052CC]">c</span>uss
                    </h1>

                    {/* 안내 메시지 */}
                    <p className="text-center text-xl text-gray-700 mb-10">
                        AI와 토론하고 싶은 뉴스 기사의 URL을 입력해주세요!
                    </p>

                    {/* URL 입력 폼 */}
                    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="뉴스 기사 URL을 입력하세요:"
                            className="flex-1 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4] bg-white text-gray-900"
                            required
                            disabled={isSubmitting}
                        />
                        <button
                            type="submit"
                            className={`bg-[#4285F4] text-white py-4 px-8 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg ${
                                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#3367d6]'
                            }`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '처리 중...' : '검색'}
                        </button>
                    </form>

                    {/* 에러 메시지 */}
                    {errorMessage && (
                        <div className="mt-4 text-red-500 text-center">
                            {errorMessage}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}