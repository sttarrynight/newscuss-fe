'use client';

import { useEffect } from 'react';
import Button from '@/components/common/Button';

const FeedbackModal = ({ 
    isOpen, 
    onClose, 
    feedbackData, 
    isLoading, 
    error 
}) => {
    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // 점수 바 컴포넌트
    const ScoreBar = ({ label, score, comment }) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-bold text-gray-900">{score}점</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score}%` }}
                ></div>
            </div>
            <p className="text-xs text-gray-600">{comment}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 투명한 배경 오버레이 (클릭으로 닫기용) */}
            <div 
                className="absolute inset-0"
                onClick={onClose}
            ></div>

            {/* 모달 컨텐츠 */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                <div className="p-6">
                    {/* 헤더 */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">🎯 토론 성과 분석</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                        >
                            ×
                        </button>
                    </div>

                    {/* 로딩 상태 */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#4285F4] mb-4"></div>
                            <p className="text-gray-600 text-lg">점수를 계산하고 있습니다...</p>
                            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
                        </div>
                    )}

                    {/* 에러 상태 */}
                    {error && !isLoading && (
                        <div className="text-center py-16">
                            <div className="text-red-500 text-5xl mb-4">😅</div>
                            <h3 className="text-xl font-bold text-red-600 mb-2">점수 계산 실패</h3>
                            <p className="text-red-700 mb-6">{error}</p>
                            <Button variant="primary" onClick={onClose}>
                                확인
                            </Button>
                        </div>
                    )}

                    {/* 피드백 데이터 표시 */}
                    {feedbackData && !isLoading && !error && (
                        <div>
                            {/* 총점 표시 */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg mb-4">
                                    <span className="text-4xl font-bold text-white">{feedbackData.총점}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">총점</h3>
                            </div>

                            {/* 카테고리별 점수 */}
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold text-gray-900 mb-4">📊 세부 평가</h4>
                                
                                {feedbackData.논리적_사고력 && (
                                    <ScoreBar 
                                        label="논리적 사고력" 
                                        score={feedbackData.논리적_사고력.점수 || 0}
                                        comment={feedbackData.논리적_사고력.코멘트 || ''}
                                    />
                                )}

                                {feedbackData.근거와_증거_활용 && (
                                    <ScoreBar 
                                        label="근거와 증거 활용" 
                                        score={feedbackData.근거와_증거_활용.점수 || 0}
                                        comment={feedbackData.근거와_증거_활용.코멘트 || ''}
                                    />
                                )}

                                {feedbackData.의사소통_능력 && (
                                    <ScoreBar 
                                        label="의사소통 능력" 
                                        score={feedbackData.의사소통_능력.점수 || 0}
                                        comment={feedbackData.의사소통_능력.코멘트 || ''}
                                    />
                                )}

                                {feedbackData.토론_태도와_매너 && (
                                    <ScoreBar 
                                        label="토론 태도와 매너" 
                                        score={feedbackData.토론_태도와_매너.점수 || 0}
                                        comment={feedbackData.토론_태도와_매너.코멘트 || ''}
                                    />
                                )}

                                {feedbackData.창의성과_통찰력 && (
                                    <ScoreBar 
                                        label="창의성과 통찰력" 
                                        score={feedbackData.창의성과_통찰력.점수 || 0}
                                        comment={feedbackData.창의성과_통찰력.코멘트 || ''}
                                    />
                                )}
                            </div>

                            {/* 종합 피드백 섹션 */}
                            {feedbackData.종합_코멘트 && (
                                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        💡 종합 피드백
                                    </h4>
                                    <p className="text-gray-700 leading-relaxed text-base">
                                        {feedbackData.종합_코멘트}
                                    </p>
                                </div>
                            )}

                            {/* 닫기 버튼 */}
                            <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
                                <Button 
                                    variant="primary" 
                                    onClick={onClose}
                                    className="px-8"
                                >
                                    확인
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
