export function LabAtmosphere() {
  return (
    <div className="lab-atmosphere" aria-hidden="true">
      <div className="spectral-haze haze-left" />
      <div className="spectral-haze haze-right" />
      <div className="wandering-spores">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}

export function FlaskBubbles() {
  return (
    <>
      <g clipPath="url(#flask-left)" className="flask-bubbles">
        {[61, 73, 85, 92].map((x, i) => (
          <circle
            key={x}
            className={'brew-bubble bubble-' + i}
            cx={x}
            cy="337"
            r={i % 2 ? 2 : 3}
            fill="#deff9f"
          />
        ))}
      </g>
      <g clipPath="url(#flask-right)" className="flask-bubbles violet-bubbles">
        {[469, 479, 491, 497].map((x, i) => (
          <circle
            key={x}
            className={'brew-bubble bubble-' + i}
            cx={x}
            cy="337"
            r={i % 2 ? 2.5 : 3}
            fill="#edcfff"
          />
        ))}
      </g>
      <path
        className="liquid-surface"
        d="M54 309q11-3 22 0t22 0"
        stroke="#d6fa9b"
        strokeWidth="1.5"
      />
      <path
        className="liquid-surface violet-surface"
        d="M463 306q10-3 20 0t20 0"
        stroke="#d8b6ef"
        strokeWidth="1.5"
      />
    </>
  );
}

export function LabInstruments() {
  return (
    <>
      <g className="lab-phantom" fill="#b9a8ce" opacity=".18">
        <path d="M381 188v-14a12 12 0 0 1 24 0v14l-6-4-6 4-6-4z" />
        <ellipse cx="389" cy="174" rx="1.5" ry="2.5" fill="#192125" />
        <ellipse cx="397" cy="174" rx="1.5" ry="2.5" fill="#192125" />
      </g>
      <path
        className="flow-tube"
        d="M76 254v-28q0-12 12-12h25M483 254v-28q0-12-12-12h-24"
        stroke="#829c6d"
        strokeWidth="2"
      />
      <path
        className="flow-current"
        d="M76 254v-28q0-12 12-12h25M483 254v-28q0-12-12-12h-24"
        stroke="#c5ed87"
        strokeWidth="2"
        strokeDasharray="3 14"
      />
      <g className="pressure-gauge">
        <circle
          cx="417"
          cy="267"
          r="19"
          fill="#182321"
          stroke="#788b68"
          strokeWidth="2"
        />
        <path
          d="M403 270a14 14 0 0 1 28 0"
          stroke="#a1b881"
          strokeWidth="2"
          strokeDasharray="2 4"
        />
        <path
          className="gauge-needle"
          d="M417 267l10-8"
          stroke="#d9edb4"
          strokeWidth="2"
        />
        <circle cx="417" cy="267" r="2" fill="#d9edb4" />
      </g>
      <g className="indicator-bank">
        <rect
          x="239"
          y="368"
          width="82"
          height="18"
          rx="3"
          fill="#202c27"
          stroke="#6e805c"
        />
        <circle
          className="indicator-light indicator-one"
          cx="254"
          cy="377"
          r="3"
          fill="#c7ed91"
        />
        <circle
          className="indicator-light indicator-two"
          cx="270"
          cy="377"
          r="3"
          fill="#b89bd3"
        />
        <circle
          className="indicator-light indicator-three"
          cx="286"
          cy="377"
          r="3"
          fill="#c7ed91"
        />
        <path d="M300 375h12m-12 4h8" stroke="#8da174" strokeWidth="1.5" />
      </g>
      <g
        className="apparatus-steam"
        stroke="#a5c99a"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".25"
      >
        <path className="steam-wisp wisp-one" d="M69 253c-9-9 8-15 0-24" />
        <path className="steam-wisp wisp-two" d="M81 251c-7-8 7-14 0-21" />
        <path className="steam-wisp wisp-three" d="M482 252c-9-9 8-15 0-24" />
      </g>
    </>
  );
}
