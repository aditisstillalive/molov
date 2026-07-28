interface StepperProps {
  current: number; // 0, 1, 2
}

const STEPS = ["Upload", "Review", "Summary"];

export default function Stepper({ current }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {/* Step circle */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i <= current
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {i < current ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {/* Label */}
          <span
            className={`text-sm font-medium hidden sm:inline ${
              i <= current ? "text-blue-600" : "text-gray-400"
            }`}
          >
            {label}
          </span>
          {/* Connector line */}
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 hidden sm:block ${
                i < current ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
