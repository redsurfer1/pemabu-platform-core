import Link from 'next/link';

export default function ConnectCompletePage() {
  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <h1>Payment account setup complete</h1>
      <p>
        Your payment account has been set up. You can now receive payment releases when you complete jobs. It may take a
        few minutes for your account status to update in the app.
      </p>
      <p>
        <Link href="/dashboard">Return to dashboard</Link>
      </p>
    </div>
  );
}
