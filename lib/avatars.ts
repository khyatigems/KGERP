
export const PREDEFINED_AVATARS = [
  // 1. Male with glasses
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam)">
      <rect width="36" height="36" fill="#ffadad"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(6 6) rotate(324 18 18) scale(1.1)" fill="#ffd6a5" rx="36"></rect>
      <g transform="translate(-1 2) rotate(-2 18 18)">
        <path d="M13,19 a1,0.75 0 0,0 10,0" fill="#000000"></path>
        <rect x="11" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
        <rect x="23" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
      </g>
    </g>
  </svg>`,
  
  // 2. Female with blue background
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam_2" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam_2)">
      <rect width="36" height="36" fill="#a0c4ff"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(-2 -2) rotate(12 18 18) scale(1.1)" fill="#caffbf" rx="36"></rect>
      <g transform="translate(2 1) rotate(5 18 18)">
        <path d="M13,21 a1,0.75 0 0,0 10,0" fill="#000000"></path>
        <rect x="12" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
        <rect x="22" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
      </g>
    </g>
  </svg>`,

  // 3. Neutral purple
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam_3" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam_3)">
      <rect width="36" height="36" fill="#bdb2ff"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(4 4) rotate(90 18 18) scale(1.1)" fill="#ffc6ff" rx="36"></rect>
      <g transform="translate(0 0) rotate(0 18 18)">
        <path d="M15,19 a1,0.75 0 0,0 6,0" fill="#000000"></path>
        <rect x="14" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
        <rect x="20" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
      </g>
    </g>
  </svg>`,

  // 4. Cool Mint
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam_4" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam_4)">
      <rect width="36" height="36" fill="#9bf6ff"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(-5 -5) rotate(-45 18 18) scale(1.1)" fill="#fdffb6" rx="36"></rect>
      <g transform="translate(0 2) rotate(0 18 18)">
        <path d="M14,20 a1,0.75 0 0,0 8,0" fill="#000000"></path>
        <rect x="13" y="13" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
        <rect x="21" y="13" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
      </g>
    </g>
  </svg>`,

  // 5. Warm Orange
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam_5" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam_5)">
      <rect width="36" height="36" fill="#ffc8dd"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(2 2) rotate(180 18 18) scale(1.1)" fill="#ffafcc" rx="36"></rect>
      <g transform="translate(0 1) rotate(0 18 18)">
        <path d="M13,20 a1,0.75 0 0,0 10,0" fill="#000000"></path>
        <rect x="12" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
        <rect x="22" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#000000"></rect>
      </g>
    </g>
  </svg>`,

  // 6. Professional Dark Blue
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <mask id="mask__beam_6" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
      <rect width="36" height="36" rx="72" fill="#FFFFFF"></rect>
    </mask>
    <g mask="url(#mask__beam_6)">
      <rect width="36" height="36" fill="#023e8a"></rect>
      <rect x="0" y="0" width="36" height="36" transform="translate(0 0) rotate(0 18 18) scale(1)" fill="#0077b6" rx="36"></rect>
      <g transform="translate(0 0) rotate(0 18 18)">
         <circle cx="12" cy="14" r="1.5" fill="#ffffff"/>
         <circle cx="24" cy="14" r="1.5" fill="#ffffff"/>
         <path d="M13,22 Q18,26 23,22" stroke="#ffffff" stroke-width="1.5" fill="none" />
      </g>
    </g>
  </svg>`,
];
