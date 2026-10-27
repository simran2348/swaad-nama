/**
 * Fills its (positioned) parent with a photo: a blurred, dimmed cover copy
 * behind, and the whole photo contained in front, so nothing is cropped.
 */
export const Photo = ({
  src,
  alt = '',
  className = 'absolute inset-0',
}: {
  src: string;
  alt?: string;
  /** Size and position of the frame; fills the parent by default. */
  className?: string;
}) => (
  <span className={`block overflow-hidden bg-black ${className}`}>
    <img
      src={src}
      alt=""
      aria-hidden
      className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-[0.6]"
    />
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-contain"
    />
  </span>
);
