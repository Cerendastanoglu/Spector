import { useState, useCallback } from "react";

interface UseSliderOptions {
  totalItems: number;
  initialIndex?: number;
}

interface UseSliderReturn {
  currentIndex: number;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Custom hook for managing slider/carousel navigation
 * 
 * Provides simple prev/next navigation with boundary checks
 * 
 * @param options Configuration with total items count
 * @returns Slider state and navigation functions
 */
export function useSlider({ totalItems, initialIndex = 0 }: UseSliderOptions): UseSliderReturn {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalItems);
  }, [totalItems]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalItems) % totalItems);
  }, [totalItems]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < totalItems) {
      setCurrentIndex(index);
    }
  }, [totalItems]);

  const hasNext = currentIndex < totalItems - 1;
  const hasPrevious = currentIndex > 0;

  return {
    currentIndex,
    goToNext,
    goToPrevious,
    goToIndex,
    hasNext,
    hasPrevious,
  };
}
