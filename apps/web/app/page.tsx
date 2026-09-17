import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default function HomePage() {
  // This will be replaced with proper auth check later
  return redirect('/(dashboard)');
}