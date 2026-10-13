import React, { useState, useEffect } from 'react';
import { getOptimizedCoverUrl, CoverSize } from '../../utils/imageOptimizer';
import { Music2 } from 'lucide-react';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  size?: CoverSize;
  priority?: boolean;
  containerClassName?: string;
  fallbackSrc?: string;
  showIconPlaceholder?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  size = 'card',
  priority = false,
  containerClassName = '',
  className = '',
  fallbackSrc = '/logo.svg',
  showIconPlaceholder = true,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = hasError ? fallbackSrc : getOptimizedCoverUrl(src, size);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-white/[0.03] ${containerClassName}`}>
      {/* Skeleton Shimmer Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent animate-pulse pointer-events-none">
          {showIconPlaceholder && (
            <Music2 className="w-1/3 h-1/3 text-white/10" />
          )}
        </div>
      )}

      {/* Main Image */}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) {
            setHasError(true);
          } else {
            setIsLoaded(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...rest}
      />
    </div>
  );
};
