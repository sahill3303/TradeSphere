import Card from '../../components/ui/Card';

const SUMMARY_CARDS = [
    { label: 'Total Clients', value: '—', icon: '👥' },
    { label: 'Open Trades', value: '—', icon: '📈' },
    { label: 'Capital Deployed', value: '—', icon: '💰' },
    { label: 'Realised P&L', value: '—', icon: '📊' },
];

export default function Dashboard() {
    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Dashboard</h2>
                <p className="page__subtitle">Overview of your portfolio</p>
            </div>

            {/* Summary cards */}
            <div className="stats-grid">
                {SUMMARY_CARDS.map(({ label, value, icon }) => (
                    <Card key={label} className="stat-card">
                        <div className="stat-card__icon">{icon}</div>
                        <div className="stat-card__body">
                            <span className="stat-card__value">{value}</span>
                            <span className="stat-card__label">{label}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Placeholder for charts / recent trades */}
            <div className="dashboard-sections">
                <Card className="section-placeholder">
                    <h3>Recent Trades</h3>
                    <p className="placeholder-text">Data will appear here once connected to the API.</p>
                </Card>
                <Card className="section-placeholder">
                    <h3>Client Activity</h3>
                    <p className="placeholder-text">Live data coming soon.</p>
                </Card>
            </div>
        </div>
    );
}
