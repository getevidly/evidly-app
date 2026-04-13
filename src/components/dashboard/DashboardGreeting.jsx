/**
 * DashboardGreeting — EMOTIONAL-UX-01
 *
 * Role-aware, time-aware greeting that acknowledges what the user
 * is there to do. Replaces generic "Welcome back" greetings.
 */

const GREETINGS = {
  owner_operator: {
    morning: "Good morning. Let's make sure your operation is protected today.",
    afternoon: "Good afternoon. Here's where your business stands right now.",
    evening: "Good evening. Your kitchen is covered. Here's today's summary.",
  },
  executive: {
    morning: "Good morning. Here's your portfolio at a glance.",
    afternoon: "Good afternoon. Everything your leadership team needs to know.",
    evening: "Good evening. Your locations closed strong today.",
  },
  compliance_manager: {
    morning: "Good morning. Let's stay ahead of what's coming.",
    afternoon: "Good afternoon. Here's what needs your attention today.",
    evening: "Good evening. You're ahead of schedule. Keep it up.",
  },
  facilities_manager: {
    morning: "Good morning. Your systems are standing by.",
    afternoon: "Good afternoon. Here's the status of your safeguards.",
    evening: "Good evening. Everything's in order for tomorrow.",
  },
  chef: {
    morning: "Good morning, Chef. Your kitchen is ready for service.",
    afternoon: "Good afternoon, Chef. Here's where your standards stand.",
    evening: "Good evening, Chef. Service summary is ready.",
  },
  kitchen_manager: {
    morning: "Good morning. Your team's shift starts with this.",
    afternoon: "Good afternoon. Here's how your team is performing.",
    evening: "Good evening. Ready for shift handoff.",
  },
  kitchen_staff: {
    morning: "Good morning. Here's what you need to do today.",
    afternoon: "Good afternoon. Let's keep the kitchen running right.",
    evening: "Good evening. Almost done — here's what's left.",
  },
};

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function DashboardGreeting({ role, firstName }) {
  const time = getTimeOfDay();
  const roleGreetings = GREETINGS[role] ?? GREETINGS['kitchen_staff'];
  const greeting = roleGreetings[time];

  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-[#1E2D4D]">
        {greeting}
      </h1>
      {firstName && (
        <p className="text-sm text-gray-500 mt-0.5">{firstName}, here's your snapshot.</p>
      )}
    </div>
  );
}
