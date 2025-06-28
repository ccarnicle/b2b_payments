import Link from 'next/link';

interface Pool {
  id: number;
  name: string;
  organizer: string;
  tokenSymbol: string;
  dues: string;
  totalPot: string;
  endsIn: string;
}

interface PoolCardProps {
  pool: Pool;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function PoolCard({ pool }: PoolCardProps) {
  return (
    // Wrap the entire card in a Link component
    <Link href={`/pool/${pool.id}`} className="block">
        <div className="bg-card border border-accent p-6 rounded-lg hover:border-primary transition-colors duration-200 cursor-pointer space-y-4 h-full flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-primary">{pool.name}</h3>
                    <div className="text-right">
                        <p className="text-xs text-foreground/60">Ends In</p>
                        <p className="font-semibold">{pool.endsIn}</p>
                    </div>
                </div>
                <p className="text-sm text-foreground/80 mt-1 truncate" title={pool.organizer}>
                    By: {pool.organizer}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-accent">
                <InfoItem label="Total Pot" value={`${pool.totalPot} MTK`} />
                <InfoItem label="Dues" value={Number(pool.dues) > 0 ? `${pool.dues} MTK` : 'Open'} />
            </div>
        </div>
    </Link>
  );
}