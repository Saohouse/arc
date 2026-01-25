'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);
      
      // Color code based on performance
      const getColor = () => {
        switch (metric.name) {
          case 'FCP': // First Contentful Paint - Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s
            return value < 1800 ? '🟢' : value < 3000 ? '🟡' : '🔴';
          case 'LCP': // Largest Contentful Paint - Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s
            return value < 2500 ? '🟢' : value < 4000 ? '🟡' : '🔴';
          case 'CLS': // Cumulative Layout Shift - Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25
            return value < 100 ? '🟢' : value < 250 ? '🟡' : '🔴';
          case 'FID': // First Input Delay - Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms
            return value < 100 ? '🟢' : value < 300 ? '🟡' : '🔴';
          case 'TTFB': // Time to First Byte - Good: <800ms, Needs Improvement: 800-1800ms, Poor: >1800ms
            return value < 800 ? '🟢' : value < 1800 ? '🟡' : '🔴';
          case 'INP': // Interaction to Next Paint - Good: <200ms, Needs Improvement: 200-500ms, Poor: >500ms
            return value < 200 ? '🟢' : value < 500 ? '🟡' : '🔴';
          default:
            return '⚪';
        }
      };

      console.log(
        `${getColor()} ${metric.name}:`,
        metric.name === 'CLS' ? (value / 1000).toFixed(3) : `${value}ms`,
        metric.rating
      );
    }

    // You can also send to analytics here
    // Example: window.gtag?.('event', metric.name, { value: metric.value });
  });

  return null;
}
