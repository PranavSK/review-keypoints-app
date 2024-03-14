import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing
});

function Landing() {
  return (
    <div>
      <Link to='/dashboard'>Go to dashboard</Link>
    </div>
  );
}
