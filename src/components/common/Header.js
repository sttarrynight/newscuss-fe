'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header({ showNav = false, backUrl = '/', nextUrl = null, nextText = '다음' }) {
    const pathname = usePathname();

    // Function to render logo with highlighted characters
    const renderLogo = () => (
        <h1 className="text-6xl font-bold text-[#4285F4]">
            <span className="text-[#0052CC]">N</span>ews<span className="text-[#0052CC]">c</span>uss
        </h1>
    );

    return (
        <>
            {/* 상단 정보 */}
            <header className="w-full py-3 px-6 text-left bg-white border-b border-gray-200 text-sm text-gray-700">
                서울과학기술대학교 캡스톤디자인 Newscuss | contact: kyb20102010@seoultech.ac.kr
            </header>

            {/* 네비게이션 */}
            {showNav && (
                <nav className="flex justify-between items-center py-4 px-6">
                    <div className="w-28">
                        <Link
                            href={backUrl}
                            className="bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium hover:bg-[#3367d6] transition-colors inline-block"
                        >
                            뒤로가기
                        </Link>
                    </div>

                    <div className="flex justify-center">
                        <Link href="/" className="text-center">
                            {renderLogo()}
                        </Link>
                    </div>

                    <div className="w-28 flex justify-end">
                        {nextUrl && (
                            <Link
                                href={nextUrl}
                                className="bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium hover:bg-[#3367d6] transition-colors"
                            >
                                {nextText}
                            </Link>
                        )}
                    </div>
                </nav>
            )}
        </>
    );
}