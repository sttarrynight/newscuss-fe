'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
    const [url, setUrl] = useState('');
    const router = useRouter();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            // 실제로는 API 호출하여 URL 처리
            // 여기서는 단순 페이지 이동으로 구현
            router.push('/keyword-summary');
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
                        />
                        <button
                            type="submit"
                            className="bg-[#4285F4] text-white py-4 px-8 rounded-lg font-medium hover:bg-[#3367d6] transition-colors shadow-md hover:shadow-lg"
                        >
                            검색
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}