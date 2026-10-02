type MissMinutesAvatarProps = { className?: string };

export function MissMinutesAvatar({ className = '' }: MissMinutesAvatarProps) {
  return (
    <svg
      className={`miss-minutes-avatar ${className}`.trim()}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="27" fill="#F3F8F5" stroke="#243B34" strokeWidth="2" />
      <circle cx="32" cy="32" r="21.5" fill="#E5F1EB" stroke="#B7CDC2" strokeWidth="1.25" />
      <path d="M13 25.5c5.2-7 12-10.5 19-10.5s13.8 3.5 19 10.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".9" />
      <circle cx="20" cy="35" r="2" fill="#55BCA4" />
      <circle cx="44" cy="35" r="2" fill="#55BCA4" />
      <circle cx="23.5" cy="29" r="2.1" fill="#1C302A" />
      <circle cx="40.5" cy="29" r="2.1" fill="#1C302A" />
      <path d="M27 37.5c1.5 2 3.2 3 5 3s3.5-1 5-3" stroke="#1C302A" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="32" cy="11" r="3" fill="#55BCA4" stroke="#F3F8F5" strokeWidth="1.5" />
      <path d="M32 7.5v-2" stroke="#243B34" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.5 47.5c3.8 3.3 8.3 5 13.5 5s9.7-1.7 13.5-5" stroke="#B7CDC2" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
